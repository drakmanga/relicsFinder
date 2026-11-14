import { Button, EmptyState, Skeleton } from "relic-finder-ui";

import { CrackFilters } from "./CrackFilters";
import { CrackRanking } from "./CrackRanking";
import { useFissures, useItemPrices } from "../api/queries";
import { rankCrack } from "../lib/relicCrack";
import { useNow } from "../lib/useNow";
import type { CrackOptions } from "../lib/crackOptions";
import type { OwnedRelic, Relic } from "../api/types";

/** Often enough that "expires in N min" is never a minute stale for long. */
const CLOCK_TICK = 30_000;

interface Props {
  owned: OwnedRelic[];
  catalogue: Relic[];
  options: CrackOptions;
  onOptions: (next: CrackOptions) => void;
}

/**
 * The ranking half of the tab: the controls, and the held relics scored
 * against the fissures up right now.
 *
 * It owns the two requests only it needs — the fissure feed and the prices of
 * what the held relics drop — so the inventory beside it keeps working when the
 * worldstate does not answer.
 */
export function CrackBoard({ owned, catalogue, options, onOptions }: Props) {
  const fissures = useFissures(true);
  const now = useNow(CLOCK_TICK);

  const held = new Set(owned.map((relic) => `${relic.relicName}|${relic.refinement}`));
  const drops = catalogue
    .filter((relic) => held.has(`${relic.fullName}|${relic.refinement}`))
    .flatMap((relic) => relic.rewards.map((reward) => reward.itemName));
  const prices = useItemPrices(drops);

  // Fastest first, which is the order the threshold reads them in.
  const missionTypes = Object.entries(fissures.data?.missionMinutes ?? {})
    .sort(([a, x], [b, y]) => x - y || a.localeCompare(b))
    .map(([type]) => type);

  return (
    <section className="rf-crack-board" aria-labelledby="rf-crack-board-title">
      <h3 id="rf-crack-board-title" className="rf-text-heading-md rf-crack-section-title">
        What to open now
      </h3>

      <CrackFilters options={options} onChange={onOptions} missionTypes={missionTypes} />

      {fissures.isPending ? (
        <div className="rf-skeleton-stack" aria-hidden="true">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} height={56} />
          ))}
        </div>
      ) : fissures.isError ? (
        /* Said as unavailable, never as an empty ranking: "nothing to open"
           would be a claim about the game the app cannot make right now. */
        <EmptyState
          tone="error"
          title="Fissure data unavailable"
          description={fissures.error.message}
          actions={
            <Button variant="outline" size="sm" onClick={() => fissures.refetch()}>
              Retry
            </Button>
          }
        />
      ) : owned.length === 0 ? (
        <EmptyState
          title="No relics to rank yet"
          description="Add the relics you hold and they are ranked here against the fissures up right now."
        />
      ) : (
        <CrackRanking
          rows={rankCrack(owned, catalogue, prices.data, fissures.data, options, now)}
          currency={options.currency}
          now={now}
        />
      )}

      <p className="rf-text-caption rf-fg-muted">
        Value per minute is what one opening pays over the minutes one round of that mission takes.
        Open means the best fissure reaches at least half the rate of the fastest mission type you
        play. Requiem relics drop mods rather than Prime parts, so only what the market prices
        counts toward theirs.
      </p>
    </section>
  );
}
