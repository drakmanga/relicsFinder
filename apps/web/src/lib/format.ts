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
