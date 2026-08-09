import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  Button,
  ExternalLinkIcon,
  Skeleton,
  Table,
  TableCell,
  TableHeaderCell,
  TableRow,
  TierChip,
} from "relic-finder-ui";

import { PlatGlyph, PlatPrice } from "./Plat";
import { relicMarketUrl } from "../lib/format";
import { bestDropValue, expectedValue, rareChance } from "../lib/rows";
import type { PriceMap, RelicPriceMap, RelicRow } from "../api/types";
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
  /** Full names of the relics currently in rotation; undefined while loading. */
  unvaulted: Set<string> | undefined;
  selected: string | null;
  onSelect: (id: string) => void;
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
  unvaulted,
  selected,
  onSelect,
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

  const dir = (column: RelicSortColumn) => (sort.column === column ? sort.direction : null);

  // Spacers stand in for the rows that are not rendered, so the scrollbar
  // reflects the whole result set rather than the handful in the DOM.
  const paddingTop = items.length > 0 ? (items[0]?.start ?? 0) : 0;
  const paddingBottom =
    items.length > 0 ? virtualizer.getTotalSize() - (items[items.length - 1]?.end ?? 0) : 0;

  return (
    <div ref={scrollRef} className="rf-virtual-scroll" style={{ height: "100%", overflow: "auto" }}>
      <Table interactive framed={false}>
        <thead>
          <tr>
            <TableHeaderCell>Tier</TableHeaderCell>
            <TableHeaderCell sortable sortDirection={dir("relic")} onSort={() => onSort("relic")}>
              Relic
            </TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            {/*
              The rare's chance, which is the one number refinement moves: 2% at
              Intact against 10% Radiant on most relics. Without it the
              refinement control looked inert, because everything else on the row
              either stays put or shifts by a fraction of a platinum.
            */}
            <TableHeaderCell
              align="right"
              title="Chance of the rare drop at the selected refinement"
            >
              Rare
            </TableHeaderCell>
            {/*
              Expected value first, because it is the number the decision turns
              on. Best drop stays beside it — it answers a different question,
              "what is the jackpot", and the two disagree almost always.
            */}
            <TableHeaderCell
              align="right"
              sortable
              sortDirection={dir("expected")}
              onSort={() => onSort("expected")}
              title="Average payout of one run: every drop weighted by its chance"
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
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
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
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
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                Cost <PlatGlyph size={12} />
              </span>
            </TableHeaderCell>
            {/*
              No ducat column here. Ducats are what a *part* dissolves into, and
              a relic cannot be dissolved — so the sum of its six drops is a
              number nobody can ever collect. It lives on Prime Items, where it
              is a real trade, and per drop inside the relic panel.
            */}
            <TableHeaderCell align="center">Market</TableHeaderCell>
          </tr>
        </thead>

        <tbody>
          {paddingTop > 0 && (
            <tr aria-hidden="true">
              <td colSpan={8} style={{ height: paddingTop, padding: 0, border: 0 }} />
            </tr>
          )}

          {items.map((virtualRow) => {
            const row = rows[virtualRow.index];
            if (!row) return null;

            const best = bestDropValue(row, prices);
            const expected = expectedValue(row.rewards, prices);
            const rare = rareChance(row);
            const cost = relicPrices?.get(row.relicFullName) ?? null;

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
                <TableCell>{row.relicFullName}</TableCell>
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
                    <span className="rf-text-caption" style={{ color: "var(--rf-success)" }}>
                      Farmable
                    </span>
                  ) : (
                    <span className="rf-text-caption rf-fg-muted">Vaulted</span>
                  )}
                </TableCell>
                <TableCell align="right" numeric>
                  {rare === null ? (
                    <span className="rf-fg-disabled">—</span>
                  ) : (
                    <span className="rf-fg-secondary">{rare}%</span>
                  )}
                </TableCell>
                <TableCell align="right" numeric>
                  {pricesPending && !prices ? (
                    <Skeleton width={44} height={14} />
                  ) : expected === 0 ? (
                    <span className="rf-fg-disabled">—</span>
                  ) : (
                    <strong style={{ color: "var(--rf-gold-300)" }}>
                      {expected.toFixed(1)}
                    </strong>
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
              <td colSpan={8} style={{ height: paddingBottom, padding: 0, border: 0 }} />
            </tr>
          )}
        </tbody>
      </Table>
    </div>
  );
}
