/**
 * Over 150 lines (rule 4). A table component is a column specification and a
 * row renderer, and the two are read together: the fourth `<col>` and the
 * fourth `<TableCell>` are the same decision. Splitting them would put the
 * halves of every column in two files.
 */
import { useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  Button,
  Checkbox,
  Chip,
  DucatGlyph,
  EmptyState,
  ExternalLinkIcon,
  InfoIcon,
  Table,
  TableCell,
  TableCols,
  TableHeaderCell,
  TableRow,
} from "relic-finder-ui";

import { PlatGlyph, PlatPrice } from "./Plat";
import { QtyStepper } from "./QtyStepper";
import { Highlight, HighlightPlaceholder, RankedPage } from "./RankedPage";
import { bump, remove } from "../lib/wishlist";
import { marketUrl } from "../lib/format";
import type { PriceMap, WishlistKind } from "../api/types";

const ROW_HEIGHT = 48;
const OVERSCAN = 10;

/**
 * Below this many trades in 48 hours a price is one lucky sale rather than a
 * market, and a ratio built on it would rank a purchase nobody can actually
 * make. Ducat farming turns on small margins, so the noise matters.
 */
const MIN_TRADES = 8;

interface Props {
  prices: PriceMap | undefined;
  onInfo: (itemName: string) => void;
  quantityOf: (itemName: string, kind: WishlistKind) => number;
}

interface Row {
  itemName: string;
  setName: string | null;
  price: number;
  ducats: number;
  /** Ducats obtained per platinum spent — what the view ranks on. */
  ratio: number;
  volume: number;
}

/**
 * Ducat efficiency: what to buy cheap and dissolve at Baro's.
 *
 * A 45-ducat part at 2p returns 22.5 ducats per platinum; the same part at 20p
 * returns 2.25 and is a waste of an evening.
 */
export function DucanetorTable({ prices, onInfo, quantityOf }: Props) {
  const [includeQuiet, setIncludeQuiet] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const rows = useMemo((): Row[] => {
    if (!prices) return [];

    const out: Row[] = [];

    for (const meta of prices.values()) {
      const { averagePrice: price, ducats } = meta;
      if (price === null || ducats === null || ducats === 0) continue;
      // A part listed at 0p would divide by zero and rank infinitely well.
      if (price <= 0) continue;

      const volume = meta.volume ?? 0;
      if (!includeQuiet && volume < MIN_TRADES) continue;

      out.push({
        itemName: meta.itemName,
        setName: meta.setName,
        price,
        ducats,
        ratio: Math.round((ducats / price) * 100) / 100,
        volume,
      });
    }

    return out.sort((a, b) => b.ratio - a.ratio);
  }, [prices, includeQuiet]);

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

  const controls = (
    <Checkbox checked={includeQuiet} onChange={(event) => setIncludeQuiet(event.target.checked)}>
      Include parts with under {MIN_TRADES} recent trades
    </Checkbox>
  );

  if (!prices) {
    return (
      <RankedPage
        title="Ducanetor"
        lead="Waiting for the market to be read."
        controls={controls}
        highlights={<HighlightPlaceholder />}
      >
        <EmptyState
          tone="initial"
          title="No prices yet"
          description="This view ranks on price, so it has nothing to rank until the cache fills."
        />
      </RankedPage>
    );
  }

  return (
    <RankedPage
      title="Ducanetor"
      lead="Prime parts ranked by ducats per platinum spent. Buy near the top, dissolve at Baro Ki'Teer."
      controls={controls}
      footnote={
        <p className="rf-text-caption rf-fg-muted">
          Ranked on trades completed in the last 48 hours. Parts nobody is trading are hidden by
          default — a ratio built on two sales points at something you cannot buy.
        </p>
      }
      highlights={rows.slice(0, 3).map((row, index) => (
        <Highlight
          key={row.itemName}
          rank={index + 1}
          title={row.itemName}
          subtitle={row.setName ?? undefined}
          figureLabel="Ducats / plat"
          figure={<span className="rf-text-data-lg rf-gold">{row.ratio.toFixed(1)}</span>}
          meta={
            <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
              <PlatPrice value={row.price} />
              <Chip>{row.ducats} ducats</Chip>
            </span>
          }
          onClick={() => onInfo(row.itemName)}
        />
      ))}
    >
      <div
        ref={scrollRef}
        className="rf-virtual-scroll"
        role="region"
        aria-label="Ducats per platinum table"
        tabIndex={0}
      >
        {rows.length === 0 ? (
          <EmptyState
            title="Nothing to rank"
            description="No part has both a price and a ducat value yet."
          />
        ) : (
          <Table
            stickyFirstColumn
            interactive
            framed={false}
            density="comfortable"
            caption="Prime parts ranked by ducats per platinum"
            className="rf-cols-ducats"
          >
            <TableCols count={10} />
            <thead>
              <tr>
                {/* Widths are mandatory under the table's fixed layout. */}
                <TableHeaderCell align="right">#</TableHeaderCell>
                <TableHeaderCell>Item</TableHeaderCell>
                <TableHeaderCell>Set</TableHeaderCell>
                <TableHeaderCell align="right">
                  <span className="rf-inline">
                    Price <PlatGlyph size={12} />
                  </span>
                </TableHeaderCell>
                <TableHeaderCell align="right">
                  <span className="rf-inline">
                    Ducats
                    <DucatGlyph className="rf-glyph-ducat" />
                  </span>
                </TableHeaderCell>
                <TableHeaderCell align="right">Ducats / plat</TableHeaderCell>
                <TableHeaderCell align="right">Trades</TableHeaderCell>
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

                const seed = {
                  itemName: row.itemName,
                  kind: "ducat" as const,
                  tier: "lith" as const,
                  relicFullName: "",
                  refinement: "intact" as const,
                };

                return (
                  <TableRow key={row.itemName} onClick={() => onInfo(row.itemName)}>
                    <TableCell align="right" numeric>
                      <span className="rf-fg-muted">{virtualRow.index + 1}</span>
                    </TableCell>
                    <TableCell>{row.itemName}</TableCell>
                    <TableCell>
                      <span className="rf-fg-secondary">{row.setName ?? "—"}</span>
                    </TableCell>
                    <TableCell align="right" numeric>
                      <PlatPrice value={row.price} />
                    </TableCell>
                    <TableCell align="right" numeric>
                      <span className="rf-ducat">{row.ducats}</span>
                    </TableCell>
                    <TableCell align="right" numeric>
                      <strong className="rf-gold">{row.ratio.toFixed(2)}</strong>
                    </TableCell>
                    <TableCell align="right" numeric>
                      <span className={row.volume < MIN_TRADES ? "rf-fg-muted" : "rf-fg-secondary"}>
                        {row.volume}
                      </span>
                    </TableCell>
                    <TableCell align="center">
                      <QtyStepper
                        itemName={row.itemName}
                        qty={quantityOf(row.itemName, "ducat")}
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
        )}
      </div>
    </RankedPage>
  );
}
