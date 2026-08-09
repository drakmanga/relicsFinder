import { useState } from "react";
import {
  Button,
  Chip,
  DucatGlyph,
  EmptyState,
  ExternalLinkIcon,
  InfoIcon,
  PriceDelta,
  Table,
  Tabs,
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
type Kind = "part" | "ducat" | "endo";

/** What each list is for, in one line. The long version is behind the info icon. */
const KIND_NOTE: Record<Kind, { label: string; short: string; long: string }> = {
  part: {
    label: "Prime parts",
    short: "Pieces you are collecting, in the order you added them.",
    long: "Judged on price: what a piece costs today and how that compares with its ninety-day average. A piece wanted for a set and the same piece wanted for ducats are two separate lines, because they are read against different numbers.",
  },
  ducat: {
    label: "Ducat farm",
    short: "Bought to dissolve at Baro Ki'Teer, not to keep.",
    long: "Judged on ducats per platinum, the same figure the Ducanetor ranks on — a cheap piece worth many ducats beats an expensive one worth more.",
  },
  endo: {
    label: "Ayatan",
    short: "Bought to dissolve at Maroo's, for Endo.",
    long: "Sculptures carry no fixed price: two Anasas at the same platinum are not the same purchase, because one may hold four stars and the other none. What is shown is the best offer open right now, not what the line cost when it was added.",
  },
};

/**
 * The wishlist as a full view, one tab per kind of line.
 *
 * A piece wanted to finish a set and a piece wanted to dissolve for ducats are
 * bought the same way but read completely differently — one is judged on price,
 * the other on ducats per platinum, and a sculpture on neither. They used to sit
 * stacked on one page, three tables with three different sets of columns that
 * lined up with nothing, each under a paragraph of its own. Splitting them into
 * tabs lets every table have exactly the columns its question needs and puts
 * only one grid on screen at a time.
 */
export function WishlistTable({ entries, prices, onInfo, endoOffers }: Props) {
  const [kind, setKind] = useState<Kind>("part");
  const [noteOpen, setNoteOpen] = useState(false);

  const parts = entries.filter((entry) => entry.kind === "part");
  const ducats = entries.filter((entry) => entry.kind === "ducat");
  const endo = entries.filter((entry) => entry.kind === "endo");

  // Sculptures are deliberately excluded from the total: they have no catalogue
  // price, and counting them as unpriced would report a gap the tool chose to
  // leave.
  const { total, unpriced } = listTotal([...parts, ...ducats], prices);
  const ducatTotal = entries.reduce(
    (sum, entry) => sum + (prices?.get(entry.itemName)?.ducats ?? 0) * entry.qty,
    0,
  );

  if (entries.length === 0) {
    return (
      <EmptyState
        tone="initial"
        title="Your wishlist is empty"
        description="Add lines with the + button in the Relics, Prime Items, Ducanetor or Endo views."
      />
    );
  }

  const shown = kind === "part" ? parts : kind === "ducat" ? ducats : endo;
  const note = KIND_NOTE[kind];

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/*
        The totals lead rather than trail. They are the reason to open the view
        at all — "what is this list going to cost me" — and at the foot of three
        stacked tables they were below the fold on any list worth asking about.
      */}
      <div
        style={{
          flex: "none",
          display: "flex",
          alignItems: "center",
          gap: 32,
          padding: "14px 18px",
          background: "var(--rf-surface-1)",
          borderBottom: "1px solid var(--rf-border-default)",
        }}
      >
        <Total label="List total">
          <PlatPrice value={total} size="lg" />
        </Total>

        <Total label="Ducats">
          <span className="rf-text-data-lg" style={{ color: "var(--rf-currency-ducat)" }}>
            {ducatTotal}
          </span>
        </Total>

        <Total label="Lines">
          <span className="rf-text-data-lg rf-fg-secondary">{entries.length}</span>
        </Total>

        {unpriced > 0 && (
          <p className="rf-text-caption rf-fg-muted" style={{ maxWidth: 240 }}>
            {unpriced} {unpriced === 1 ? "line has" : "lines have"} no listing and{" "}
            {unpriced === 1 ? "counts" : "count"} as nothing in the total.
          </p>
        )}
      </div>

      <div
        style={{
          flex: "none",
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "0 18px",
          background: "var(--rf-surface-1)",
          borderBottom: "1px solid var(--rf-border-default)",
        }}
      >
        <Tabs
          label="Wishlist sections"
          value={kind}
          onChange={(id) => {
            setKind(id as Kind);
            setNoteOpen(false);
          }}
          items={[
            { id: "part", label: `${KIND_NOTE.part.label} · ${parts.length}` },
            { id: "ducat", label: `${KIND_NOTE.ducat.label} · ${ducats.length}` },
            { id: "endo", label: `${KIND_NOTE.endo.label} · ${endo.length}` },
          ]}
        />
      </div>

      <div
        style={{
          flex: "none",
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "10px 18px",
          background: "var(--rf-surface-1)",
          borderBottom: "1px solid var(--rf-border-subtle)",
        }}
      >
        <span className="rf-text-caption rf-fg-muted">{note.short}</span>
        <button
          type="button"
          onClick={() => setNoteOpen((was) => !was)}
          aria-expanded={noteOpen}
          aria-label={noteOpen ? "Hide the explanation" : `What ${note.label} is judged on`}
          style={{
            display: "inline-flex",
            padding: 0,
            border: 0,
            background: "none",
            cursor: "pointer",
            color: noteOpen ? "var(--rf-gold-500)" : "var(--rf-fg-muted)",
          }}
        >
          <InfoIcon width={13} height={13} />
        </button>
        {shown.length > 0 && (
          <Chip style={{ marginLeft: "auto" }}>
            {shown.length} {shown.length === 1 ? "line" : "lines"}
          </Chip>
        )}
      </div>

      {noteOpen && (
        <p
          className="rf-text-body-sm"
          style={{
            flex: "none",
            margin: 0,
            padding: "10px 18px",
            maxWidth: "80ch",
            color: "var(--rf-fg-secondary)",
            background: "var(--rf-surface-3)",
            borderBottom: "1px solid var(--rf-border-subtle)",
            borderLeft: "2px solid var(--rf-gold-500)",
          }}
        >
          {note.long}
        </p>
      )}

      <div style={{ flex: 1, minHeight: 0, overflow: "auto" }} className="rf-virtual-scroll">
        {shown.length === 0 ? (
          <EmptyState
            title={`Nothing under ${note.label}`}
            description="Lines added from the other views land here."
          />
        ) : kind === "part" ? (
          <PartRows entries={parts} prices={prices} onInfo={onInfo} />
        ) : kind === "ducat" ? (
          <DucatRows entries={ducats} prices={prices} onInfo={onInfo} />
        ) : (
          <EndoRows entries={endo} offers={endoOffers} />
        )}
      </div>
    </div>
  );
}

function Total({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="rf-text-overline rf-fg-muted" style={{ marginBottom: 4 }}>
        {label}
      </p>
      {children}
    </div>
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
function DucatRows({ entries, prices, onInfo }: Props) {
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
function EndoRows({ entries, offers }: { entries: WishlistEntry[]; offers?: EndoOffer[] }) {
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
