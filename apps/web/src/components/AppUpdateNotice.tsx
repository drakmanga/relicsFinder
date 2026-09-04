import { useState } from "react";
import { Button, ExternalLinkIcon, UpdateNotice } from "relic-finder-ui";

import { useAppUpdate } from "../api/queries";
import { plainReleaseNotes } from "../lib/releaseNotes";
import { rememberSkippedVersion, shouldAnnounce, skippedVersion } from "../lib/updateMemory";

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
 * The ending is the release page. That is the whole ending this brief has: a
 * Windows install and a container install each replace it with a real button of
 * their own, and the slot is where those go.
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
      }
    />
  );
}
