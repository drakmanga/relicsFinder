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
 * warframe.market item URL.
 *
 * The drop tables append "Blueprint" to most part names and the market does
 * not, which is the same normalisation the backend applies before calling the
 * API — kept in sync with RelicMarketService.itemSlug.
 */
export function marketUrl(itemName: string): string {
  let cleaned = itemName;

  if (/\sblueprint$/i.test(itemName)) {
    const withoutSuffix = itemName.slice(0, -" blueprint".length);
    const remainder = withoutSuffix.toLowerCase().trim();
    // "Volt Prime Blueprint" is the main blueprint, a part in its own right —
    // stripping the suffix would point at the set instead.
    if (remainder.includes("prime") && !remainder.endsWith("prime")) {
      cleaned = withoutSuffix;
    }
  }

  const slug = cleaned
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return `https://warframe.market/items/${slug}`;
}

/**
 * The same URL, from a slug the server has already resolved.
 *
 * Preferred over `marketUrl` wherever a price came back with the item's slug on
 * it: the rule that turns a name into a slug is right for every part and for
 * 159 sets out of 160, and the market is the only thing that knows about the
 * one it is wrong for — Kavasa Prime is sold as `kavasa_prime_kubrow_collar_set`.
 */
export function marketUrlFromSlug(slug: string): string {
  return `https://warframe.market/items/${slug}`;
}

/**
 * warframe.market URL for the relic itself, which is a tradeable item too.
 *
 * The slug carries a "_relic" suffix the part slugs do not have: `axi_a1_relic`,
 * not `axi_a1`.
 */
export function relicMarketUrl(relicFullName: string): string {
  const slug = relicFullName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return `https://warframe.market/items/${slug}_relic`;
}

/** Platinum price of an item, or null when unlisted or not yet fetched. */
export function priceOf(
  prices: Map<string, { averagePrice: number | null }> | undefined,
  itemName: string,
): number | null {
  return prices?.get(itemName)?.averagePrice ?? null;
}
