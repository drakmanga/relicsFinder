import { describe, expect, it } from "vitest";

import {
  countdownLabel,
  kuvaLabel,
  nextWeeklyReset,
  orderRewards,
  orderVendors,
  steelPathKuvaRotation,
  weeklyKuva,
  weeklyVendorCeiling,
} from "./kuva";
import { KUVA_REWARDS, KUVA_VENDORS, type KuvaVendor } from "./kuvaSources";

const vendor = (patch: Partial<KuvaVendor>): KuvaVendor => ({
  id: "v",
  npc: "Vendor",
  where: "Somewhere",
  cost: [{ currency: "steelEssence", amount: 1 }],
  kuva: 1_000,
  weeklyLimit: 1,
  ...patch,
});

describe("nextWeeklyReset", () => {
  it("lands on the coming Monday at midnight UTC", () => {
    // Tuesday 2026-11-24 14:30 UTC.
    expect(nextWeeklyReset(Date.UTC(2026, 10, 24, 14, 30))).toBe(Date.UTC(2026, 10, 30));
  });

  it("is a full week away at the instant of a reset", () => {
    expect(nextWeeklyReset(Date.UTC(2026, 10, 23))).toBe(Date.UTC(2026, 10, 30));
  });

  it("rolls over on Sunday night, not before", () => {
    expect(nextWeeklyReset(Date.UTC(2026, 10, 29, 23, 59))).toBe(Date.UTC(2026, 10, 30));
  });
});

describe("steelPathKuvaRotation", () => {
  // Read from api.warframestat.us/pc/steelPath on 2026-11-24: the week of
  // 2026-11-23 sells the Kitgun Riven Mod, and the 50,000 Kuva slot is the one
  // before it.
  it("is in the shop the week of 2026-11-16", () => {
    const status = steelPathKuvaRotation(Date.UTC(2026, 10, 18));
    expect(status).toEqual({ thisWeek: true, weeksAway: 0, at: Date.UTC(2026, 10, 23) });
  });

  it("comes back seven weeks after the Kitgun week", () => {
    const status = steelPathKuvaRotation(Date.UTC(2026, 10, 24));
    expect(status).toEqual({ thisWeek: false, weeksAway: 7, at: Date.UTC(2027, 0, 11) });
  });

  it("is one week away in the week before its slot", () => {
    expect(steelPathKuvaRotation(Date.UTC(2027, 0, 5)).weeksAway).toBe(1);
  });
});

describe("weekly totals", () => {
  it("multiplies a capped offer by its limit", () => {
    expect(weeklyKuva(vendor({ kuva: 10_000, weeklyLimit: 25 }))).toBe(250_000);
  });

  it("has no total for an uncapped offer", () => {
    expect(weeklyKuva(vendor({ weeklyLimit: null }))).toBeNull();
  });

  it("counts the rotating offer only in its own week", () => {
    const vendors = [
      vendor({ kuva: 10_000, weeklyLimit: 2 }),
      vendor({ kuva: 50_000, weeklyLimit: 1, rotating: true }),
      vendor({ kuva: 99_999, weeklyLimit: null }),
    ];
    expect(weeklyVendorCeiling(vendors, false)).toBe(20_000);
    expect(weeklyVendorCeiling(vendors, true)).toBe(70_000);
  });

  it("adds up the shipped catalogue to 591,000 in an ordinary week", () => {
    expect(weeklyVendorCeiling(KUVA_VENDORS, false)).toBe(591_000);
  });
});

describe("ordering", () => {
  it("puts the biggest weekly total first and the uncapped vendors last", () => {
    const ordered = orderVendors([
      vendor({ id: "free", weeklyLimit: null }),
      vendor({ id: "small", kuva: 6_000, weeklyLimit: 1 }),
      vendor({ id: "big", kuva: 10_000, weeklyLimit: 25 }),
    ]);
    expect(ordered.map((v) => v.id)).toEqual(["big", "small", "free"]);
  });

  it("lists weekly rewards before daily, Baro and seasonal ones", () => {
    const cadences = orderRewards(KUVA_REWARDS).map((r) => r.cadence);
    const firstNonWeekly = cadences.findIndex((c) => c !== "weekly");
    expect(cadences.slice(firstNonWeekly)).not.toContain("weekly");
    expect(orderRewards(KUVA_REWARDS)[0]?.id).toBe("icebind");
  });
});

describe("labels", () => {
  it("formats amounts and ranges with thousands separators", () => {
    expect(kuvaLabel(35_000)).toBe("35,000");
    expect(kuvaLabel([7_000, 21_000])).toBe("7,000–21,000");
  });

  it("keeps the two largest units of a countdown", () => {
    expect(countdownLabel((4 * 24 + 9) * 3_600_000 + 59_000)).toBe("4d 9h");
    expect(countdownLabel(3 * 3_600_000 + 12 * 60_000)).toBe("3h 12m");
    expect(countdownLabel(8 * 60_000)).toBe("8m");
    expect(countdownLabel(-1)).toBe("0m");
  });
});
