import { describe, expect, it } from "vitest";

import { availableCategories, filterByStatus } from "./setCategories";
import type { PrimeSet } from "./setCompletion";

/**
 * Which sets the progress switch lets through.
 *
 * The unfinished filter is the one place a reader goes to find out what they
 * still need, so a set that cannot be built must not fall out of it. That is
 * the whole reason this counts copies rather than names: Kestrel Prime with one
 * Blade of two is three parts of four, not three pieces of three.
 */
const set = (overrides: Partial<PrimeSet>): PrimeSet => ({
  setName: "Kestrel Prime",
  category: "melee",
  parts: [],
  ownedCount: 0,
  neededCount: 4,
  missingCost: 0,
  costIncomplete: false,
  ...overrides,
});

describe("filterByStatus", () => {
  const oneBladeShort = set({ ownedCount: 3, neededCount: 4 });
  const built = set({ setName: "Volt Prime", ownedCount: 4, neededCount: 4 });

  it("keeps a set missing one copy in the unfinished list", () => {
    expect(filterByStatus([oneBladeShort, built], "missing")).toEqual([oneBladeShort]);
  });

  it("calls a set complete only when every copy is in hand", () => {
    expect(filterByStatus([oneBladeShort, built], "complete")).toEqual([built]);
  });

  it("lets everything through when the switch is on all", () => {
    expect(filterByStatus([oneBladeShort, built], "all")).toHaveLength(2);
  });
});

describe("availableCategories", () => {
  it("offers a chip only for a kind the catalogue actually holds", () => {
    expect(availableCategories([set({ category: "melee" }), set({ category: null })])).toEqual([
      "melee",
    ]);
  });

  it("orders the chips the way the game does, not alphabetically", () => {
    expect(
      availableCategories([set({ category: "arch-gun" }), set({ category: "warframe" })]),
    ).toEqual(["warframe", "arch-gun"]);
  });
});
