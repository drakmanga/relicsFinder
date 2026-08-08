import { useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  Button,
  DucatGlyph,
  EmptyState,
  ExternalLinkIcon,
  InfoIcon,
  Table,
  TableCell,
  TableHeaderCell,
  TableRow,
} from "relic-finder-ui";

import { PlatGlyph, PlatPrice } from "./Plat";
import { marketUrl } from "../lib/format";
import type { PriceMap } from "../api/types";

const ROW_HEIGHT = 40;
const OVERSCAN = 12;

/**
 * Below this, a price is one lucky trade rather than a market, and the ratio
 * built on it is noise. Ducat farming turns on small margins, so a bad price
 * ranked first would send someone to buy something nobody is selling.
 */
const MIN_TRADES = 8;

interface Props {
  prices: PriceMap | undefined;
  onInfo: (itemName: string) => void;
}

interface Row {
  itemName: string;
  setName: string | null;
  price: number;
  ducats: number;
  /** Ducats obtained per platinum spent — the whole point of the view. */
  ratio: number;
  volume: number;
}

/**
 * Ducat efficiency: what to buy cheap and dissolve at Baro's.
 *
 * Ranks parts by ducats per platinum. A 45-ducat part at 2p returns 22.5 ducats
 * per platinum; the same part at 20p returns 2.25, and buying it is a loss of
 * time. The ratio only means anything against a real price, so thinly traded
 * parts are held back rather than allowed to top the table.
 */
export function DucanetorTable({ prices, onInfo }: Props) {
  const [includeThin, setIncludeThin] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const rows = useMemo((): Row[] => {
    if (!prices) return [];

    const out: Row[] = [];

    for (const meta of prices.values()) {
      const { averagePrice: price, ducats } = meta;
      if (price === null || ducats === null || ducats === 0) continue;
      // A part given away at 0p would divide by zero and rank infinitely well.
      if (price <= 0) continue;

      const volume = meta.volume ?? 0;
      if (!includeThin && volume < MIN_TRADES) continue;

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
  }, [prices, includeThin]);

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

  if (!prices) {
    return (
      <EmptyState
        tone="initial"
        title="Waiting for prices"
        description="The server is still reading the market. This view needs prices to rank anything."
      />
    );
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div
        style={{
          flex: "none",
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "10px 18px",
          background: "var(--rf-surface-1)",
          borderBottom: "1px solid var(--rf-border-default)",
        }}
      >
        <p className="rf-text-body-sm rf-fg-secondary" style={{ flex: 1 }}>
          Ducats per platinum spent. Buy at the top, dissolve at Baro.
        </p>

        <label
          style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}
        >
          <input
            type="checkbox"
            checked={includeThin}
            onChange={(event) => setIncludeThin(event.target.checked)}
            style={{ accentColor: "var(--rf-gold-500)" }}
          />
          <span className="rf-fg-secondary">
            Include thin markets (under {MIN_TRADES} trades)
          </span>
        </label>
      </div>

      <div ref={scrollRef} className="rf-virtual-scroll" style={{ flex: 1, overflow: "auto" }}>
        <Table interactive framed={false}>
          <thead>
            <tr>
              <TableHeaderCell align="right">#</TableHeaderCell>
              <TableHeaderCell>Item</TableHeaderCell>
              <TableHeaderCell>Set</TableHeaderCell>
              <TableHeaderCell align="right">
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                  Price <PlatGlyph size={12} />
                </span>
              </TableHeaderCell>
              <TableHeaderCell align="right">
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                  Ducats
                  <DucatGlyph style={{ width: 12, height: 12, color: "var(--rf-currency-ducat)" }} />
                </span>
              </TableHeaderCell>
              <TableHeaderCell align="right">Ducats / plat</TableHeaderCell>
              <TableHeaderCell align="right">Trades</TableHeaderCell>
              <TableHeaderCell align="center">Info</TableHeaderCell>
              <TableHeaderCell align="center">Market</TableHeaderCell>
            </tr>
          </thead>

          <tbody>
            {paddingTop > 0 && (
              <tr aria-hidden="true">
                <td colSpan={9} style={{ height: paddingTop, padding: 0, border: 0 }} />
              </tr>
            )}

            {items.map((virtualRow) => {
              const row = rows[virtualRow.index];
              if (!row) return null;

              return (
                <TableRow key={row.itemName} onClick={() => onInfo(row.itemName)}>
                  <TableCell align="right" numeric>
                    <span className="rf-fg-muted">{virtualRow.index + 1}</span>
                  </TableCell>
                  <TableCell>{row.itemName}</TableCell>
                  <TableCell>{row.setName ?? "—"}</TableCell>
                  <TableCell align="right" numeric>
                    <PlatPrice value={row.price} />
                  </TableCell>
                  <TableCell align="right" numeric>
                    <span style={{ color: "var(--rf-currency-ducat)" }}>{row.ducats}</span>
                  </TableCell>
                  <TableCell align="right" numeric>
                    <strong style={{ color: "var(--rf-gold-300)" }}>{row.ratio.toFixed(2)}</strong>
                  </TableCell>
                  <TableCell align="right" numeric>
                    <span className={row.volume < MIN_TRADES ? "rf-fg-disabled" : "rf-fg-muted"}>
                      {row.volume}
                    </span>
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
                <td colSpan={9} style={{ height: paddingBottom, padding: 0, border: 0 }} />
              </tr>
            )}
          </tbody>
        </Table>
      </div>
    </div>
  );
}
