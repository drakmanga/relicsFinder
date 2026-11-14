import { describe, expect, it } from "vitest";

import type { Fissure, FissureFeed, ItemPrice, OwnedRelic, PriceMap, Relic } from "../api/types";
import { defaultCrackOptions, type CrackOptions } from "./crackOptions";
import { STEEL_PATH_PENALTY, crackLine, rankCrack } from "./relicCrack";

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

  it("re-ranks when the currency changes", () => {
    const feed = feedOf(omniaCapture);

    expect(rank([n16, a1], feed).map((row) => row.relic.relicName)).toEqual(["Neo N16", "Axi A1"]);
    expect(rank([n16, a1], feed, { currency: "ducats" }).map((row) => row.relic.relicName)).toEqual(
      ["Axi A1", "Neo N16"],
    );
    expect(rank([n16], feed, { currency: "ducats" })[0]!.value).toBeCloseTo(29.5);
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
