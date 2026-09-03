import {
  Button,
  ExternalLinkIcon,
  Skeleton,
  Table,
  TableCell,
  TableCols,
  TableHeaderCell,
  TableRow,
  Unlisted,
} from "relic-finder-ui";

import { PlatGlyph, PlatPrice } from "./Plat";
import { QtyStepper } from "./QtyStepper";
import { bump, remove, type WishlistEntry } from "../lib/wishlist";
import { marketUrl } from "../lib/format";
import type { PrimeSet } from "../lib/setCompletion";

interface Props {
  entries: WishlistEntry[];
  /** The catalogue's sets, for what each line still needs. Keyed by set name. */
  sets: Map<string, PrimeSet>;
  /** What each set sells for assembled, by set name. */
  setPrices: Map<string, { price: number | null; slug: string | null }>;
  /** Whether the assembled-set prices are still landing. See lib/priceProgress. */
  setPricesFilling: boolean;
  /** Opens the set's panel over this list. The view does not change. */
  onPick: (setName: string) => void;
}

/**
 * Sets you mean to finish.
 *
 * Its own kind of line, not four part lines: "I want Volt Prime" is one
 * decision, and filed as its pieces it became four rows that said nothing about
 * belonging together and a total that could not be read off the list.
 *
 * A row opens the set's panel over this list rather than jumping to the Sets
 * view: the reader is working through a list of plans, and being thrown into
 * another view to look at one of them means finding their way back afterwards.
 * Closing the panel leaves them on the line they clicked.
 *
 * A set line is priced by what is *missing* from it, so ticking a piece makes
 * the line cheaper and finishing the set makes it free. That is the number the
 * reader is actually planning against — the whole-set price is what someone
 * else's account would pay.
 */
export function WishlistSetRows({ entries, sets, setPrices, setPricesFilling, onPick }: Props) {
  return (
    <Table
      stickyFirstColumn
      interactive
      framed={false}
      caption="Prime sets you mean to finish"
      className="rf-cols-wl-sets"
    >
      <TableCols count={7} />
      <thead>
        <tr>
          <TableHeaderCell>Set</TableHeaderCell>
          <TableHeaderCell align="right">Progress</TableHeaderCell>
          <TableHeaderCell align="right">Missing</TableHeaderCell>
          <TableHeaderCell align="right">
            <span className="rf-inline">
              To finish <PlatGlyph size={12} />
            </span>
          </TableHeaderCell>
          <TableHeaderCell align="right">
            <span className="rf-inline">
              Whole set <PlatGlyph size={12} />
            </span>
          </TableHeaderCell>
          <TableHeaderCell align="center">Qty</TableHeaderCell>
          <TableHeaderCell align="center">Market</TableHeaderCell>
        </tr>
      </thead>

      <tbody>
        {entries.map((entry) => {
          const set = sets.get(entry.itemName) ?? null;
          const listing = setPrices.get(entry.itemName);
          // Copies, the same count the Sets table and the panel show.
          const missing = set ? set.neededCount - set.ownedCount : null;
          const done = missing === 0;

          return (
            <TableRow
              key={entry.itemName}
              onClick={() => onPick(entry.itemName)}
              title={`${entry.itemName} — see the pieces`}
            >
              <TableCell title={entry.itemName}>{entry.itemName}</TableCell>

              <TableCell align="right" numeric>
                {set ? (
                  <span className={done ? "rf-success" : undefined}>
                    {set.ownedCount}/{set.neededCount}
                  </span>
                ) : (
                  <Unlisted />
                )}
              </TableCell>

              <TableCell align="right" numeric>
                {missing === null ? <Unlisted /> : done ? "—" : missing}
              </TableCell>

              <TableCell align="right" numeric>
                {/* A finished set costs nothing to finish, which is a real
                    answer and not a missing one. */}
                {set === null ? (
                  <Unlisted />
                ) : done ? (
                  <span className="rf-success">Complete</span>
                ) : (
                  <span className="rf-inline-tight">
                    {/* missingCost already prices every missing copy, so a
                        line for two sets is twice a total that counts both
                        Blades rather than twice a total that counted one. */}
                    <PlatPrice value={Math.round(set.missingCost * entry.qty)} />
                    {set.costIncomplete && <span className="rf-fg-muted">+</span>}
                  </span>
                )}
              </TableCell>

              <TableCell align="right" numeric>
                {listing?.price == null && setPricesFilling ? (
                  <Skeleton width={44} height={14} />
                ) : (
                  <PlatPrice value={listing?.price ?? null} />
                )}
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
                  aria-label={`Open ${entry.itemName} Set on Warframe Market`}
                  onClick={(event) => {
                    event.stopPropagation();
                    // The assembled set is its own listing, and its slug came
                    // back with its price: Kavasa Prime is sold as
                    // "Kavasa Prime Kubrow Collar Set", which no rule applied to
                    // the set's name would have guessed.
                    window.open(
                      marketUrl(`${entry.itemName} Set`, listing?.slug),
                      "_blank",
                      "noopener,noreferrer",
                    );
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
