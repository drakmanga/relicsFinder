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
import { Skeleton } from "relic-finder-ui";

import { PlatPrice } from "./Plat";
import { verdictFor } from "../lib/setCompletion";
import type { SetPart } from "../lib/setCompletion";

export function Piece({
  part,
  setName,
  pricesPending,
  onToggle,
  onPickItem,
  onPickRelic,
}: {
  part: SetPart;
  setName: string;
  pricesPending: boolean;
  onToggle: (itemName: string) => void;
  onPickItem: (itemName: string) => void;
  onPickRelic: (relicFullName: string) => void;
}) {
  const verdict = verdictFor(part);

  return (
    <div style={{ opacity: part.owned ? 0.55 : 1 }}>
      <div className="rf-row">
        <input
          type="checkbox"
          checked={part.owned}
          onChange={() => onToggle(part.itemName)}
          aria-label={`I have ${part.itemName}`}
          style={{ accentColor: "var(--rf-gold-500)", width: 15, height: 15, flex: "none" }}
        />

        <button
          type="button"
          className="rf-focus-ring"
          onClick={() => onPickItem(part.itemName)}
          title={`${part.itemName} — open it in Prime Items`}
          style={{
            flex: 1,
            minWidth: 0,
            textAlign: "left",
            background: "none",
            border: 0,
            padding: 0,
            cursor: "pointer",
            fontSize: 13,
            color: "var(--rf-fg-primary)",
            textDecoration: part.owned ? "line-through" : undefined,
          }}
        >
          {/* The set name is the panel title; repeating it on all six rows
              spends the width that tells them apart. */}
          {part.itemName.replace(`${setName} `, "")}
        </button>

        {pricesPending && part.price === null ? (
          <Skeleton width={36} height={13} />
        ) : (
          <PlatPrice value={part.price} />
        )}
      </div>

      {!part.owned && (
        <div
          className="rf-text-caption rf-fg-muted"
          style={{ display: "flex", alignItems: "baseline", gap: 6, marginLeft: 23, marginTop: 3 }}
        >
          {part.bestRelic ? (
            <>
              <button
                type="button"
                className="rf-focus-ring"
                onClick={() => onPickRelic(part.bestRelic!)}
                title={`${part.bestRelic} — open it in Relics`}
                style={{
                  background: "none",
                  border: 0,
                  padding: 0,
                  cursor: "pointer",
                  font: "inherit",
                  color: "var(--rf-fg-secondary)",
                  textDecoration: "underline",
                  textUnderlineOffset: 3,
                }}
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

          <span
            style={{
              marginLeft: "auto",
              color:
                verdict === "buy"
                  ? "var(--rf-success)"
                  : verdict === "farm"
                    ? "var(--rf-gold-300)"
                    : "var(--rf-fg-muted)",
            }}
          >
            {verdict === "unknown" ? "—" : verdict}
          </span>
        </div>
      )}
    </div>
  );
}
