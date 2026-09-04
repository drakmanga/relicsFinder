import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button, CommandBlock } from "relic-finder-ui";

import { api } from "../api/client";
import { keys, useUpdateInstall } from "../api/queries";
import { SELF_UPDATE_FILE, SELF_UPDATE_OPT_IN, installMessage } from "../lib/updateInstall";

/**
 * The two commands that update a container install by hand.
 *
 * In this order, and both of them: `pull` fetches the new images and `up -d`
 * is what actually replaces the running containers with them. Either one alone
 * looks like it worked and leaves the old version running.
 */
const BY_HAND = ["docker compose pull", "docker compose up -d"];

/**
 * The one command that turns the button on, for a reader who decides to.
 *
 * Both files are named because compose takes them together: the second one adds
 * the socket to what the first one already describes, and running it alone
 * would start a backend with no frontend and no ports.
 */
const TURN_IT_ON = [`docker compose -f docker-compose.yaml -f ${SELF_UPDATE_FILE} up -d`];

/**
 * The container ending of the update dialog.
 *
 * Two endings really, and which one shows is not this component's decision —
 * the server answers `self-update-off` until somebody mounts the Docker socket,
 * because replacing a container means controlling Docker and that is control of
 * the whole machine.
 *
 * An install that accepted gets the button, and it does exactly what the two
 * commands above do.
 *
 * An install that declined gets all three of them: why there is no button, the
 * commands that do the job without one, and what to run to have one after all.
 * The first two were always here and the third was not, which made this screen
 * a dead end — an absent button with no explanation is something a reader has
 * to interpret, and an explanation with no way out is something they can only
 * interpret as "not possible".
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

      {/*
        The ending that has somewhere to go, and it is shown as one: what it
        costs, then the commands that avoid the cost, then the way to have the
        button anyway. In that order, because a reader who stops after the
        first two has still been served — which is what the order is for.

        It used to stop at the commands. The button was off by default and
        nothing on this screen said the button existed, so the only conclusion
        available to somebody standing here was that Relic Finder cannot update
        itself in a container. It can, and the instruction was in the README of
        a repository a container install may never have cloned.
      */}
      {state.problem === "self-update-off" && (
        <>
          <CommandBlock commands={BY_HAND} label="the two update commands" />
          <p className="rf-text-body-sm">{SELF_UPDATE_OPT_IN}</p>
          <CommandBlock commands={TURN_IT_ON} label="the command that turns the update button on" />
        </>
      )}

      {state.problem === "recreate-failed" && (
        <Button variant="primary" onClick={start} disabled={asking}>
          Try again
        </Button>
      )}
    </div>
  );
}
