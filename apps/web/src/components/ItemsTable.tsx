import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  Button,
  DucatGlyph,
  ExternalLinkIcon,
  InfoIcon,
  RarityTag,
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
import type { PriceMap } from "../api/types";
import type { PrimeItemRow } from "../lib/items";

const ROW_HEIGHT = 40;
const OVERSCAN = 12;

interface Props {
  rows: PrimeItemRow[];
  prices: PriceMap | undefined;
  quantityOf: (itemName: string) => number;
  onSelect: (itemName: string) => void;
  selected: string | null;
  onInfo: (itemName: string) => void;
}

/** One row per Prime part: set, rarity, which relics hold it, ducats and price. */
export function ItemsTable({
  rows,
  prices,
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

  const paddingTop = items.length > 0 ? (items[0]?.start ?? 0) : 0;
  const paddingBottom =
    items.length > 0 ? virtualizer.getTotalSize() - (items[items.length - 1]?.end ?? 0) : 0;

  return (
    <div ref={scrollRef} className="rf-virtual-scroll" style={{ height: "100%", overflow: "auto" }}>
      <Table interactive framed={false}>
        <thead>
          <tr>
            <TableHeaderCell>Item</TableHeaderCell>
            <TableHeaderCell>Set</TableHeaderCell>
            <TableHeaderCell>Rarity</TableHeaderCell>
            <TableHeaderCell>Relics</TableHeaderCell>
            <TableHeaderCell align="right">Best drop</TableHeaderCell>
            <TableHeaderCell align="right">
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                Ducats
                <DucatGlyph
                  style={{ width: 12, height: 12, color: "var(--rf-currency-ducat)" }}
                />
              </span>
            </TableHeaderCell>
            <TableHeaderCell align="right">
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
                <TableCell>{row.itemName}</TableCell>
                <TableCell>{row.setName ?? "—"}</TableCell>
                <TableCell>
                  <RarityTag rarity={row.rarity} />
                </TableCell>
                <TableCell>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    {row.tiers.slice(0, 3).map((tier) => (
                      <TierChip key={tier} tier={tier} />
                    ))}
                    <span className="rf-text-caption rf-fg-muted">
                      {row.relicNames.length}
                    </span>
                  </span>
                </TableCell>
                <TableCell align="right" numeric>
                  {row.bestChance.toFixed(2)}%
                </TableCell>
                <TableCell align="right" numeric>
                  {meta?.ducats == null ? (
                    <span className="rf-fg-disabled">—</span>
                  ) : (
                    <span style={{ color: "var(--rf-currency-ducat)" }}>{meta.ducats}</span>
                  )}
                </TableCell>
                <TableCell align="right" numeric>
                  <PlatPrice value={priceOf(prices, row.itemName)} />
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
