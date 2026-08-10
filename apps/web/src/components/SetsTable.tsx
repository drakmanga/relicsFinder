import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Skeleton, Table, TableCell, TableCols, TableHeaderCell, TableRow } from "relic-finder-ui";

import { Unlisted } from "./Unlisted";

import { PlatGlyph, PlatPrice } from "./Plat";
import type { PrimeSet } from "../lib/setCompletion";

const ROW_HEIGHT = 40;
const OVERSCAN = 12;

interface Props {
  sets: PrimeSet[];
  pricesPending: boolean;
  selected: string | null;
  onSelect: (setName: string) => void;
}

/**
 * The Prime sets, one per row, with how far along each one is.
 *
 * The question this view answers is "I want Volt Prime — what is left and what
 * will it cost me", which the relic and item views cannot: one is about what a
 * relic contains and the other about where a part comes from, and neither knows
 * what the player already has.
 */
export function SetsTable({ sets, pricesPending, selected, onSelect }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: sets.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: OVERSCAN,
  });

  const items = virtualizer.getVirtualItems();
  const paddingTop = items.length > 0 ? (items[0]?.start ?? 0) : 0;
  const paddingBottom =
    items.length > 0 ? virtualizer.getTotalSize() - (items[items.length - 1]?.end ?? 0) : 0;

  return (
    <div
      ref={scrollRef}
      className="rf-virtual-scroll"
      role="region"
      aria-label="Prime sets table"
      tabIndex={0}
    >
      <Table
        interactive
        framed={false}
        caption="Prime sets, with what each one still needs"
        className="rf-cols-sets"
      >
        <TableCols count={4} />
        <thead>
          <tr>
            <TableHeaderCell>Set</TableHeaderCell>
            <TableHeaderCell>Progress</TableHeaderCell>
            <TableHeaderCell align="right">Missing</TableHeaderCell>
            <TableHeaderCell align="right">
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                To finish <PlatGlyph size={12} />
              </span>
            </TableHeaderCell>
          </tr>
        </thead>

        <tbody>
          {paddingTop > 0 && (
            <tr aria-hidden="true">
              <td colSpan={4} style={{ height: paddingTop, padding: 0, border: 0 }} />
            </tr>
          )}

          {items.map((virtualRow) => {
            const set = sets[virtualRow.index];
            if (!set) return null;

            const total = set.parts.length;
            const missing = total - set.ownedCount;
            const done = missing === 0;

            return (
              <TableRow
                key={set.setName}
                selected={set.setName === selected}
                onClick={() => onSelect(set.setName)}
                title={`${set.setName} — click to see the pieces`}
              >
                <TableCell>{set.setName}</TableCell>

                <TableCell>
                  {/*
                    A bar as well as a count. "4 / 6" is the precise answer and
                    the bar is the one that can be read while scrolling, which is
                    how a list of two hundred sets is actually used.
                  */}
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        flex: 1,
                        height: 4,
                        minWidth: 40,
                        background: "var(--rf-surface-3)",
                        overflow: "hidden",
                      }}
                    >
                      <span
                        style={{
                          display: "block",
                          height: "100%",
                          width: `${(set.ownedCount / total) * 100}%`,
                          background: done ? "var(--rf-success)" : "var(--rf-gold-500)",
                        }}
                      />
                    </span>
                    <span className="rf-text-caption rf-tabular rf-fg-muted">
                      {set.ownedCount}/{total}
                    </span>
                  </span>
                </TableCell>

                <TableCell align="right" numeric>
                  {done ? (
                    <span className="rf-text-caption" style={{ color: "var(--rf-success)" }}>
                      Complete
                    </span>
                  ) : (
                    missing
                  )}
                </TableCell>

                <TableCell align="right" numeric>
                  {done ? (
                    <Unlisted />
                  ) : pricesPending ? (
                    <Skeleton width={44} height={14} />
                  ) : (
                    <span title={set.costIncomplete ? "Some pieces have no listing" : undefined}>
                      <PlatPrice value={Math.round(set.missingCost)} />
                      {/* An unlisted piece is not a free one. */}
                      {set.costIncomplete && <span className="rf-fg-muted">+</span>}
                    </span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}

          {paddingBottom > 0 && (
            <tr aria-hidden="true">
              <td colSpan={4} style={{ height: paddingBottom, padding: 0, border: 0 }} />
            </tr>
          )}
        </tbody>
      </Table>
    </div>
  );
}
