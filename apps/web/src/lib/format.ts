const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

/**
 * "updated 4 minutes ago" — driven by TanStack Query's `dataUpdatedAt`, which
 * is why nothing here needs to store a timestamp of its own.
 */
export function relativeTime(timestamp: number, now = Date.now()): string {
  const seconds = Math.round((timestamp - now) / 1000);
  const abs = Math.abs(seconds);

  if (abs < 60) return rtf.format(Math.round(seconds), "second");
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(seconds / 3600), "hour");
  return rtf.format(Math.round(seconds / 86400), "day");
}

const TIER_LABEL: Record<string, string> = {
  lith: "Lith",
  meso: "Meso",
  neo: "Neo",
  axi: "Axi",
  requiem: "Requiem",
};

export const tierLabel = (tier: string) => TIER_LABEL[tier] ?? tier;

/**
 * Where every warframe.market link in this app is built.
 *
 * The host and the shape of an item URL are written once, here. They used to be
 * written in five places — four copies of the slug rule plus a template literal
 * in EndoTable — and the copies drifted apart, which is the whole reason the
 * Market button worked on Volt and not on Gyre.
 */
const MARKET_ITEMS = "https://warframe.market/items";

/**
 * A name as warframe.market spells it in a URL — the same rule as
 * RelicMarketService.baseSlug, and it has to stay the same rule.
 *
 * Two things it deliberately does not do. It does not strip a trailing
 * "Blueprint": the shortened slug answered for years, but with a 301 to the
 * full one, and the backend's HTTP client follows a redirect silently where a
 * browser tab does not. Warframes released since Hildryn have no redirect
 * behind them at all — measured 2026-08-25, `gyre_prime_chassis` and
 * `revenant_prime_chassis` are 404 while the full names are 200 — so the
 * shortened slug opened a tab on a missing item.
 *
 * And it turns "&" into "and" rather than a separator: the market writes "Cobra
 * & Crane Prime Hilt" as `cobra_and_crane_prime_hilt`, where collapsing the
 * ampersand gives `cobra_crane_prime_hilt`, which is 404 and was every dual
 * weapon in the game.
 */
function derivedSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/**
 * warframe.market item URL, from the slug the server resolved where there is
 * one and from the item's name where there is not.
 *
 * The market is the only thing that knows how it spells an item, and
 * `ItemPrice.slug` is that answer coming back with the price — so pass it
 * whenever the row has a price entry in hand. Deriving a slug from a name is a
 * guess, and this function exists in its current shape because the guess
 * drifted; it stays as the fallback for the rows that have no price yet, and
 * for the one set the rule cannot reach at all — Kavasa Prime is sold as
 * `kavasa_prime_kubrow_collar_set`, which no rule applied to "Kavasa Prime Set"
 * would have produced.
 */
export function marketUrl(itemName: string, resolvedSlug?: string | null): string {
  return `${MARKET_ITEMS}/${resolvedSlug || derivedSlug(itemName)}`;
}

/**
 * warframe.market URL for the relic itself, which is a tradeable item too.
 *
 * A separate rule, and it stays separate: the slug carries a "_relic" suffix
 * the part slugs do not have — `axi_a1_relic`, not `axi_a1`. Nothing on the
 * wire carries a relic's slug, so this one is always derived.
 */
export function relicMarketUrl(relicFullName: string): string {
  return `${MARKET_ITEMS}/${derivedSlug(relicFullName)}_relic`;
}

/** Platinum price of an item, or null when unlisted or not yet fetched. */
export function priceOf(
  prices: Map<string, { averagePrice: number | null }> | undefined,
  itemName: string,
): number | null {
  return prices?.get(itemName)?.averagePrice ?? null;
}
