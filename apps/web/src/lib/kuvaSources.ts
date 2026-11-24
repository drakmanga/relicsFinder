/**
 * Every vendor that sells Kuva, and every recurring reward that pays it.
 *
 * Curated by hand, because no API carries it: the worldstate knows the Steel
 * Path rotation and nothing about Palladino's weekly 35,000, and the drop
 * tables know Sortie odds and nothing about prices. Figures are from the
 * Warframe wiki's Kuva page after Update 44.1 (October 2026), cross-checked
 * against drops.warframestat.us where the drop tables carry the same reward;
 * Yonta's and Acrithis's prices were confirmed in game, because the wiki
 * contradicts itself on both.
 *
 * Direct farming (Kuva Siphons and Floods, the Kuva Fortress nodes, bounties,
 * Liches, Requiem relics, events) is left out on purpose: this tab answers
 * "where do I buy or collect it each week", not "where do I grind it".
 *
 * Update this file when a patch changes a price or a limit, and move
 * `VERIFIED_AS_OF` with it. Nothing else in the app holds these numbers.
 */
import atramentum from "../assets/kuva/atramentum.webp";
import beatingHeartstring from "../assets/kuva/beating-heartstring.webp";
import crimsonTalent from "../assets/kuva/crimson-talent.webp";
import emeraldTalent from "../assets/kuva/emerald-talent.webp";
import entropicKuva from "../assets/kuva/entropic-kuva.webp";
import fergolyte from "../assets/kuva/fergolyte.webp";
import kuva from "../assets/kuva/kuva.webp";
import nightwaveCred from "../assets/kuva/nightwave-cred.webp";
import pathosClamp from "../assets/kuva/pathos-clamp.webp";
import rivenSliver from "../assets/kuva/riven-sliver.webp";
import scuttlerHusk from "../assets/kuva/scuttler-husk.webp";
import steelEssence from "../assets/kuva/steel-essence.webp";
import vitusEssence from "../assets/kuva/vitus-essence.webp";
import voidplumePinion from "../assets/kuva/voidplume-pinion.webp";

/**
 * When the figures below were last checked against the game, shown at the foot
 * of the tab so a reader after the next patch knows they may have moved.
 */
export const VERIFIED_AS_OF = "Update 44.1, November 2026";

/**
 * The icons are WFCD's game renders (warframe-items, `data/img`), shrunk to
 * 96px webp and bundled rather than hotlinked: the app runs offline from the
 * Windows installer, and a CDN outage should not blank a column.
 */
export const KUVA_ICON = kuva;

export const CURRENCIES = {
  steelEssence: { name: "Steel Essence", icon: steelEssence },
  rivenSliver: { name: "Riven Sliver", icon: rivenSliver },
  voidplumePinion: { name: "Voidplume Pinion", icon: voidplumePinion },
  pathosClamp: { name: "Pathos Clamp", icon: pathosClamp },
  scuttlerHusk: { name: "Scuttler Husk", icon: scuttlerHusk },
  beatingHeartstring: { name: "Beating Heartstring", icon: beatingHeartstring },
  fergolyte: { name: "Fergolyte", icon: fergolyte },
  atramentum: { name: "Atramentum", icon: atramentum },
  crimsonTalent: { name: "Crimson Talent", icon: crimsonTalent },
  emeraldTalent: { name: "Emerald Talent", icon: emeraldTalent },
  entropicKuva: { name: "Entropic Kuva", icon: entropicKuva },
  nightwaveCred: { name: "Nightwave Cred", icon: nightwaveCred },
  vitusEssence: { name: "Vitus Essence", icon: vitusEssence },
} as const;

export type CurrencyId = keyof typeof CURRENCIES;

export interface Cost {
  currency: CurrencyId;
  amount: number;
}

