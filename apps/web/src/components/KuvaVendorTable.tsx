import { Chip, Table, TableCell, TableCols, TableHeaderCell, TableRow } from "relic-finder-ui";

import { KuvaAmount, KuvaCost } from "./KuvaAmount";
import { KuvaDone } from "./KuvaDone";
import { countdownLabel, weeklyKuva, type RotationStatus } from "../lib/kuva";
import type { KuvaVendor } from "../lib/kuvaSources";

interface Props {
  vendors: KuvaVendor[];
  rotation: RotationStatus;
  now: number;
  /** This week's purchases, by vendor id. See lib/kuvaBought. */
  bought: Record<string, number>;
  onBought: (vendor: KuvaVendor, count: number) => void;
}

/**
 * Every vendor that sells Kuva, one row per offer.
 *
 * Acrithis and Teshin each have two rows because each has two offers with
 * their own price and limit; folding them into one row would need a second
 * price column that every other vendor leaves empty.
 */
export function KuvaVendorTable({ vendors, rotation, now, bought, onBought }: Props) {
  return (
    // The wrapper is the sideways scroller below the table's minimum width
    // (§4.6, horizontal scroll with a sticky first column), so it is the one
    // that needs a name and a tab stop for keyboard scrolling.
    <div className="rf-kuva-scroll" role="region" aria-label="Kuva vendors table" tabIndex={0}>
      <Table
        stickyFirstColumn
        framed={false}
        density="comfortable"
        caption="Vendors that sell Kuva, biggest weekly total first"
        className="rf-cols-kuva-vendors"
      >
        <TableCols count={6} />
        <thead>
          <tr>
            <TableHeaderCell>Vendor</TableHeaderCell>
            <TableHeaderCell>Price</TableHeaderCell>
            <TableHeaderCell align="right">Kuva</TableHeaderCell>
            <TableHeaderCell align="right">Per week</TableHeaderCell>
            <TableHeaderCell align="right">Weekly total</TableHeaderCell>
            <TableHeaderCell align="center">Done</TableHeaderCell>
          </tr>
        </thead>
        <tbody>
          {vendors.map((vendor) => {
            const total = weeklyKuva(vendor);
            const count = bought[vendor.id] ?? 0;
            const available = !vendor.rotating || rotation.thisWeek;
            const done = vendor.weeklyLimit !== null && available && count >= vendor.weeklyLimit;
            return (
              // A finished offer recedes so the eye lands on what is left; the
              // checkbox or the "3/3" beside it says so in text as well.
              <TableRow key={vendor.id} className={done ? "rf-kuva-row-done" : undefined}>
                <TableCell>
                  <div className="rf-kuva-who">
                    <span>{vendor.npc}</span>
                    <span className="rf-text-caption rf-fg-muted">{vendor.where}</span>
                    {vendor.requirement && (
                      <span className="rf-text-caption rf-fg-secondary">
                        Needs {vendor.requirement}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <KuvaCost cost={vendor.cost} />
                </TableCell>
                <TableCell align="right" numeric>
                  <KuvaAmount kuva={vendor.kuva} />
                </TableCell>
                <TableCell align="right">
                  <WeeklyLimit vendor={vendor} rotation={rotation} now={now} />
                </TableCell>
                <TableCell align="right" numeric>
                  {total === null ? (
                    <span className="rf-fg-muted">—</span>
                  ) : vendor.rotating && !rotation.thisWeek ? (
                    // Not gold while it is out of the shop: the ceiling in the
                    // head leaves it out those weeks, and a gold figure here
                    // would be a total this week cannot reach.
                    <span className="rf-fg-secondary rf-tabular">
                      {total.toLocaleString("en-US")}
                    </span>
                  ) : (
                    <strong className="rf-gold rf-tabular">{total.toLocaleString("en-US")}</strong>
                  )}
                </TableCell>
                <TableCell align="center">
                  <KuvaDone
                    name={`${vendor.npc}'s ${vendor.kuva.toLocaleString("en-US")} Kuva`}
                    limit={vendor.weeklyLimit}
                    count={count}
                    available={available}
                    onSet={(next) => onBought(vendor, next)}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </tbody>
      </Table>
    </div>
  );
}

function WeeklyLimit({
  vendor,
  rotation,
  now,
}: Pick<Props, "rotation" | "now"> & { vendor: KuvaVendor }) {
  if (vendor.weeklyLimit === null) return <span className="rf-fg-secondary">No limit</span>;
  if (!vendor.rotating) return <span className="rf-tabular">{vendor.weeklyLimit}×</span>;

  // The rotating offer says when it is buyable rather than how often: the
  // limit of one is the less useful half of what a reader needs from this row.
  return (
    <span className="rf-kuva-rotation">
      <span className="rf-tabular">1×, every 8 weeks</span>
      {rotation.thisWeek ? (
        <Chip>In the shop · {countdownLabel(rotation.at - now)} left</Chip>
      ) : (
        <span className="rf-text-caption rf-fg-muted">
          Back in {rotation.weeksAway} {rotation.weeksAway === 1 ? "week" : "weeks"} ·{" "}
          {new Date(rotation.at).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            timeZone: "UTC",
          })}
        </span>
      )}
    </span>
  );
}
