import { useState } from "react";

import type { Refinement } from "../api/types";

/**
 * The relics opened with "Opened one", kept as a log of the session, so the
 * reader can see what the evening was worth and take back a mis-click.
 *
 * In this browser rather than on the server: it is a record of one sitting at
 * one machine, nobody else reads it, and losing it costs a summary, not data.
 * The inventory, which is data, is still changed on the server by the click
 * itself. Every read and write is guarded, as storage can be blocked.
 */
const STORAGE_KEY = "relic-finder.crack-session";

/** Enough for any one sitting; past it the oldest go, so storage cannot grow for ever. */
const MAX_ENTRIES = 500;

export interface SessionEntry {
  id: string;
  relicName: string;
  refinement: Refinement;
  /** What one opening was expected to pay when it was opened, for the squad then. */
  value: number;
  ducats: number;
  at: number;
}

function load(): SessionEntry[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? (parsed as SessionEntry[]) : [];
  } catch {
    return [];
  }
}

function save(entries: SessionEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Blocked storage: the log still lasts until the tab closes.
  }
}

/** Totals of a log: how many opened, and their expected platinum and ducats. */
export function sessionTotals(entries: readonly SessionEntry[]) {
  return entries.reduce(
    (sum, entry) => ({
      opened: sum.opened + 1,
      value: sum.value + entry.value,
      ducats: sum.ducats + entry.ducats,
    }),
    { opened: 0, value: 0, ducats: 0 },
  );
}

/** Appends one opening, newest last, dropping the oldest past the cap. */
export function appendEntry(entries: readonly SessionEntry[], entry: SessionEntry): SessionEntry[] {
  return [...entries, entry].slice(-MAX_ENTRIES);
}

export function useCrackSession() {
  const [entries, setEntries] = useState<SessionEntry[]>(load);

  const commit = (next: SessionEntry[]) => {
    setEntries(next);
    save(next);
  };

  const record = (entry: Omit<SessionEntry, "id" | "at">) => {
    const at = Date.now();
    commit(appendEntry(entries, { ...entry, at, id: `${at}-${entries.length}` }));
  };

  const remove = (id: string) => commit(entries.filter((entry) => entry.id !== id));
  const clear = () => commit([]);

  return { entries, record, remove, clear };
}
