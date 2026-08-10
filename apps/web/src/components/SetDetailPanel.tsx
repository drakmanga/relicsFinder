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
  pricesPending: boolean;
  refinement: Refinement;
  onRefinement: (next: Refinement) => void;
  /** Ticks or unticks one piece. */
  onToggle: (itemName: string) => void;
  /** Ticks or unticks the whole set at once. */
  onToggleAll: (itemNames: string[], value: boolean) => void;
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
  pricesPending,
  refinement,
  onRefinement,
  onToggle,
  onToggleAll,
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

  const missing = set.parts.filter((part) => !part.owned);
  const complete = missing.length === 0;

  return (
    <DetailPanel
      key={set.setName}
      title={set.setName}
      meta={
        complete
          ? "Complete"
          : `${set.ownedCount} of ${set.parts.length} pieces — ${missing.length} to go`
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
            <strong>Buy</strong> is what the finished piece sells for. <strong>Farm</strong> is the
            relic with the best odds at the chosen refinement, the runs that takes on average, and
            what those runs cost <em>net</em> — the price of the relics minus everything else they
            drop along the way, which you keep.
          </p>
          <p className="rf-panel-note">
            That subtraction is the whole point: a relic worth more than it sells for pays for its
            own farming, and "pays for itself" means the runs turn a profit before the piece even
            arrives.
          </p>
          <p className="rf-panel-note">
            Runs are a mean, not a promise: at 25% it is four on average, and a long tail says it
            can be twelve. The verdict weighs platinum against platinum — what an evening is worth
            is the part only you can price.
          </p>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            onToggleAll(
              set.parts.map((part) => part.itemName),
              !complete,
            )
          }
        >
          {complete ? "Clear the set" : "I have all of these"}
        </Button>
      </div>

      <p className="rf-text-overline rf-fg-muted rf-stack-sm">Refinement</p>

      <input
        type="range"
        min={0}
        max={ALL_REFINEMENTS.length - 1}
        step={1}
        value={ALL_REFINEMENTS.indexOf(refinement)}
        onChange={(event) => onRefinement(ALL_REFINEMENTS[Number(event.target.value)] ?? "intact")}
        aria-label="Refinement the farming route assumes"
        aria-valuetext={REFINEMENT_LABEL[refinement]}
        className="rf-range"
      />

      <div className="rf-split">
        {ALL_REFINEMENTS.map((state) => (
          <span
            key={state}
            style={{
              fontSize: 10,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: state === refinement ? "var(--rf-fg-primary)" : "var(--rf-fg-muted)",
            }}
          >
            {state === "exceptional" ? "Except." : REFINEMENT_LABEL[state]}
          </span>
        ))}
      </div>

      <Divider />

      <p className="rf-text-overline rf-fg-muted rf-stack-sm">Pieces</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {set.parts.map((part) => (
          <Piece
            key={part.itemName}
            part={part}
            setName={set.setName}
            pricesPending={pricesPending}
            onToggle={onToggle}
            onPickItem={onPickItem}
            onPickRelic={onPickRelic}
          />
        ))}
      </div>

      {!complete && (
        <>
          <Divider />

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
    </DetailPanel>
  );
}
