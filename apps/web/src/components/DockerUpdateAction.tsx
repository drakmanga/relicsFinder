import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button, CommandBlock } from "relic-finder-ui";

import { api } from "../api/client";
import { keys, useUpdateInstall } from "../api/queries";
import { installMessage } from "../lib/updateInstall";

/**
 * The two commands that update a container install by hand.
 *
 * In this order, and both of them: `pull` fetches the new images and `up -d`
 * is what actually replaces the running containers with them. Either one alone
 * looks like it worked and leaves the old version running.
 */
const BY_HAND = ["docker compose pull", "docker compose up -d"];

/**
 * The container ending of the update dialog.
 *
 * Two endings really, and which one shows is not this component's decision —
 * the server answers `self-update-off` until somebody mounts the Docker socket,
 * because replacing a container means controlling Docker and that is control of
 * the whole machine. An install that declined gets the commands above and a
 * sentence saying why there is no button, which is the point: an absent button
 * with no explanation is something a reader has to interpret.
 *
 * An install that accepted gets the button, and it does exactly what those two
 * commands do.
 */
export function DockerUpdateAction() {
  const queryClient = useQueryClient();
  const install = useUpdateInstall();

  const [asking, setAsking] = useState(false);
  const [unreachable, setUnreachable] = useState(false);

  async function start() {
    setAsking(true);
    setUnreachable(false);

    try {
      queryClient.setQueryData(keys.updateInstall, await api.startUpdateInstall());
    } catch {
      setUnreachable(true);
    } finally {
      setAsking(false);
    }
  }

  if (unreachable) {
    return (
      <p className="rf-update-install rf-text-body-sm">
        Relic Finder is not answering. Close this and try again.
      </p>
    );
  }

  const state = install.data;

  // Before the first answer lands there is nothing honest to show: a button
  // would be wrong on an install that declined the socket, and the commands
  // would be wrong on one that took it.
  if (!state) return null;

  const message = installMessage(state);

  // Switched on and nothing running yet, which is the only state that gets a
  // plain button.
  if (!message) {
    return (
      <Button variant="primary" onClick={start} disabled={asking}>
        Fetch it and restart
      </Button>
    );
  }

  return (
    <div className="rf-update-install">
      <p className="rf-text-body-sm" aria-live="polite">
        {message}
      </p>

      {state.problem === "self-update-off" && (
        <CommandBlock commands={BY_HAND} label="the two update commands" />
      )}

      {state.problem === "recreate-failed" && (
        <Button variant="primary" onClick={start} disabled={asking}>
          Try again
        </Button>
      )}
    </div>
  );
}
