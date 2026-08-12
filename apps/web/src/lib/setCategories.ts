import type { PrimeSet } from "./setCompletion";
import type { SetCategory } from "../api/types";

/**
 * What kind of gear a Prime set is.
 *
 * The Sets view is two hundred rows of sets in one alphabetical run, and the
 * question a reader arrives with is almost never "show me every Prime" — it is
 * "which frames am I missing" or "what secondaries are worth finishing". The
 * kind is the only thing the list could be cut by that the rows do not already
 * carry.
 *
 * The categories come from the item database, through the price payload: the
 * server knows that Akbolto is a secondary and the browser has no way to tell.
 */
export const SET_CATEGORY_LABEL: Record<SetCategory, string> = {
  warframe: "Warframe",
  primary: "Primary",
  secondary: "Secondary",
  melee: "Melee",
  sentinel: "Sentinel",
  "sentinel-weapon": "Sentinel weapon",
  archwing: "Archwing",
  "arch-gun": "Arch-gun",
  "arch-melee": "Arch-melee",
  pet: "Companion",
};

/**
 * The order the filters are laid out in.
 *
 * Frames first because most sets are frames, then the three weapon slots in the
 * order the game puts them, then the companions and the archwing gear that
 * hardly anyone is farming. Alphabetical would open with Arch-gun.
 */
export const SET_CATEGORY_ORDER: SetCategory[] = [
  "warframe",
  "primary",
  "secondary",
  "melee",
  "sentinel",
  "sentinel-weapon",
  "pet",
  "archwing",
  "arch-gun",
  "arch-melee",
];

/**
 * Which categories the catalogue actually holds sets for, in order.
 *
 * Built from the data rather than listed, because a filter for a category with
 * nothing in it is a control whose only effect is an empty screen — Arch-melee
 * has no Prime gear at all today, and Arch-gun has two sets. When one is
 * released, its chip appears on its own.
 */
export function availableCategories(sets: PrimeSet[]): SetCategory[] {
  const present = new Set(
    sets
      .map((set) => set.category)
      .filter((category): category is SetCategory => category !== null),
  );

  return SET_CATEGORY_ORDER.filter((category) => present.has(category));
}

/**
 * Whether a set is shown by how far along it is.
 *
 * Three exclusive states rather than a "hide finished" tick, because "only the
 * finished ones" is a real question too — it is how someone checks what they
 * can sell — and a tick can only ever say one of the two.
 */
export type SetStatus = "all" | "missing" | "complete";

export const SET_STATUS_LABEL: Record<SetStatus, string> = {
  all: "All",
  missing: "Unfinished",
  complete: "Complete",
};

export const ALL_SET_STATUSES: SetStatus[] = ["all", "missing", "complete"];

/** The sets left after the progress switch. */
export function filterByStatus(sets: PrimeSet[], status: SetStatus): PrimeSet[] {
  if (status === "all") return sets;

  return sets.filter((set) =>
    status === "complete" ? set.ownedCount === set.parts.length : set.ownedCount < set.parts.length,
  );
}

/**
 * The sets left after the chips.
 *
 * No chips means no filter, not "nothing": an empty selection is how the view
 * opens, and it has to show the whole catalogue.
 */
export function filterByCategory(sets: PrimeSet[], categories: Set<SetCategory>): PrimeSet[] {
  if (categories.size === 0) return sets;
  return sets.filter((set) => set.category !== null && categories.has(set.category));
}
