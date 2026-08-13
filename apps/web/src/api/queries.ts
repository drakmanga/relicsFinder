import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ApiError, api } from "./client";
import type { RelicPriceMap } from "./types";

/**
 * Query keys in one place so an invalidation can never miss a cache entry
 * through a typo.
 */
export const keys = {
  relics: ["relics"] as const,
  relicsByTier: (tier: string) => ["relics", "tier", tier] as const,
  relicStates: (name: string) => ["relics", "states", name] as const,
  dropInfo: (name: string) => ["relics", "drop-info", name] as const,
  search: (term: string) => ["search", term] as const,
  itemPrices: (names: string[]) => ["market", "items", names] as const,
  relicPrices: (names: string[]) => ["market", "relics", names] as const,
  itemHistory: (name: string) => ["market", "history", name] as const,
  relicDetail: (name: string) => ["market", "relic", name] as const,
  relicHistory: (name: string) => ["market", "relic", "history", name] as const,
  vaulted: (name: string) => ["relics", "vaulted", name] as const,
  endo: ["endo", "offers"] as const,
};

/**
 * Relic data comes from a JSON file the backend refreshes on demand, so it is
 * effectively static within a session. Prices are the opposite — they move,
 * and the UI shows how old they are.
 */
const STATIC_DATA = { staleTime: 60 * 60_000, gcTime: 2 * 60 * 60_000 };
const PRICE_DATA = { staleTime: 15 * 60_000, gcTime: 60 * 60_000 };

/**
 * The share of a price batch that may stay empty and still count as finished.
 *
 * Some parts are genuinely untraded: nobody has ever listed a Braton Prime
 * Blueprint, and waiting for zero missing prices would be waiting forever. Past
 * this residue the batch is treated as settled — the poll stops, and a row with
 * no price stops saying "loading" and starts saying "not listed".
 *
 * Exported because the tables need the same answer the poll uses. Two thresholds
 * would mean cells still shimmering after the polling that fills them gave up.
 */
export const PRICE_RESIDUE = 0.05;

/**
 * Whether a batch is still filling in, given what each entry is worth so far.
 *
 * `null` is "no price yet", which covers both the queue not having reached it
 * and the market not having a listing — the two are indistinguishable from here,
 * which is exactly why the residue exists.
 */
export function stillFilling(values: (number | null | undefined)[]): boolean {
  if (values.length === 0) return false;
  const missing = values.filter((value) => value === null || value === undefined).length;
  return missing > values.length * PRICE_RESIDUE;
}

export function useRelics() {
  return useQuery({
    queryKey: keys.relics,
    queryFn: ({ signal }) => api.allRelics(signal),
    ...STATIC_DATA,
  });
}

export function useRelicStates(relicName: string | null) {
  return useQuery({
    queryKey: keys.relicStates(relicName ?? ""),
    queryFn: ({ signal }) => api.relicStates(relicName!, signal),
    enabled: !!relicName,
    ...STATIC_DATA,
  });
}

export function useDropInfo(relicName: string | null) {
  return useQuery({
    queryKey: keys.dropInfo(relicName ?? ""),
    queryFn: ({ signal }) => api.dropInfo(relicName!, signal),
    enabled: !!relicName,
    ...STATIC_DATA,
  });
}

/**
 * A search that matches nothing answers 404, which is an empty result rather
 * than a failure — it is mapped to `[]` so the UI shows the empty state
 * instead of the error state.
 */
export function useItemSearch(term: string) {
  const query = term.trim();

  return useQuery({
    queryKey: keys.search(query),
    queryFn: async ({ signal }) => {
      try {
        return await api.searchByItem(query, signal);
      } catch (error) {
        if (error instanceof ApiError && error.isNotFound) return [];
        throw error;
      }
    },
    enabled: query.length >= 2,
    ...STATIC_DATA,
  });
}

/**
 * Prices for the entire catalogue, in one request.
 *
 * Not a scroll window. The server warms every part in the background, so
 * fetching all ~550 is one round trip of map lookups — and sorting by price is
 * only correct when every row has a price. With a window, sorting ranked 4000
 * rows using the thirty prices that happened to be on screen, and the order
 * shifted as the user scrolled.
 */
