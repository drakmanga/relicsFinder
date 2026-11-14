import { describe, expect, it } from "vitest";

import type { Fissure, FissureFeed, ItemPrice, OwnedRelic, PriceMap, Relic } from "../api/types";
import { defaultCrackOptions, type CrackOptions } from "./crackOptions";
import { alertDurationMs, alertText, alertWorthy, copiesFor, heldByTier } from "./fissureAlerts";
import {
  STEEL_PATH_PENALTY,
  crackLine,
  rankCrack,
  refineAdvice,
  visibleFissures,
} from "./relicCrack";

/*
  The fixture, and the hand calculation every expectation below comes from.

  Neo N16 Radiant drops A 10%, B 20%, C 70%.
    platinum  A 100, B 10, C 1  → solo EV = 10 + 2 + 0.7  = 12.7p
    ducats    A 100, B 45, C 15 → solo EV = 10 + 9 + 10.5 = 29.5
    two players, platinum: 100·(1−0.9²) + 10·(0.9²−0.7²) + 1·0.7² = 19 + 3.2 + 0.49 = 22.69
  Axi A1 Radiant drops X 100%: 1p, 100 ducats.

  The clock is 12:00. Minutes: Capture 1, Extermination 2, Defense 4, Survival 5.
*/
const NOW = Date.parse("2026-11-14T12:00:00Z");
const at = (hhmm: string) => `2026-11-14T${hhmm}:00.000Z`;

const fissure = (
  id: string,
  tier: string,
  missionType: string,
  minutes: number | null,
  expiry: string,
  extra: Partial<Fissure> = {},
): Fissure => ({
  id,
  node: `${id} (Void)`,
  missionType,
  tier,
  steelPath: false,
  voidStorm: false,
  expiry: at(expiry),
  minutes,
  ...extra,
});

const MINUTES = { Capture: 1, Extermination: 2, Defense: 4, Survival: 5 };

const feedOf = (...fissures: Fissure[]): FissureFeed => ({ fissures, missionMinutes: MINUTES });

const neoSurvival = fissure("NeoSurv", "Neo", "Survival", 5, "12:18");
const neoSurvivalSp = fissure("NeoSurvSP", "Neo", "Survival", 5, "12:40", { steelPath: true });
const omniaCapture = fissure("OmniaCap", "Omnia", "Capture", 1, "12:30");
const lithCapture = fissure("LithCap", "Lith", "Capture", 1, "12:30");
const neoStorm = fissure("NeoStorm", "Neo", "Extermination", 2, "12:50", { voidStorm: true });
const neoDefense = fissure("NeoDef", "Neo", "Defense", 4, "12:45");
const closed = fissure("Closed", "Neo", "Capture", 1, "11:59");

const relic = (tier: Relic["tier"], name: string, rewards: [string, number][]): Relic => ({
  tier,
  relicName: name,
  fullName: `${tier[0]!.toUpperCase()}${tier.slice(1)} ${name}`,
  refinement: "radiant",
  rewards: rewards.map(([itemName, chance]) => ({
    id: itemName,
    itemName,
    rarity: "common",
    chance,
  })),
});

const CATALOGUE = [
  relic("neo", "N16", [
    ["A", 10],
    ["B", 20],
    ["C", 70],
  ]),
  relic("axi", "A1", [["X", 100]]),
  relic("lith", "Z1", [["Unlisted", 100]]),
];

const price = (itemName: string, averagePrice: number, ducats: number) =>
  [itemName, { itemName, averagePrice, ducats } as ItemPrice] as const;

const PRICES: PriceMap = new Map([
  price("A", 100, 100),
  price("B", 10, 45),
  price("C", 1, 15),
  price("X", 1, 100),
]);

const n16: OwnedRelic = { relicName: "Neo N16", refinement: "radiant", quantity: 3 };
const a1: OwnedRelic = { relicName: "Axi A1", refinement: "radiant", quantity: 1 };
const z1: OwnedRelic = { relicName: "Lith Z1", refinement: "radiant", quantity: 1 };

const options = (over: Partial<CrackOptions> = {}): CrackOptions => ({
  ...defaultCrackOptions(),
  ...over,
});

