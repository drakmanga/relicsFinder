import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";

/**
 * The parts the player already has.
 *
 * A set of names and nothing else. A second copy of a part does not change what
 * a set is missing — it is something to sell, which is the wishlist's "ducat"
 * kind — so there is no quantity here.
 *
 * Kept apart from the wishlist rather than folded into it as another kind: the
 * wishlist says "I want this", this says "I have this", and a part can easily
 * be neither. Reading one as the negation of the other would tell anyone who
 * has never opened the wishlist that they own every Prime in the game.
 */
const STORAGE_KEY = "relic-finder.owned.v1";

/** Writes are coalesced: ticking through a set should not send six requests. */
const SAVE_DELAY = 600;

type Listener = (owned: Set<string>) => void;

const listeners = new Set<Listener>();
let owned: Set<string> = loadLocal();
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function loadLocal(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();

    return new Set(parsed.filter((name): name is string => typeof name === "string"));
  } catch {
    // Hand-edited or half-migrated storage must not take the app down.
    return new Set();
  }
}

function publish(next: Set<string>) {
  owned = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
  } catch {
    // Private browsing or a full quota: the session still works.
  }
  listeners.forEach((listener) => listener(next));
}

function commit(next: Set<string>) {
  publish(next);

  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    api.saveOwned([...owned]).catch((error) => {
      // The local copy already holds the change, so a failed sync degrades to
      // "this browser only" rather than losing the edit.
      console.warn("owned: salvataggio sul server fallito", error);
    });
  }, SAVE_DELAY);
}

/**
 * Pulls the stored list once at startup.
 *
 * The server wins when it has anything, since it is the copy that survives a
 * change of browser. An empty server list does not overwrite a local one: that
 * is the first run after the feature landed, and the local list is the real one.
 */
export async function syncOwnedFromServer() {
  try {
    const remote = await api.owned();

    if (remote.length > 0) {
      publish(new Set(remote));
    } else if (owned.size > 0) {
      commit(owned);
    }
  } catch {
    // Backend down: carry on with the mirror.
  }
}

export function toggleOwned(itemName: string) {
  const next = new Set(owned);
  if (!next.delete(itemName)) next.add(itemName);
  commit(next);
}

/** Marks every part of a set at once — the "I already built this" shortcut. */
export function setOwnedAll(itemNames: string[], value: boolean) {
  const next = new Set(owned);
  for (const name of itemNames) {
    if (value) next.add(name);
    else next.delete(name);
  }
  commit(next);
}

export function useOwned() {
  const [current, setCurrent] = useState(owned);

  useEffect(() => {
    const listener: Listener = (next) => setCurrent(next);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const has = useCallback((itemName: string) => current.has(itemName), [current]);

  return { owned: current, has, toggle: toggleOwned, setAll: setOwnedAll };
}
