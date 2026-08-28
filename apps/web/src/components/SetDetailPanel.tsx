/**
 * Over 150 lines (rule 4). The per-piece verdict went to SetPiece; what is left
 * is how far along the set is and the route to finishing it, which are one
 * question asked twice.
 */
import { useState } from "react";
import { ArrowLeftIcon, Button, DetailPanel, Divider, InfoIcon, XIcon } from "relic-finder-ui";

import { PlatPrice } from "./Plat";
import type { PrimeSet } from "../lib/setCompletion";
import { Piece } from "./SetPiece";
import { ALL_REFINEMENTS, REFINEMENT_LABEL } from "../lib/rows";
import type { Refinement } from "../api/types";

interface Props {
  set: PrimeSet | null;
  /**
   * The pieces the search named, mapped to the relic that matched it.
   *
   * A set can be found by a relic that drops one of its pieces — "Axi S18" —
   * and the list of six then gives no clue which one that was. Marking it is
   * the whole reason the search reached this set.
   */
  highlightParts: ReadonlyMap<string, string | null>;
  /** Whether more prices are still expected. See lib/priceProgress. */
  pricesFilling: boolean;
  refinement: Refinement;
  onRefinement: (next: Refinement) => void;
  /** Sets how many copies of one piece are in hand. */
  onSetOwned: (itemName: string, copies: number) => void;
  /** Fills in or clears the whole set at once, every copy of every piece. */
  onSetOwnedAll: (pieces: { itemName: string; copies: number }[], value: boolean) => void;
  /** Opens the piece in Prime Items. */
  onPickItem: (itemName: string) => void;
  /** Opens the relic that drops it. */
  onPickRelic: (relicFullName: string) => void;
  onBack?: () => void;
  onClose: () => void;
}

/**
 * One Prime set: what is missing, and the two ways to get each piece.
 *
 * Buying and farming are quoted side by side rather than reduced to a verdict
 * alone, because the exchange rate between platinum and an evening is the
 * reader's and nobody else's. The verdict is the shorthand; the numbers under
 * it are the reason.
 */
