/**
 * Wire types — the exact shape Spring Boot sends.
 *
 * Mirrors relics.reliceApi.model.*. Two things to watch: `chance` is a String
 * on the Java side, not a number, and `Relic` is annotated
 * `@JsonInclude(NON_NULL)`, so `state` and `rewards` are absent rather than
 * null on the endpoints that build a Relic from the short constructors.
 */

export interface WireRewards {
  _id: string;
  itemName: string;
  rarity: string;
  chance: string;
}

export interface WireRelic {
  tier?: string;
  relicName: string;
  state?: string;
  rewards?: WireRewards[];
}

export interface WireDropInfo {
  mission: string;
  location: string;
  rotation: string;
  chance: string;
}

export interface WireRelicPrice {
  relicName: string;
  /** Null when the market has no listing for the relic. */
  averagePrice: number | null;
}

/* -------------------------------------------------------------------------
   Domain types — what the UI works with.

   The design system's Tier / Refinement / Rarity unions are lowercase, and the
   backend's casing comes from Warframe's own drop tables, so everything is
   normalised on the way in.
   ---------------------------------------------------------------------- */

export type Tier = "lith" | "meso" | "neo" | "axi" | "requiem" | "vanguard";
export type Refinement = "intact" | "exceptional" | "flawless" | "radiant";
export type Rarity = "common" | "uncommon" | "rare";

export interface Reward {
  id: string;
  itemName: string;
  rarity: Rarity;
  /** Drop chance as a percentage, e.g. 25.33. */
  chance: number;
}

export interface Relic {
  tier: Tier;
  /**
   * Short name exactly as the backend sends it — `"V9"`, not `"Lith V9"`.
   * The tier is a separate field and is never part of this string.
   */
  relicName: string;
  /**
   * `"Lith V9"` — tier and short name joined. This is what the user reads and,
   * more importantly, what every name-addressed endpoint expects:
   * `/api/market/V9` answers 404, `/api/market/Lith%20V9` answers 200.
   */
  fullName: string;
  refinement: Refinement;
  rewards: Reward[];
}

/**
 * One relic with all four of its refinement states.
 *
 * `/api/relics` returns 2756 rows — 689 relics times four states — so the flat
 * list is grouped before it reaches the UI. Rewards are per state: the item
 * set stays the same, the chances do not.
 */
export interface RelicGroup {
  tier: Tier;
  relicName: string;
  fullName: string;
  states: Partial<Record<Refinement, Reward[]>>;
}

export interface DropInfo {
  mission: string;
  location: string;
  rotation: string;
  /** Chance of the relic dropping from that mission, as a percentage. */
  chance: number;
}

export interface RelicPrice {
  relicName: string;
  /** Platinum the relic itself trades for. Null when nobody is selling it. */
  averagePrice: number | null;
}

/** Relic name to its own market price. Empty while the batch is in flight. */
export type RelicPriceMap = Map<string, number | null>;

/* ------------------------------------------------------------------------- */

export interface WireItemPrice {
  itemName: string;
  averagePrice: number | null;
  median: number | null;
  volume: number | null;
  trend: number | null;
  slug: string;
  ducats: number | null;
  setName: string | null;
}

export interface ItemPrice {
  itemName: string;
  /**
   * Platinum, from trades completed in the last 48 hours — not from open
   * orders, whose buy and sell sides average to a number nobody trades at.
   * Null when nothing sold, or when the cache has not reached it yet.
   */
  averagePrice: number | null;
  /** Median of the same trades. Steadier than the mean on a thin market. */
  median: number | null;
  /** Trades in the window. A price backed by two sales is barely a price. */
  volume: number | null;
  /** Percent against the 90-day average. */
  trend: number | null;
  slug: string;
  /** Static ducat value. Null for anything that is not a Prime part. */
  ducats: number | null;
  /** The Prime set it completes, e.g. "Volt Prime". Null when it has none. */
  setName: string | null;
}

/**
 * Everything known about the items on screen, keyed by item name.
 *
 * One map rather than three: price, ducats and set all arrive from the same
 * request, and splitting them would mean three lookups per row.
 */
export type PriceMap = Map<string, ItemPrice>;

/**
 * One relic, as the Relics table lists it.
 *
 * The table used to hold one row per relic-and-drop pairing, which meant a
 * relic appeared six times and the view answered "which parts exist" — a
 * question the Prime Items view already answers better. A row is a relic now,
 * and its contents live in the detail panel where they can be read together.
 */
export interface RelicRow {
  /** `"Lith V9|intact"` — stable while the refinement filter is unchanged. */
  id: string;
  tier: Tier;
  relicFullName: string;
  refinement: Refinement;
  rewards: Reward[];
}

export interface RelicItemRow {
  /** Stable across refinements, so selection and wishlist keys survive a filter change. */
  id: string;
  tier: Tier;
  relicFullName: string;
  refinement: Refinement;
  itemName: string;
  rarity: Rarity;
  chance: number;
}

/** One day of completed trades, for the price chart. */
export interface PricePoint {
  date: string;
  avgPrice: number;
  median: number;
  minPrice: number;
  maxPrice: number;
  volume: number;
}

/** How much of the price catalogue the server has filled. */
export interface MarketStatus {
  cached: number;
  fresh: number;
  queued: number;
}

/** One wishlist line as the server stores it. */
/** What a wishlist line is for. Part of its identity, not a label. */
export type WishlistKind = "part" | "ducat" | "endo";

export interface WireWishlistEntry {
  itemName: string;
  kind: WishlistKind;
  tier: string;
  relicFullName: string;
  refinement: string;
  quantity: number;
}

/** One Ayatan sell order, with the Endo it yields. */
export interface EndoOffer {
  itemName: string;
  slug: string;
  platinum: number;
  cyanStars: number;
  amberStars: number;
  endo: number;
  ratio: number;
  seller: string;
  quantity: number;
}
