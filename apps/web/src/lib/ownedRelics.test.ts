import { describe, expect, it } from "vitest";

import type { OwnedRelic } from "../api/types";
import {
  PICKER_MATCHES,
  addOwnedRelic,
  filterOwnedRelics,
  matchRelicNames,
  setOwnedRelic,
  totalOwnedRelics,
} from "./ownedRelics";

const n16: OwnedRelic = { relicName: "Neo N16", refinement: "radiant", quantity: 3 };

describe("setOwnedRelic", () => {
  it("adds a line that was not there", () => {
    expect(setOwnedRelic([], "Neo N16", "radiant", 3)).toEqual([n16]);
  });

  it("changes the quantity of a line that was", () => {
    expect(setOwnedRelic([n16], "Neo N16", "radiant", 2)).toEqual([{ ...n16, quantity: 2 }]);
  });

  it("removes a line set to zero", () => {
    expect(setOwnedRelic([n16], "Neo N16", "radiant", 0)).toEqual([]);
  });

  it("keeps the same relic in another refinement as its own line", () => {
    const both = setOwnedRelic([n16], "Neo N16", "intact", 1);

    expect(both).toHaveLength(2);
    expect(both[0]).toEqual(n16);
  });

  it("does not touch the list it was given", () => {
    const list = [n16];
    setOwnedRelic(list, "Neo N16", "radiant", 9);

    expect(list).toEqual([n16]);
  });
});

describe("addOwnedRelic", () => {
  it("adds copies to a line already held", () => {
    expect(addOwnedRelic([n16], "Neo N16", "radiant", 2)).toEqual([{ ...n16, quantity: 5 }]);
  });

  it("creates the line when it is new", () => {
    expect(addOwnedRelic([], "Axi A20", "intact", 1)).toEqual([
      { relicName: "Axi A20", refinement: "intact", quantity: 1 },
    ]);
  });
});

describe("totalOwnedRelics", () => {
  it("counts copies, not lines", () => {
    expect(totalOwnedRelics([n16, { ...n16, refinement: "intact", quantity: 2 }])).toBe(5);
  });
});

describe("matchRelicNames", () => {
  const names = ["Lith N16", "Neo N16", "Neo N1", "Neo N10", "Axi A20", "Meso N6"];

  it("ranks names starting with the term first, in natural order", () => {
    expect(matchRelicNames(names, "neo n1")).toEqual(["Neo N1", "Neo N10", "Neo N16"]);
  });

  it("matches the short name alone", () => {
    expect(matchRelicNames(names, "a20")).toEqual(["Axi A20"]);
  });

  it("ignores spaces in what was typed", () => {
    expect(matchRelicNames(names, "neon16")).toEqual(["Neo N16"]);
  });

  it("offers nothing for an empty term", () => {
    expect(matchRelicNames(names, "  ")).toEqual([]);
  });

  it("caps the list", () => {
    const many = Array.from({ length: 30 }, (_, i) => `Lith A${i}`);
    expect(matchRelicNames(many, "lith")).toHaveLength(PICKER_MATCHES);
  });
});

describe("filterOwnedRelics", () => {
  const list: OwnedRelic[] = [
    { relicName: "Neo N10", refinement: "intact", quantity: 1 },
    { relicName: "Axi A2", refinement: "radiant", quantity: 5 },
    { relicName: "Neo N2", refinement: "radiant", quantity: 3 },
    { relicName: "Neo N2", refinement: "intact", quantity: 3 },
  ];
  const names = (rows: OwnedRelic[]) => rows.map((r) => `${r.relicName} ${r.refinement}`);

  it("keeps everything, in the order entered, when nothing is asked", () => {
    expect(filterOwnedRelics(list, "", new Set(), "added")).toEqual(list);
  });

  it("matches the name with spaces ignored", () => {
    expect(names(filterOwnedRelics(list, "neon2", new Set(), "added"))).toEqual([
      "Neo N2 radiant",
      "Neo N2 intact",
    ]);
  });

  it("keeps only the tiers picked", () => {
    expect(names(filterOwnedRelics(list, "", new Set(["Axi"]), "added"))).toEqual([
      "Axi A2 radiant",
    ]);
  });

  it("sorts names naturally, refinements in game order", () => {
    expect(names(filterOwnedRelics(list, "", new Set(), "name"))).toEqual([
      "Axi A2 radiant",
      "Neo N2 intact",
      "Neo N2 radiant",
      "Neo N10 intact",
    ]);
  });

  it("sorts by copies, most first", () => {
    expect(filterOwnedRelics(list, "", new Set(), "copies")[0]!.relicName).toBe("Axi A2");
  });
});
