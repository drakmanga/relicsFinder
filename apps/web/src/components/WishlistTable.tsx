import type { ReactNode } from "react";
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
import type { EndoOffer, PriceMap } from "../api/types";

interface Props {
  entries: WishlistEntry[];
  prices: PriceMap | undefined;
  onInfo: (itemName: string) => void;
  /** Live Ayatan offers, so a saved sculpture still shows what it costs today. */
  endoOffers?: EndoOffer[];
}

/**
 * The wishlist as a full view, split by what each line is for.
 *
 * A part wanted to finish a set and a part wanted to dissolve for ducats are
 * bought the same way but read completely differently — one is judged on price,
 * the other on ducats per platinum. Mixing them in one table forces every row to
 * carry both sets of columns and answers neither question well.
 */
export function WishlistTable({ entries, prices, onInfo, endoOffers }: Props) {
  if (entries.length === 0) {
    return (
      <EmptyState
        tone="initial"
        title="Your wishlist is empty"
        description="Add lines with the + button in the Relics, Prime Items, Ducanetor or Endo views."
      />
    );
  }

  const parts = entries.filter((entry) => entry.kind === "part");
  const ducats = entries.filter((entry) => entry.kind === "ducat");
  const endo = entries.filter((entry) => entry.kind === "endo");

  // Sculptures are deliberately excluded: they have no catalogue price, and
  // counting them as unpriced would report a gap the tool chose to leave.
  const { total, unpriced } = listTotal([...parts, ...ducats], prices);
  const ducatTotal = entries.reduce(
    (sum, entry) => sum + (prices?.get(entry.itemName)?.ducats ?? 0) * entry.qty,
    0,
  );

  return (
    <div style={{ height: "100%", overflow: "auto" }} className="rf-virtual-scroll">
      {parts.length > 0 && (
        <Section
          title="Prime parts"
          note="Parts you are collecting. Ranked by nothing — this is the order you added them."
        >
          <PartRows entries={parts} prices={prices} onInfo={onInfo} />
        </Section>
      )}

      {ducats.length > 0 && (
        <Section title="Ducat farm" note="Bought to dissolve at Baro Ki'Teer, not to keep.">
          <DucatRows entries={ducats} prices={prices} onInfo={onInfo} />
        </Section>
      )}

      {endo.length > 0 && (
        <Section
          title="Ayatan sculptures"
          note="Bought to dissolve at Maroo's. Endo depends on the stars in the one you buy, so the line has no fixed value — what is shown is the best offer open right now."
        >
          <EndoRows entries={endo} offers={endoOffers} />
        </Section>
      )}

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
            {unpriced} {unpriced === 1 ? "line has" : "lines have"} no listing and{" "}
            {unpriced === 1 ? "counts" : "count"} as nothing in the total.
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

/** A titled block. Empty kinds are not rendered at all, so there is no header without rows. */
function Section({ title, note, children }: { title: string; note: string; children: ReactNode }) {
  return (
    <section>
      <div
        style={{
          padding: "14px 18px 10px",
          background: "var(--rf-surface-1)",
          borderBottom: "1px solid var(--rf-border-subtle)",
          position: "sticky",
          top: 0,
          zIndex: 2,
        }}
      >
        <h3 className="rf-text-overline" style={{ margin: 0, color: "var(--rf-gold-300)" }}>
          {title}
        </h3>
        <p className="rf-text-caption rf-fg-muted" style={{ margin: "4px 0 0", maxWidth: "72ch" }}>
          {note}
        </p>
      </div>
      {children}
    </section>
  );
}

/** Shared by the two priced sections: name, market and info all behave the same. */
function LineActions({
  entry,
  onInfo,
}: {
  entry: WishlistEntry;
  onInfo?: (itemName: string) => void;
}) {
  return (
    <>
      <TableCell align="center">
        <QtyStepper
          itemName={entry.itemName}
          qty={entry.qty}
          onIncrement={() => bump(entry, 1)}
          onDecrement={() => bump(entry, -1)}
          onRemove={() => remove(entry.itemName, entry.kind)}
        />
      </TableCell>
      {onInfo && (
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
      )}
      <TableCell align="center">
        <Button
          variant="ghost"
          size="sm"
          iconOnly
          icon={<ExternalLinkIcon />}
          aria-label={`Open ${entry.itemName} on Warframe Market`}
          onClick={() => window.open(marketUrl(entry.itemName), "_blank", "noopener,noreferrer")}
        />
      </TableCell>
    </>
  );
}

function PartRows({ entries, prices, onInfo }: Props) {
  return (
    <Table interactive={false} framed={false}>
      <thead>
        <tr>
          <TableHeaderCell>Item</TableHeaderCell>
          <TableHeaderCell>Set</TableHeaderCell>
          <TableHeaderCell>From</TableHeaderCell>
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
              <LineActions entry={entry} onInfo={onInfo} />
            </TableRow>
          );
        })}
      </tbody>
    </Table>
  );
}

