import {
  Button,
  ExternalLinkIcon,
  Skeleton,
  Table,
  TableCell,
  TableCols,
  TableHeaderCell,
  TableRow,
  TierChip,
} from "relic-finder-ui";

import { PlatGlyph, PlatPrice } from "./Plat";
import { QtyStepper } from "./QtyStepper";
import { bump, remove, type WishlistEntry } from "../lib/wishlist";
import { relicMarketUrl } from "../lib/format";
import { REFINEMENT_LABEL } from "../lib/rows";
import type { RelicPriceMap } from "../api/types";

interface Props {
  entries: WishlistEntry[];
  /** What a relic itself sells for. Undefined while the batch is in flight. */
  relicPrices: RelicPriceMap | undefined;
  /** Whether more of them are still expected. See lib/priceProgress. */
  relicPricesFilling: boolean;
  /** Opens the relic in the Relics view, with its contents and drop sites. */
  onPick: (relicFullName: string) => void;
}

/**
 * Relics you mean to buy whole.
 *
 * Its own table, and its own kind of line, because a relic is priced from a
 * different list than a part — the market sells "Axi A1 Relic", which is not an
 * item name and never appears in the item price map — and because the state it
 * is wanted in is part of the question: an Intact and a Radiant Axi A1 are the
 * same purchase but not the same plan.
 */
export function RelicLineRows({ entries, relicPrices, relicPricesFilling, onPick }: Props) {
  return (
    <Table
      stickyFirstColumn
      interactive
      framed={false}
      caption="Wishlist: relics you mean to buy"
      className="rf-cols-wl-relics"
    >
      <TableCols count={6} />
      <thead>
        <tr>
          <TableHeaderCell>Relic</TableHeaderCell>
          <TableHeaderCell>Wanted at</TableHeaderCell>
          <TableHeaderCell align="right">
            <span className="rf-inline">
              Cost <PlatGlyph size={12} />
            </span>
          </TableHeaderCell>
          <TableHeaderCell align="right">
            <span className="rf-inline">
              Line total <PlatGlyph size={12} />
            </span>
          </TableHeaderCell>
          <TableHeaderCell align="center">Qty</TableHeaderCell>
          <TableHeaderCell align="center">Market</TableHeaderCell>
        </tr>
      </thead>

      <tbody>
        {entries.map((entry) => {
          const cost = relicPrices?.get(entry.itemName) ?? null;

          return (
            <TableRow
              key={`${entry.itemName}|${entry.refinement}`}
              onClick={() => onPick(entry.itemName)}
              title={`${entry.itemName} — click to see what is inside it`}
            >
              <TableCell>
                <span className="rf-inline">
                  <TierChip tier={entry.tier} refinement={entry.refinement} />
                  {entry.itemName}
                </span>
              </TableCell>
              <TableCell>
                <span className="rf-text-caption rf-fg-secondary">
                  {REFINEMENT_LABEL[entry.refinement]}
                </span>
              </TableCell>
              <TableCell align="right" numeric>
                {/* A price that has not arrived is not a price of nothing: the
                    batch is a server-side queue, so the wait is visible. */}
                {cost === null && relicPricesFilling ? (
                  <Skeleton width={44} height={14} />
                ) : (
                  <PlatPrice value={cost} />
                )}
              </TableCell>
              <TableCell align="right" numeric>
                <PlatPrice value={cost === null ? null : Math.round(cost * entry.qty)} />
              </TableCell>
              <TableCell align="center">
                <QtyStepper
                  itemName={entry.itemName}
                  qty={entry.qty}
                  onIncrement={() => bump(entry, 1)}
                  onDecrement={() => bump(entry, -1)}
                  onRemove={() => remove(entry)}
                />
              </TableCell>
              <TableCell align="center">
                <Button
                  variant="ghost"
                  size="sm"
                  iconOnly
                  icon={<ExternalLinkIcon />}
                  aria-label={`Open ${entry.itemName} on Warframe Market`}
                  onClick={(event) => {
                    event.stopPropagation();
                    window.open(relicMarketUrl(entry.itemName), "_blank", "noopener,noreferrer");
                  }}
                />
              </TableCell>
            </TableRow>
          );
        })}
      </tbody>
    </Table>
  );
}
