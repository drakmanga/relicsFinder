import { describe, expect, it } from "vitest";

import type { Fissure } from "../api/types";
import { crackLines, groupCrack, openSummary } from "./crackGroups";
import type { CrackRow, CrackVerdict } from "./relicCrack";

const fissure = (id: string): Fissure => ({
  id,
  node: `${id} (Void)`,
  missionType: "Capture",
  tier: "Neo",
  steelPath: false,
  voidStorm: false,
  expiry: "2026-11-14T13:00:00.000Z",
  minutes: 1,
});

const hepit = fissure("Hepit");
const ukko = fissure("Ukko");

const row = (name: string, verdict: CrackVerdict, at: Fissure | null, value: number): CrackRow => ({
  key: `${name}|intact`,
  relic: { relicName: name, refinement: "intact", quantity: 1 },
  tier: "neo",
  value,
  ducats: 0,
  best: at ? { fissure: at, minutes: 1, score: value } : null,
  verdict,
  soonest: null,
  refine: null,
});

// Ranked as rankCrack returns them: open by score, then wait, then unpriced.
const ranked = [
  row("Neo A1", "open", hepit, 12),
  row("Neo B1", "open", ukko, 10),
  row("Neo C1", "open", hepit, 9),
  row("Neo D1", "wait", ukko, 3),
  row("Neo E1", "unpriced", null, 0),
];

describe("groupCrack", () => {
  it("puts each open relic under its best fissure, the best relic's fissure first", () => {
    const groups = groupCrack(ranked);

    expect(groups.map((group) => group.key)).toEqual(["Hepit", "Ukko", "wait", "unpriced"]);
    expect(groups[0]!.rows.map((r) => r.relic.relicName)).toEqual(["Neo A1", "Neo C1"]);
  });

  it("keeps a wait out of a fissure block, even when it has a best fissure", () => {
    const ukkoBlock = groupCrack(ranked)[1]!;

    expect(ukkoBlock.rows.map((r) => r.relic.relicName)).toEqual(["Neo B1"]);
  });

  it("loses no row and counts none twice", () => {
    const rows = groupCrack(ranked).flatMap((group) => group.rows);

    expect(rows).toHaveLength(ranked.length);
    expect(new Set(rows.map((r) => r.key)).size).toBe(ranked.length);
  });
});

describe("crackLines", () => {
  it("is the ranking unchanged when not grouped", () => {
    const lines = crackLines(ranked, false);

    expect(lines.every((line) => line.kind === "row")).toBe(true);
    expect(lines).toHaveLength(ranked.length);
  });

  it("puts a heading before each block when grouped", () => {
    const kinds = crackLines(ranked, true).map((line) => line.kind);

    expect(kinds).toEqual(["head", "row", "row", "head", "row", "head", "row", "head", "row"]);
  });
});

describe("openSummary", () => {
  it("adds up every copy of the open relics, and nothing else", () => {
    const twoCopies = { ...ranked[0]!, relic: { ...ranked[0]!.relic, quantity: 2 } };

    expect(openSummary([twoCopies, ...ranked.slice(1)])).toEqual({
      lines: 3,
      copies: 4,
      value: 12 * 2 + 10 + 9,
      ducats: 0,
    });
  });
});
