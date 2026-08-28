import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";
import { DEFAULT_REFINEMENT } from "./rows";
import type {
  PriceMap,
  Refinement,
  RelicPriceMap,
  Tier,
  WireWishlistEntry,
  WishlistKind,
} from "../api/types";

/**
 * Local mirror of the list.
 *
 * The server is the source of truth now, but the mirror is what makes the
 * stepper feel instant and what keeps the list readable if the backend is down.
 * Versioned so a future migration can recognise what it is reading.
 */
const STORAGE_KEY = "relic-finder.wishlist.v1";

/** Writes are coalesced: holding "+" should not send ten requests. */
const SAVE_DELAY = 600;

export interface WishlistEntry {
  itemName: string;
  /**
   * What the line is for. Part of the identity: the same part wanted to finish
   * a set and wanted to dissolve for ducats are two separate lines.
   */
  kind: WishlistKind;
  /** Where the user found it — context, not identity. Empty outside "part". */
  tier: Tier;
  relicFullName: string;
  refinement: Refinement;
  qty: number;
}

/** The fields that decide whether two lines are the same line. */
export type WishlistLineId = {
  itemName: string;
  kind: WishlistKind;
  refinement?: Refinement;
};

/**
 * Lines are identified by what they are for as well as by their name — and, for
 * a relic, by the state it is wanted in.
 *
 * A relic is bought sealed and then refined with void traces, so Axi A20 Intact
 * and Axi A20 Exceptional are two different plans and two different quantities.
 * Without the state in the key, adding one at Exceptional found the Intact line
 * and raised its count instead, and the state the user had just chosen was
 * silently dropped.
 *
 * For every other kind the refinement is context — where the user found the
 * part — and keying on it would split one part into four lines nobody asked
 * for. The backend applies the same rule; the two must agree or a reload
 * collapses lines this side kept apart.
 *
 * A line that records no state falls back to `DEFAULT_REFINEMENT` rather than
 * to a literal of its own, because a relic line never picks its state: every
 * caller copies it from the refinement the view was showing — the table row's,
 * the detail panel's slider — so the only state an unrecorded one can have
 * meant is the one that view opens on. A second constant here would be a
 * second answer to the question that broke this in the first place. The backend
 * spells the same value in `WishlistService.DEFAULT_REFINEMENT`, and that pair
 * is where the agreement above actually lives.
 *
 * Exported because it is the rule, not a detail of it: the two sides agreeing
 * is a thing the tests have to be able to state, which is the same reason
 * `identityOf` is package-private rather than private on the Java side.
 */
export const idOf = (entry: WishlistLineId) =>
  entry.kind === "relic"
    ? `relic|${entry.itemName}|${entry.refinement ?? DEFAULT_REFINEMENT}`
    : `${entry.kind}|${entry.itemName}`;

/**
 * One line per identity, with the quantities of any collision added up.
 *
 * Two stored lines can key the same and mean the same plan. A relic line
 * written before the catalogue moved off Intact carries `refinement: null`,
 * which `idOf` now resolves to Radiant — the key an explicit Radiant line
 * already holds — so a store written across that move can hold both. Nothing
 * on screen could tell them apart: they rendered as two identical rows, `bump`
 * and `remove` reached only the first, and the next write dropped the other.
 *
 * They add up rather than one of them winning, because both are quantities the
 * reader entered for the same line and dropping either is losing a plan they
 * made. The wire and the mirror hold at most one line per identity after this,
 * which is what the server's `replace` also guarantees — the two run the same
 * rule so a reload cannot undo it.
 *
 * The survivor is written back under the state its key resolved to rather than
 * under the null it arrived with, so the ambiguity resolves once and durably
 * instead of on every read. Only a relic line is touched: for every other kind
 * the refinement is a note about where the part was found, and rewriting it
 * would be inventing context.
 */
export function coalesce(lines: WishlistEntry[]): WishlistEntry[] {
  const byId = new Map<string, WishlistEntry>();

  for (const line of lines) {
    const id = idOf(line);
    const seen = byId.get(id);

    if (seen) {
      seen.qty += line.qty;
      continue;
    }

    byId.set(id, {
      ...line,
      refinement: line.kind === "relic" ? (line.refinement ?? DEFAULT_REFINEMENT) : line.refinement,
    });
  }

  return [...byId.values()];
}

