import { useEffect, useRef, useState } from "react";

import { api } from "../api/client";
import { useUpdateInstall } from "../api/queries";
import { awaitNewVersion } from "./awaitNewVersion";

/**
 * The tab that started an update, waiting for the application to come back and
 * then reloading itself onto the new version.
 *
 * This is the whole of the ending the update used to get wrong. The restarted
 * process used to open a browser whether or not one was already pointed at it,
 * so an update finished with two tabs — a fresh one, and the one the reader had
 * been on, still showing the version that was just replaced. Reloading in place
 * leaves them with the tab they already had.
 *
 * It lives above the dialog rather than inside the button that starts the
 * install, because the dialog unmounts its contents when it is closed and
 * closing it mid-update is an ordinary thing to do: the download takes a minute
 * and there is nothing to watch. A wait that lived in the button would end the
 * moment somebody clicked Close, and the update would go back to ending with
 * two tabs for everybody who did.
 *
 * It asks for the version rather than merely for an answer, because a setup can
 * fail after closing the application and Windows then restarts the version that
 * was already there. Reloading on the first thing to answer would show the old
 * build with nothing saying anything had gone wrong.
 */
export function useAwaitNewVersion(currentVersion: string | undefined): { stalled: boolean } {
  const install = useUpdateInstall();
  const stage = install.data?.stage;

  const [stalled, setStalled] = useState(false);

  /*
    A ref rather than state: a re-render must not start a second wait, and the
    wait outlives the renders — it runs for as long as the restart takes, under
    a dialog that may be opened and closed several times while it does.
  */
  const waiting = useRef(false);

  useEffect(() => {
    if (stage !== "starting" || !currentVersion || waiting.current) return;
    waiting.current = true;

    void awaitNewVersion({
      was: currentVersion,
      read: () => api.appVersion(),
      wait: (ms) => new Promise((resume) => setTimeout(resume, ms)),
    }).then((arrived) => {
      if (arrived) {
        window.location.reload();
      } else {
        setStalled(true);
      }
    });
  }, [stage, currentVersion]);

  return { stalled };
}
