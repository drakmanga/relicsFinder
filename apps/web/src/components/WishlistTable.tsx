import { useState } from "react";
import { Chip, EmptyState, InfoIcon, TabPanel, Tabs } from "relic-finder-ui";

import { PlatPrice } from "./Plat";
import { DucatRows, EndoRows, PartRows } from "./WishlistRows";
import { listTotal, type WishlistEntry } from "../lib/wishlist";
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

      {/* The panel the section tabs point at: without it their `aria-controls`
          names an element that is not in the document. */}
      <TabPanel id={kind} value={kind} className="rf-virtual-scroll rf-virtual-scroll-flex">
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
      </TabPanel>
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
