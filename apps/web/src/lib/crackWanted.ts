import type { Relic } from "../api/types";
import type { OwnedCounts } from "./owned";
import { partsOfSet } from "./sets";
import type { WishlistEntry } from "./wishlist";

/**
 * Which drops the reader is after, read from the wishlist, and which held
 * relics can drop them.
 *
 * A part wanted for itself or for its ducats counts as it is. A set counts
 * through the pieces of it the reader does not own yet: a set two pieces from
 * done should not light every relic that drops the other two. Ayatan and relic
 * lines name no drop, so they count for nothing here.
 */
export function wantedItems(
  wishlist: readonly WishlistEntry[],
  owned: OwnedCounts,
  catalogue: readonly Relic[],
): Set<string> {
  const wanted = new Set<string>();
  for (const entry of wishlist) {
    if (entry.kind === "part" || entry.kind === "ducat") wanted.add(entry.itemName);
    if (entry.kind === "set") {
      for (const part of partsOfSet([...catalogue], entry.itemName)) {
        if ((owned.get(part) ?? 0) === 0) wanted.add(part);
      }
    }
  }
  return wanted;
}

/**
 * The wanted drops of each relic, by full name, for the relics that have any.
 * By name and not by refinement: a refinement changes the chances, never the
 * drops.
 */
export function wantedByRelic(
  catalogue: readonly Relic[],
  wanted: ReadonlySet<string>,
): Map<string, string[]> {
  const byRelic = new Map<string, string[]>();
  if (wanted.size === 0) return byRelic;

  for (const relic of catalogue) {
    if (byRelic.has(relic.fullName)) continue;
    const drops = relic.rewards
      .map((reward) => reward.itemName)
      .filter((itemName) => wanted.has(itemName));
    if (drops.length > 0) byRelic.set(relic.fullName, [...new Set(drops)].sort());
  }
  return byRelic;
}
