import { Button } from "relic-finder-ui";

import { usePriceEta } from "../lib/priceEta";
import type { PriceProgress } from "../lib/priceProgress";

interface Batch {
  progress: PriceProgress;
  isError: boolean;
  refetch: () => void;
}

interface Props {
  /**
   * Every price batch in flight — parts, whole relics, assembled sets.
   *
   * Reported as one number rather than three. They are three requests for
   * accounting reasons the reader has no stake in; what is being waited for is
   * "the prices", and three bars for one wait is three things to interpret.
   */
  batches: Batch[];
}

/**
 * What the market batches are doing, when they are doing something worth saying.
 *
 * Renders nothing at rest, which is most of the time. It exists for the two
 * states that had no voice at all:
 *
 * A batch takes minutes, not milliseconds — the server queues six hundred
 * lookups behind one response — and until now the only sign of that was
 * skeletons scattered through the table with no way to tell a queue that is
 * working from one that has died. Anything over ten seconds needs a count, not
 * a spinner: the number moving is the proof that waiting is worth it.
 *
 * And a failed batch was silent. The rows fell back to "not listed", which is a
 * statement about the market rather than about the request, so a network error
 * read as six hundred parts nobody sells.
 */
export function PriceStatus({ batches }: Props) {
  const priced = batches.reduce((sum, batch) => sum + batch.progress.priced, 0);
  const total = batches.reduce((sum, batch) => sum + batch.progress.total, 0);

  // Read before the early returns, because a hook cannot be called after one.
  // It costs a ref and a comparison on the renders where nothing is shown.
  const eta = usePriceEta(priced, total);

  const failed = batches.filter((batch) => batch.isError);

  if (failed.length > 0) {
    return (
      <div className="rf-band rf-pricestatus rf-pricestatus-error">
        <div className="rf-shell rf-pricestatus-inner" role="alert">
          <span className="rf-text-caption">
            Prices could not be fetched. Everything else on this page is still correct — the market
            is the only part missing.
          </span>
          {/* Only the ones that failed: refetching a batch that is working
              would throw away prices already on screen. */}
          <Button variant="ghost" size="sm" onClick={() => failed.forEach((b) => b.refetch())}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!batches.some((batch) => batch.progress.filling)) return null;

  return (
    <div className="rf-band rf-pricestatus">
      <div className="rf-shell rf-pricestatus-inner">
        {/*
          Polite and atomic: the count changes every fifteen seconds, and a
          screen reader that announced each digit as it moved would talk over
          everything else the user is doing. Atomic so it reads "412 of 550
          prices" rather than the one number that changed.
        */}
        <span className="rf-text-caption rf-fg-muted" aria-live="polite" aria-atomic="true">
          {total > 0 ? `Fetching prices · ${priced} of ${total}` : "Fetching prices…"}
          {/* Absent until the rate is measurable, and absent again if it stops
              being. A batch that says nothing about when it will finish is
              better than one that says the wrong thing twice. */}
          {eta && ` · ${eta}`}
        </span>

        {/*
          A bar rather than a spinner: the wait is long and bounded, and the one
          thing worth knowing is whether it is moving.

          The platform's own element, not two divs and an inline width. The
          browser draws the proportion, which is the whole reason `<progress>`
          exists, and it keeps a computed percentage out of a `style` attribute
          — see rule 1.

          aria-hidden because the sentence beside it already carries both
          numbers, and a progressbar role would announce the same fact a second
          time every time a poll lands.
        */}
        {total > 0 && (
          <progress className="rf-pricestatus-bar" value={priced} max={total} aria-hidden="true" />
        )}
      </div>
    </div>
  );
}
