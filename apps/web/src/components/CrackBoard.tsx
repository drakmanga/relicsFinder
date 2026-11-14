import type { RefObject } from "react";
import { EmptyState, Skeleton } from "relic-finder-ui";

import { CrackRanking } from "./CrackRanking";
import { useItemPrices } from "../api/queries";
import { rankCrack } from "../lib/relicCrack";
import type { CrackOptions } from "../lib/crackOptions";
import type { FissureFeed, OwnedRelic, Relic } from "../api/types";

interface Props {
  owned: OwnedRelic[];
  catalogue: Relic[];
  /** Undefined while the feed is loading or unavailable; the section above says which. */
  feed: FissureFeed | undefined;
  feedPending: boolean;
  options: CrackOptions;
  now: number;
  onOpened: (relic: OwnedRelic) => void;
  /** The tab's scrolling pane, which the ranking scrolls with. */
  pane: RefObject<HTMLElement | null>;
}

/**
 * The held relics scored against the fissures up right now.
 *
 * It owns the one request only it needs — the prices of what the held relics
 * drop — so the inventory beside it keeps working while those load.
 */
export function CrackBoard({
  owned,
  catalogue,
  feed,
  feedPending,
  options,
  now,
  onOpened,
  pane,
}: Props) {
  const held = new Set(owned.map((relic) => `${relic.relicName}|${relic.refinement}`));
  const drops = catalogue
    .filter((relic) => held.has(`${relic.fullName}|${relic.refinement}`))
    .flatMap((relic) => relic.rewards.map((reward) => reward.itemName));
  const prices = useItemPrices(drops);

  return (
    <section className="rf-crack-board" aria-labelledby="rf-crack-board-title">
      <h3 id="rf-crack-board-title" className="rf-text-heading-md rf-crack-section-title">
        What to open now
      </h3>

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
        <CrackRanking
          rows={rankCrack(owned, catalogue, prices.data, feed, options, now)}
          onOpened={onOpened}
          pane={pane}
          now={now}
        />
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
