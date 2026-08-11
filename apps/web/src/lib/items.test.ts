import { describe, expect, it } from "vitest";

import { applyItemPriceCeiling, buildItemRows, synthesiseItemRow } from "./items";
import { emptyFilters } from "./rows";
import { prices, relic, reward } from "./testing";
import type { PrimeItemRow } from "./items";

const catalogue = [
  relic({
    fullName: "Lith V9",
    tier: "lith",
    refinement: "intact",
    rewards: [
      reward({ itemName: "Volt Prime Neuroptics Blueprint", rarity: "rare", chance: 2 }),
      reward({ itemName: "Forma Blueprint", rarity: "common", chance: 25.33 }),
    ],
  }),
  relic({
    fullName: "Axi A1",
    tier: "axi",
    refinement: "intact",
    rewards: [reward({ itemName: "Volt Prime Neuroptics Blueprint", rarity: "rare", chance: 10 })],
  }),
  relic({
    fullName: "Lith V9",
    refinement: "radiant",
    rewards: [reward({ itemName: "Volt Prime Neuroptics Blueprint", rarity: "rare", chance: 10 })],
  }),
];

describe("buildItemRows", () => {
  it("gives one row per part however many relics hold it", () => {
    const rows = buildItemRows(catalogue, emptyFilters());
    const volt = rows.filter((r) => r.itemName === "Volt Prime Neuroptics Blueprint");

    expect(volt).toHaveLength(1);
    expect(volt[0]?.relicNames).toEqual(["Lith V9", "Axi A1"]);
  });

  it("reads one refinement, so the sources are not counted four times", () => {
    const rows = buildItemRows(catalogue, { ...emptyFilters(), refinement: "intact" });
    const volt = rows.find((r) => r.itemName === "Volt Prime Neuroptics Blueprint");

    // Lith V9 appears twice in the catalogue, once per state.
    expect(volt?.relicNames).toHaveLength(2);
  });

  it("keeps the best chance across the relics that drop it", () => {
    const rows = buildItemRows(catalogue, emptyFilters());
    const volt = rows.find((r) => r.itemName === "Volt Prime Neuroptics Blueprint");

    expect(volt?.bestChance).toBe(10);
  });

  it("sorts the quantity-prefixed rewards to the end", () => {
    // "2X Forma Blueprint" is not a Prime part, and this is a list of Prime
    // parts: it belongs after the Z's, not ahead of the A's.
    const withQuantity = [
      relic({ rewards: [reward({ itemName: "2X Forma Blueprint" })] }),
      relic({ rewards: [reward({ itemName: "Akbolto Prime Barrel" })] }),
    ];
    const rows = buildItemRows(withQuantity, emptyFilters());

    expect(rows.map((r) => r.itemName)).toEqual(["Akbolto Prime Barrel", "2X Forma Blueprint"]);
  });

  it("finds a part by the name of a relic that drops it", () => {
    const rows = buildItemRows(catalogue, { ...emptyFilters(), term: "axi a1" });

    expect(rows.map((r) => r.itemName)).toEqual(["Volt Prime Neuroptics Blueprint"]);
  });

  it("derives the set, and leaves Forma without one", () => {
    const rows = buildItemRows(catalogue, emptyFilters());

    expect(rows.find((r) => r.itemName.startsWith("Volt"))?.setName).toBe("Volt Prime");
    expect(rows.find((r) => r.itemName === "Forma Blueprint")?.setName).toBeNull();
  });
});

describe("applyItemPriceCeiling", () => {
  const row = (itemName: string): PrimeItemRow => ({
    itemName,
    setName: null,
    rarity: "common",
    relicNames: ["Lith V9"],
    tiers: ["lith"],
    bestChance: 25.33,
  });

  it("caps on the part's own price, not on a relic's best drop", () => {
    const kept = applyItemPriceCeiling(
      [row("cheap"), row("dear")],
      10,
      prices({ cheap: 5, dear: 500 }),
    );

    expect(kept.map((r) => r.itemName)).toEqual(["cheap"]);
  });

  it("keeps a part priced exactly at the ceiling", () => {
    // A ceiling of 10 means "10 or less". Off by one here silently drops the
    // rows a reader set the slider to find.
    const kept = applyItemPriceCeiling([row("exact")], 10, prices({ exact: 10 }));

    expect(kept.map((r) => r.itemName)).toEqual(["exact"]);
  });

  it("keeps a part nobody has listed", () => {
    const kept = applyItemPriceCeiling([row("unlisted")], 10, prices({ unlisted: null }));

    expect(kept).toHaveLength(1);
  });

  it("does nothing before the prices land", () => {
    // The rows exist before the batch answers; filtering on nothing would empty
    // the view for as long as that takes.
    expect(applyItemPriceCeiling([row("a"), row("b")], 10, undefined)).toHaveLength(2);
  });
});

describe("synthesiseItemRow", () => {
  it("builds a panel row from the first Intact relic that drops the part", () => {
    const built = synthesiseItemRow(catalogue, "Volt Prime Neuroptics Blueprint");

    expect(built).toMatchObject({
      relicFullName: "Lith V9",
      refinement: "intact",
      itemName: "Volt Prime Neuroptics Blueprint",
      rarity: "rare",
      chance: 2,
    });
  });

  it("reads Intact even when another state comes first in the catalogue", () => {
    // The panel quotes the state the catalogue is read at. All four states hold
    // the same items, so the first match is not necessarily the right one.
    const radiantFirst = [
      relic({
        fullName: "Lith V9",
        refinement: "radiant",
        rewards: [reward({ itemName: "Volt Prime Blueprint", rarity: "rare", chance: 20 })],
      }),
      relic({
        fullName: "Axi A1",
        tier: "axi",
        refinement: "intact",
        rewards: [reward({ itemName: "Volt Prime Blueprint", rarity: "rare", chance: 2 })],
      }),
    ];

    expect(synthesiseItemRow(radiantFirst, "Volt Prime Blueprint")).toMatchObject({
      relicFullName: "Axi A1",
      refinement: "intact",
      chance: 2,
    });
  });

  it("is null for a part nothing drops, and for no part at all", () => {
    expect(synthesiseItemRow(catalogue, "Nothing Prime Blueprint")).toBeNull();
    expect(synthesiseItemRow(catalogue, null)).toBeNull();
  });
});