/**
 * The same relic wanted in states other than the one being asked about.
 *
 * The Relics view lists every relic at one refinement and the stepper on the
 * row asks the wishlist for that state alone, so a line made at another one
 * reads as 0 — the plan is still stored and still reachable by moving the
 * slider, but the view it was made on now shows it as unmade. This is what the
 * view says instead of nothing: a line keeps the state it was made in, and
 * where that state is not the one on screen the number says so.
 *
 * Empty for every other kind, which is not keyed on refinement and cannot have
 * a twin in another state.
 */
export function otherStates(
  lines: WishlistEntry[],
  itemName: string,
  refinement: Refinement,
): { refinement: Refinement; qty: number }[] {
  return lines
    .filter(
      (line) =>
        line.kind === "relic" && line.itemName === itemName && line.refinement !== refinement,
    )
    .map((line) => ({ refinement: line.refinement, qty: line.qty }));
}

type Listener = (entries: WishlistEntry[]) => void;

/**
 * A small store outside React.
 *
 * The stepper lives in the tables and the list lives in its own view; both must
 * see the same data. Threading it through props would mean every keystroke in
 * the search box re-renders the wishlist and every wishlist click re-renders
 * the table.
 */
const listeners = new Set<Listener>();
let entries: WishlistEntry[] = loadLocal();
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function loadLocal(): WishlistEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    // Hand-edited or half-migrated storage must not take the app down.
    return coalesce(
      parsed
        .filter(
          (entry): entry is WishlistEntry =>
            !!entry &&
            typeof entry === "object" &&
            typeof (entry as WishlistEntry).itemName === "string" &&
            typeof (entry as WishlistEntry).qty === "number" &&
            (entry as WishlistEntry).qty > 0,
        )
        .map((entry) => ({
          // Lines written before kinds existed are all parts.
          ...entry,
          kind: (entry.kind as WishlistKind) ?? "part",
        })),
    );
  } catch {
    return [];
  }
}

const toWire = (entry: WishlistEntry): WireWishlistEntry => ({
  itemName: entry.itemName,
  kind: entry.kind,
  tier: entry.tier,
  relicFullName: entry.relicFullName,
  refinement: entry.refinement,
  quantity: entry.qty,
});

const fromWire = (entry: WireWishlistEntry): WishlistEntry => ({
  itemName: entry.itemName,
  kind: entry.kind ?? "part",
  tier: (entry.tier as Tier) ?? "lith",
  relicFullName: entry.relicFullName ?? "",
  // The same fallback as `idOf`, and not by coincidence: a stored line read
  // back as one state while keyed under another would show a refinement the
  // stepper beside it cannot find.
  refinement: (entry.refinement as Refinement) ?? DEFAULT_REFINEMENT,
  qty: entry.quantity,
});

function publish(next: WishlistEntry[]) {
  entries = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Private browsing or a full quota: the session still works.
  }
  listeners.forEach((listener) => listener(next));
}

function commit(next: WishlistEntry[]) {
  publish(next);

  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    api.saveWishlist(entries.map(toWire)).catch((error) => {
      // The local copy already holds the change, so a failed sync degrades to
      // "this browser only" rather than losing the edit.
      console.warn("wishlist: saving to the server failed", error);
    });
  }, SAVE_DELAY);
}

/**
 * Pulls the stored list once at startup.
 *
 * The server wins when it has anything, since it is the copy that survives a
 * browser change. An empty server list does not overwrite a local one: that is
 * the first run after the feature landed, and the local list is the real one.
 */
export async function syncFromServer() {
  try {
    // Coalesced on the way in as well as on the way out of storage: a file
    // written before the default moved holds the collision, and the server
    // hands it over exactly as it found it until something writes it back.
    const wire = (await api.wishlist()).map(fromWire);
    const remote = coalesce(wire);

    if (remote.length > 0) {
      // A store that held a collision is written back resolved rather than
      // being read as resolved on every start: `commit` sends it, `publish`
      // would leave the server's copy ambiguous until the next edit.
      if (remote.length < wire.length) commit(remote);
      else publish(remote);
    } else if (entries.length > 0) {
      commit(entries);
    }
  } catch {
    // Backend down: carry on with the mirror.
  }
}

