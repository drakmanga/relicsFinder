import { Button } from "relic-finder-ui";

import { refreshMessage, useSnapshotRefresh } from "../lib/snapshotRefresh";
import type { RefreshView } from "../api/types";

/**
 * The visible way to ask for newer numbers.
 *
 * A reload asks for exactly the same thing, and this is deliberately not a
 * second mechanism: both go through `useSnapshotRefresh`, so whatever a reload
 * re-reads this re-reads. What it has that F5 does not is that the filters, the
 * sort and any open panel are still where they were afterwards — which is the
 * reason it stands beside the reload rather than instead of it.
 *
 * The sentence under the button is the point of the component as much as the
 * button is. A refresh that changes nothing because the data was already new
 * used to be indistinguishable from one that failed, and both were
 * indistinguishable from a click that did not land.
 */
export function RefreshControl({ view }: { view: RefreshView }) {
  const { state, refresh } = useSnapshotRefresh(view);
  const message = refreshMessage(state);

  return (
    <div className="rf-refresh">
      <Button
        variant="ghost"
        size="sm"
        /* 32px tall inside the ranked head's own padding: the hit area grows
           into space that belongs to nobody, and nothing moves (rule 7). */
        className="rf-hit-block"
        loading={state.phase === "asking"}
        onClick={() => void refresh()}
      >
        Refresh
      </Button>

      {/* The region is always here and the sentence inside it comes and goes.
          A live region that appears at the same moment as its first content is
          not announced by every screen reader — what gets read is a region that
          was already being watched when it changed.

          Polite, so it waits for a pause rather than interrupting whatever the
          reader is doing; atomic because the sentence is one statement, and
          reading out only the words that changed would be half of one. */}
      <div aria-live="polite" aria-atomic="true">
        {message && <p className="rf-text-caption rf-fg-muted rf-refresh-note">{message}</p>}
      </div>
    </div>
  );
}
