/** Relic era. Each tier owns a colour; the chip is the only place it appears. */
export type Tier = "lith" | "meso" | "neo" | "axi" | "requiem";

/**
 * Relic refinement. Has no colour of its own — it modulates the tier chip's
 * opacity and frame. The label always travels with it, because opacity alone
 * is not an accessible channel.
 */
export type Refinement = "intact" | "exceptional" | "flawless" | "radiant";

/** Drop rarity. Rendered as a dot plus text, never as colour alone. */
export type Rarity = "common" | "uncommon" | "rare";

/** Warframe currencies. */
export type Currency = "platinum" | "ducat" | "credit";

/** Notch depth token — the Orokin corner cut. Replaces border-radius. */
export type Notch = "xs" | "sm" | "md" | "lg" | "xl";

/** Control height token. */
export type ControlSize = "xs" | "sm" | "md" | "lg";

/** Row density for tables and drop lists. */
export type Density = "compact" | "default" | "comfortable";

export const TIER_LABEL: Record<Tier, string> = {
  lith: "Lith",
  meso: "Meso",
  neo: "Neo",
  axi: "Axi",
  requiem: "Requiem",
};

export const REFINEMENT_LABEL: Record<Refinement, string> = {
  intact: "Intact",
  exceptional: "Exceptional",
  flawless: "Flawless",
  radiant: "Radiant",
};

export const RARITY_LABEL: Record<Rarity, string> = {
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
};
