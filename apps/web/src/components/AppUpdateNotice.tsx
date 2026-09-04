import { useState } from "react";
import { Button, ExternalLinkIcon, UpdateNotice } from "relic-finder-ui";

import { useAppUpdate } from "../api/queries";
import { plainReleaseNotes } from "../lib/releaseNotes";
import { rememberSkippedVersion, shouldAnnounce, skippedVersion } from "../lib/updateMemory";
import { DockerUpdateAction } from "./DockerUpdateAction";
import { WindowsUpdateAction } from "./WindowsUpdateAction";

/**
 * The topbar's update notice, wired to the endpoint that answers for it.
 *
 * Everything this adds over `UpdateNotice` is knowledge the library must not
 * have: where the answer comes from, what the release notes arrive as, and
 * where a skip is remembered. The notice itself takes two strings and an
 * ending.
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
 * The Windows button is offered on the platform rather than on the presence of
 * a setup, and the two come apart: a release whose installer build failed has
 * a `windows` of null, and the button then refuses out loud with a sentence and
 * a link. That is better than quietly showing the same link as every other
 * platform, which tells a Windows user nothing about why their one click went
 * missing.
 */
export function AppUpdateNotice() {
  const update = useAppUpdate();

  // Read once, on mount rather than on every render: the value only changes
  // through the skip below, and this state is what makes that change visible.
  const [skipped, setSkipped] = useState(skippedVersion);

  const status = update.data;
  if (!status?.updateAvailable) return null;
  if (!shouldAnnounce(status.latest, skipped)) return null;

  // Non-null past shouldAnnounce, which is what it checks first.
  const latest = status.latest as string;

  return (
    <UpdateNotice
      latestVersion={latest}
      currentVersion={status.current}
      notes={plainReleaseNotes(status.releaseNotes)}
      onSkip={() => {
        rememberSkippedVersion(latest);
        setSkipped(latest);
      }}
      action={
        status.platform === "windows" ? (
          <WindowsUpdateAction releaseUrl={status.releaseUrl} />
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
