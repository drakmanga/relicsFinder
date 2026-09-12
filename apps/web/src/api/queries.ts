import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ApiError, api } from "./client";
// The one piece of logic this layer needs and does not own: whether an install
// is still running is a fact about the record, not about fetching it.
import { installUnderWay } from "../lib/updateInstall";
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
  /**
   * Every price batch, whatever set of names it was asked for.
   *
   * A prefix rather than a key: the two below carry the names they asked for,
   * so adding a wishlist line makes a different query, and something wanting to
   * refresh "the prices" has to reach all of them at once. The keys are built
   * from these constants so the prefix cannot drift away from what it matches.
   */
  allItemPrices: ["market", "items"] as const,
  allRelicPrices: ["market", "relics"] as const,
  itemPrices: (names: string[]) => [...keys.allItemPrices, names] as const,
  relicPrices: (names: string[]) => [...keys.allRelicPrices, names] as const,
  itemHistory: (name: string) => ["market", "history", name] as const,
  relicDetail: (name: string) => ["market", "relic", name] as const,
  relicHistory: (name: string) => ["market", "relic", "history", name] as const,
  vaulted: (name: string) => ["relics", "vaulted", name] as const,
  endo: ["endo", "offers"] as const,
  marketStatus: ["market", "status"] as const,
  endoStatus: ["endo", "status"] as const,
  setLifecycle: ["sets", "lifecycle"] as const,
  /**
   * The ranking, per population.
   *
   * `allTierLists` is the prefix: the vault filter is part of the key, so the
   * three populations are three cache entries, and something wanting to refresh
   * "the ranking" has to reach all of them at once — the same shape the two
   * price batches use, and for the same reason.
   */
  allTierLists: ["tiers"] as const,
  tierList: (vault: string) => [...keys.allTierLists, vault] as const,
  appUpdate: ["app", "update"] as const,
  updateInstall: ["app", "update", "install"] as const,
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
  const priced = values.filter((value) => value !== null && value !== undefined).length;
  return stillFillingCount(priced, values.length);
}

/**
 * The same question asked of two counts rather than of the prices themselves.
 *
 * The Tier List asks it this way: the ranking is computed on the server, so the
 * tab never holds the prices behind it and the response reports how many of
 * them there were. One rule for both shapes, because a row still shimmering
 * after the polling that fills it gave up is the failure either of them would
 * produce alone.
 */
export function stillFillingCount(priced: number, total: number): boolean {
  if (total === 0) return false;
  return total - priced > total * PRICE_RESIDUE;
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
    select: (prices) => new Map(prices.map((p) => [p.relicName, p])) as RelicPriceMap,
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
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return false;
      // A trend with no reason beside it is the server saying "not fetched
      // yet": the endpoint waits four seconds for a first read and answers
      // empty if the queue is longer than that. Nothing else would fill it in
      // — there is no batch behind this query and a fifteen-minute staleTime
      // in front of it — so the skeleton the trend cell draws would spin until
      // the dialog was closed. Every other outcome, a price or one of the
      // three reasons, stops the poll.
      return data.trend === null && !data.trendGap ? 15_000 : false;
    },
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
 * How old the oldest price held is — what the topbar reports.
 *
 * Polled rather than invalidated: the warmer moves the figure on its own
 * schedule, server-side, with nothing the client does to trigger it. A minute
 * is finer than the label's own resolution.
 */
export function useMarketStatus(enabled: boolean) {
  return useQuery({
    queryKey: keys.marketStatus,
    queryFn: ({ signal }) => api.marketStatus(signal),
    enabled,
    staleTime: 30_000,
    refetchInterval: enabled ? 60_000 : false,
  });
}

/**
 * Whether the application itself is out of date.
 *
 * Asked once a session and never polled. The server holds its own answer for an
 * hour — GitHub's rate limit is per address and a Docker host behind NAT shares
 * one with everybody — so a poll here would be a round trip to be told the same
 * thing, and a release published while a tab is open is news that keeps until
 * the next load.
 *
 * `retry: false` because the one failure worth expecting is no network, and
 * three more attempts at it is three more waits before the page settles. The
 * server already answers 200 with `known: false` rather than an error.
 */
