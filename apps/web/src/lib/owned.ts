import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";

/**
 * The parts the player already has, and how many of each.
 *
 * A count rather than a set of names, because a Prime set is not one copy of
 * each piece: Kestrel Prime is one Blueprint, one Grip and two Blades, and 28
 * sets hold a doubled piece. A name alone cannot say "one Blade of two", so the
 * set read as finished with half of it missing.
 *
 * The count is what a set asks for and nothing else. A third Blade found in the
 * wild is still a thing to sell rather than a thing a set needs — that is the
 * wishlist's "ducat" kind — so the stepper on a piece stops at what the set is
 * built from.
 *
 * Kept apart from the wishlist rather than folded into it as another kind: the
 * wishlist says "I want this", this says "I have this", and a part can easily
 * be neither. Reading one as the negation of the other would tell anyone who
 * has never opened the wishlist that they own every Prime in the game.
 */
const STORAGE_KEY = "relic-finder.owned.v2";

/**
 * The list as it was stored while it was a list of names.
 *
 * Read once, when the new key holds nothing, and never written to again. It is
 * deliberately not deleted: it is a few hundred bytes and the only copy of the
 * collection as it stood before the migration, so a migration that turns out to
 * be wrong is recoverable rather than a loss.
 */
const LEGACY_STORAGE_KEY = "relic-finder.owned.v1";

/** Writes are coalesced: ticking through a set should not send six requests. */
const SAVE_DELAY = 600;

/** How many copies of each part are in hand. Absent means none. */
export type OwnedCounts = ReadonlyMap<string, number>;

type Listener = (owned: OwnedCounts) => void;

const listeners = new Set<Listener>();
let owned: Map<string, number> = loadLocal();
let saveTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * One entry of the stored list, in either shape it can have.
 *
 * A bare name is the shape written before pieces had counts, and it means one
 * copy — the number a stored name has always stood for. Reading it as zero
 * would empty a collection somebody spent months ticking.
 */
export function parseEntry(entry: unknown): [string, number] | null {
  if (typeof entry === "string") return entry.trim() === "" ? null : [entry, 1];

  if (!entry || typeof entry !== "object") return null;

  const { itemName, quantity } = entry as { itemName?: unknown; quantity?: unknown };
  if (typeof itemName !== "string" || itemName.trim() === "") return null;

  const count =
    typeof quantity === "number" && Number.isFinite(quantity) ? Math.trunc(quantity) : 1;
  return count > 0 ? [itemName, count] : null;
}

/**
 * A stored list in either shape, or null when the key holds nothing usable.
 *
 * Exported because it is the migration itself rather than a detail of it: what
 * a name written before counts existed is worth is the one thing this change
 * could get wrong, and a test has to be able to state it.
 */
export function parseStoredList(raw: string | null): Map<string, number> | null {
  if (!raw) return null;

  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) return null;

  const counts = new Map<string, number>();
  for (const entry of parsed) {
    const pair = parseEntry(entry);
    // The same name twice is one entry, not two: a list written by hand could
    // otherwise report seven of a six-piece set.
    if (pair) counts.set(pair[0], pair[1]);
  }

  return counts;
}

function loadLocal(): Map<string, number> {
  try {
    const current = parseStoredList(localStorage.getItem(STORAGE_KEY));
    if (current) return current;

    // Nothing under the new key: this browser last wrote the list of names.
    return parseStoredList(localStorage.getItem(LEGACY_STORAGE_KEY)) ?? new Map();
  } catch {
    // Hand-edited or half-migrated storage must not take the app down.
    return new Map();
  }
}

const toWire = (counts: OwnedCounts) =>
  [...counts].map(([itemName, quantity]) => ({ itemName, quantity }));

function publish(next: Map<string, number>) {
  owned = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toWire(next)));
  } catch {
    // Private browsing or a full quota: the session still works.
  }
  listeners.forEach((listener) => listener(next));
}

function commit(next: Map<string, number>) {
  publish(next);

  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    api.saveOwned(toWire(owned)).catch((error) => {
      // The local copy already holds the change, so a failed sync degrades to
      // "this browser only" rather than losing the edit.
      console.warn("owned: saving to the server failed", error);
    });
  }, SAVE_DELAY);
}

/**
 * Pulls the stored list once at startup.
 *
 * The server wins when it has anything, since it is the copy that survives a
 * change of browser. An empty server list does not overwrite a local one: that
 * is the first run after the feature landed, and the local list is the real one.
 *
 * A list that arrived as bare names is written straight back as counts, so the
 * migration reaches the server's copy rather than being redone on every start.
 */
export async function syncOwnedFromServer() {
  try {
    const remote = await api.owned();
    const counts = new Map<string, number>();

    for (const entry of remote) {
      const pair = parseEntry(entry);
      if (pair) counts.set(pair[0], pair[1]);
    }

    if (counts.size > 0) {
      if (remote.some((entry) => typeof entry === "string")) commit(counts);
      else publish(counts);
    } else if (owned.size > 0) {
      commit(owned);
    }
  } catch {
    // Backend down: carry on with the mirror.
  }
}

/**
 * Sets how many copies of a part are in hand. Zero drops it from the list.
 *
 * A count rather than a toggle because the collection now holds one: "one Blade
 * of two" is a state a set has to be able to be in.
 */
export function setOwnedCount(itemName: string, copies: number) {
  const next = new Map(owned);

  if (copies <= 0) next.delete(itemName);
  else next.set(itemName, copies);

  commit(next);
}

/** In hand or not at all, for a piece a set needs one of. */
export function toggleOwned(itemName: string) {
  setOwnedCount(itemName, owned.has(itemName) ? 0 : 1);
}

/** Marks every part of a set at once — the "I already built this" shortcut. */
export function setOwnedAll(itemNames: string[], value: boolean) {
  const next = new Map(owned);

  for (const name of itemNames) {
    if (value) next.set(name, 1);
    else next.delete(name);
  }

  commit(next);
}

export function useOwned() {
  const [current, setCurrent] = useState<OwnedCounts>(owned);

  useEffect(() => {
    const listener: Listener = (next) => setCurrent(next);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const countOf = useCallback((itemName: string) => current.get(itemName) ?? 0, [current]);

  return {
    owned: current,
    countOf,
    setCount: setOwnedCount,
    toggle: toggleOwned,
    setAll: setOwnedAll,
  };
}
