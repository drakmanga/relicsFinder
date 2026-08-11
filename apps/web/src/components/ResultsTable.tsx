/**
 * Over 150 lines (rule 4). A table component is a column specification and a
 * row renderer, and the two are read together: the fourth `<col>` and the
 * fourth `<TableCell>` are the same decision. Splitting them would put the
 * halves of every column in two files.
 */
import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  Button,
  ExternalLinkIcon,
  Skeleton,
  Table,
  TableCell,
  TableCols,
  TableHeaderCell,
  TableRow,
  TierChip,
} from "relic-finder-ui";

import { Unlisted } from "./Unlisted";

import { PlatGlyph, PlatPrice } from "./Plat";
import { QtyStepper } from "./QtyStepper";
import { bump, remove } from "../lib/wishlist";
import { relicMarketUrl } from "../lib/format";
import { bestDropValue, expectedValue } from "../lib/rows";
import type { PriceMap, Refinement, RelicPriceMap, RelicRow, WishlistKind } from "../api/types";
import type { RelicSortColumn, SortDirection } from "../lib/rows";

/**
 * Row height, fixed at the design system's 40px.
 *
 * The specification makes this mandatory past a hundred rows for exactly this
 * reason: a virtualizer that has to measure every row cannot know the total
 * scroll height until it has rendered everything, which is the thing being
 * avoided.
 */
const ROW_HEIGHT = 40;

/** Rows rendered outside the viewport, so a fast scroll does not show gaps. */
const OVERSCAN = 12;

interface Props {
  rows: RelicRow[];
  prices: PriceMap | undefined;
  pricesPending: boolean;
  /** What each relic itself sells for. Undefined while the batch is in flight. */
  relicPrices: RelicPriceMap | undefined;
  /**
   * What the user typed, so a row can show why it is in the list.
   *
   * Searching "volt" in a list of relics returns sixteen rows named Lith V9 and
   * Meso N11, with nothing on any of them mentioning Volt — the match is inside
   * the relic, and until it is named the search reads as broken.
   */
  term: string;
  /** Full names of the relics currently in rotation; undefined while loading. */
  unvaulted: Set<string> | undefined;
  selected: string | null;
  onSelect: (id: string) => void;
  /** How many of a relic the wishlist holds, for the stepper on each row. */
  quantityOf: (itemName: string, kind?: WishlistKind, refinement?: Refinement) => number;
  sort: { column: RelicSortColumn; direction: SortDirection };
  onSort: (column: RelicSortColumn) => void;
}

/**
 * The relics, one per row.
 *
 * The table used to pair every relic with each of its six drops, which made a
 * relic occupy six rows and turned a list of relics into a list of parts —
 * the question the Prime Items view exists to answer. What a relic holds is
 * read in the detail panel, where the six drops can be seen together and
 * compared, which is how the decision to open one is actually made.
 */