export function useItemPrices(itemNames: string[]) {
  const names = [...new Set(itemNames)].sort();

  return useQuery({
    queryKey: keys.itemPrices(names),
    queryFn: ({ signal }) => api.itemPrices(names, signal),
    enabled: names.length > 0,
    ...PRICE_DATA,
    // The set of names is part of the key, so adding a wishlist line or opening
    // the Sets view starts a different query. Without this the prices already on
    // screen would blank back to skeletons for the length of one round trip,
    // over a change that only added to the list.
    placeholderData: keepPreviousData,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return false;
      return stillFilling(data.map((p) => p.averagePrice)) ? 15_000 : false;
    },
    select: (prices) => new Map(prices.map((p) => [p.itemName, p])),
  });
}

/**
 * What each relic itself sells for.
 *
 * A relic is tradeable in its own right, and buying one is the alternative to
 * farming it — so the price belongs on every row of the table, next to what
 * opening it is worth. Fetched for the whole list in one request, like the item
 * prices and for the same reason: sorting is only correct when every row has a
 * price, and a scroll window reorders the table under the user's hands.
 */
export function useRelicPrices(relicNames: string[]) {
  const names = [...new Set(relicNames)].sort();

  return useQuery({
    queryKey: keys.relicPrices(names),
    queryFn: ({ signal }) => api.relicPrices(names, signal),
    enabled: names.length > 0,
    ...PRICE_DATA,
    // The wishlist asks for exactly the relics it has lines for, so every line
    // added or removed is a new key. Keeping the previous answer means the four
    // prices already there stay put while the fifth is fetched.
    placeholderData: keepPreviousData,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return false;
      // Relics are queued rather than waited on server-side, so the first
      // response is mostly nulls and fills in as the warmer works through them.
      return stillFilling(data.map((p) => p.averagePrice)) ? 15_000 : false;
    },
    select: (prices) => new Map(prices.map((p) => [p.relicName, p.averagePrice])) as RelicPriceMap,
  });
}

/**
 * Price, median, trades and trend for one relic, and its ninety-day series.
 *
 * Asked for only while a relic's panel or dialog is open, which is why these
 * may wait on a first fetch where the table's batch never does.
 */
export function useRelicDetail(relicName: string | null) {
  return useQuery({
    queryKey: keys.relicDetail(relicName ?? ""),
    queryFn: ({ signal }) => api.relicDetail(relicName!, signal),
    enabled: !!relicName,
    ...PRICE_DATA,
  });
}

export function useRelicHistory(relicName: string | null) {
  return useQuery({
    queryKey: keys.relicHistory(relicName ?? ""),
    queryFn: ({ signal }) => api.relicHistory(relicName!, signal),
    enabled: !!relicName,
    ...PRICE_DATA,
  });
}

/** Ninety days of completed trades — the series behind the price chart. */
export function useItemHistory(itemName: string | null) {
  return useQuery({
    queryKey: keys.itemHistory(itemName ?? ""),
    queryFn: ({ signal }) => api.itemHistory(itemName!, signal),
    enabled: !!itemName,
    ...PRICE_DATA,
  });
}

/**
 * Ayatan offers.
 *
 * Short-lived by nature: these are open orders from players currently online,
 * so a stale list sends someone to message a seller who has logged off.
 */
export function useEndoOffers(enabled: boolean) {
  return useQuery({
    queryKey: keys.endo,
    queryFn: ({ signal }) => api.endoOffers(signal),
    enabled,
    staleTime: 4 * 60_000,
    refetchInterval: enabled ? 5 * 60_000 : false,
  });
}

/**
 * Which relics are currently farmable, in one request.
 *
 * The per-relic `isVaulted` endpoint would be 689 calls to fill a column. This
 * is the same answer as one small list — around thirty relics are in rotation
 * at a time — and it changes only when Digital Extremes rotates the vault.
 */
export function useUnvaultedNames() {
  return useQuery({
    queryKey: ["relics", "unvaulted", "names"] as const,
    queryFn: ({ signal }) => api.unvaultedNames(signal),
    ...STATIC_DATA,
  });
}

export function useIsVaulted(relicName: string | null) {
  return useQuery({
    queryKey: keys.vaulted(relicName ?? ""),
    queryFn: ({ signal }) => api.isVaulted(relicName!, signal),
    enabled: !!relicName,
    ...STATIC_DATA,
  });
}
