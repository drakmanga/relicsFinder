/**
 * Over 150 lines (rule 4). The rows came out into WishlistRows; what is left is
 * the section tabs, the totals and the note behind the info icon.
 */
import { useState } from "react";
import { Chip, EmptyState, InfoIcon, TabPanel, Tabs } from "relic-finder-ui";

import { PlatPrice } from "./Plat";
import { DucatRows, EndoRows, PartRows } from "./WishlistRows";
import { RelicLineRows } from "./WishlistRelicRows";
import { WishlistSetRows } from "./WishlistSetRows";
import { listTotal, relicListTotal, setListTotal, type WishlistEntry } from "../lib/wishlist";
import type { PrimeSet } from "../lib/setCompletion";
import type { EndoOffer, PriceMap, RelicPriceMap, WishlistKind } from "../api/types";

interface Props {
  entries: WishlistEntry[];
  prices: PriceMap | undefined;
  /** Whether more part prices are still expected. See lib/priceProgress. */
  pricesFilling: boolean;
  /** What a relic sells for; the item price map does not carry relics. */
  relicPrices: RelicPriceMap | undefined;
  /** Whether the relic batch is still landing. */
  relicPricesFilling: boolean;
  onInfo: (itemName: string, kind?: WishlistKind) => void;
  /** Opens a part in Prime Items, a relic in Relics. A line is a way back to
      the thing it names, not just a row of numbers about it. */
  onPickItem: (itemName: string) => void;
  onPickRelic: (relicFullName: string) => void;
  /** Sculptures have no panel; their click goes to the Endo ranking. */
  onShowEndo: () => void;
  /**
   * The catalogue's sets, keyed by name.
   *
   * A set line stores a name and a quantity; how far along it is and what is
   * left to buy are read from the catalogue, so the line stays true as pieces
   * are ticked rather than freezing the numbers it was added with.
   */
  sets: Map<string, PrimeSet>;
  /** What each set sells for assembled, by set name. */
  setPrices: Map<string, { price: number | null; slug: string | null }>;
  /** Whether the assembled-set prices are still landing. */
  setPricesFilling: boolean;
  /** Opens a set line's panel over the wishlist. */
  onPickSet: (setName: string) => void;
  /**
   * Which section is open.
   *
   * Lifted out of the table because the wishlist is now something other views
   * send the reader to: a stepper in a relic panel adds a relic, and landing on
   * Parts with the line you just added filed under the next tab along is the
   * app pointing at the wrong thing.
   */
  section: Kind;
  onSection: (section: Kind) => void;
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
type Kind = "part" | "set" | "relic" | "ducat" | "endo";

/** What each list is for, in one line. The long version is behind the info icon. */
const KIND_NOTE: Record<Kind, { label: string; short: string; long: string }> = {
  part: {
    label: "Prime parts",
    short: "Pieces you are collecting, in the order you added them.",
    long: "Judged on price: what a piece costs today and how that compares with its ninety-day average. A piece wanted for a set and the same piece wanted for ducats are two separate lines, because they are read against different numbers.",
  },
  set: {
    label: "Sets",
    short: "Whole sets you mean to finish, priced by what is still missing.",
    long: 'A set line is one decision — "I want Volt Prime" — rather than four part lines that say nothing about belonging together. It is priced by the pieces still missing from it, so ticking one off makes the line cheaper and finishing the set makes it free. Buying the assembled set from another player is a different purchase, and the market link goes to that.',
  },
  relic: {
    label: "Relics",
    short: "Relics you mean to buy whole and crack yourself.",
    long: "Priced from the relic market rather than the item one: what is being bought is the sealed relic, not any one of the six things inside it. The state beside each line is the one it was added in — refining is a decision about the same relic, not a different purchase.",
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
export function WishlistTable({
  entries,
  prices,
  pricesFilling,
  relicPrices,
  relicPricesFilling,
  onInfo,
  onPickItem,
  onPickRelic,
  onShowEndo,
  sets,
  setPrices,
  setPricesFilling,
  onPickSet,
  endoOffers,
  section: kind,
  onSection: setKind,
}: Props) {
  const [noteOpen, setNoteOpen] = useState(false);

  const parts = entries.filter((entry) => entry.kind === "part");
  const setLines = entries.filter((entry) => entry.kind === "set");
  const relics = entries.filter((entry) => entry.kind === "relic");
  const ducats = entries.filter((entry) => entry.kind === "ducat");
  const endo = entries.filter((entry) => entry.kind === "endo");

  // Sculptures are deliberately excluded from the total: they have no catalogue
  // price, and counting them as unpriced would report a gap the tool chose to
  // leave.
  const items = listTotal([...parts, ...ducats], prices);
  const sealed = relicListTotal(relics, relicPrices);
  // A set counts for what is left of it, so the total falls as pieces are
  // ticked rather than only when a line is deleted.
  const plans = setListTotal(setLines, sets);
  const total = items.total + sealed.total + plans.total;
  const unpriced = items.unpriced + sealed.unpriced + plans.unpriced;
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

  const shown =
    kind === "part"
      ? parts
      : kind === "set"
        ? setLines
        : kind === "relic"
          ? relics
          : kind === "ducat"
            ? ducats
            : endo;
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
          <span className="rf-text-data-lg rf-ducat">{ducatTotal}</span>
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
            { id: "set", label: `${KIND_NOTE.set.label} · ${setLines.length}` },
            { id: "relic", label: `${KIND_NOTE.relic.label} · ${relics.length}` },
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
          className={`rf-icon-button rf-focus-ring${noteOpen ? " rf-gold-mark" : ""}`}
        >
          <InfoIcon width={13} height={13} />
        </button>
        {shown.length > 0 && (
          <Chip className="rf-push">
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
          <PartRows
            entries={parts}
            prices={prices}
            pricesFilling={pricesFilling}
            onInfo={onInfo}
            onPick={onPickItem}
          />
        ) : kind === "set" ? (
          <WishlistSetRows
            entries={setLines}
            sets={sets}
            setPrices={setPrices}
            setPricesFilling={setPricesFilling}
            onPick={onPickSet}
          />
        ) : kind === "relic" ? (
          <RelicLineRows
            entries={relics}
            relicPrices={relicPrices}
            relicPricesFilling={relicPricesFilling}
            onPick={onPickRelic}
          />
        ) : kind === "ducat" ? (
          <DucatRows
            entries={ducats}
            prices={prices}
            pricesFilling={pricesFilling}
            onInfo={onInfo}
            onPick={onPickItem}
          />
        ) : (
          <EndoRows entries={endo} offers={endoOffers} onPick={onShowEndo} />
        )}
      </TabPanel>
    </div>
  );
}

function Total({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="rf-text-overline rf-fg-muted rf-mb-1">{label}</p>
      {children}
    </div>
  );
}