const rank = (owned: OwnedRelic[], feed: FissureFeed, over: Partial<CrackOptions> = {}) =>
  rankCrack(owned, CATALOGUE, PRICES, feed, options(over), NOW);

describe("rankCrack", () => {
  it("opens a relic in the Omnia Capture, the fastest fissure its tier can use", () => {
    const [row] = rank([n16], feedOf(neoSurvival, omniaCapture, lithCapture));

    expect(row!.value).toBeCloseTo(12.7);
    expect(row!.best!.fissure.id).toBe("OmniaCap");
    expect(row!.best!.score).toBeCloseTo(12.7);
    expect(row!.verdict).toBe("open");
    expect(crackLine(row!, "neo", NOW)).toBe(
      "open now on OmniaCap (Void) - Capture, expires in 30 min",
    );
  });

  it("never matches a fissure of another tier", () => {
    const [row] = rank([n16], feedOf(lithCapture));

    expect(row!.best).toBeNull();
    expect(crackLine(row!, "neo", NOW)).toBe("wait - no Neo fissure open right now");
  });

  it("waits when only slow missions are up, naming the soonest to close", () => {
    // 12.7/5 = 2.54 against half of 12.7/1 = 6.35.
    const [row] = rank([n16], feedOf(neoSurvivalSp, neoSurvival));

    expect(row!.verdict).toBe("wait");
    expect(crackLine(row!, "neo", NOW)).toBe(
      "wait - only slow missions for Neo right now; the first expires in 18 min",
    );
  });

  it("opens at exactly half the fastest rate", () => {
    // Capture excluded, so the fastest is Extermination at 2: half of 12.7/2 is 3.175 = 12.7/4.
    const [row] = rank([n16], feedOf(neoDefense), { excluded: new Set(["Capture"]) });

    expect(row!.verdict).toBe("open");
  });

  it("waits just under half", () => {
    // Survival at 5 against the same 3.175: 2.54.
    const [row] = rank([n16], feedOf(neoSurvival), { excluded: new Set(["Capture"]) });

    expect(row!.verdict).toBe("wait");
  });

  it("measures half against the fastest type in the table, not the fastest one open", () => {
    // Defense alone is up; with Capture rated at 1 it is a quarter of the best rate.
    const [row] = rank([n16], feedOf(neoDefense));

    expect(row!.verdict).toBe("wait");
  });

  it("skips excluded mission types, Void Storms by default, and closed fissures", () => {
    const [row] = rank([n16], feedOf(omniaCapture, neoStorm, closed), {
      excluded: new Set(["Capture"]),
    });

    expect(row!.best).toBeNull();
  });

  it("considers Void Storms once asked to", () => {
    const [row] = rank([n16], feedOf(neoStorm), { voidStorms: true });

    expect(row!.best!.fissure.id).toBe("NeoStorm");
  });

  it("ranks on platinum and carries the ducats beside it", () => {
    const rows = rank([a1, n16], feedOf(omniaCapture));

    expect(rows.map((row) => row.relic.relicName)).toEqual(["Neo N16", "Axi A1"]);
    expect(rows[0]!.ducats).toBeCloseTo(29.5);
    expect(rows[1]!.ducats).toBeCloseTo(100);
  });

  it("values a radshare as the best of the squad's rolls", () => {
    expect(rank([n16], feedOf(omniaCapture), { players: 2 })[0]!.value).toBeCloseTo(22.69);
  });

  it("puts a relic with nothing priced last, as unpriced rather than wait", () => {
    const rows = rank([z1, n16], feedOf(omniaCapture));

    expect(rows.map((row) => row.verdict)).toEqual(["open", "unpriced"]);
  });
});

