import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  Button,
  DucatGlyph,
  ExternalLinkIcon,
  InfoIcon,
  RarityTag,
  Skeleton,
  Table,
  TableCell,
  TableHeaderCell,
  TableRow,
  TierChip,
} from "relic-finder-ui";

import { PlatGlyph, PlatPrice } from "./Plat";
import { QtyStepper } from "./QtyStepper";
import { bump, remove } from "../lib/wishlist";
import { marketUrl, priceOf } from "../lib/format";
import type { PriceMap, RelicItemRow } from "../api/types";
import type { SortColumn, SortDirection } from "../lib/rows";

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
  rows: RelicItemRow[];
  prices: PriceMap | undefined;
  pricesPending: boolean;
  selected: string | null;
  onSelect: (id: string, mode: "relic" | "item") => void;
  sort: { column: SortColumn; direction: SortDirection };
  onSort: (column: SortColumn) => void;
  quantityOf: (itemName: string) => number;
  onInfo: (itemName: string) => void;
}

export function ResultsTable({
  rows,
  prices,
  pricesPending,
  selected,
  onSelect,
  sort,
  onSort,
  quantityOf,
  onInfo,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: OVERSCAN,
  });

  const items = virtualizer.getVirtualItems();


  const dir = (column: SortColumn) => (sort.column === column ? sort.direction : null);

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
            <TableHeaderCell>Relic</TableHeaderCell>
            <TableHeaderCell>Item</TableHeaderCell>
            <TableHeaderCell>Rarity</TableHeaderCell>
            <TableHeaderCell
              align="right"
              sortable
              sortDirection={dir("chance")}
              onSort={() => onSort("chance")}
            >
              Drop %
            </TableHeaderCell>
            <TableHeaderCell align="right">
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                Ducats
                <DucatGlyph style={{ width: 12, height: 12, color: "var(--rf-currency-ducat)" }} />
              </span>
            </TableHeaderCell>
            <TableHeaderCell
              align="right"
              sortable
              sortDirection={dir("price")}
              onSort={() => onSort("price")}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                Price <PlatGlyph size={12} />
              </span>
            </TableHeaderCell>
            <TableHeaderCell align="center">Wishlist</TableHeaderCell>
            <TableHeaderCell align="center">Info</TableHeaderCell>
            <TableHeaderCell align="center">Market</TableHeaderCell>
          </tr>
        </thead>

        <tbody>
          {paddingTop > 0 && (
            <tr aria-hidden="true">
              <td colSpan={10} style={{ height: paddingTop, padding: 0, border: 0 }} />
            </tr>
          )}

          {items.map((virtualRow) => {
            const row = rows[virtualRow.index];
            if (!row) return null;

            const seed = {
              itemName: row.itemName,
              kind: "part" as const,
              tier: row.tier,
              relicFullName: row.relicFullName,
              refinement: row.refinement,
            };

            return (
              <TableRow
                key={row.id}
                selected={row.id === selected}
                onClick={() => onSelect(row.id, "relic")}
              >
                <TableCell>
                  <TierChip tier={row.tier} refinement={row.refinement} />
                </TableCell>
                <TableCell>{row.relicFullName}</TableCell>
                <TableCell
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelect(row.id, "item");
                  }}
                  style={{ cursor: "pointer" }}
                  title={`What drops ${row.itemName}`}
                >
                  {row.itemName}
                </TableCell>
                <TableCell>
                  <RarityTag rarity={row.rarity} />
                </TableCell>
                <TableCell align="right" numeric>
                  {row.chance.toFixed(2)}%
                </TableCell>
                <TableCell align="right" numeric>
                  {prices?.get(row.itemName)?.ducats == null ? (
                    <span className="rf-fg-disabled">—</span>
                  ) : (
                    <span style={{ color: "var(--rf-currency-ducat)" }}>
                      {prices.get(row.itemName)!.ducats}
                    </span>
                  )}
                </TableCell>
                <TableCell align="right" numeric>
                  {pricesPending && !prices ? (
                    <Skeleton width={44} height={14} />
                  ) : (
                    <PlatPrice value={priceOf(prices, row.itemName)} />
                  )}
                </TableCell>
                <TableCell align="center">
                  <QtyStepper
                    itemName={row.itemName}
                    qty={quantityOf(row.itemName)}
                    onIncrement={() => bump(seed, 1)}
                    onDecrement={() => bump(seed, -1)}
                    onRemove={() => remove(row.itemName)}
                  />
                </TableCell>
                <TableCell align="center">
                  <Button
                    variant="ghost"
                    size="sm"
                    iconOnly
                    icon={<InfoIcon />}
                    aria-label={`More about ${row.itemName}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      onInfo(row.itemName);
                    }}
                  />
                </TableCell>
                <TableCell align="center">
                  <Button
                    variant="ghost"
                    size="sm"
                    iconOnly
                    icon={<ExternalLinkIcon />}
                    aria-label={`Open ${row.itemName} on Warframe Market`}
                    onClick={(event) => {
                      event.stopPropagation();
                      window.open(marketUrl(row.itemName), "_blank", "noopener,noreferrer");
                    }}
                  />
                </TableCell>
              </TableRow>
            );
          })}

          {paddingBottom > 0 && (
            <tr aria-hidden="true">
              <td colSpan={10} style={{ height: paddingBottom, padding: 0, border: 0 }} />
            </tr>
          )}
        </tbody>
      </Table>
    </div>
  );
}
