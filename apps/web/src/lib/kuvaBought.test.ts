import { describe, expect, it } from "vitest";

import {
  countsFor,
  rewardsFor,
  rewardsObtained,
  setCount,
  setReward,
  weekStartOf,
  weeklyBought,
  weeklyRemaining,
} from "./kuvaBought";
import type { KuvaVendor } from "./kuvaSources";

const vendor = (patch: Partial<KuvaVendor>): KuvaVendor => ({
  id: "v",
  npc: "Vendor",
  where: "Somewhere",
  cost: [{ currency: "steelEssence", amount: 1 }],
  kuva: 1_000,
  weeklyLimit: 3,
  ...patch,
});

// Tuesday 2026-11-24, and the Monday after it.
const TUESDAY = Date.UTC(2026, 10, 24, 14, 30);
const NEXT_MONDAY = Date.UTC(2026, 10, 30, 0, 1);

describe("the week a count belongs to", () => {
  it("starts on the Monday before", () => {
    expect(weekStartOf(TUESDAY)).toBe(Date.UTC(2026, 10, 23));
  });

  it("keeps this week's counts", () => {
    const stored = setCount(null, TUESDAY, vendor({}), 2);
    expect(countsFor(stored, TUESDAY)).toEqual({ v: 2 });
  });

  it("reads last week's counts as empty once the reset has passed", () => {
    const stored = setCount(null, TUESDAY, vendor({}), 2);
    expect(countsFor(stored, NEXT_MONDAY)).toEqual({});
  });

  it("drops last week's other counts when this week's first one is written", () => {
    const old = setCount(null, TUESDAY, vendor({ id: "a" }), 3);
    const fresh = setCount(old, NEXT_MONDAY, vendor({ id: "b" }), 1);
    expect(countsFor(fresh, NEXT_MONDAY)).toEqual({ b: 1 });
  });
});

describe("setCount", () => {
  it("cannot pass the vendor's limit or go below zero", () => {
    expect(setCount(null, TUESDAY, vendor({ weeklyLimit: 3 }), 9).counts).toEqual({ v: 3 });
    expect(setCount(null, TUESDAY, vendor({}), -1).counts).toEqual({ v: 0 });
  });

  it("records nothing for an uncapped vendor", () => {
    expect(setCount(null, TUESDAY, vendor({ weeklyLimit: null }), 2).counts).toEqual({ v: 0 });
  });
});

describe("weeklyRemaining", () => {
  const vendors = [
    vendor({ id: "teshin", kuva: 10_000, weeklyLimit: 25 }),
    vendor({ id: "rotation", kuva: 50_000, weeklyLimit: 1, rotating: true }),
    vendor({ id: "free", kuva: 10_000, weeklyLimit: null }),
  ];

  it("takes what was bought off each capped offer", () => {
    expect(weeklyRemaining(vendors, { teshin: 5 }, false)).toBe(200_000);
  });

  it("counts the rotating offer only in its week", () => {
    expect(weeklyRemaining(vendors, {}, true)).toBe(300_000);
    expect(weeklyRemaining(vendors, { rotation: 1 }, true)).toBe(250_000);
  });

  it("and what was bought add up to the week's ceiling", () => {
    const counts = { teshin: 5, rotation: 1 };
    expect(weeklyBought(vendors, counts, true)).toBe(100_000);
    expect(weeklyBought(vendors, counts, true) + weeklyRemaining(vendors, counts, true)).toBe(
      300_000,
    );
  });

  it("ignores a rotating purchase left over from outside its week", () => {
    expect(weeklyBought(vendors, { rotation: 1 }, false)).toBe(0);
  });
});

describe("weekly rewards", () => {
  it("keeps a reward's Kuva beside the vendor counts", () => {
    const bought = setCount(null, TUESDAY, vendor({}), 2);
    const both = setReward(bought, TUESDAY, "icebind", 45_750);
    expect(countsFor(both, TUESDAY)).toEqual({ v: 2 });
    expect(rewardsFor(both, TUESDAY)).toEqual({ icebind: 45_750 });
  });

  it("keeps the rewards when a vendor count changes", () => {
    const rewarded = setReward(null, TUESDAY, "circuit-milestone", 20_000);
    expect(rewardsFor(setCount(rewarded, TUESDAY, vendor({}), 1), TUESDAY)).toEqual({
      "circuit-milestone": 20_000,
    });
  });

  it("forgets last week's rewards after the reset", () => {
    const rewarded = setReward(null, TUESDAY, "icebind", 45_750);
    expect(rewardsFor(rewarded, NEXT_MONDAY)).toEqual({});
  });

  it("never stores a negative or nonsense amount", () => {
    expect(setReward(null, TUESDAY, "icebind", -5).rewards).toEqual({ icebind: 0 });
    expect(setReward(null, TUESDAY, "icebind", Number.NaN).rewards).toEqual({ icebind: 0 });
    expect(setReward(null, TUESDAY, "icebind", 9e9).rewards).toEqual({ icebind: 1_000_000 });
  });

  it("adds every reward up", () => {
    expect(rewardsObtained({ icebind: 45_750, sortie: 12_000 })).toBe(57_750);
    expect(rewardsObtained({})).toBe(0);
  });
});
