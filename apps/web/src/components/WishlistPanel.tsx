import {
  Button,
  Chip,
  DetailPanel,
  Divider,
  ExternalLinkIcon,
  TierChip,
} from "relic-finder-ui";

import { PlatPrice } from "./Plat";
import { QtyStepper } from "./QtyStepper";
import { bump, listTotal, remove, type WishlistEntry } from "../lib/wishlist";
import { marketUrl, priceOf, relativeTime } from "../lib/format";
import type { PriceMap } from "../api/types";

interface Props {
  entries: WishlistEntry[];
  prices: PriceMap | undefined;
  pricesUpdatedAt: number;
}

/**
 * The wishlist, in the same 380px slot as the detail panel.
 *
 * They alternate rather than coexist — the design has one panel, and stacking
 * two would leave neither enough room for the item names.
 */
export function WishlistPanel({ entries, prices, pricesUpdatedAt }: Props) {
  const { total, unpriced } = listTotal(entries, prices);

  if (entries.length === 0) {
    return (
      <DetailPanel
        badges={<Chip>0 items</Chip>}
        title="Wishlist"
        meta="Add parts with the + button in the results table."
      />
    );
  }

  return (
    <DetailPanel
      badges={<Chip>{entries.reduce((n, e) => n + e.qty, 0)} items</Chip>}
      title="Wishlist"
      meta={pricesUpdatedAt > 0 ? `Prices updated ${relativeTime(pricesUpdatedAt)}` : undefined}
    >
      <Divider />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 1,
          background: "var(--rf-border-subtle)",
          border: "1px solid var(--rf-border-subtle)",
        }}
      >
        {entries.map((entry) => (
          <div
            key={entry.itemName}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 12px",
              background: "var(--rf-surface-2)",
            }}
          >
            <TierChip tier={entry.tier} refinement={entry.refinement} />

            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                title={entry.itemName}
                style={{
                  fontSize: 13,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {entry.itemName}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                <PlatPrice value={priceOf(prices, entry.itemName)} />
                <span className="rf-text-caption rf-fg-muted">from {entry.relicFullName}</span>
              </div>
            </div>

            <div style={{ flex: "none" }}>
              <QtyStepper
                itemName={entry.itemName}
                qty={entry.qty}
                onIncrement={() => bump(entry, 1)}
                onDecrement={() => bump(entry, -1)}
                onRemove={() => remove(entry.itemName)}
              />
            </div>
          </div>
        ))}
      </div>

      <Divider />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <p className="rf-text-overline rf-fg-muted" style={{ marginBottom: 4 }}>
            List total
          </p>
          <PlatPrice value={total} size="lg" />
        </div>

        {unpriced > 0 && (
          <p className="rf-text-caption rf-fg-muted" style={{ textAlign: "right", maxWidth: 150 }}>
            {unpriced} {unpriced === 1 ? "item is" : "items are"} not listed and count as nothing
          </p>
        )}
      </div>

      <div style={{ marginTop: 20 }}>
        <Button
          variant="primary"
          icon={<ExternalLinkIcon />}
          style={{ width: "100%" }}
          onClick={() => {
            // warframe.market has no multi-item URL, so each part opens on its
            // own. Capped so a long list cannot spawn thirty popups at once.
            entries
              .slice(0, 5)
              .forEach((entry) => window.open(marketUrl(entry.itemName), "_blank", "noopener,noreferrer"));
          }}
        >
          Open on Warframe Market
        </Button>

        {entries.length > 5 && (
          <p className="rf-text-caption rf-fg-muted" style={{ marginTop: 8 }}>
            Opens the first 5 of {entries.length} — the market has no multi-item page.
          </p>
        )}
      </div>
    </DetailPanel>
  );
}
