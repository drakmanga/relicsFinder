import { normalizeDropInfo, normalizeRelic } from "./normalize";
import type {
  DropInfo,
  EndoOffer,
  ItemPrice,
  MarketStatus,
  PricePoint,
  Relic,
  RelicPrice,
  WireDropInfo,
  WireItemPrice,
  WireRelic,
  WireRelicPrice,
  WireWishlistEntry,
} from "./types";

/** Relative on purpose: Vite proxies it in dev, Spring Boot serves it in prod. */
const BASE = "/api";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly url: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }

  /** 404 is a legitimate "nothing matched" on most of these endpoints. */
  get isNotFound() {
    return this.status === 404;
  }
}

async function get<T>(path: string, signal?: AbortSignal): Promise<T> {
  const url = `${BASE}${path}`;
  let res: Response;

  try {
    res = await fetch(url, { signal, headers: { Accept: "application/json" } });
  } catch (cause) {
    // Network-level failure: the backend is down, or the dev proxy has nothing
    // to talk to. Surfaced as status 0 so callers can tell it from an HTTP error.
    throw new ApiError(0, url, `Cannot reach the server: ${String(cause)}`);
  }

  if (!res.ok) {
    throw new ApiError(res.status, url, `${res.status} ${res.statusText}`);
  }

  return (await res.json()) as T;
}

/**
 * Path segments carry spaces ("Lith V9") and must be encoded.
 *
 * Every `relicName` parameter below wants the **full** name — tier included.
 * `/api/market/V9` answers 404; `/api/market/Lith%20V9` answers 200. Pass
 * `Relic.fullName`, never `Relic.relicName`.
 */
const seg = (value: string) => encodeURIComponent(value.trim());

