import type { OwnedRelic, Refinement, Relic } from "../api/types";
import { ALL_REFINEMENTS } from "./rows";

/**
 * The relics the player is holding, as pure list edits.
 *
 * The server stores the whole list and the screen sends the whole list, so
 * every edit here is "this list, with one line changed" — the same whole-list
 * protocol the wishlist and the owned parts use, and for their reason: a
 * single-user tool cannot have the conflicts a partial protocol exists for.
 */

/** Relic and refinement: the two together are what makes two lines the same line. */
export const ownedRelicKey = (relicName: string, refinement: Refinement) =>
  `${relicName}|${refinement}`;

/**
 * The list with one line set to `quantity`. Zero or less removes the line.
 *
 * A new line goes last rather than sorted in, so a relic just added appears
 * where the reader's eye already is — at the end of what they have been
 * entering — instead of jumping somewhere into the middle.
 */
export function setOwnedRelic(
  list: readonly OwnedRelic[],
  relicName: string,
  refinement: Refinement,
  quantity: number,
): OwnedRelic[] {
  const key = ownedRelicKey(relicName, refinement);
  const exists = list.some((entry) => ownedRelicKey(entry.relicName, entry.refinement) === key);

  if (quantity <= 0) {
    return list.filter((entry) => ownedRelicKey(entry.relicName, entry.refinement) !== key);
  }

  if (!exists) return [...list, { relicName, refinement, quantity }];

  return list.map((entry) =>
    ownedRelicKey(entry.relicName, entry.refinement) === key ? { ...entry, quantity } : entry,
  );
}

/** The list with `quantity` more copies of one line, which is created if missing. */
export function addOwnedRelic(
  list: readonly OwnedRelic[],
  relicName: string,
  refinement: Refinement,
  quantity: number,
): OwnedRelic[] {
  const key = ownedRelicKey(relicName, refinement);
  const held = list.find((entry) => ownedRelicKey(entry.relicName, entry.refinement) === key);
  return setOwnedRelic(list, relicName, refinement, (held?.quantity ?? 0) + quantity);
}

/** How many relics in all, counting copies. */
export const totalOwnedRelics = (list: readonly OwnedRelic[]) =>
  list.reduce((sum, entry) => sum + entry.quantity, 0);

/** How many matches the picker offers. More than a screenful is a list to scroll, not to pick from. */
export const PICKER_MATCHES = 8;

/**
 * Catalogue relics whose full name matches what was typed, best first.
 *
 * A name that starts with the term ranks above one that only contains it, so
 * "n16" offers Neo N16 before Lith N16-something-longer, and "neo n1" lists the
 * Neo N1x relics in name order. Spaces are ignored on both sides, because
 * "neon16" is how the name gets typed in a hurry.
 */
export function matchRelicNames(names: readonly string[], term: string): string[] {
  const needle = squash(term);
  if (!needle) return [];

  const starts: string[] = [];
  const contains: string[] = [];

  for (const name of names) {
    const hay = squash(name);
    const shortName = squash(name.slice(name.indexOf(" ") + 1));
    if (hay.startsWith(needle) || shortName.startsWith(needle)) starts.push(name);
    else if (hay.includes(needle)) contains.push(name);
  }

  const byName = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true });
  return [...starts.sort(byName), ...contains.sort(byName)].slice(0, PICKER_MATCHES);
}

const squash = (value: string) => value.toLowerCase().replace(/\s+/g, "");

/** Every relic's full name, once — the catalogue lists each relic four times, one per state. */
export const catalogueNames = (relics: readonly Relic[]) => [
  ...new Set(relics.map((relic) => relic.fullName)),
];

/** The refinement a typed or stored value names, or null for anything else. */
export const parseRefinement = (value: string): Refinement | null =>
  (ALL_REFINEMENTS as string[]).includes(value) ? (value as Refinement) : null;

/** The tiers a held relic can be in, as its name spells them. */
export const OWNED_TIERS = ["Lith", "Meso", "Neo", "Axi", "Requiem", "Vanguard"] as const;
export type OwnedTier = (typeof OWNED_TIERS)[number];

/** How the inventory list is ordered. "added" is the order the lines were entered in. */
export type OwnedSort = "added" | "name" | "copies";
export const ALL_OWNED_SORTS: OwnedSort[] = ["added", "name", "copies"];

/** The tier word a full relic name starts with: "Neo" for "Neo N16". */
export const tierOfName = (relicName: string) => relicName.slice(0, relicName.indexOf(" "));

/**
 * The lines matching what was typed and the tiers picked, in the order asked for.
 *
 * Nothing picked means every tier, the way the Sets view's kinds work. The
 * term matches the name with spaces ignored, as the picker does, so "neon1"
 * finds what "Neo N1" would. Name order is natural — Neo N2 before Neo N10 —
 * since that is how the game lists them.
 */
export function filterOwnedRelics(
  list: readonly OwnedRelic[],
  term: string,
  tiers: ReadonlySet<string>,
  sort: OwnedSort,
): OwnedRelic[] {
  const needle = squash(term);
  const kept = list.filter(
    (entry) =>
      (tiers.size === 0 || tiers.has(tierOfName(entry.relicName))) &&
      (!needle || squash(entry.relicName).includes(needle)),
  );

  if (sort === "added") return kept;

  const byName = (a: OwnedRelic, b: OwnedRelic) =>
    a.relicName.localeCompare(b.relicName, undefined, { numeric: true }) ||
    ALL_REFINEMENTS.indexOf(a.refinement) - ALL_REFINEMENTS.indexOf(b.refinement);

  return [...kept].sort(
    sort === "name" ? byName : (a, b) => b.quantity - a.quantity || byName(a, b),
  );
}
