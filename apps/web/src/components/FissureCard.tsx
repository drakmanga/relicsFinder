import { Chip, Frame } from "relic-finder-ui";

import { minutesLeft } from "../lib/relicCrack";
import type { Fissure } from "../api/types";

interface Props {
  fissure: Fissure;
  /** Whether this is the fastest mission type there is, which gilds it. */
  fastest: boolean;
  now: number;
}

/**
 * One open fissure, drawn as the ranked views draw their top three.
 *
 * The big number is what the cards are compared by — minutes to crack one
 * relic there — in the slot where Ducanetor puts its rank, so the eye runs down
 * the same column on both tabs. Only the fastest are gilded, for the reason
 * only Ducanetor's leader is: gold on everything ranks nothing.
 */
export function FissureCard({ fissure, fastest, now }: Props) {
  return (
    <Frame notch="md" variant={fastest ? "gilded" : "default"} surface={2}>
      <div className="rf-highlight">
        <span
          className={`rf-text-display-sm rf-highlight-rank rf-crack-card-minutes${fastest ? " rf-highlight-rank-first" : ""}`}
        >
          {fissure.minutes ?? "–"}
          <span className="rf-text-caption rf-fg-muted">
            {fissure.minutes === null ? "no estimate" : "min / relic"}
          </span>
        </span>

        <div className="rf-highlight-body">
          <div title={fissure.node} className="rf-highlight-title">
            {fissure.node}
          </div>
          <div className="rf-text-caption rf-fg-muted rf-highlight-sub">
            {fissure.tier} · {fissure.missionType}
          </div>
          {(fissure.steelPath || fissure.voidStorm) && (
            <div className="rf-highlight-meta">
              <span className="rf-highlight-meta-row">
                {fissure.steelPath && <Chip>Steel Path</Chip>}
                {fissure.voidStorm && <Chip>Void Storm</Chip>}
              </span>
            </div>
          )}
        </div>

        <div className="rf-highlight-figure">
          <div className="rf-text-overline rf-fg-muted">Closes in</div>
          <div className="rf-highlight-sub rf-tabular">{minutesLeft(fissure, now)} min</div>
        </div>
      </div>
    </Frame>
  );
}