export function useAppUpdate() {
  return useQuery({
    queryKey: keys.appUpdate,
    queryFn: ({ signal }) => api.appUpdate(signal),
    staleTime: Infinity,
    retry: false,
  });
}

/**
 * How far the application has got updating itself, while it is doing it.
 *
 * Asked once whenever something mounts this, and then at
 * {@link INSTALL_POLL_MS} for as long as the answer says an install is running.
 * That is what makes a dialog closed halfway through a download and reopened
 * pick the progress back up: the server is where the install lives, so the
 * server is asked rather than a piece of component state that went away with
 * the dialog.
 *
 * `staleTime: 0` because the whole point is that the answer changes: the
 * default would serve the first response for the rest of the download.
 */
export function useUpdateInstall() {
  return useQuery({
    queryKey: keys.updateInstall,
    queryFn: ({ signal }) => api.updateInstall(signal),
    // Read off the answer rather than passed in, because the only thing that
    // knows whether to keep asking is the last thing that was asked. A caller
    // holding that as its own state loses it the moment the dialog closes.
    refetchInterval: (query) => (installUnderWay(query.state.data) ? INSTALL_POLL_MS : false),
    staleTime: 0,
    // The last poll before the process ends is expected to fail — it is asking
    // a server that is closing itself. A retry would turn that into an error
    // the screen shows for the two seconds it has left.
    retry: false,
  });
}

/** Twice a second: fast enough that the bar moves, slow enough to be free. */
const INSTALL_POLL_MS = 500;

/**
 * When the Ayatan offers were read, for the same label on the Endo tab.
 *
 * The key carries the offers query's own `dataUpdatedAt`, which makes this
 * refetch at the moment a new list lands rather than up to a poll later. The
 * extra `useEndoOffers` call costs no request: it is the same cache entry the
 * table reads, and React Query serves both from it.
 */
export function useEndoStatus(enabled: boolean) {
  const offers = useEndoOffers(enabled);

  return useQuery({
    queryKey: [...keys.endoStatus, offers.dataUpdatedAt] as const,
    queryFn: ({ signal }) => api.endoStatus(signal),
    enabled,
    staleTime: 60_000,
    // Each new list makes a new key; without this the old entries would sit in
    // the cache for the default five minutes apiece.
    gcTime: 60_000,
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

/**
 * Where every Prime set sits in the price cycle, in one request.
 *
 * As static as the relic catalogue and for the same reason: it moves when a set
 * is released or rotates out of the drop tables, which is a few times a year,
 * and never when a price moves. One query for all four surfaces that read it —
 * the two tables and the two detail panels — so React Query serves them from a
 * single cache entry.
 */
export function useSetLifecycle() {
  return useQuery({
    queryKey: keys.setLifecycle,
    queryFn: ({ signal }) => api.setLifecycle(signal),
    ...STATIC_DATA,
  });
}

/**
 * Every relic ranked twice, from the server that computes it.
 *
 * Polled while the prices behind it are still arriving, exactly as the two
 * price batches poll: the ranking of a cold instance is built on the prices
 * that have landed, and it is worth asking again until they have. Once the
 * response says the catalogue is priced the polling stops, and the marker on
 * `/api/market/status` is what wakes it afterwards — see `usePriceRefresh`.
 *
 * Fetched only for the view that shows it. The other six have no use for a
 * ranking, and a request for 772 rows behind another tab is a response nobody
 * reads.
 */
export function useTierList(vault: string, enabled: boolean) {
  return useQuery({
    queryKey: keys.tierList(vault),
    queryFn: ({ signal }) => api.tierList(vault, signal),
    enabled,
    ...PRICE_DATA,
    // The population is part of the key, so switching the filter is a different
    // query. Without this the table would blank to its empty state for the
    // length of one round trip on every click of a control that only re-bands
    // the rows it is already showing.
    placeholderData: keepPreviousData,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return false;
      return stillFillingCount(data.prices.partsPriced, data.prices.parts) ||
        stillFillingCount(data.prices.relicsPriced, data.prices.relics)
        ? 15_000
        : false;
    },
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
