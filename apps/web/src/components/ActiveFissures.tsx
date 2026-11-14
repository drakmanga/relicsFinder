import { Button, EmptyState, Skeleton } from "relic-finder-ui";

import { CrackFilters } from "./CrackFilters";
import { FissureCard } from "./FissureCard";
import { visibleFissures } from "../lib/relicCrack";
import type { CrackOptions } from "../lib/crackOptions";
import type { FissureFeed } from "../api/types";

/** How many fissures get a card. Three, like the ranked views' highlights. */
const TOP_FISSURES = 3;

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
 * The three fastest Void Fissures up right now, as cards, with the controls
 * that decide which fissures count under them.
 *
 * Above the inventory and the ranking rather than inside the ranking: the
 * filters here (Steel Path, Void Storms, the missions skipped) act on the
 * fissures first, and the cards show what they leave at the top before the
 * ranking says what it made of the rest.
 */
export function ActiveFissures({ fissures, options, onOptions, now }: Props) {
  const feed = fissures.data;
  const visible = feed ? visibleFissures(feed, options, now) : [];
  // The best three, as Ducanetor shows its best three: all thirty-odd open
  // fissures as cards buried the inventory and the ranking under seven rows.
  // Only the rated ones compete, since an unrated type has no "fast".
  const shown = visible.filter((fissure) => fissure.minutes !== null).slice(0, TOP_FISSURES);

  // Fastest first, the order the cards and the threshold read them in.
  const missionTypes = Object.entries(feed?.missionMinutes ?? {})
    .sort(([a, x], [b, y]) => x - y || a.localeCompare(b))
    .map(([type]) => type);

  return (
    <section className="rf-crack-fissures" aria-labelledby="rf-crack-fissures-title">
      <h3 id="rf-crack-fissures-title" className="rf-text-heading-md rf-crack-section-title">
        Top fissures now{feed ? ` · ${shown.length} of ${visible.length} open` : ""}
      </h3>

      {fissures.isPending ? (
        <div className="rf-ranked-highlights" aria-hidden="true">
          {Array.from({ length: TOP_FISSURES }, (_, index) => (
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
          {shown.map((fissure, index) => (
            <li key={fissure.id}>
              <FissureCard fissure={fissure} first={index === 0} now={now} />
            </li>
          ))}
        </ul>
      )}

      {/* Below the cards: the cards are the answer to "what is up right now",
          the filters a refinement of it, and the answer comes first. */}
      <CrackFilters options={options} onChange={onOptions} missionTypes={missionTypes} />
    </section>
  );
}
