import { Button, EmptyState, Skeleton } from "relic-finder-ui";

import { CrackFilters } from "./CrackFilters";
import { FissureCard } from "./FissureCard";
import { fastestMinutes, visibleFissures } from "../lib/relicCrack";
import type { CrackOptions } from "../lib/crackOptions";
import type { FissureFeed } from "../api/types";

interface Props {
  /** The fissure request, whole: this section draws its waiting and failed states. */
  fissures: {
    data: FissureFeed | undefined;
    isPending: boolean;
    isError: boolean;
    error: Error | null;
    refetch: () => unknown;
  };
  options: CrackOptions;
  onOptions: (next: CrackOptions) => void;
  now: number;
}

/**
 * The Void Fissures up right now, as cards, under the controls that decide
 * which of them count.
 *
 * Above the inventory and the ranking rather than inside the ranking: the
 * filters here (Steel Path, Void Storms, the missions skipped) act on the
 * fissures first, and the reader sees what they removed before reading what
 * the ranking made of the rest.
 */
export function ActiveFissures({ fissures, options, onOptions, now }: Props) {
  const feed = fissures.data;
  const shown = feed ? visibleFissures(feed, options, now) : [];
  const fastest = feed ? fastestMinutes(feed, options) : null;

  // Fastest first, the order the cards and the threshold read them in.
  const missionTypes = Object.entries(feed?.missionMinutes ?? {})
    .sort(([a, x], [b, y]) => x - y || a.localeCompare(b))
    .map(([type]) => type);

  return (
    <section className="rf-crack-fissures" aria-labelledby="rf-crack-fissures-title">
      <h3 id="rf-crack-fissures-title" className="rf-text-heading-md rf-crack-section-title">
        Active fissures{feed ? ` · ${shown.length}` : ""}
      </h3>

      <CrackFilters options={options} onChange={onOptions} missionTypes={missionTypes} />

      {fissures.isPending ? (
        <div className="rf-ranked-highlights" aria-hidden="true">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} height={99} />
          ))}
        </div>
      ) : fissures.isError ? (
        /* Unavailable, never "none open": that would be a claim about the game
           the app cannot make while the worldstate is not answering. */
        <EmptyState
          tone="error"
          title="Fissure data unavailable"
          description={fissures.error?.message}
          actions={
            <Button variant="outline" size="sm" onClick={() => fissures.refetch()}>
              Retry
            </Button>
          }
        />
      ) : shown.length === 0 ? (
        <p className="rf-text-body-sm rf-fg-muted">No open fissure passes these filters.</p>
      ) : (
        <ul className="rf-ranked-highlights rf-crack-cards" aria-label="Open fissures">
          {shown.map((fissure) => (
            <li key={fissure.id}>
              <FissureCard fissure={fissure} fastest={fissure.minutes === fastest} now={now} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
