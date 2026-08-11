import { describe, expect, it } from "vitest";

import { marketUrl, priceOf, relativeTime, relicMarketUrl, tierLabel } from "./format";
import { prices } from "./testing";

describe("marketUrl", () => {
  it("slugifies a part name", () => {
    expect(marketUrl("Volt Prime Neuroptics Blueprint")).toBe(
      "https://warframe.market/items/volt_prime_neuroptics",
    );
  });

  it("keeps the suffix on the set's own blueprint", () => {
    // "Volt Prime Blueprint" is the main blueprint, a part in its own right:
    // stripping the suffix would point at the set instead.
    expect(marketUrl("Volt Prime Blueprint")).toBe(
      "https://warframe.market/items/volt_prime_blueprint",
    );
  });

  it("leaves a name the market spells the same way alone", () => {
    expect(marketUrl("Forma Blueprint")).toBe("https://warframe.market/items/forma_blueprint");
  });

  it("collapses punctuation rather than passing it through", () => {
    expect(marketUrl("Akbolto Prime Barrel")).toBe(
      "https://warframe.market/items/akbolto_prime_barrel",
    );
  });
});

describe("relicMarketUrl", () => {
  it("carries the _relic suffix the part slugs do not have", () => {
    expect(relicMarketUrl("Axi A1")).toBe("https://warframe.market/items/axi_a1_relic");
    expect(relicMarketUrl("Lith V9")).toBe("https://warframe.market/items/lith_v9_relic");
  });
});

describe("tierLabel", () => {
  it("capitalises a known tier", () => {
    expect(tierLabel("lith")).toBe("Lith");
    expect(tierLabel("axi")).toBe("Axi");
  });

  it("hands back anything it does not know, rather than an empty string", () => {
    expect(tierLabel("vanguard")).toBe("vanguard");
  });
});

describe("priceOf", () => {
  const market = prices({ listed: 30, unlisted: null });

  it("reads the price", () => {
    expect(priceOf(market, "listed")).toBe(30);
  });

  it("is null for unlisted, unknown, and before the batch lands", () => {
    expect(priceOf(market, "unlisted")).toBeNull();
    expect(priceOf(market, "never heard of it")).toBeNull();
    expect(priceOf(undefined, "listed")).toBeNull();
  });
});

describe("relativeTime", () => {
  const now = Date.UTC(2026, 0, 1, 12, 0, 0);

  it("counts in the largest unit that fits", () => {
    expect(relativeTime(now - 30_000, now)).toBe("30 seconds ago");
    expect(relativeTime(now - 4 * 60_000, now)).toBe("4 minutes ago");
    expect(relativeTime(now - 3 * 3600_000, now)).toBe("3 hours ago");
    expect(relativeTime(now - 2 * 86400_000, now)).toBe("2 days ago");
  });

  it("says now for now", () => {
    expect(relativeTime(now, now)).toBe("now");
  });
});
