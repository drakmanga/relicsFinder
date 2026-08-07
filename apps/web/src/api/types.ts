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
  averagePrice: number;
}

/* -------------------------------------------------------------------------
   Domain types — what the UI works with.

   The design system's Tier / Refinement / Rarity unions are lowercase, and the
   backend's casing comes from Warframe's own drop tables, so everything is
   normalised on the way in.
   ---------------------------------------------------------------------- */

export type Tier = "lith" | "meso" | "neo" | "axi" | "requiem";
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
  averagePrice: number;
}

/* ------------------------------------------------------------------------- */

export interface WireItemPrice {
  itemName: string;
  averagePrice: number | null;
  slug: string;
}

export interface ItemPrice {
  itemName: string;
  /** Platinum, 48h average. Null when the item has no listings. */
  averagePrice: number | null;
  slug: string;
}

/**
 * One row of the results table: a relic paired with one of its drops.
 *
 * The table is item-granular, not relic-granular — `Axi A2 / Odonata Prime
 * Systems` is a row, and the same relic appears once per drop it contains.
 * Price, wishlist and sorting all hang off this pairing.
 */
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
