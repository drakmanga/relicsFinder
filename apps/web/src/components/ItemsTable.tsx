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
  DucatGlyph,
  ExternalLinkIcon,
  InfoIcon,
  RarityTag,
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
import { marketUrl, priceOf } from "../lib/format";
import { usePricePriority } from "../lib/usePricePriority";
import type { PriceMap, WishlistKind } from "../api/types";
import type { PrimeItemRow } from "../lib/items";

const ROW_HEIGHT = 40;
const OVERSCAN = 12;

interface Props {
  rows: PrimeItemRow[];
  prices: PriceMap | undefined;
  /** Whether more prices are still expected. See lib/priceProgress. */
  pricesFilling: boolean;
  quantityOf: (itemName: string) => number;
  onSelect: (itemName: string) => void;
  selected: string | null;
  onInfo: (itemName: string, kind?: WishlistKind) => void;
}

/** One row per Prime part: set, rarity, which relics hold it, ducats and price. */
export function ItemsTable({
  rows,
  prices,
  pricesFilling,
  quantityOf,
  onSelect,
  selected,
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

  // The rows on screen, told to the server so it prices those first.
  usePricePriority({
    items: items.map((item) => rows[item.index]?.itemName).filter((name): name is string => !!name),
  });

  const paddingTop = items.length > 0 ? (items[0]?.start ?? 0) : 0;
  const paddingBottom =
    items.length > 0 ? virtualizer.getTotalSize() - (items[items.length - 1]?.end ?? 0) : 0;

  return (
    <div
      ref={scrollRef}
      className="rf-virtual-scroll"
      role="region"
      aria-label="Prime items table"
      tabIndex={0}
    >
      <Table
        stickyFirstColumn
        interactive
        framed={false}
        caption="Prime parts, with the relics that drop them, ducats and price"
        className="rf-cols-items"
      >
        <TableCols count={10} />
        <thead>
          <tr>
            {/*
              Widths are mandatory under the table's fixed layout — without
              them the ten columns would each take a tenth, and a part name
              needs several times what an icon button does. They are in
              app.css, measured rather than guessed: under fixed layout an
              undersized column silently eats its own content instead of
              pushing the table wider, and what it eats first is whatever sits
              last in the cell.
            */}
            <TableHeaderCell>Item</TableHeaderCell>
            <TableHeaderCell>Set</TableHeaderCell>
            <TableHeaderCell>Rarity</TableHeaderCell>
            <TableHeaderCell>Relics</TableHeaderCell>
            <TableHeaderCell align="right">Best drop</TableHeaderCell>
            <TableHeaderCell align="right">
              <span className="rf-inline">
                Ducats
                <DucatGlyph className="rf-glyph-ducat" />
              </span>
            </TableHeaderCell>
            <TableHeaderCell align="right">
              <span className="rf-inline">
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
              <td colSpan={10} className="rf-spacer" style={{ height: paddingTop }} />
            </tr>
          )}

          {items.map((virtualRow) => {
            const row = rows[virtualRow.index];
            if (!row) return null;

            const meta = prices?.get(row.itemName);
            const firstRelic = row.relicNames[0];
            const firstTier = row.tiers[0];

            const seed = {
              itemName: row.itemName,
              kind: "part" as const,
              tier: firstTier ?? "lith",
              relicFullName: firstRelic ?? "",
              refinement: "intact" as const,
            };

            return (
              <TableRow
                key={row.itemName}
                selected={row.itemName === selected}
                onClick={() => onSelect(row.itemName)}
              >
                {/* Titled because the column truncates: the longest part names
                    run past any width this table can spare, and the full name
                    has to stay reachable without opening the panel. */}
                <TableCell title={row.itemName}>{row.itemName}</TableCell>
                <TableCell title={row.setName ?? undefined}>{row.setName ?? "—"}</TableCell>
                <TableCell>
                  <RarityTag rarity={row.rarity} />
                </TableCell>
                {/* Which tiers hold the part, and nothing else. There used to
                    be a count of relics beside the chips; it answered a
                    question nobody scanning this column was asking, and the
                    relics themselves are one click away in the panel. The
                    title still names them, which is what the count gestured at.
                    All four tiers are shown: a part that drops from every tier
                    used to lose one silently to a slice. */}
                <TableCell title={row.relicNames.join(", ")}>
                  <span className="rf-inline">
                    {row.tiers.map((tier) => (
                      <TierChip key={tier} tier={tier} />
                    ))}
                  </span>
                </TableCell>
                <TableCell align="right" numeric>
                  {row.bestChance.toFixed(2)}%
                </TableCell>
                <TableCell align="right" numeric>
                  {meta?.ducats == null ? (
                    <Unlisted />
                  ) : (
                    <span className="rf-ducat">{meta.ducats}</span>
                  )}
                </TableCell>
                {/* An em dash here is a claim that nobody sells the part.
                    While the batch is still filling it is only a claim that the
                    server has not got to it yet, and the two must not look the
                    same. */}
                <TableCell align="right" numeric>
                  {priceOf(prices, row.itemName) === null && pricesFilling ? (
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
                    onRemove={() => remove(seed)}
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
              <td colSpan={10} className="rf-spacer" style={{ height: paddingBottom }} />
            </tr>
          )}
        </tbody>
      </Table>
    </div>
  );
}
