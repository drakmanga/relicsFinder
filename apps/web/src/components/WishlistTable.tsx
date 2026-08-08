import {
  Button,
  DucatGlyph,
  EmptyState,
  ExternalLinkIcon,
  InfoIcon,
  PriceDelta,
  Table,
  TableCell,
  TableHeaderCell,
  TableRow,
  TierChip,
} from "relic-finder-ui";

import { PlatGlyph, PlatPrice } from "./Plat";
import { QtyStepper } from "./QtyStepper";
import { bump, listTotal, remove, type WishlistEntry } from "../lib/wishlist";
import { marketUrl } from "../lib/format";
import type { PriceMap } from "../api/types";

interface Props {
  entries: WishlistEntry[];
  prices: PriceMap | undefined;
  onInfo: (itemName: string) => void;
}

/**
 * The wishlist as a full view.
 *
 * It was a side panel sharing 380px with the relic detail, which meant item
 * names were truncated to a dozen characters and there was no room for what the
 * list is actually for: totals, trend, and what each line is worth now against
 * what it usually costs.
 */
export function WishlistTable({ entries, prices, onInfo }: Props) {
  if (entries.length === 0) {
    return (
      <EmptyState
        tone="initial"
        title="Your wishlist is empty"
        description="Add parts with the + button in the Relics or Prime Items views."
      />
    );
  }

  const { total, unpriced } = listTotal(entries, prices);
  const ducatTotal = entries.reduce(
    (sum, entry) => sum + (prices?.get(entry.itemName)?.ducats ?? 0) * entry.qty,
    0,
  );

  return (
    <div style={{ height: "100%", overflow: "auto" }} className="rf-virtual-scroll">
      <Table interactive={false} framed={false}>
        <thead>
          <tr>
            <TableHeaderCell>Item</TableHeaderCell>
            <TableHeaderCell>Set</TableHeaderCell>
            <TableHeaderCell>From</TableHeaderCell>
            <TableHeaderCell align="right">Qty</TableHeaderCell>
            <TableHeaderCell align="right">
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                Ducats
                <DucatGlyph style={{ width: 12, height: 12, color: "var(--rf-currency-ducat)" }} />
              </span>
            </TableHeaderCell>
            <TableHeaderCell align="right">
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                Unit <PlatGlyph size={12} />
              </span>
            </TableHeaderCell>
            <TableHeaderCell align="right">vs 90d</TableHeaderCell>
            <TableHeaderCell align="right">
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                Line total <PlatGlyph size={12} />
              </span>
            </TableHeaderCell>
            <TableHeaderCell align="center">Qty</TableHeaderCell>
            <TableHeaderCell align="center">Info</TableHeaderCell>
            <TableHeaderCell align="center">Market</TableHeaderCell>
          </tr>
        </thead>

        <tbody>
          {entries.map((entry) => {
            const meta = prices?.get(entry.itemName);
            const unit = meta?.averagePrice ?? null;

            return (
              <TableRow key={entry.itemName}>
                <TableCell>{entry.itemName}</TableCell>
                <TableCell>{meta?.setName ?? "—"}</TableCell>
                <TableCell>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <TierChip tier={entry.tier} />
                    {entry.relicFullName}
                  </span>
                </TableCell>
                <TableCell align="right" numeric>
                  {entry.qty}
                </TableCell>
                <TableCell align="right" numeric>
                  {meta?.ducats == null ? (
                    <span className="rf-fg-disabled">—</span>
                  ) : (
                    <span style={{ color: "var(--rf-currency-ducat)" }}>
                      {meta.ducats * entry.qty}
                    </span>
                  )}
                </TableCell>
                <TableCell align="right" numeric>
                  <PlatPrice value={unit} />
                </TableCell>
                <TableCell align="right" numeric>
                  {meta?.trend == null ? (
                    <span className="rf-fg-disabled">—</span>
                  ) : (
                    <PriceDelta value={Math.round(meta.trend)} />
                  )}
                </TableCell>
                <TableCell align="right" numeric>
                  <PlatPrice value={unit === null ? null : Math.round(unit * entry.qty)} />
                </TableCell>
                <TableCell align="center">
                  <QtyStepper
                    itemName={entry.itemName}
                    qty={entry.qty}
                    onIncrement={() => bump(entry, 1)}
                    onDecrement={() => bump(entry, -1)}
                    onRemove={() => remove(entry.itemName)}
                  />
                </TableCell>
                <TableCell align="center">
                  <Button
                    variant="ghost"
                    size="sm"
                    iconOnly
                    icon={<InfoIcon />}
                    aria-label={`More about ${entry.itemName}`}
                    onClick={() => onInfo(entry.itemName)}
                  />
                </TableCell>
                <TableCell align="center">
                  <Button
                    variant="ghost"
                    size="sm"
                    iconOnly
                    icon={<ExternalLinkIcon />}
                    aria-label={`Open ${entry.itemName} on Warframe Market`}
                    onClick={() =>
                      window.open(marketUrl(entry.itemName), "_blank", "noopener,noreferrer")
                    }
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </tbody>
      </Table>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 32,
          padding: "16px 18px",
          borderTop: "1px solid var(--rf-border-default)",
          background: "var(--rf-surface-1)",
          position: "sticky",
          bottom: 0,
        }}
      >
        <div>
          <p className="rf-text-overline rf-fg-muted" style={{ marginBottom: 4 }}>
            List total
          </p>
          <PlatPrice value={total} size="lg" />
        </div>

        <div>
          <p className="rf-text-overline rf-fg-muted" style={{ marginBottom: 4 }}>
            Ducats
          </p>
          <span className="rf-text-data-lg" style={{ color: "var(--rf-currency-ducat)" }}>
            {ducatTotal}
          </span>
        </div>

        <div>
          <p className="rf-text-overline rf-fg-muted" style={{ marginBottom: 4 }}>
            Lines
          </p>
          <span className="rf-text-data-lg rf-fg-secondary">{entries.length}</span>
        </div>

        {unpriced > 0 && (
          <p className="rf-text-caption rf-fg-muted" style={{ maxWidth: 260 }}>
            {unpriced} {unpriced === 1 ? "line has" : "lines have"} no listing and count as
            nothing in the total.
          </p>
        )}

        {/*
          One button per line rather than one for the list: warframe.market has
          no multi-item page, so a single "open the list" button could only ever
          open one of them — which is what the old panel button did, silently.
        */}
        <p className="rf-text-caption rf-fg-muted" style={{ marginLeft: "auto", maxWidth: 220 }}>
          Warframe Market has no page for a whole list — open lines individually.
        </p>
      </div>
    </div>
  );
}
