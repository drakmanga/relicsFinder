/**
 * The three lists a wishlist is made of, and the bits they share.
 *
 * Split out of WishlistTable because a part you are collecting, a part you
 * are keeping for ducats and an Ayatan sculpture are judged on different
 * numbers — set completion, ducats per platinum, Endo per platinum — and each
 * list carries its own columns for them. They lived in one 517-line file only
 * because they arrived one at a time.
 */
import {
  Button,
  DucatGlyph,
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
import { bump, remove, type WishlistEntry } from "../lib/wishlist";
import { marketUrl } from "../lib/format";
import type { EndoOffer, PriceMap } from "../api/types";

/** One list's worth of entries, already filtered to its kind by the parent. */
interface RowsProps {
  entries: WishlistEntry[];
  prices: PriceMap | undefined;
  onInfo: (itemName: string) => void;
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

export function PartRows({ entries, prices, onInfo }: RowsProps) {
  return (
    <Table interactive={false} framed={false}>
      <thead>
        <tr>
          {/* Proportional, so the columns share the slack instead of pooling it
              in whichever one happens to be widest. */}
          <TableHeaderCell style={{ width: "26%" }}>Item</TableHeaderCell>
          <TableHeaderCell style={{ width: "15%" }}>Set</TableHeaderCell>
          <TableHeaderCell style={{ width: "15%" }}>From</TableHeaderCell>
          <TableHeaderCell align="right" style={{ width: "9%" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              Unit <PlatGlyph size={12} />
            </span>
          </TableHeaderCell>
          <TableHeaderCell align="right" style={{ width: "9%" }}>
            vs 90d
          </TableHeaderCell>
          <TableHeaderCell align="right" style={{ width: "10%" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              Line total <PlatGlyph size={12} />
            </span>
          </TableHeaderCell>
          <TableHeaderCell align="center" style={{ width: "9%" }}>
            Qty
          </TableHeaderCell>
          <TableHeaderCell align="center" style={{ width: "3%" }}>
            Info
          </TableHeaderCell>
          <TableHeaderCell align="center" style={{ width: "4%" }}>
            Market
          </TableHeaderCell>
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
export function DucatRows({ entries, prices, onInfo }: RowsProps) {
  return (
    <Table interactive={false} framed={false}>
      <thead>
        <tr>
          <TableHeaderCell style={{ width: "30%" }}>Item</TableHeaderCell>
          <TableHeaderCell style={{ width: "18%" }}>Set</TableHeaderCell>
          <TableHeaderCell align="right" style={{ width: "9%" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              Unit <PlatGlyph size={12} />
            </span>
          </TableHeaderCell>
          <TableHeaderCell align="right" style={{ width: "9%" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              Ducats
              <DucatGlyph style={{ width: 12, height: 12, color: "var(--rf-currency-ducat)" }} />
            </span>
          </TableHeaderCell>
          <TableHeaderCell align="right" style={{ width: "12%" }}>
            Ducats / plat
          </TableHeaderCell>
          <TableHeaderCell align="right" style={{ width: "10%" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              Line total <PlatGlyph size={12} />
            </span>
          </TableHeaderCell>
          <TableHeaderCell align="center" style={{ width: "9%" }}>
            Qty
          </TableHeaderCell>
          <TableHeaderCell align="center" style={{ width: "3%" }}>
            Info
          </TableHeaderCell>
          <TableHeaderCell align="center" style={{ width: "4%" }}>
            Market
          </TableHeaderCell>
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
export function EndoRows({ entries, offers }: { entries: WishlistEntry[]; offers?: EndoOffer[] }) {
  return (
    <Table interactive={false} framed={false}>
      <thead>
        <tr>
          <TableHeaderCell style={{ width: "28%" }}>Sculpture</TableHeaderCell>
          <TableHeaderCell align="right" style={{ width: "11%" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              Best now <PlatGlyph size={12} />
            </span>
          </TableHeaderCell>
          <TableHeaderCell style={{ width: "11%" }}>Stars</TableHeaderCell>
          <TableHeaderCell align="right" style={{ width: "10%" }}>
            Endo
          </TableHeaderCell>
          <TableHeaderCell align="right" style={{ width: "12%" }}>
            Endo / plat
          </TableHeaderCell>
          <TableHeaderCell style={{ width: "15%" }}>Seller</TableHeaderCell>
          <TableHeaderCell align="center" style={{ width: "9%" }}>
            Qty
          </TableHeaderCell>
          <TableHeaderCell align="center" style={{ width: "4%" }}>
            Market
          </TableHeaderCell>
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
