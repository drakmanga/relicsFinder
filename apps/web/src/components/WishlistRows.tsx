/**
 * Over 150 lines (rule 4) and deliberately so: three row renderers that were
 * split out of WishlistTable together. Each is under a hundred lines; putting
 * them in three files would spread one idea — how a wishlist line is drawn —
 * across three, and they share the actions block below them.
 */
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
import { bump, remove, type WishlistEntry } from "../lib/wishlist";
import { marketUrl } from "../lib/format";
import type { EndoOffer, PriceMap, WishlistKind } from "../api/types";

/** One list's worth of entries, already filtered to its kind by the parent. */
interface RowsProps {
  entries: WishlistEntry[];
  prices: PriceMap | undefined;
  /** Whether more prices are still expected. See lib/priceProgress. */
  pricesFilling: boolean;
  /** Opens the line's dialog, on the same list the line belongs to. */
  onInfo: (itemName: string, kind?: WishlistKind) => void;
  /**
   * Opens the part in the view that is about parts.
   *
   * A wishlist line names something the user went and found somewhere else, and
   * the questions that follow — what else is in that set, which relics drop it,
   * what it has done over ninety days — are all answered there. Without this the
   * list was a dead end you could only read.
   */
  onPick: (itemName: string) => void;
}

/** Shared by the two priced sections: name, market and info all behave the same. */
function LineActions({
  entry,
  onInfo,
}: {
  entry: WishlistEntry;
  onInfo?: (itemName: string, kind?: WishlistKind) => void;
}) {
  return (
    <>
      <TableCell align="center">
        <QtyStepper
          itemName={entry.itemName}
          qty={entry.qty}
          onIncrement={() => bump(entry, 1)}
          onDecrement={() => bump(entry, -1)}
          onRemove={() => remove(entry)}
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
            onClick={(event) => {
              event.stopPropagation();
              onInfo(entry.itemName, entry.kind);
            }}
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
          onClick={(event) => {
            event.stopPropagation();
            window.open(marketUrl(entry.itemName), "_blank", "noopener,noreferrer");
          }}
        />
      </TableCell>
    </>
  );
}

