import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";
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
 */
const idOf = (entry: WishlistLineId) =>
  entry.kind === "relic"
    ? `relic|${entry.itemName}|${entry.refinement ?? "intact"}`
    : `${entry.kind}|${entry.itemName}`;

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
    return parsed
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
      }));
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
  refinement: (entry.refinement as Refinement) ?? "intact",
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
    const remote = (await api.wishlist()).map(fromWire);

    if (remote.length > 0) {
      publish(remote);
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

  const totalItems = snapshot.reduce((sum, entry) => sum + entry.qty, 0);

  return { entries: snapshot, quantityOf, totalItems };
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
    const price = relicPrices?.get(entry.itemName);
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
