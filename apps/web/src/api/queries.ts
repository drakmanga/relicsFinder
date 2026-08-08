import { useQuery } from "@tanstack/react-query";
import { ApiError, api } from "./client";

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
  price: (name: string) => ["market", name] as const,
  itemPrices: (names: string[]) => ["market", "items", names] as const,
  itemHistory: (name: string) => ["market", "history", name] as const,
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
 * `dataUpdatedAt` on the result is what feeds the "updated N minutes ago" line
 * in the detail panel — the freshness the design asks for is already tracked
 * by the cache, so nothing extra needs storing.
 */
export function useRelicPrice(relicName: string | null) {
  return useQuery({
    queryKey: keys.price(relicName ?? ""),
    queryFn: async ({ signal }) => {
      try {
        return await api.relicPrice(relicName!, signal);
      } catch (error) {
        // No listing on the market is a legitimate "no price", not an error.
        if (error instanceof ApiError && error.isNotFound) return null;
        throw error;
      }
    },
    enabled: !!relicName,
    ...PRICE_DATA,
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
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return false;
      const missing = data.filter((p) => p.averagePrice === null).length;
      // Some parts are genuinely untraded and never fill in, so stop polling
      // once only a residue is left rather than waiting for zero.
      return missing > data.length * 0.05 ? 15_000 : false;
    },
    select: (prices) => new Map(prices.map((p) => [p.itemName, p])),
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

export function useIsVaulted(relicName: string | null) {
  return useQuery({
    queryKey: keys.vaulted(relicName ?? ""),
    queryFn: ({ signal }) => api.isVaulted(relicName!, signal),
    enabled: !!relicName,
    ...STATIC_DATA,
  });
}