/** Judged on ducats per platinum — the same columns the Ducanetor ranks on. */
function DucatRows({ entries, prices, onInfo }: Props) {
  return (
    <Table interactive={false} framed={false}>
      <thead>
        <tr>
          <TableHeaderCell>Item</TableHeaderCell>
          <TableHeaderCell>Set</TableHeaderCell>
          <TableHeaderCell align="right">
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              Unit <PlatGlyph size={12} />
            </span>
          </TableHeaderCell>
          <TableHeaderCell align="right">
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              Ducats
              <DucatGlyph style={{ width: 12, height: 12, color: "var(--rf-currency-ducat)" }} />
            </span>
          </TableHeaderCell>
          <TableHeaderCell align="right">Ducats / plat</TableHeaderCell>
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
          const ducats = meta?.ducats ?? null;
          const ratio = unit && unit > 0 && ducats ? ducats / unit : null;

          return (
            <TableRow key={entry.itemName}>
              <TableCell>{entry.itemName}</TableCell>
              <TableCell>{meta?.setName ?? "—"}</TableCell>
              <TableCell align="right" numeric>
                <PlatPrice value={unit} />
              </TableCell>
              <TableCell align="right" numeric>
                {ducats === null ? (
                  <span className="rf-fg-disabled">—</span>
                ) : (
                  <span style={{ color: "var(--rf-currency-ducat)" }}>{ducats * entry.qty}</span>
                )}
              </TableCell>
              <TableCell align="right" numeric>
                {ratio === null ? (
                  <span className="rf-fg-disabled">—</span>
                ) : (
                  <strong style={{ color: "var(--rf-gold-300)" }}>{ratio.toFixed(2)}</strong>
                )}
              </TableCell>
              <TableCell align="right" numeric>
                <PlatPrice value={unit === null ? null : Math.round(unit * entry.qty)} />
              </TableCell>
              <LineActions entry={entry} onInfo={onInfo} />
            </TableRow>
          );
        })}
      </tbody>
    </Table>
  );
}

/**
 * Sculptures carry no price column.
 *
 * Two Anasas at the same price are not the same purchase — one may hold four
 * stars and the other none. Showing a price here would be showing the price of
 * whichever offer happened to be on screen when the line was added, hours ago.
 */
function EndoRows({ entries, offers }: { entries: WishlistEntry[]; offers?: EndoOffer[] }) {
  return (
    <Table interactive={false} framed={false}>
      <thead>
        <tr>
          <TableHeaderCell>Sculpture</TableHeaderCell>
          <TableHeaderCell align="right">
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              Best now <PlatGlyph size={12} />
            </span>
          </TableHeaderCell>
          <TableHeaderCell>Stars</TableHeaderCell>
          <TableHeaderCell align="right">Endo</TableHeaderCell>
          <TableHeaderCell align="right">Endo / plat</TableHeaderCell>
          <TableHeaderCell>Seller</TableHeaderCell>
          <TableHeaderCell align="center">Qty</TableHeaderCell>
          <TableHeaderCell align="center">Market</TableHeaderCell>
        </tr>
      </thead>

      <tbody>
        {entries.map((entry) => {
          // The offer list is already ranked, so the first match is the best.
          const best = offers?.find((offer) => offer.itemName === entry.itemName);

          return (
            <TableRow key={entry.itemName}>
              <TableCell>{entry.itemName}</TableCell>
              <TableCell align="right" numeric>
                {best ? <PlatPrice value={best.platinum} /> : <span className="rf-fg-disabled">—</span>}
              </TableCell>
              <TableCell>
                <span className="rf-text-caption rf-fg-secondary rf-tabular">
                  {best ? `${best.cyanStars}C / ${best.amberStars}A` : "—"}
                </span>
              </TableCell>
              <TableCell align="right" numeric>
                {best ? best.endo : <span className="rf-fg-disabled">—</span>}
              </TableCell>
              <TableCell align="right" numeric>
                {best ? (
                  <strong style={{ color: "var(--rf-gold-300)" }}>{best.ratio.toFixed(0)}</strong>
                ) : (
                  <span className="rf-fg-disabled">—</span>
                )}
              </TableCell>
              <TableCell>
                <span className="rf-text-caption rf-fg-muted">{best?.seller ?? "nobody online"}</span>
              </TableCell>
              <LineActions entry={entry} />
            </TableRow>
          );
        })}
      </tbody>
    </Table>
  );
}
