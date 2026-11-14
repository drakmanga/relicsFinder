import { describe, expect, it } from "vitest";

import type { Relic } from "../api/types";
import { wantedByRelic, wantedItems } from "./crackWanted";
import type { WishlistEntry } from "./wishlist";

const relic = (fullName: string, refinement: Relic["refinement"], drops: string[]): Relic => ({
  tier: "neo",
  relicName: fullName.split(" ")[1]!,
  fullName,
  refinement,
  rewards: drops.map((itemName) => ({ id: itemName, itemName, rarity: "common", chance: 25 })),
});

const catalogue = [
  relic("Neo V1", "intact", ["Volt Prime Systems Blueprint", "Forma Blueprint"]),
  relic("Neo V1", "radiant", ["Volt Prime Systems Blueprint", "Forma Blueprint"]),
  relic("Neo W1", "intact", ["Wisp Prime Blueprint", "Wisp Prime Chassis Blueprint"]),
  relic("Neo A1", "intact", ["Ash Prime Blueprint"]),
];

const line = (itemName: string, kind: WishlistEntry["kind"]): WishlistEntry => ({
  itemName,
  kind,
  tier: "neo",
  relicFullName: "",
  refinement: "intact",
  qty: 1,
});

describe("wantedItems", () => {
  it("takes parts as they are, and a set through the pieces not owned yet", () => {
    const wanted = wantedItems(
      [line("Volt Prime Systems Blueprint", "part"), line("Wisp Prime", "set")],
      new Map([["Wisp Prime Blueprint", 1]]),
      catalogue,
    );

    expect([...wanted].sort()).toEqual([
      "Volt Prime Systems Blueprint",
      "Wisp Prime Chassis Blueprint",
    ]);
  });

  it("ignores lines that name no drop", () => {
    expect(wantedItems([line("Neo V1", "relic")], new Map(), catalogue).size).toBe(0);
  });
});

describe("wantedByRelic", () => {
  it("lists each relic's wanted drops once, whatever its refinements", () => {
    const byRelic = wantedByRelic(catalogue, new Set(["Volt Prime Systems Blueprint"]));

    expect([...byRelic]).toEqual([["Neo V1", ["Volt Prime Systems Blueprint"]]]);
  });
});