export function PartRows({ entries, prices, pricesFilling, onInfo, onPick }: RowsProps) {
  return (
    <Table
      stickyFirstColumn
      interactive
      framed={false}
      caption="Wishlist: parts you are collecting"
      className="rf-cols-wl-parts"
    >
      <TableCols count={9} />
      <thead>
        <tr>
          {/* Proportional, so the columns share the slack instead of pooling it
              in whichever one happens to be widest. */}
          <TableHeaderCell>Item</TableHeaderCell>
          <TableHeaderCell>Set</TableHeaderCell>
          <TableHeaderCell>From</TableHeaderCell>
          <TableHeaderCell align="right">
            <span className="rf-inline">
              Unit <PlatGlyph size={12} />
            </span>
          </TableHeaderCell>
          <TableHeaderCell align="right">vs 90d</TableHeaderCell>
          <TableHeaderCell align="right">
            <span className="rf-inline">
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
            <TableRow
              key={entry.itemName}
              onClick={() => onPick(entry.itemName)}
              title={`${entry.itemName} — click to open it in Prime Items`}
            >
              <TableCell>{entry.itemName}</TableCell>
              <TableCell>{meta?.setName ?? "—"}</TableCell>
              <TableCell>
                <span className="rf-inline">
                  <TierChip tier={entry.tier} />
                  {entry.relicFullName}
                </span>
              </TableCell>
              {/* Waiting and unlisted are different answers and used to look
                  the same here. See lib/priceProgress. */}
              <TableCell align="right" numeric>
                {unit === null && pricesFilling ? (
                  <Skeleton width={44} height={14} />
                ) : (
                  <PlatPrice value={unit} />
                )}
              </TableCell>
              <TableCell align="right" numeric>
                {meta?.trend == null ? <Unlisted /> : <PriceDelta value={Math.round(meta.trend)} />}
              </TableCell>
              <TableCell align="right" numeric>
                {unit === null && pricesFilling ? (
                  <Skeleton width={44} height={14} />
                ) : (
                  <PlatPrice value={unit === null ? null : Math.round(unit * entry.qty)} />
                )}
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
export function DucatRows({ entries, prices, onInfo, onPick }: RowsProps) {
  return (
    <Table
      stickyFirstColumn
      interactive
      framed={false}
      caption="Wishlist: parts you are keeping for ducats"
      className="rf-cols-wl-ducats"
    >
      <TableCols count={9} />
      <thead>
        <tr>
          <TableHeaderCell>Item</TableHeaderCell>
          <TableHeaderCell>Set</TableHeaderCell>
          <TableHeaderCell align="right">
            <span className="rf-inline">
              Unit <PlatGlyph size={12} />
            </span>
          </TableHeaderCell>
          <TableHeaderCell align="right">
            <span className="rf-inline">
              Ducats
              <DucatGlyph className="rf-glyph-ducat" />
            </span>
          </TableHeaderCell>
          <TableHeaderCell align="right">Ducats / plat</TableHeaderCell>
          <TableHeaderCell align="right">
            <span className="rf-inline">
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
            <TableRow
              key={entry.itemName}
              onClick={() => onPick(entry.itemName)}
              title={`${entry.itemName} — click to open it in Prime Items`}
            >
              <TableCell>{entry.itemName}</TableCell>
              <TableCell>{meta?.setName ?? "—"}</TableCell>
              <TableCell align="right" numeric>
                <PlatPrice value={unit} />
              </TableCell>
              <TableCell align="right" numeric>
                {ducats === null ? (
                  <Unlisted />
                ) : (
                  <span className="rf-ducat">{ducats * entry.qty}</span>
                )}
              </TableCell>
              <TableCell align="right" numeric>
                {ratio === null ? (
                  <Unlisted />
                ) : (
                  <strong className="rf-gold">{ratio.toFixed(2)}</strong>
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
export function EndoRows({
  entries,
  offers,
  onPick,
}: {
  entries: WishlistEntry[];
  offers?: EndoOffer[];
  /** Sculptures have no panel of their own; the Endo ranking is where they
      are actually bought, so that is where a click goes. */
  onPick: () => void;
}) {
  return (
    <Table
      stickyFirstColumn
      interactive
      framed={false}
      caption="Wishlist: Ayatan sculptures"
      className="rf-cols-wl-endo"
    >
      <TableCols count={8} />
      <thead>
        <tr>
          <TableHeaderCell>Sculpture</TableHeaderCell>
          <TableHeaderCell align="right">
            <span className="rf-inline">
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
            <TableRow
              key={entry.itemName}
              onClick={onPick}
              title={`${entry.itemName} — click for the offers open right now`}
            >
              <TableCell>{entry.itemName}</TableCell>
              <TableCell align="right" numeric>
                {best ? <PlatPrice value={best.platinum} /> : <Unlisted />}
              </TableCell>
              <TableCell>
                <span className="rf-text-caption rf-fg-secondary rf-tabular">
                  {best ? `${best.cyanStars}C / ${best.amberStars}A` : "—"}
                </span>
              </TableCell>
              <TableCell align="right" numeric>
                {best ? best.endo : <Unlisted />}
              </TableCell>
              <TableCell align="right" numeric>
                {best ? <strong className="rf-gold">{best.ratio.toFixed(0)}</strong> : <Unlisted />}
              </TableCell>
              <TableCell>
                <span className="rf-text-caption rf-fg-muted">
                  {best?.seller ?? "nobody online"}
                </span>
              </TableCell>
              <LineActions entry={entry} />
            </TableRow>
          );
        })}
      </tbody>
    </Table>
  );
}
