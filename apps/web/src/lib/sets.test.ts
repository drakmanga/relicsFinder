import { describe, expect, it } from "vitest";

import { partsOfSet, setOf, sourcesFor } from "./sets";
import { relic, reward } from "./testing";

describe("setOf", () => {
  it("takes everything up to and including the word Prime", () => {
    expect(setOf("Volt Prime Neuroptics Blueprint")).toBe("Volt Prime");
    expect(setOf("Volt Prime Blueprint")).toBe("Volt Prime");
  });

  it("handles the multi-word names without a list of exceptions", () => {
    expect(setOf("Dual Kamas Prime Blade")).toBe("Dual Kamas Prime");
    expect(setOf("Akbolto Prime Barrel")).toBe("Akbolto Prime");
  });

  it("returns the set itself when the name is already the set", () => {
    expect(setOf("Volt Prime")).toBe("Volt Prime");
  });

  it("has no set for what is not a Prime part", () => {
    expect(setOf("Forma Blueprint")).toBeNull();
    expect(setOf("2X Forma Blueprint")).toBeNull();
    expect(setOf("1200X Kuva")).toBeNull();
  });

  it("does not match Prime inside a longer word", () => {
    expect(setOf("Primed Flow")).toBeNull();
  });
});

describe("sourcesFor", () => {
  const catalogue = [
    relic({
      fullName: "Lith V9",
      refinement: "intact",
      rewards: [reward({ itemName: "Volt Prime Blueprint", chance: 2 })],
    }),
    relic({
      fullName: "Axi A1",
      tier: "axi",
      refinement: "intact",
      rewards: [reward({ itemName: "Volt Prime Blueprint", chance: 10 })],
    }),
    relic({
      fullName: "Lith V9",
      refinement: "radiant",
      rewards: [reward({ itemName: "Volt Prime Blueprint", chance: 20 })],
    }),
    relic({ fullName: "Meso M1", rewards: [reward({ itemName: "Something Else" })] }),
  ];

  it("lists every relic that drops the item, best chance first", () => {
    const sources = sourcesFor(catalogue, "Volt Prime Blueprint");

    expect(sources.map((s) => s.chance)).toEqual([20, 10, 2]);
  });

  it("keeps every refinement, so the caller can pick one", () => {
    const sources = sourcesFor(catalogue, "Volt Prime Blueprint");

    expect(sources.map((s) => s.refinement)).toContain("radiant");
    expect(sources.map((s) => s.refinement)).toContain("intact");
  });

  it("is empty for an item nothing drops", () => {
    expect(sourcesFor(catalogue, "Nothing Prime Blueprint")).toEqual([]);
  });
});

describe("partsOfSet", () => {
  const catalogue = [
    relic({
      rewards: [
        reward({ itemName: "Volt Prime Chassis Blueprint" }),
        reward({ itemName: "Volt Prime Blueprint" }),
        reward({ itemName: "Ash Prime Helmet Blueprint" }),
        reward({ itemName: "Forma Blueprint" }),
      ],
    }),
    // A second relic dropping one of the same parts must not duplicate it.
    relic({ rewards: [reward({ itemName: "Volt Prime Blueprint" })] }),
  ];

  it("returns each part of the set once, sorted", () => {
    expect(partsOfSet(catalogue, "Volt Prime")).toEqual([
      "Volt Prime Blueprint",
      "Volt Prime Chassis Blueprint",
    ]);
  });

  it("is empty for a set nothing in the catalogue belongs to", () => {
    expect(partsOfSet(catalogue, "Nothing Prime")).toEqual([]);
  });
});
