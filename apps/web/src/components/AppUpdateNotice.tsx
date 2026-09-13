import { Button, ExternalLinkIcon, UpdateNotice } from "relic-finder-ui";

import { useAppUpdate } from "../api/queries";
import { plainReleaseNotes } from "../lib/releaseNotes";
import { useAwaitNewVersion } from "../lib/useAwaitNewVersion";
import { DockerUpdateAction } from "./DockerUpdateAction";
import { WindowsUpdateAction } from "./WindowsUpdateAction";

/**
 * The topbar's update notice, wired to the endpoint that answers for it.
 *
 * Everything this adds over `UpdateNotice` is knowledge the library must not
 * have: where the answer comes from and what the release notes arrive as. The
 * notice itself takes two strings and an ending.
 *
 * It renders nothing in three cases, and all three are ordinary rather than
 * exceptional: the check has not answered yet, it answered "I do not know"
 * because the machine is offline, or the running build is the newest there is.
 * A reader who is current sees no notice at all — not a green tick, which would
 * put a claim in the bar for the one state that needs no words.
 *
 * The ending depends on what this install can actually do. A Windows install
 * updates itself in one click and gets the button that does it. A container
 * install gets a button too when it was given control of Docker, and the two
 * commands to run by hand when it was not — which is the shipped default, and
 * an answer rather than an absence. Anything else gets the release page, which
 * is the honest ending when the application cannot finish the job itself.
 *
 * Nothing dismisses it. A version behind is a version behind on the next
 * reload too, so the only thing that takes the notice off the bar is the
 * install catching up — which is why there is no stored "skipped" version to
 * read here any more, and why a reader who closes the dialog gets the badge
 * back on every load until they update. That is the accepted cost of the
 * alternative being a signal a single click deletes for good.
 *
 * The Windows button is offered on the platform rather than on the presence of
 * a setup, and the two come apart: a release whose installer build failed has
 * a `windows` of null, and the button then refuses out loud with a sentence and
 * a link. That is better than quietly showing the same link as every other
 * platform, which tells a Windows user nothing about why their one click went
 * missing.
 */
export function AppUpdateNotice() {
  const update = useAppUpdate();

  // Above the dialog on purpose: the wait for the restarted application has to
  // outlive a reader clicking Close on a download that takes a minute. See
  // `useAwaitNewVersion`.
  const { stalled } = useAwaitNewVersion(update.data?.current);

  const status = update.data;
  if (!status?.updateAvailable) return null;

  // The offline answer carries a null latest, and a notice about a version
  // nobody could read is worse than no notice at all.
  if (!status.latest) return null;
  const latest = status.latest;

  return (
    <UpdateNotice
      latestVersion={latest}
      currentVersion={status.current}
      notes={plainReleaseNotes(status.releaseNotes)}
      action={
        status.platform === "windows" ? (
          <WindowsUpdateAction releaseUrl={status.releaseUrl} stalled={stalled} />
        ) : status.platform === "docker" ? (
          <DockerUpdateAction />
        ) : (
          status.releaseUrl && (
            <Button
              variant="primary"
              icon={<ExternalLinkIcon />}
              onClick={() =>
                window.open(status.releaseUrl as string, "_blank", "noopener,noreferrer")
              }
            >
              See the release
            </Button>
          )
        )
      }
    />
  );
}
