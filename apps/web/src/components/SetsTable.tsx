/**
 * Over 150 lines (rule 4). A table component is a column specification and a
 * row renderer, and the two are read together: the fourth `<col>` and the
 * fourth `<TableCell>` are the same decision. Splitting them would put the
 * halves of every column in two files.
 */
import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Skeleton, Table, TableCell, TableCols, TableHeaderCell, TableRow } from "relic-finder-ui";

import { OwnedBox } from "./OwnedBox";
import { QtyStepper } from "./QtyStepper";
import { Unlisted } from "./Unlisted";

import { PlatGlyph, PlatPrice } from "./Plat";
import { bump, remove } from "../lib/wishlist";
import type { PrimeSet } from "../lib/setCompletion";
import type { WishlistKind } from "../api/types";

const ROW_HEIGHT = 40;
const OVERSCAN = 12;

interface Props {
  sets: PrimeSet[];
  /** What each set sells for assembled, by set name. Null while it lands. */
  setPrices: Map<string, { price: number | null; slug: string | null }>;
  /** How many of a line the wishlist holds, for the stepper. */
  quantityOf: (itemName: string, kind?: WishlistKind) => number;
  /**
   * Ticks or unticks every piece of a set at once.
   *
   * The fastest thing a reader can say about their collection is "I have that
   * whole one", and until now saying it meant opening the set's panel and
   * finding the button inside.
   */
  onToggleOwned: (itemNames: string[], owned: boolean) => void;
  /** Whether more part prices are still expected. See lib/priceProgress. */
  pricesFilling: boolean;
  /** Whether the assembled-set prices are still landing. A batch of its own. */
  setPricesFilling: boolean;
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
export function SetsTable({
  sets,
  pricesFilling,
  setPricesFilling,
  selected,
  onSelect,
  onToggleOwned,
  quantityOf,
  setPrices,
}: Props) {
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
        stickyFirstColumn
        interactive
        framed={false}
        caption="Prime sets, with what each one still needs"
        className="rf-cols-sets"
      >
        <TableCols count={7} />
        <thead>
          <tr>
            <TableHeaderCell align="center">Owned</TableHeaderCell>
            <TableHeaderCell>Set</TableHeaderCell>
            <TableHeaderCell>Progress</TableHeaderCell>
            <TableHeaderCell align="right">Missing</TableHeaderCell>
            <TableHeaderCell align="right">
              <span className="rf-inline">
                To finish <PlatGlyph size={12} />
              </span>
            </TableHeaderCell>
            {/* What the whole thing goes for, assembled. Beside "to finish"
                because the two are read against each other: a set selling for
                less than its missing pieces is a set to buy outright. */}
            <TableHeaderCell align="right">
              <span className="rf-inline">
                Whole set <PlatGlyph size={12} />
              </span>
            </TableHeaderCell>
            <TableHeaderCell align="center">Wishlist</TableHeaderCell>
          </tr>
        </thead>

        <tbody>
          {paddingTop > 0 && (
            <tr aria-hidden="true">
              <td colSpan={7} className="rf-spacer" style={{ height: paddingTop }} />
            </tr>
          )}

          {items.map((virtualRow) => {
            const set = sets[virtualRow.index];
            if (!set) return null;

            const total = set.parts.length;
            const missing = total - set.ownedCount;
            const done = missing === 0;

            // A set has no tier, no relic and no refinement: it is a plan, not
            // a drop. The fields are here because every wishlist line carries
            // them — see lib/wishlist.
            const seed = {
              itemName: set.setName,
              kind: "set" as const,
              tier: "lith" as const,
              relicFullName: "",
              refinement: "intact" as const,
            };

            return (
              <TableRow
                key={set.setName}
                selected={set.setName === selected}
                onClick={() => onSelect(set.setName)}
                title={`${set.setName} — click to see the pieces`}
              >
                {/* First, before the name: on a list read top to bottom it is
                    the column the hand goes down. */}
                <TableCell align="center">
                  <OwnedBox
                    label={set.setName}
                    state={done ? "all" : set.ownedCount > 0 ? "some" : "none"}
                    onToggle={() =>
                      onToggleOwned(
                        set.parts.map((part) => part.itemName),
                        // Anything short of the whole set fills it in; only a
                        // complete one clears.
                        !done,
                      )
                    }
                  />
                </TableCell>

                <TableCell>{set.setName}</TableCell>

                <TableCell>
                  {/*
                    A bar as well as a count. "4 / 6" is the precise answer and
                    the bar is the one that can be read while scrolling, which is
                    how a list of two hundred sets is actually used.
                  */}
                  <span className="rf-row">
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
                  {done ? <span className="rf-text-caption rf-success">Complete</span> : missing}
                </TableCell>

                <TableCell align="right" numeric>
                  {done ? (
                    <Unlisted />
                  ) : set.missingCost === 0 && pricesFilling ? (
                    <Skeleton width={44} height={14} />
                  ) : (
                    <span title={set.costIncomplete ? "Some pieces have no listing" : undefined}>
                      <PlatPrice value={Math.round(set.missingCost)} />
                      {/* An unlisted piece is not a free one. */}
                      {set.costIncomplete && <span className="rf-fg-muted">+</span>}
                    </span>
                  )}
                </TableCell>

                <TableCell align="right" numeric>
                  {setPrices.get(set.setName)?.price == null && setPricesFilling ? (
                    <Skeleton width={44} height={14} />
                  ) : (
                    <PlatPrice value={setPrices.get(set.setName)?.price ?? null} />
                  )}
                </TableCell>

                {/* A set is a thing someone plans to finish, so it belongs on
                    the list as one line rather than as four parts filed under
                    Prime parts, where what they add up to is invisible. */}
                <TableCell align="center">
                  <QtyStepper
                    itemName={set.setName}
                    qty={quantityOf(set.setName, "set")}
                    onIncrement={() => bump(seed, 1)}
                    onDecrement={() => bump(seed, -1)}
                    onRemove={() => remove(seed)}
                  />
                </TableCell>
              </TableRow>
            );
          })}

          {paddingBottom > 0 && (
            <tr aria-hidden="true">
              <td colSpan={7} className="rf-spacer" style={{ height: paddingBottom }} />
            </tr>
          )}
        </tbody>
      </Table>
    </div>
  );
}
