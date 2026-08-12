import { describe, expect, it } from "vitest";

import { applyToken, remember, suggestions, tokensAdded } from "./filterMemory";
import { emptyFilters } from "./rows";
import type { Tier } from "../api/types";

describe("tokensAdded", () => {
  it("counts a filter that was switched on", () => {
    const before = emptyFilters();
    const after = { ...before, tiers: new Set<Tier>(["axi"]) };

    expect(tokensAdded(before, after)).toEqual([{ kind: "tier", value: "axi" }]);
  });

  it("ignores a filter that was switched off", () => {
    const before = { ...emptyFilters(), tiers: new Set<Tier>(["axi"]) };

    expect(tokensAdded(before, emptyFilters())).toEqual([]);
  });

  it("ignores the ends that mean 'no filter'", () => {
    const before = { ...emptyFilters(), vault: "vaulted" as const, refinement: "radiant" as const };
    const after = emptyFilters();

    expect(tokensAdded(before, after)).toEqual([]);
  });
});

describe("suggestions", () => {
  it("offers nothing until a filter has been used more than once", () => {
    remember("relics", [{ kind: "tier", value: "lith" }]);

    expect(suggestions("relics", emptyFilters())).toEqual([]);
  });

  it("ranks by how often a filter is used, and skips the ones already on", () => {
    for (let use = 0; use < 3; use++) remember("items", [{ kind: "vault", value: "vaulted" }]);
    for (let use = 0; use < 2; use++) remember("items", [{ kind: "tier", value: "neo" }]);

    expect(suggestions("items", emptyFilters())).toEqual([
      { kind: "vault", value: "vaulted" },
      { kind: "tier", value: "neo" },
    ]);

    const vaulted = { ...emptyFilters(), vault: "vaulted" as const };
    expect(suggestions("items", vaulted)).toEqual([{ kind: "tier", value: "neo" }]);
  });

  it("keeps a view's habits to itself", () => {
    for (let use = 0; use < 2; use++) remember("relics", [{ kind: "tier", value: "meso" }]);

    expect(suggestions("items", emptyFilters())).not.toContainEqual({
      kind: "tier",
      value: "meso",
    });
  });
});

describe("applyToken", () => {
  it("adds to the sets and replaces the exclusive filters", () => {
    const start = { ...emptyFilters(), tiers: new Set<Tier>(["lith"]) };

    expect(applyToken(start, { kind: "tier", value: "axi" }).tiers).toEqual(
      new Set<Tier>(["lith", "axi"]),
    );
    expect(applyToken(start, { kind: "vault", value: "vaulted" }).vault).toBe("vaulted");
    expect(applyToken(start, { kind: "refinement", value: "radiant" }).refinement).toBe("radiant");
  });
});
