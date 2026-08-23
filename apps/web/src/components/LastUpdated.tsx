import { asOfTime, asOfTitle } from "../lib/freshness";
import { useEndoStatus, useMarketStatus } from "../api/queries";

interface Props {
  /**
   * Whether the Endo tab is the one in front. Its rows come from live sell
   * orders that expire in five minutes, not from the price cache, so on that
   * tab the label has to report a different clock or it reports a lie.
   */
  endo: boolean;
}

/**
 * When what you are looking at was read, at the far end of the topbar.
 *
 * For prices this is the NEWEST reading held, so the label moves as long as
 * the warmer is actually fetching — an entry that dropped out of the current
 * sweep list stays cached forever with a stale timestamp, and using the
 * oldest reading would let one such orphan pin the label indefinitely,
 * reading as "stopped updating" for a service that is working fine.
 *
 * Absent rather than empty before there is anything to report — a cold start
 * has no honest time to show, and a placeholder would only ask to be read.
 */
export function LastUpdated({ endo }: Props) {
  // Only the one that answers for the tab in front is enabled, so the other
  // is not polled in the background for a label nobody is looking at.
  const market = useMarketStatus(!endo);
  const offers = useEndoStatus(endo);

  const asOf = endo ? offers.data?.asOf : market.data?.asOf;
  const time = asOfTime(asOf);
  if (!time) return null;

  return (
    <p className="rf-lastupdated rf-text-caption rf-fg-muted">
      {endo ? "Offers" : "Prices"} as of{" "}
      <time dateTime={asOf ?? undefined} title={asOfTitle(asOf) ?? undefined}>
        {time}
      </time>
    </p>
  );
}