export function SetDetailPanel({
  set,
  highlightParts,
  pricesFilling,
  refinement,
  onRefinement,
  onSetOwned,
  onSetOwnedAll,
  onPickItem,
  onPickRelic,
  onBack,
  onClose,
}: Props) {
  const [hintOpen, setHintOpen] = useState(false);

  if (!set) {
    return (
      <DetailPanel
        empty
        emptyTitle="No set selected"
        emptyDescription="Pick a set to see what it still needs."
      />
    );
  }

  const missing = set.parts.filter((part) => !part.complete);
  const complete = missing.length === 0;
  // Every copy of every piece, which is what "I have all of these" has to mean
  // on a set built from two of one of them.
  const pieces = set.parts.map((part) => ({ itemName: part.itemName, copies: part.needed }));

  return (
    <DetailPanel
      key={set.setName}
      title={set.setName}
      meta={
        complete
          ? "Complete"
          : // Copies rather than names, the same count the table shows: a
            // Kestrel Prime with one Blade of two is 3 of 4, and the number
            // still to go is the number still to be obtained.
            `${set.ownedCount} of ${set.neededCount} pieces — ${set.neededCount - set.ownedCount} to go`
      }
      actions={
        <>
          {onBack && (
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              icon={<ArrowLeftIcon />}
              aria-label="Back to where this was opened from"
              title="Back"
              onClick={onBack}
            />
          )}
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            icon={<XIcon />}
            aria-label="Close the panel"
            title="Close"
            onClick={onClose}
          />
        </>
      }
    >
      <Divider />

      {/* The controls on one side, the pieces on the other: the two are read
          together — tick a piece and the total beside it moves — and stacked,
          a six-piece set pushed the total off the bottom of the panel. */}
      <div className="rf-panel-cols rf-panel-cols-lead">
        <div className="rf-panel-col">
          <p className="rf-text-overline rf-fg-muted rf-label-row">
            Buy or farm
            <button
              type="button"
              onClick={() => setHintOpen((was) => !was)}
              aria-expanded={hintOpen}
              aria-label={hintOpen ? "Hide the explanation" : "How the two routes compare"}
              style={{
                display: "inline-flex",
                padding: 0,
                border: 0,
                background: "none",
                cursor: "pointer",
                color: hintOpen ? "var(--rf-gold-500)" : "inherit",
              }}
            >
              <InfoIcon width={13} height={13} />
            </button>
          </p>

          {hintOpen && (
            <div
              style={{
                textTransform: "none",
                letterSpacing: "normal",
                fontSize: 12,
                lineHeight: 1.55,
                color: "var(--rf-fg-secondary)",
                background: "var(--rf-surface-3)",
                borderLeft: "2px solid var(--rf-gold-500)",
                padding: "10px 12px",
                marginBottom: 12,
              }}
            >
              <p className="rf-flush">
                <strong>Buy</strong> is what the finished piece sells for. <strong>Farm</strong> is
                the relic with the best odds at the chosen refinement, the runs that takes on
                average, and what those runs cost <em>net</em> — the price of the relics minus
                everything else they drop along the way, which you keep.
              </p>
              <p className="rf-panel-note">
                That subtraction is the whole point: a relic worth more than it sells for pays for
                its own farming, and "pays for itself" means the runs turn a profit before the piece
                even arrives.
              </p>
              <p className="rf-panel-note">
                Runs are a mean, not a promise: at 25% it is four on average, and a long tail says
                it can be twelve. The verdict weighs platinum against platinum — what an evening is
                worth is the part only you can price.
              </p>
            </div>
          )}

          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <Button variant="outline" size="sm" onClick={() => onSetOwnedAll(pieces, !complete)}>
              {complete ? "Clear the set" : "I have all of these"}
            </Button>
          </div>

          {/* The slider only sets the odds the farming route is quoted at, and
              a complete set has nothing left to farm: with every piece ticked
              it was a control whose every position produced the same panel. */}
          {!complete && (
            <>
              <p className="rf-text-overline rf-fg-muted rf-stack-sm">Refinement</p>

              <input
                type="range"
                min={0}
                max={ALL_REFINEMENTS.length - 1}
                step={1}
                value={ALL_REFINEMENTS.indexOf(refinement)}
                onChange={(event) =>
                  onRefinement(ALL_REFINEMENTS[Number(event.target.value)] ?? "intact")
                }
                aria-label="Refinement the farming route assumes"
                aria-valuetext={REFINEMENT_LABEL[refinement]}
                className="rf-range"
              />

              <div className="rf-split">
                {ALL_REFINEMENTS.map((state) => (
                  <span
                    key={state}
                    className={
                      state === refinement ? "rf-slider-tick rf-slider-tick-on" : "rf-slider-tick"
                    }
                  >
                    {state === "exceptional" ? "Except." : REFINEMENT_LABEL[state]}
                  </span>
                ))}
              </div>

              <div className="rf-row-baseline">
                <span className="rf-text-caption rf-fg-muted">
                  Buy everything missing
                  {set.costIncomplete && " (some unlisted)"}
                </span>
                <span className="rf-push">
                  <PlatPrice value={Math.round(set.missingCost)} size="lg" />
                </span>
              </div>
            </>
          )}
        </div>

        <div className="rf-panel-col">
          <p className="rf-text-overline rf-fg-muted rf-stack-sm">Pieces</p>

          <div className="rf-stack-8">
            {set.parts.map((part) => (
              <Piece
                key={part.itemName}
                part={part}
                setName={set.setName}
                marked={highlightParts.has(part.itemName)}
                matchedRelic={highlightParts.get(part.itemName) ?? null}
                pricesFilling={pricesFilling}
                onSetOwned={onSetOwned}
                onPickItem={onPickItem}
                onPickRelic={onPickRelic}
              />
            ))}
          </div>
        </div>
      </div>
    </DetailPanel>
  );
}