export interface KuvaVendor {
  id: string;
  npc: string;
  /** Hub and planet, as a player would look for it. */
  where: string;
  /** What has to be done before the offer shows. Absent when nothing does. */
  requirement?: string;
  /** Every currency the offer asks for, all at once. */
  cost: Cost[];
  /** Kuva per purchase. */
  kuva: number;
  /** Purchases per weekly reset, or null when the vendor never runs out. */
  weeklyLimit: number | null;
  /**
   * Set on the one offer that is not there every week: Teshin's 50,000, which
   * is one slot of the Steel Path Honors' eight-week rotation.
   */
  rotating?: true;
}

export const KUVA_VENDORS: KuvaVendor[] = [
  {
    id: "teshin",
    npc: "Teshin",
    where: "Steel Path Honors · Conclave room, any Relay",
    requirement: "The Steel Path",
    cost: [{ currency: "steelEssence", amount: 15 }],
    kuva: 10_000,
    weeklyLimit: 25,
  },
  {
    id: "teshin-rotation",
    npc: "Teshin",
    where: "Steel Path Honors · Conclave room, any Relay",
    requirement: "The Steel Path",
    cost: [{ currency: "steelEssence", amount: 55 }],
    kuva: 50_000,
    weeklyLimit: 1,
    rotating: true,
  },
  {
    id: "palladino",
    npc: "Palladino",
    where: "Iron Wake · Earth",
    cost: [{ currency: "rivenSliver", amount: 10 }],
    kuva: 35_000,
    weeklyLimit: 1,
  },
  {
    id: "yonta",
    npc: "Archimedean Yonta",
    where: "Chrysalith · Zariman Ten Zero",
    requirement: "Angels of the Zariman",
    cost: [{ currency: "voidplumePinion", amount: 5 }],
    kuva: 35_000,
    weeklyLimit: 1,
  },
  {
    id: "hunhow",
    npc: "Hunhow",
    where: "Pontis Tower",
    requirement: "Jade Shadows: Constellations",
    cost: [
      { currency: "crimsonTalent", amount: 35 },
      { currency: "emeraldTalent", amount: 35 },
    ],
    kuva: 17_000,
    weeklyLimit: 3,
  },
  {
    id: "acrithis-husk",
    npc: "Acrithis",
    where: "Dormizone · Duviri",
    requirement: "The Hex",
    cost: [{ currency: "scuttlerHusk", amount: 25 }],
    kuva: 14_000,
    weeklyLimit: 3,
  },
  {
    id: "flare",
    npc: "Flare",
    where: "Höllvania Central Mall",
    requirement: "The Hex · Rank 4, Hot & Fresh",
    cost: [{ currency: "beatingHeartstring", amount: 100 }],
    kuva: 14_000,
    weeklyLimit: 3,
  },
  {
    id: "nightcap",
    npc: "Nightcap",
    where: "Fortuna · Venus",
    requirement: "Rank 3, Seeker",
    cost: [{ currency: "fergolyte", amount: 75 }],
    kuva: 14_000,
    weeklyLimit: 3,
  },
  {
    id: "melica",
    npc: "Cephalon Melica",
    where: "Yuvan Peak or Zariman Ten Zero",
    cost: [{ currency: "entropicKuva", amount: 150 }],
    kuva: 10_500,
    weeklyLimit: 4,
  },
  {
    id: "zorba",
    npc: "Aspirant Zorba",
    where: "Any Relay",
    cost: [{ currency: "atramentum", amount: 500 }],
    kuva: 6_000,
    weeklyLimit: 7,
  },
  {
    id: "acrithis-clamp",
    npc: "Acrithis",
    where: "Dormizone · Duviri",
    requirement: "The Duviri Paradox",
    cost: [{ currency: "pathosClamp", amount: 10 }],
    kuva: 10_000,
    weeklyLimit: 1,
  },
  {
    id: "nightwave",
    npc: "Nightwave Offerings",
    where: "Nightwave menu, anywhere",
    cost: [{ currency: "nightwaveCred", amount: 50 }],
    kuva: 10_000,
    weeklyLimit: null,
  },
  {
    id: "arbitrations",
    npc: "Arbiters of Hexis",
    where: "Arbitrations vendor · any Relay",
    cost: [{ currency: "vitusEssence", amount: 25 }],
    kuva: 10_000,
    weeklyLimit: null,
  },
];

