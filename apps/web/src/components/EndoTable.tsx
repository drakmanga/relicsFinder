import { useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  Button,
  Chip,
  EmptyState,
  ExternalLinkIcon,
  Skeleton,
  Table,
  TableCell,
  TableHeaderCell,
  TableRow,
} from "relic-finder-ui";

import { PlatGlyph, PlatPrice } from "./Plat";
import { QtyStepper } from "./QtyStepper";
import { Highlight, RankedPage } from "./RankedPage";
import { useEndoOffers } from "../api/queries";
import { bump, remove } from "../lib/wishlist";
import type { EndoOffer, WishlistKind } from "../api/types";

const ROW_HEIGHT = 48;
const OVERSCAN = 10;

interface Props {
  active: boolean;
  quantityOf: (itemName: string, kind: WishlistKind) => number;
}

/**
 * Ayatan sculptures ranked by Endo per platinum.
 *
 * A row is one seller's offer, not a sculpture. The same sculpture yields 2000
 * Endo empty and 3450 full, so "the price of an Anasa" is not a thing that
 * exists — what exists is this player, selling this one, at this price.
 */
export function EndoTable({ active, quantityOf }: Props) {
  const [onlyFull, setOnlyFull] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const offers = useEndoOffers(active);

  const rows = useMemo(() => {
    const all = offers.data ?? [];
    if (!onlyFull) return all;
    // A full sculpture is worth its top value without spending stars of your own.
    return all.filter((offer) => offer.endo === maxEndo(all, offer.itemName));
  }, [offers.data, onlyFull]);

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
    <label
      style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}
    >
      <input
        type="checkbox"
        checked={onlyFull}
        onChange={(event) => setOnlyFull(event.target.checked)}
        style={{ accentColor: "var(--rf-gold-500)" }}
      />
      <span className="rf-fg-secondary">Only sculptures already full</span>
    </label>
  );

  const footnote = (
    <p className="rf-text-caption rf-fg-muted">
      All eleven sculptures, Chattraka included. Loose Cyan and Amber stars are not ranked: they
      are bought to fill a sculpture, not to be dissolved.
    </p>
  );

  if (offers.isPending) {
    return (
      <RankedPage title="Endo" lead="Reading the open orders." controls={controls}>
        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 8 }}>
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} height={48} />
          ))}
        </div>
      </RankedPage>
    );
  }

  if (offers.isError) {
    return (
      <RankedPage title="Endo" lead="Ayatan sculptures ranked by Endo per platinum.">
        <EmptyState
          tone="error"
          title="Could not read the Ayatan market"
          description={String(offers.error)}
          actions={
            <Button variant="outline" size="sm" onClick={() => offers.refetch()}>
              Retry
            </Button>
          }
        />
      </RankedPage>
    );
  }

  return (
    <RankedPage
      title="Endo"
      lead="Ayatan sculptures ranked by Endo per platinum, from sellers who are in the game right now. Dissolve them at Maroo's on Mars."
      controls={controls}
      footnote={footnote}
      highlights={rows.slice(0, 3).map((offer, index) => (
        <Highlight
          key={`${offer.slug}-${offer.seller}-${index}`}
          rank={index + 1}
          title={shortName(offer.itemName)}
          subtitle={`${offer.seller} · ${offer.cyanStars}C / ${offer.amberStars}A`}
          figureLabel="Endo / plat"
          figure={
            <span className="rf-text-data-lg" style={{ color: "var(--rf-gold-300)" }}>
              {offer.ratio.toFixed(0)}
            </span>
          }
          meta={
            <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
              <PlatPrice value={offer.platinum} />
              <Chip>{offer.endo} endo</Chip>
            </span>
          }
        />
      ))}
    >
      <div
        ref={scrollRef}
        className="rf-virtual-scroll"
        style={{ height: "100%", overflow: "auto" }}
      >
        {rows.length === 0 ? (
          <EmptyState
            title="No offers right now"
            description="Nobody holding a sculpture is online. The list fills again within minutes."
          />
        ) : (
          <Table interactive={false} framed={false} density="comfortable">
            <thead>
              <tr>
                <TableHeaderCell align="right">#</TableHeaderCell>
                <TableHeaderCell>Sculpture</TableHeaderCell>
                <TableHeaderCell>Stars</TableHeaderCell>
                <TableHeaderCell align="right">Endo</TableHeaderCell>
                <TableHeaderCell align="right">
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                    Price <PlatGlyph size={12} />
                  </span>
                </TableHeaderCell>
                <TableHeaderCell align="right">Endo / plat</TableHeaderCell>
                <TableHeaderCell>Seller</TableHeaderCell>
                <TableHeaderCell align="center">Wishlist</TableHeaderCell>
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
                const offer = rows[virtualRow.index];
                if (!offer) return null;

                const seed = {
                  itemName: offer.itemName,
                  kind: "endo" as const,
                  tier: "lith" as const,
                  relicFullName: "",
                  refinement: "intact" as const,
                };

                return (
                  <TableRow key={`${offer.slug}-${offer.seller}-${virtualRow.index}`}>
                    <TableCell align="right" numeric>
                      <span className="rf-fg-muted">{virtualRow.index + 1}</span>
                    </TableCell>
                    <TableCell>{shortName(offer.itemName)}</TableCell>
                    <TableCell>
                      <span className="rf-text-caption rf-fg-secondary rf-tabular">
                        {offer.cyanStars}C / {offer.amberStars}A
                      </span>
                    </TableCell>
                    <TableCell align="right" numeric>
                      {offer.endo}
                    </TableCell>
                    <TableCell align="right" numeric>
                      <PlatPrice value={offer.platinum} />
                    </TableCell>
                    <TableCell align="right" numeric>
                      <strong style={{ color: "var(--rf-gold-300)" }}>
                        {offer.ratio.toFixed(0)}
                      </strong>
                    </TableCell>
                    <TableCell>
                      <span className="rf-text-caption rf-fg-muted">{offer.seller}</span>
                    </TableCell>
                    <TableCell align="center">
                      <QtyStepper
                        itemName={offer.itemName}
                        qty={quantityOf(offer.itemName, "endo")}
                        onIncrement={() => bump(seed, 1)}
                        onDecrement={() => bump(seed, -1)}
                        onRemove={() => remove(offer.itemName, "endo")}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Button
                        variant="ghost"
                        size="sm"
                        iconOnly
                        icon={<ExternalLinkIcon />}
                        aria-label={`Open ${offer.itemName} on Warframe Market`}
                        onClick={() =>
                          window.open(
                            `https://warframe.market/items/${offer.slug}`,
                            "_blank",
                            "noopener,noreferrer",
                          )
                        }
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
        )}
      </div>
    </RankedPage>
  );
}

/** "Ayatan Orta Sculpture" → "Orta": the rest is on every row. */
const shortName = (itemName: string) => itemName.replace(/^Ayatan\s+/, "").replace(/\s+Sculpture$/, "");

/** Highest Endo seen for a sculpture — its value with every socket filled. */
function maxEndo(offers: EndoOffer[], itemName: string): number {
  let max = 0;
  for (const offer of offers) {
    if (offer.itemName === itemName && offer.endo > max) max = offer.endo;
  }
  return max;
}