/** Adds `delta` to a line, creating or removing it as needed. */
export function bump(seed: Omit<WishlistEntry, "qty">, delta: number) {
  const index = entries.findIndex((entry) => idOf(entry) === idOf(seed));

  if (index === -1) {
    if (delta > 0) commit([...entries, { ...seed, qty: delta }]);
    return;
  }

  const existing = entries[index]!;
  const qty = existing.qty + delta;

  if (qty <= 0) {
    commit(entries.filter((entry) => idOf(entry) !== idOf(seed)));
    return;
  }

  commit(entries.map((entry, i) => (i === index ? { ...entry, qty } : entry)));
}

/** Drops a line. Takes the identity rather than a name: see `idOf`. */
export function remove(line: WishlistLineId) {
  commit(entries.filter((entry) => idOf(entry) !== idOf(line)));
}

export function clear() {
  commit([]);
}

/** Subscribes a component to the wishlist. */
export function useWishlist() {
  const [snapshot, setSnapshot] = useState(entries);

  useEffect(() => {
    const listener: Listener = (next) => setSnapshot(next);
    listeners.add(listener);

    // Another tab may have changed the mirror while this one was idle.
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) publish(loadLocal());
    };
    window.addEventListener("storage", onStorage);

    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const quantityOf = useCallback(
    (itemName: string, kind: WishlistKind = "part", refinement?: Refinement) =>
      snapshot.find((entry) => idOf(entry) === idOf({ itemName, kind, refinement }))?.qty ?? 0,
    [snapshot],
  );

  const elsewhere = useCallback(
    (itemName: string, refinement: Refinement) => otherStates(snapshot, itemName, refinement),
    [snapshot],
  );

  const totalItems = snapshot.reduce((sum, entry) => sum + entry.qty, 0);

  return { entries: snapshot, quantityOf, elsewhere, totalItems };
}

/**
 * The same sum for set lines, which are priced by what is left to buy.
 *
 * A set line means "I want to finish this one", so its price is the cost of the
 * pieces still missing — not of the whole set, most of which the reader may
 * already have. That number moves as pieces are ticked, which is the point:
 * the list is a plan, and a plan gets cheaper as it is carried out.
 */
export function setListTotal(
  wishlist: WishlistEntry[],
  sets: Map<string, { missingCost: number; costIncomplete: boolean }>,
): { total: number; unpriced: number } {
  let total = 0;
  let unpriced = 0;

  for (const entry of wishlist) {
    const set = sets.get(entry.itemName);
    if (!set) {
      unpriced += 1;
      continue;
    }

    if (set.costIncomplete) unpriced += 1;
    total += set.missingCost * entry.qty;
  }

  return { total: Math.round(total), unpriced };
}

/**
 * The same sum for relic lines, which are priced from the relic market.
 *
 * A separate function rather than a `kind` branch inside `listTotal`: the two
 * read different maps, and a relic name is not a key the item map has.
 */
export function relicListTotal(
  wishlist: WishlistEntry[],
  relicPrices: RelicPriceMap | undefined,
): { total: number; unpriced: number } {
  let total = 0;
  let unpriced = 0;

  for (const entry of wishlist) {
    const price = relicPrices?.get(entry.itemName)?.averagePrice;
    if (price === null || price === undefined) unpriced += 1;
    else total += price * entry.qty;
  }

  return { total: Math.round(total), unpriced };
}

/**
 * Sum of the list in platinum.
 *
 * Unlisted items contribute nothing and are counted separately, so the total
 * never quietly implies they are free.
 */
export function listTotal(
  wishlist: WishlistEntry[],
  prices: PriceMap | undefined,
): { total: number; unpriced: number } {
  let total = 0;
  let unpriced = 0;

  for (const entry of wishlist) {
    const price = prices?.get(entry.itemName)?.averagePrice;
    if (price === null || price === undefined) unpriced += 1;
    else total += price * entry.qty;
  }

  return { total: Math.round(total), unpriced };
}