export function ResultsTable({
  rows,
  prices,
  pricesPending,
  relicPrices,
  term,
  unvaulted,
  selected,
  onSelect,
  quantityOf,
  sort,
  onSort,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: OVERSCAN,
  });

  const items = virtualizer.getVirtualItems();

  const needle = term.trim().toLowerCase();

  const dir = (column: RelicSortColumn) => (sort.column === column ? sort.direction : null);

  // Spacers stand in for the rows that are not rendered, so the scrollbar
  // reflects the whole result set rather than the handful in the DOM.
  const paddingTop = items.length > 0 ? (items[0]?.start ?? 0) : 0;
  const paddingBottom =
    items.length > 0 ? virtualizer.getTotalSize() - (items[items.length - 1]?.end ?? 0) : 0;

  return (
    <div
      ref={scrollRef}
      className="rf-virtual-scroll"
      role="region"
      aria-label="Relics table"
      tabIndex={0}
    >
      <Table
        stickyFirstColumn
        interactive
        framed={false}
        caption="Relics, with expected value, best drop and cost"
        className="rf-cols-relics"
      >
        <TableCols count={8} />
        <thead>
          <tr>
            {/*
              Proportional widths, so the slack is shared instead of pooling.
              Sized to their contents the numeric columns took only what they
              needed and left the remainder to whichever column came before
              them — first Status, then the relic name — which put a hand's
              width of empty in the middle of every row. Percentages spread the
              same space across all seven, and the table stays even at any
              window size.
            */}
            {/* Tier is sized to the longest chip, Vanguard: under fixed layout
                a column that is too narrow truncates rather than pushing its
                neighbours aside, and "VANGUA…" is not a tier. */}
            <TableHeaderCell>Tier</TableHeaderCell>
            <TableHeaderCell sortable sortDirection={dir("relic")} onSort={() => onSort("relic")}>
              Relic
            </TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            {/*
              Expected value first, because it is the number the decision turns
              on. Best drop stays beside it — it answers a different question,
              "what is the jackpot", and the two disagree almost always.

              There is deliberately no rare-chance column: every relic shares the
              same odds for its rare slot, 2% Intact and 10% Radiant, so it read
              the same down all 772 rows. What refinement changes per relic is
              the expected value.
            */}
            <TableHeaderCell
              align="right"
              sortable
              sortDirection={dir("expected")}
              onSort={() => onSort("expected")}
              title="Average payout of one run: every drop weighted by its chance"
            >
              <span className="rf-inline">
                Expected <PlatGlyph size={12} />
              </span>
            </TableHeaderCell>
            <TableHeaderCell
              align="right"
              sortable
              sortDirection={dir("value")}
              onSort={() => onSort("value")}
              title="The most valuable single drop, however unlikely"
            >
              <span className="rf-inline">
                Best drop <PlatGlyph size={12} />
              </span>
            </TableHeaderCell>
            {/*
              What the relic itself costs, against what opening it is worth.
              Buying one is the alternative to farming it, and that comparison
              cannot be made from a row that only prices the contents.
            */}
            <TableHeaderCell
              align="right"
              sortable
              sortDirection={dir("cost")}
              onSort={() => onSort("cost")}
              title="What the relic itself sells for on the market"
            >
              <span className="rf-inline">
                Cost <PlatGlyph size={12} />
              </span>
            </TableHeaderCell>
            {/*
              No ducat column here. Ducats are what a *part* dissolves into, and
              a relic cannot be dissolved — so the sum of its six drops is a
              number nobody can ever collect. It lives on Prime Items, where it
              is a real trade, and per drop inside the relic panel.
            */}
            {/*
              A relic is a thing you buy whole and crack, so it is a wishlist
              line in its own right — separate from the parts inside it, which
              take their own steppers in the panel.
            */}
            <TableHeaderCell align="center">Wishlist</TableHeaderCell>
            <TableHeaderCell align="center">Market</TableHeaderCell>
          </tr>
        </thead>

        <tbody>
          {paddingTop > 0 && (
            <tr aria-hidden="true">
              <td colSpan={8} className="rf-spacer" style={{ height: paddingTop }} />
            </tr>
          )}

          {items.map((virtualRow) => {
            const row = rows[virtualRow.index];
            if (!row) return null;

            const best = bestDropValue(row, prices);
            const expected = expectedValue(row.rewards, prices);
            // Only when the term is not simply the relic's own name: repeating
            // "holds Lith V9" under "Lith V9" is noise.
            const matched =
              needle && !row.relicFullName.toLowerCase().includes(needle)
                ? (row.rewards.find((r) => r.itemName.toLowerCase().includes(needle))?.itemName ??
                  null)
                : null;
            const cost = relicPrices?.get(row.relicFullName) ?? null;

            // The relic is its own line: its name is the item, and the state it
            // is wanted in is the one the table is listing it in.
            const seed = {
              itemName: row.relicFullName,
              kind: "relic" as const,
              tier: row.tier,
              relicFullName: row.relicFullName,
              refinement: row.refinement,
            };

            return (
              <TableRow
                key={row.id}
                selected={row.id === selected}
                onClick={() => onSelect(row.id)}
                title={`${row.relicFullName} — click to see everything inside`}
              >
                <TableCell>
                  <TierChip tier={row.tier} refinement={row.refinement} />
                </TableCell>
                <TableCell>
                  {row.relicFullName}
                  {matched && (
                    // Inline rather than a second line: the virtualizer is told
                    // every row is 40px tall, and a row that grows past that
                    // pushes the scroll position out of step with the content.
                    <span
                      className="rf-text-caption rf-fg-muted"
                      style={{ marginLeft: 8 }}
                      title={matched}
                    >
                      · {matched}
                    </span>
                  )}
                </TableCell>
                {/*
                  Whether the relic can still be farmed. This was a breakdown of
                  the contents by rarity, which reads well until you notice every
                  relic in the game holds three commons, two uncommons and one
                  rare — a column identical on all 689 rows says nothing.
                */}
                <TableCell>
                  {unvaulted === undefined ? (
                    <Skeleton width={64} height={14} />
                  ) : unvaulted.has(row.relicFullName) ? (
                    <span className="rf-text-caption rf-success">Droppable</span>
                  ) : (
                    <span className="rf-text-caption rf-fg-muted">Vaulted</span>
                  )}
                </TableCell>
                <TableCell align="right" numeric>
                  {pricesPending && !prices ? (
                    <Skeleton width={44} height={14} />
                  ) : expected === 0 ? (
                    <Unlisted />
                  ) : (
                    <strong className="rf-gold">{expected.toFixed(1)}</strong>
                  )}
                </TableCell>
                <TableCell align="right" numeric>
                  {pricesPending && !prices ? (
                    <Skeleton width={44} height={14} />
                  ) : (
                    <PlatPrice value={best} />
                  )}
                </TableCell>
                <TableCell align="right" numeric>
                  {relicPrices === undefined ? (
                    <Skeleton width={44} height={14} />
                  ) : (
                    <PlatPrice value={cost} />
                  )}
                </TableCell>
                <TableCell align="center">
                  <QtyStepper
                    itemName={row.relicFullName}
                    qty={quantityOf(row.relicFullName, "relic", row.refinement)}
                    onIncrement={() => bump(seed, 1)}
                    onDecrement={() => bump(seed, -1)}
                    onRemove={() => remove(seed)}
                  />
                </TableCell>
                <TableCell align="center">
                  <Button
                    variant="ghost"
                    size="sm"
                    iconOnly
                    icon={<ExternalLinkIcon />}
                    aria-label={`Open ${row.relicFullName} on Warframe Market`}
                    onClick={(event) => {
                      event.stopPropagation();
                      window.open(
                        relicMarketUrl(row.relicFullName),
                        "_blank",
                        "noopener,noreferrer",
                      );
                    }}
                  />
                </TableCell>
              </TableRow>
            );
          })}

          {paddingBottom > 0 && (
            <tr aria-hidden="true">
              <td colSpan={8} className="rf-spacer" style={{ height: paddingBottom }} />
            </tr>
          )}
        </tbody>
      </Table>
    </div>
  );
}
