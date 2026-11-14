import type { ReactNode, RefObject } from "react";
import { EmptyState, Skeleton } from "relic-finder-ui";

import { CrackBoardHead } from "./CrackBoardHead";
import { CrackRanking } from "./CrackRanking";
import { useItemPrices } from "../api/queries";
import { openSummary } from "../lib/crackGroups";
import { wantedByRelic, wantedItems } from "../lib/crackWanted";
import { useOwned } from "../lib/owned";
import { formatCrackValue, rankCrack, type CrackRow } from "../lib/relicCrack";
import { useWishlist } from "../lib/wishlist";
import type { CrackOptions } from "../lib/crackOptions";
import type { FissureFeed, OwnedRelic, Relic } from "../api/types";

interface Props {
  owned: OwnedRelic[];
  catalogue: Relic[];
  /** Undefined while the feed is loading or unavailable; the section above says which. */
  feed: FissureFeed | undefined;
  feedPending: boolean;
  options: CrackOptions;
  /** Changes how the ranking is drawn: grouped, waits hidden. */
  onOptions: (patch: Partial<CrackOptions>) => void;
  now: number;
  onOpened: (row: CrackRow) => void;
  /** The session log, folded, between the switches and the ranking. */
  session: ReactNode;
  /** The tab's scrolling pane, which the ranking scrolls with. */
  pane: RefObject<HTMLElement | null>;
}

/**
 * The held relics scored against the fissures up right now.
 *
 * It owns what only it needs — the prices of what the held relics drop, and
 * the wishlist they are checked against — so the inventory beside it keeps
 * working while those load.
 */
export function CrackBoard({
  owned,
  catalogue,
  feed,
  feedPending,
  options,
  onOptions,
  now,
  onOpened,
  session,
  pane,
}: Props) {
  const held = new Set(owned.map((relic) => `${relic.relicName}|${relic.refinement}`));
  const drops = catalogue
    .filter((relic) => held.has(`${relic.fullName}|${relic.refinement}`))
    .flatMap((relic) => relic.rewards.map((reward) => reward.itemName));
  const prices = useItemPrices(drops);
  const wishlist = useWishlist();
  const parts = useOwned();
  const wanted = wantedByRelic(catalogue, wantedItems(wishlist.entries, parts.owned, catalogue));

  const ranked = feed ? rankCrack(owned, catalogue, prices.data, feed, options, now) : [];
  const rows = options.onlyOpen ? ranked.filter((row) => row.verdict === "open") : ranked;
  const summary = openSummary(ranked);

  return (
    <section className="rf-crack-board" aria-labelledby="rf-crack-board-title">
      <CrackBoardHead options={options} onChange={onOptions} />
      {session}

      {feedPending ? (
        <div className="rf-skeleton-stack" aria-hidden="true">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} height={56} />
          ))}
        </div>
      ) : !feed ? (
        <p className="rf-text-body-sm rf-fg-muted">
          Nothing can be ranked until the fissure data is back.
        </p>
      ) : owned.length === 0 ? (
        <EmptyState
          title="No relics to rank yet"
          description="Add the relics you hold and they are ranked here against the fissures up right now."
        />
      ) : (
        <>
          {/* The answer to "is it worth sitting down to crack now", before
              the list that says what to crack. */}
          <p className="rf-text-body-sm rf-crack-summary" aria-live="polite">
            {summary.copies === 0 ? (
              "Nothing to open right now: every relic held is a wait."
            ) : (
              <>
                <strong>
                  {summary.copies} relic{summary.copies === 1 ? "" : "s"} to open now
                </strong>
                <span className="rf-fg-muted">
                  {" "}
                  · {summary.lines} kind{summary.lines === 1 ? "" : "s"} · ~
                  {formatCrackValue(summary.value, "plat")} · ~
                  {formatCrackValue(summary.ducats, "ducats")}
                </span>
              </>
            )}
          </p>
          <CrackRanking
            rows={rows}
            wanted={wanted}
            byFissure={options.byFissure}
            onOpened={onOpened}
            pane={pane}
            now={now}
          />
        </>
      )}

      <p className="rf-text-caption rf-fg-muted">
        Ranked by platinum per minute: what one opening pays over the minutes one round of that
        mission takes. Open means the best fissure reaches at least half the rate of the fastest
        mission type you play. Requiem relics drop mods rather than Prime parts, so only what the
        market prices counts toward theirs.
      </p>
    </section>
  );
}