describe("Steel Path", () => {
  it("is filtered in, out, or alone", () => {
    const feed = feedOf(neoSurvival, neoSurvivalSp);
    const ids = (over: Partial<CrackOptions>) => rank([n16], feed, over)[0]!.soonest!.id;

    expect(ids({ steelPath: "only" })).toBe("NeoSurvSP");
    expect(ids({ steelPath: "none" })).toBe("NeoSurv");
  });

  it("scores the same as its normal counterpart with the penalty off", () => {
    const sp = rank([n16], feedOf(neoSurvivalSp))[0]!.best!.score;
    const normal = rank([n16], feedOf(neoSurvival))[0]!.best!.score;

    expect(sp).toBe(normal);
  });

  it("scores lower with the penalty on", () => {
    const sp = rank([n16], feedOf(neoSurvivalSp), { penaliseSteelPath: true })[0]!.best!;

    expect(sp.minutes).toBe(5 * STEEL_PATH_PENALTY);
    expect(sp.score).toBeLessThan(12.7 / 5);
  });

  it("marks a Steel Path fissure in the open line", () => {
    const spCapture = fissure("SpCap", "Neo", "Capture", 1, "12:10", { steelPath: true });

    expect(crackLine(rank([n16], feedOf(spCapture))[0]!, "neo", NOW)).toBe(
      "open now on SpCap (Void) - Capture [SP], expires in 10 min",
    );
  });
});

describe("visibleFissures", () => {
  it("lists fastest first, keeps unrated types last, and drops what the filters exclude", () => {
    const flood = fissure("Flood", "Omnia", "Void Flood", null, "12:20");

    const shown = visibleFissures(
      feedOf(neoSurvival, flood, omniaCapture, lithCapture, neoStorm, closed),
      options(),
      NOW,
    );

    expect(shown.map((f) => f.id)).toEqual(["LithCap", "OmniaCap", "NeoSurv", "Flood"]);
  });
});

describe("refineAdvice", () => {
  // Same drops in two states: Radiant moves chance onto the 100p reward.
  const intact = {
    ...relic("neo", "N16", [
      ["A", 2],
      ["B", 25.33],
      ["C", 72.67],
    ]),
    refinement: "intact" as const,
  };
  const radiant = {
    ...relic("neo", "N16", [
      ["A", 10],
      ["B", 20],
      ["C", 70],
    ]),
    refinement: "radiant" as const,
  };

  it("suggests the step up that pays per trace, with what it gains", () => {
    // Intact 2 + 2.533 + 0.7267 = 5.26p; Radiant 12.7p; +7.44p for 100 traces.
    const advice = refineAdvice({ intact, radiant }, "intact", PRICES, 1);

    expect(advice!.to).toBe("radiant");
    expect(advice!.traces).toBe(100);
    expect(advice!.gain).toBeCloseTo(7.44, 2);
  });

  it("suggests nothing for a copy already at the top", () => {
    expect(refineAdvice({ intact, radiant }, "radiant", PRICES, 1)).toBeNull();
  });

  it("suggests nothing when refining loses value", () => {
    expect(refineAdvice({ intact: radiant, radiant: intact }, "intact", PRICES, 1)).toBeNull();
  });
});

describe("fissure alerts", () => {
  const held = heldByTier([n16, a1]);

  it("counts copies per tier, and every copy toward Omnia", () => {
    expect(copiesFor(neoSurvival, held)).toBe(3);
    expect(copiesFor(omniaCapture, held)).toBe(4);
    expect(copiesFor(lithCapture, held)).toBe(0);
  });

  it("announces only fast fissures of a tier held", () => {
    // Capture 1 and Extermination 2 clear half the fastest rate; Survival 5 does not.
    const neoExterm = fissure("NeoExt", "Neo", "Extermination", 2, "12:40");
    const worthy = alertWorthy(
      feedOf(omniaCapture, lithCapture, neoExterm, neoSurvival),
      options(),
      held,
      NOW,
    );

    expect(worthy.map((f) => f.id)).toEqual(["OmniaCap", "NeoExt"]);
  });

  it("says where and how many relics it takes", () => {
    expect(alertText(neoSurvivalSp, 3)).toEqual({
      title: "Neo Survival (Steel Path) on NeoSurvSP (Void)",
      body: "You hold 3 relics it can open.",
    });
  });

  it("takes typed hours, a comma as the decimal point, and refuses what is not a duration", () => {
    expect(alertDurationMs("200")).toBe(200 * 3_600_000);
    expect(alertDurationMs("1,5")).toBe(1.5 * 3_600_000);
    expect(alertDurationMs(" 0.25 ")).toBe(900_000);
    expect(alertDurationMs("")).toBeNull();
    expect(alertDurationMs("abc")).toBeNull();
    expect(alertDurationMs("0")).toBeNull();
    expect(alertDurationMs("1000")).toBeNull();
  });
});
