import { describe, expect, it } from "vitest";

import { availableCategories, filterByPhase, filterByStatus } from "./setCategories";
import type { PrimeSet } from "./setCompletion";
import type { LifecycleMap, PrimeLifecycle } from "../api/types";

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

/**
 * Which sets the phase chips let through.
 *
 * The two cases that carry the design are the last two: a set the lifecycle
 * answer never names has to filter as "Not dated", because that is what its own
 * badge says, and a lifecycle that has not answered at all has to filter as
 * nothing, because the table must not empty and refill while it lands.
 */
describe("filterByPhase", () => {
  const volt = set({ setName: "Volt Prime", category: "warframe" });
  const wisp = set({ setName: "Wisp Prime", category: "warframe" });
  const kavasa = set({ setName: "Kavasa Prime", category: "pet" });

  const lifecycle: LifecycleMap = new Map(
    (
      [
        { setName: "Volt Prime", phase: "dropping", releaseDate: null, vaultDate: null },
        { setName: "Wisp Prime", phase: "recently-vaulted", releaseDate: null, vaultDate: null },
      ] satisfies PrimeLifecycle[]
    ).map((row) => [row.setName, row]),
  );

  const all = [volt, wisp, kavasa];

  it("lets everything through when no chip is on", () => {
    expect(filterByPhase(all, new Set(), lifecycle)).toEqual(all);
  });

  it("keeps only the sets whose badge reads the chip that is on", () => {
    expect(filterByPhase(all, new Set(["recently-vaulted"]), lifecycle)).toEqual([wisp]);
  });

  it("shows the union of two chips rather than their intersection", () => {
    expect(filterByPhase(all, new Set(["dropping", "recently-vaulted"]), lifecycle)).toEqual([
      volt,
      wisp,
    ]);
  });

  it("counts a set the lifecycle never names as the Not dated its badge says", () => {
    expect(filterByPhase(all, new Set(["unknown"]), lifecycle)).toEqual([kavasa]);
  });

  it("filters nothing while the lifecycle request is still in flight", () => {
    expect(filterByPhase(all, new Set(["dropping"]), undefined)).toEqual(all);
  });
});