export const api = {
  /**
   * Every relic the backend knows about. This is the whole dataset in one
   * response — there is no server-side pagination or filtering, so filtering
   * happens client-side.
   */
  async allRelics(signal?: AbortSignal): Promise<Relic[]> {
    const wire = await get<WireRelic[]>("/relics", signal);
    return wire.map(normalizeRelic);
  },

  async relicsByTier(tier: string, signal?: AbortSignal): Promise<Relic[]> {
    const wire = await get<WireRelic[]>(`/relics/${seg(tier)}`, signal);
    return wire.map(normalizeRelic);
  },

  /** All four refinement states of one relic. */
  async relicStates(relicName: string, signal?: AbortSignal): Promise<Relic[]> {
    const wire = await get<WireRelic[]>(`/relics/relic/${seg(relicName)}`, signal);
    return wire.map(normalizeRelic);
  },

  /** Where the relic drops: mission, location, rotation, chance. */
  async dropInfo(relicName: string, signal?: AbortSignal): Promise<DropInfo[]> {
    const wire = await get<WireDropInfo[]>(`/relics/drop-info/${seg(relicName)}`, signal);
    return wire.map(normalizeDropInfo);
  },

  /** Relics containing an item, e.g. "Volt Prime Neuroptics". */
  async searchByItem(itemName: string, signal?: AbortSignal): Promise<Relic[]> {
    const wire = await get<WireRelic[]>(`/search/${seg(itemName)}`, signal);
    return wire.map(normalizeRelic);
  },

  /**
   * Average market price **of a relic**, not of an item. The UI shows a price
   * per drop, which this endpoint cannot answer — see NOTE below.
   */
  async relicPrice(relicName: string, signal?: AbortSignal): Promise<RelicPrice> {
    return await get<WireRelicPrice>(`/market/${seg(relicName)}`, signal);
  },

  /** Average price of a single Prime part. */
  async itemPrice(itemName: string, signal?: AbortSignal): Promise<ItemPrice> {
    return await get<WireItemPrice>(`/market/item/${seg(itemName)}`, signal);
  },

  /**
   * Prices for many items in one call.
   *
   * The batch exists because warframe.market allows roughly three requests a
   * second: forty individual GETs get throttled, while these queue behind one
   * server-side limiter and share the server cache.
   */
  async itemPrices(itemNames: string[], signal?: AbortSignal): Promise<ItemPrice[]> {
    if (itemNames.length === 0) return [];

    const url = `${BASE}/market/items`;
    let res: Response;

    try {
      res = await fetch(url, {
        method: "POST",
        signal,
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(itemNames),
      });
    } catch (cause) {
      throw new ApiError(0, url, `Cannot reach the server: ${String(cause)}`);
    }

    if (!res.ok) throw new ApiError(res.status, url, `${res.status} ${res.statusText}`);
    return (await res.json()) as WireItemPrice[];
  },

  /**
   * Prices for many relics in one call.
   *
   * Same reason as the item batch, at a larger scale: the relics table lists
   * the whole catalogue, so this is hundreds of prices rather than forty.
   */
  async relicPrices(relicNames: string[], signal?: AbortSignal): Promise<RelicPrice[]> {
    if (relicNames.length === 0) return [];

    const url = `${BASE}/market/relics`;
    let res: Response;

    try {
      res = await fetch(url, {
        method: "POST",
        signal,
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(relicNames),
      });
    } catch (cause) {
      throw new ApiError(0, url, `Cannot reach the server: ${String(cause)}`);
    }

    if (!res.ok) throw new ApiError(res.status, url, `${res.status} ${res.statusText}`);
    return (await res.json()) as WireRelicPrice[];
  },

  /**
   * Tells the server which rows are on screen, so it prices those first.
   *
   * A hint, not a request: the batches above still ask for the whole catalogue,
   * because sorting a table by price is only right when every row has one. This
   * only changes the order the server fills them in.
   *
   * Deliberately swallows its own failures. Nothing on screen depends on it,
   * and a rejected promise here would surface as an error toast for something
   * the user never asked for.
   */
  async prioritise(names: { items?: string[]; relics?: string[] }): Promise<void> {
    try {
      await fetch(`${BASE}/market/priority`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(names),
        keepalive: true,
      });
    } catch {
      // Ordering hint only.
    }
  },

  /** Ninety days of completed trades. */
  async itemHistory(itemName: string, signal?: AbortSignal): Promise<PricePoint[]> {
    return await get<PricePoint[]>(`/market/item/${seg(itemName)}/history`, signal);
  },

  /**
   * Everything the market knows about a whole relic.
   *
   * Its own call rather than a lookup in the batch above: a relic and a part
   * reach the market through different slugs, and the batch answers with an
   * average alone — the panel shows the median and the trades behind it.
   */
  async relicDetail(relicName: string, signal?: AbortSignal): Promise<ItemPrice> {
    return await get<WireItemPrice>(`/market/relic/${seg(relicName)}`, signal);
  },

  /** Ninety days of completed trades for a whole relic. */
  async relicHistory(relicName: string, signal?: AbortSignal): Promise<PricePoint[]> {
    return await get<PricePoint[]>(`/market/relic/${seg(relicName)}/history`, signal);
  },

  /** How much of the price cache is filled — the UI says so while it warms. */
  async marketStatus(signal?: AbortSignal): Promise<MarketStatus> {
    return await get<MarketStatus>("/market/status", signal);
  },

  /** The wishlist, as stored on the server. */
  async wishlist(signal?: AbortSignal): Promise<WireWishlistEntry[]> {
    return await get<WireWishlistEntry[]>("/wishlist", signal);
  },

  /** Replaces the stored list with this one. */
  async saveWishlist(entries: WireWishlistEntry[]): Promise<WireWishlistEntry[]> {
    const url = `${BASE}/wishlist`;
    let res: Response;

    try {
      res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(entries),
      });
    } catch (cause) {
      throw new ApiError(0, url, `Cannot reach the server: ${String(cause)}`);
    }

    if (!res.ok) throw new ApiError(res.status, url, `${res.status} ${res.statusText}`);
    return (await res.json()) as WireWishlistEntry[];
  },

  /** The parts the player already has, as stored on the server. */
  async owned(signal?: AbortSignal): Promise<string[]> {
    return await get<string[]>("/owned", signal);
  },

  /** Replaces the stored list with this one. */
  async saveOwned(itemNames: string[]): Promise<string[]> {
    const url = `${BASE}/owned`;
    let res: Response;

    try {
      res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(itemNames),
      });
    } catch (cause) {
      throw new ApiError(0, url, `Cannot reach the server: ${String(cause)}`);
    }

    if (!res.ok) throw new ApiError(res.status, url, `${res.status} ${res.statusText}`);
    return (await res.json()) as string[];
  },

  /** Ayatan offers ranked by Endo per platinum. */
  async endoOffers(signal?: AbortSignal): Promise<EndoOffer[]> {
    return await get<EndoOffer[]>("/endo/offers", signal);
  },

  async isVaulted(relicName: string, signal?: AbortSignal): Promise<boolean> {
    return await get<boolean>(`/relics/isVaulted/${seg(relicName)}`, signal);
  },

  async unvaulted(signal?: AbortSignal): Promise<Record<string, Relic[]>> {
    const wire = await get<Record<string, WireRelic[]>>("/relics/unvaulted", signal);
    return Object.fromEntries(
      Object.entries(wire).map(([key, relics]) => [key, relics.map(normalizeRelic)]),
    );
  },

  /**
   * Full names of every relic currently dropping, as a set.
   *
   * The endpoint groups by tier and sends only the short name — `"A12"` under
   * `"Axi"` — so the two are joined here into the `"Axi A12"` form the rest of
   * the app uses as a relic's identity.
   */
  async unvaultedNames(signal?: AbortSignal): Promise<Set<string>> {
    const wire = await get<Record<string, WireRelic[]>>("/relics/unvaulted", signal);

    const names = new Set<string>();
    for (const [tier, relics] of Object.entries(wire)) {
      for (const relic of relics) names.add(`${tier} ${relic.relicName}`);
    }
    return names;
  },
};

/**
 * NOTE — state of the backend, verified against a running instance 2026-08-07.
 *
 * All endpoints above work. `drop-info`, `isVaulted` and `unvaulted` were
 * repaired the same day: they used to scrape a Cloudflare-protected wiki and
 * answered `[]` and 500 respectively; they now read the official drop tables.
 *
 * Still missing, and needed by the design:
 * - Ducats.
 * - Price history, so the "+12%" delta cannot be computed server-side.
 * - Wishlist persistence. Client-side only until an endpoint exists.
 */
