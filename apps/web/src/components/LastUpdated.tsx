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
 * For prices this is the OLDEST reading held, not the newest: the sentence is
 * "prices as of", and that is only true of every row if it names the row
 * furthest behind. The newest would say a few seconds at all times while the
 * warmer works, over a table half of which is an hour old.
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
