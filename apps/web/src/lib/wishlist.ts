import { useCallback, useEffect, useState } from "react";
import type { PriceMap, Refinement, Tier } from "../api/types";

/**
 * Versioned on purpose: when the backend grows a wishlist endpoint, a migration
 * needs to recognise what it is reading. Bumping the suffix retires old data
 * instead of crashing on it.
 */
const STORAGE_KEY = "relic-finder.wishlist.v1";

export interface WishlistEntry {
  itemName: string;
  /** Where the user found it — shown as context in the panel. */
  tier: Tier;
  relicFullName: string;
  refinement: Refinement;
  qty: number;
}

type Listener = (entries: WishlistEntry[]) => void;

/**
 * A tiny store outside React.
 *
 * The stepper lives in the table and the list lives in the panel; both have to
 * see the same data. Threading state through props would mean every keystroke
 * in the search box re-renders the wishlist, and every wishlist click
 * re-renders the whole table.
 */
const listeners = new Set<Listener>();
let entries: WishlistEntry[] = load();

function load(): WishlistEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    // Hand-edited or half-migrated storage should not take the app down.
    return parsed.filter(
      (entry): entry is WishlistEntry =>
        !!entry &&
        typeof entry === "object" &&
        typeof (entry as WishlistEntry).itemName === "string" &&
        typeof (entry as WishlistEntry).qty === "number" &&
        (entry as WishlistEntry).qty > 0,
    );
  } catch {
    return [];
  }
}

function commit(next: WishlistEntry[]) {
  entries = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Private browsing or a full quota: the list still works for this session.
  }
  listeners.forEach((listener) => listener(next));
}

/** Adds `delta` to an item's quantity, creating or removing the entry as needed. */
export function bump(seed: Omit<WishlistEntry, "qty">, delta: number) {
  const index = entries.findIndex((entry) => entry.itemName === seed.itemName);

  if (index === -1) {
    if (delta > 0) commit([...entries, { ...seed, qty: delta }]);
    return;
  }

  const existing = entries[index]!;
  const qty = existing.qty + delta;

  if (qty <= 0) {
    commit(entries.filter((entry) => entry.itemName !== seed.itemName));
    return;
  }

  commit(entries.map((entry, i) => (i === index ? { ...entry, qty } : entry)));
}

export function remove(itemName: string) {
  commit(entries.filter((entry) => entry.itemName !== itemName));
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

    // Another tab may have changed the list while this one was idle.
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        entries = load();
        listeners.forEach((l) => l(entries));
      }
    };
    window.addEventListener("storage", onStorage);

    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const quantityOf = useCallback(
    (itemName: string) => snapshot.find((entry) => entry.itemName === itemName)?.qty ?? 0,
    [snapshot],
  );

  const totalItems = snapshot.reduce((sum, entry) => sum + entry.qty, 0);

  return { entries: snapshot, quantityOf, totalItems };
}

/**
 * Sum of the list in platinum.
 *
 * Items with no listing contribute nothing and are counted separately, so the
 * total never silently pretends an unpriced item is free.
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
