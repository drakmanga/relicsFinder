import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button, ProgressBar } from "relic-finder-ui";

import { api } from "../api/client";
import { keys, useUpdateInstall } from "../api/queries";
import { installMessage } from "../lib/updateInstall";

/**
 * The Windows ending of the update dialog: one click, and the newer version is
 * running.
 *
 * The click starts a download on the server, which proves the file is the one
 * the release published and only then runs it. Nothing here has to know any of
 * that — it asks, and it says what came back — but the button is worded as the
 * whole thing rather than as "download", because that is what happens: the
 * application closes and comes back a version newer.
 *
 * It replaces itself with the progress rather than sitting disabled beside it.
 * A dead button next to a moving bar is one more thing on screen that does
 * nothing, and the bar already says the click landed.
 *
 * Reopening the dialog mid-download shows the download rather than a fresh
 * button: `useUpdateInstall` reads the install off the server, which is where
 * it lives.
 */
export function WindowsUpdateAction({ releaseUrl }: { releaseUrl: string | null }) {
  const queryClient = useQueryClient();
  const install = useUpdateInstall();

  // Only the one thing the server cannot answer yet: whether the POST that
  // starts an install is still in flight. Everything else is read off the poll.
  const [asking, setAsking] = useState(false);
  const [unreachable, setUnreachable] = useState(false);

  async function start() {
    setAsking(true);
    setUnreachable(false);

    try {
      // Seeded rather than waited for by the poll: the answer to the POST is
      // the same record, so the first stage is on screen on the click.
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
  const message = state && installMessage(state);

  if (!message) {
    return (
      <Button variant="primary" onClick={start} disabled={asking}>
        Download and install it
      </Button>
    );
  }

  return (
    <div className="rf-update-install">
      {state?.stage === "downloading" && (
        <ProgressBar value={state.downloaded} total={state.total} label="Downloading the update" />
      )}

      {/* Polite rather than assertive: the stages replace each other every few
          seconds, and an assertive region would interrupt a screen reader
          mid-sentence each time one did. */}
      <p className="rf-text-body-sm" aria-live="polite">
        {message}
      </p>

      {state?.stage === "failed" && releaseUrl && (
        <Button
          variant="ghost"
          onClick={() => window.open(releaseUrl, "_blank", "noopener,noreferrer")}
        >
          Open the release page
        </Button>
      )}
    </div>
  );
}