/** How often a reward comes round. The tab groups and labels by it. */
export type Cadence = "daily" | "weekly" | "baro" | "season";

export interface KuvaReward {
  id: string;
  source: string;
  where: string;
  requirement?: string;
  /** One amount, or the lowest and highest a single claim can pay. */
  kuva: number | readonly [number, number];
  /**
   * Percent, when the Kuva is one roll of a reward table. "varies" when it is
   * paid only if Kuva is what this season or this week happens to offer, which
   * no fixed percentage describes. Absent when every claim pays it.
   */
  chance?: number | "varies";
  cadence: Cadence;
  /** The one sentence a reader needs to know how the payout works. */
  detail: string;
  /**
   * How a week's collection of it is ticked on the tab, when it is: up to
   * `times` claims of the fixed amount, or "amount" where the sum differs
   * every week and only the player knows it. Absent for what does not come
   * round weekly — Baro, Nightwave ranks, the calendar.
   */
  track?: { times: number } | "amount";
}

export const KUVA_REWARDS: KuvaReward[] = [
  {
    id: "icebind",
    track: "amount",
    source: "The Icebind",
    where: "Yuvan Peak · Earth",
    requirement: "Angels of the Zariman · Whispers in the Walls · Elite Archimedea",
    kuva: [38_250, 363_000],
    cadence: "weekly",
    // Chest odds from drops.warframestat.us; the weekly range is the wiki's own
    // sum over all three weekly and all three side objectives.
    detail:
      "Crested Frozen Chests pay 7,500 (69%), 17,500 (30%) or 100,000 (1%); Frozen Chests 1,750, 3,500 or 7,500. The range is every objective done.",
  },
  {
    id: "circuit-milestone",
    track: { times: 1 },
    source: "The Circuit · Steel Path",
    where: "Duviri",
    requirement: "The Duviri Paradox · The Steel Path",
    kuva: 20_000,
    cadence: "weekly",
    detail: "Tier 5 or tier 10 milestone reward, once per week.",
  },
  {
    id: "clan-initiative",
    track: "amount",
    source: "Clan Weekly Initiative",
    where: "Clan Dojo",
    kuva: [7_000, 21_000],
    chance: "varies",
    cadence: "weekly",
    detail:
      "Some weeks one or more tiers pay Kuva, 7,000 to 21,000 each. The line under the name says what this week's and next week's tiers pay, read from the game.",
  },
  {
    id: "archon-hunt",
    track: { times: 1 },
    source: "Archon Hunt",
    where: "Weekly Archon mission",
    kuva: 12_000,
    chance: 12,
    cadence: "weekly",
    detail: "One roll on completing the third mission.",
  },
  {
    id: "circuit-tiers",
    track: { times: 3 },
    source: "The Circuit · Steel Path",
    where: "Duviri",
    requirement: "The Duviri Paradox · The Steel Path",
    kuva: 6_000,
    chance: 4.43,
    cadence: "weekly",
    detail: "A chance at tier 1, 3 and 4 of the weekly Circuit run.",
  },
  {
    id: "sortie",
    track: { times: 7 },
    source: "Sortie",
    where: "Daily Sortie",
    kuva: 6_000,
    chance: 12,
    cadence: "daily",
    detail: "One roll on completing the third mission.",
  },
  {
    id: "void-surplus",
    source: "Void Surplus",
    where: "Baro Ki'Teer",
    kuva: 35_000,
    chance: 2,
    cadence: "baro",
    detail: "One of the rewards a Void Surplus bought from Baro can roll.",
  },
  {
    id: "nightwave-ranks",
    source: "Nightwave ranks",
    where: "Nightwave",
    kuva: [10_000, 20_000],
    chance: "varies",
    cadence: "season",
    detail: "Some ranks of each season's ladder pay Kuva; which ones changes every season.",
  },
  {
    id: "calendar",
    source: "1999 Calendar",
    where: "Höllvania",
    requirement: "The Hex",
    kuva: 6_000,
    chance: "varies",
    cadence: "season",
    detail: "Can appear among a calendar season's reward choices.",
  },
];
