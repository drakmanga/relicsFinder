import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  Button,
  DucatGlyph,
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
import { bestDropValue, ducatTotal } from "../lib/rows";
import type { PriceMap, RelicRow } from "../api/types";
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
            <TableHeaderCell
              align="right"
              sortable
              sortDirection={dir("value")}
              onSort={() => onSort("value")}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                Best drop <PlatGlyph size={12} />
              </span>
            </TableHeaderCell>
            <TableHeaderCell
              align="right"
              sortable
              sortDirection={dir("ducats")}
              onSort={() => onSort("ducats")}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                Ducats
                <DucatGlyph style={{ width: 12, height: 12, color: "var(--rf-currency-ducat)" }} />
              </span>
            </TableHeaderCell>
            <TableHeaderCell align="center">Market</TableHeaderCell>
          </tr>
        </thead>

        <tbody>
          {paddingTop > 0 && (
            <tr aria-hidden="true">
              <td colSpan={6} style={{ height: paddingTop, padding: 0, border: 0 }} />
            </tr>
          )}

          {items.map((virtualRow) => {
            const row = rows[virtualRow.index];
            if (!row) return null;

            const best = bestDropValue(row, prices);
            const ducats = ducatTotal(row, prices);

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
                  {pricesPending && !prices ? (
                    <Skeleton width={44} height={14} />
                  ) : (
                    <PlatPrice value={best} />
                  )}
                </TableCell>
                <TableCell align="right" numeric>
                  {ducats === 0 ? (
                    <span className="rf-fg-disabled">—</span>
                  ) : (
                    <span style={{ color: "var(--rf-currency-ducat)" }}>{ducats}</span>
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
              <td colSpan={6} style={{ height: paddingBottom, padding: 0, border: 0 }} />
            </tr>
          )}
        </tbody>
      </Table>
    </div>
  );
}
