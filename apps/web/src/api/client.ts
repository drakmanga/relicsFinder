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
    throw new ApiError(0, url, `Impossibile raggiungere il server: ${String(cause)}`);
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
      throw new ApiError(0, url, `Impossibile raggiungere il server: ${String(cause)}`);
    }

    if (!res.ok) throw new ApiError(res.status, url, `${res.status} ${res.statusText}`);
    return (await res.json()) as WireItemPrice[];
  },

  /** Ninety days of completed trades. */
  async itemHistory(itemName: string, signal?: AbortSignal): Promise<PricePoint[]> {
    return await get<PricePoint[]>(`/market/item/${seg(itemName)}/history`, signal);
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
      throw new ApiError(0, url, `Impossibile raggiungere il server: ${String(cause)}`);
    }

    if (!res.ok) throw new ApiError(res.status, url, `${res.status} ${res.statusText}`);
    return (await res.json()) as WireWishlistEntry[];
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
