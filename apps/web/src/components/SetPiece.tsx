/**
 * One piece of a set: whether it is owned, what it costs to buy, and what it
 * costs to farm.
 *
 * Its own file because it is where the verdict is reached — buy or farm — and
 * that is a different question from the one the panel above it answers, which
 * is how far along the set is. Both numbers are shown rather than reduced to
 * the verdict alone: the trade-off between platinum and an evening is the
 * reader's and nobody else's.
 */
import { cx, Skeleton } from "relic-finder-ui";

import { OwnedStepper } from "./OwnedStepper";
import { PlatPrice } from "./Plat";
import { verdictFor } from "../lib/setCompletion";
import type { SetPart } from "../lib/setCompletion";

export function Piece({
  part,
  setName,
  marked,
  matchedRelic,
  pricesFilling,
  onSetOwned,
  onPickItem,
  onPickRelic,
}: {
  part: SetPart;
  setName: string;
  /** Whether the search named this piece, directly or through a relic. */
  marked?: boolean;
  /**
   * The relic the search matched, when it was a relic that matched.
   *
   * Quoted beside the marker because the farming line below names the piece's
   * *best* source, which is usually a different relic: without this the mark
   * would point at a row that appears to have nothing to do with what was
   * typed. Null when the piece matched on its own name, where the mark needs
   * no explanation.
   */
  matchedRelic?: string | null;
  /** Whether more prices are still expected. See lib/priceProgress. */
  pricesFilling: boolean;
  /** Sets how many copies of this piece are in hand. */
  onSetOwned: (itemName: string, copies: number) => void;
  onPickItem: (itemName: string) => void;
  onPickRelic: (relicFullName: string) => void;
}) {
  const verdict = verdictFor(part);

  return (
    <div
      className={cx(
        "rf-set-piece",
        marked && "rf-set-piece-marked",
        part.complete && "rf-set-piece-done",
      )}
    >
      <OwnedStepper
        itemName={part.itemName}
        owned={part.ownedCopies}
        needed={part.needed}
        onChange={(copies) => onSetOwned(part.itemName, copies)}
      />

      <div className="rf-row">
        <button
          type="button"
          /* 20px of text in rule 7's 44px box. The piece rows are 28px apart,
             so the two growths meet with 4px to spare. */
          className={cx(
            "rf-focus-ring rf-set-piece-name rf-hit-block",
            part.complete && "rf-struck",
          )}
          onClick={() => onPickItem(part.itemName)}
          title={`${part.itemName} — open it in Prime Items`}
        >
          {/* The set name is the panel title; repeating it on all six rows
              spends the width that tells them apart. */}
          {part.itemName.replace(`${setName} `, "")}
        </button>

        {marked && matchedRelic && (
          <span className="rf-text-caption rf-fg-muted rf-set-piece-match">
            from {matchedRelic}
          </span>
        )}

        {part.price === null && pricesFilling ? (
          <Skeleton width={36} height={13} />
        ) : (
          <PlatPrice value={part.price} />
        )}
      </div>

      {!part.complete && (
        <div className="rf-text-caption rf-fg-muted rf-set-piece-note">
          {part.bestRelic ? (
            <>
              <button
                type="button"
                className="rf-focus-ring rf-inline-link"
                onClick={() => onPickRelic(part.bestRelic!)}
                title={`${part.bestRelic} — open it in Relics`}
              >
                {part.bestRelic}
              </button>
              <span>{part.bestChance.toFixed(2)}%</span>
              <span>·</span>
              <span>{part.runs === null ? "—" : `${part.runs.toFixed(1)} runs`}</span>
              {part.netFarmCost !== null && (
                <span>
                  ·{" "}
                  {part.netFarmCost <= 0
                    ? "pays for itself"
                    : `${Math.round(part.netFarmCost)}p net`}
                </span>
              )}
            </>
          ) : (
            <span>No relic drops it at this refinement</span>
          )}

          <span className={`rf-set-piece-verdict rf-set-piece-verdict-${verdict}`}>
            {verdict === "unknown" ? "—" : verdict}
          </span>
        </div>
      )}
    </div>
  );
}
