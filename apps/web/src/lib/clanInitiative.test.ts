import { describe, expect, it } from "vitest";

import { clanWeekLine, clanWeeks } from "./clanInitiative";
import type { ClanInitiativeWeek } from "../api/types";

const THIS_MONDAY = Date.UTC(2026, 10, 23);
const NEXT_MONDAY = Date.UTC(2026, 10, 30);
const TUESDAY = Date.UTC(2026, 10, 24, 14);

const pluto: ClanInitiativeWeek = {
  week: THIS_MONDAY,
  region: "Pluto",
  kuva: 0,
  tiers: [{ points: 2000, reward: "Forma", count: 1, kuva: 0 }],
};

const ceres: ClanInitiativeWeek = {
  week: NEXT_MONDAY,
  region: "Ceres",
  kuva: 28_000,
  tiers: [
    { points: 500, reward: "SyndicateTeamEnergyTotem", count: 50, kuva: 0 },
    { points: 1000, reward: "Kuva", count: 7000, kuva: 7000 },
    { points: 2000, reward: "Kuva", count: 21000, kuva: 21000 },
  ],
};

describe("clanWeeks", () => {
  it("reads the weeks by their Monday, not by their order", () => {
    expect(clanWeeks([ceres, pluto], TUESDAY)).toEqual({ current: pluto, next: ceres });
  });

  it("does not take last week for this one after the reset", () => {
    expect(clanWeeks([pluto, ceres], Date.UTC(2026, 10, 30, 1))).toEqual({
      current: ceres,
      next: undefined,
    });
  });

  it("leaves a week the worldstate has not announced absent", () => {
    expect(clanWeeks([], TUESDAY)).toEqual({ current: undefined, next: undefined });
  });
});

describe("clanWeekLine", () => {
  it("says so when a week pays no Kuva", () => {
    expect(clanWeekLine(pluto)).toBe("Pluto · no Kuva");
  });

  it("names the total and each tier that pays it", () => {
    expect(clanWeekLine(ceres)).toBe("Ceres · 28,000 (7,000 at 1,000 pts, 21,000 at 2,000 pts)");
  });
});
