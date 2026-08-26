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
 * Relics warframe.market does not spell the way it names them.
 *
 * The market's own inconsistency rather than ours: Axi Y2 is sold at
 * `axi_o7_relic`, because the item was created while the relic was called O7
 * and only its display name was corrected afterwards. Of the 772 relics the
 * market carries, measured on 2026-08-26, it is the only one whose slug does
 * not derive from its name.
 *
 * This is the same table as RELIC_LISTINGS in RelicMarketService, and it is
 * deliberately a second copy rather than a shared one. A part's slug reaches
 * the browser on the price payload, so the frontend can prefer what the server
 * resolved; a relic's does not — RelicPrice carries a name and a price and
 * nothing else — so the button here has no answer to read and has to derive
 * one. Putting the slug on the wire would mean changing the model, the
 * controller, the wire type and the flattened RelicPriceMap for a single
 * relic. If a second entry ever appears, that trade is worth revisiting.
 */
const RELIC_LISTINGS: Record<string, string> = {
  axi_y2: "axi_o7_relic",
};

/**
 * warframe.market URL for the relic itself, which is a tradeable item too.
 *
 * A separate rule, and it stays separate: the slug carries a "_relic" suffix
 * the part slugs do not have — `axi_a1_relic`, not `axi_a1`. Nothing on the
 * wire carries a relic's slug, so this one is always derived.
 */
export function relicMarketUrl(relicFullName: string): string {
  const base = derivedSlug(relicFullName);
  return `${MARKET_ITEMS}/${RELIC_LISTINGS[base] ?? `${base}_relic`}`;
}

/** Platinum price of an item, or null when unlisted or not yet fetched. */
export function priceOf(
  prices: Map<string, { averagePrice: number | null }> | undefined,
  itemName: string,
): number | null {
  return prices?.get(itemName)?.averagePrice ?? null;
}
