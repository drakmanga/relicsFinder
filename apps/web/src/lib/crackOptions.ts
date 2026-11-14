/**
 * The Relic Crack tab's controls, and how they travel in the address bar.
 *
 * Their own module rather than more fields spelled out in `urlState`: the
 * six of them are one question ("rank my relics under these conditions"),
 * and `urlState` only has to hand them a `URLSearchParams` either way.
 */

export type CrackCurrency = "plat" | "ducats";

/** Steel Path fissures: either kind, only them, or none of them. */
export type SteelPathFilter = "both" | "only" | "none";

export const ALL_CURRENCIES: CrackCurrency[] = ["plat", "ducats"];
export const ALL_STEEL_PATH: SteelPathFilter[] = ["both", "only", "none"];
export const SQUAD_SIZES = [1, 2, 3, 4] as const;

export interface CrackOptions {
  currency: CrackCurrency;
  steelPath: SteelPathFilter;
  /** Whether Railjack Void Storms are considered at all. */
  voidStorms: boolean;
  /** 1 alone, 2–4 a radshare. */
  players: number;
  /** Mission types the reader will not play, as the worldstate spells them. */
  excluded: Set<string>;
  /** Count Steel Path as slower — for a player who finds it hard. See `relicCrack`. */
  penaliseSteelPath: boolean;
}

/**
 * Where the tab opens.
 *
 * Platinum, because it is what the rest of the app ranks by. Both kinds of
 * fissure, since Steel Path is a filter first and a difficulty only when the
 * reader says so. No Void Storms: those are Railjack missions, a different
 * loadout and a different session, and nobody cracking relics on the star
 * chart wants them recommended unasked. Alone, because a radshare is a squad
 * the reader has to have found first.
 */
export const defaultCrackOptions = (): CrackOptions => ({
  currency: "plat",
  steelPath: "both",
  voidStorms: false,
  players: 1,
  excluded: new Set(),
  penaliseSteelPath: false,
});

/** Writes only what differs from the default, so a clean tab is a clean URL. */
export function writeCrackParams(params: URLSearchParams, options: CrackOptions) {
  if (options.currency !== "plat") params.set("cur", options.currency);
  if (options.steelPath !== "both") params.set("sp", options.steelPath);
  if (options.voidStorms) params.set("storm", "1");
  if (options.players !== 1) params.set("squad", String(options.players));
  if (options.excluded.size > 0) params.set("skip", [...options.excluded].sort().join(","));
  if (options.penaliseSteelPath) params.set("sppen", "1");
}

/**
 * Reads them back, dropping anything that is not a value a control can show.
 *
 * Excluded mission types are taken as written: the list of types comes from
 * the server's minutes table, which this module does not know, and a type
 * nobody rates simply excludes nothing.
 */
export function readCrackParams(params: URLSearchParams): CrackOptions {
  const fallback = defaultCrackOptions();
  const squad = Number(params.get("squad"));
  const currency = params.get("cur");
  const steelPath = params.get("sp");
  const skip = params.get("skip");

  return {
    currency: ALL_CURRENCIES.includes(currency as CrackCurrency)
      ? (currency as CrackCurrency)
      : fallback.currency,
    steelPath: ALL_STEEL_PATH.includes(steelPath as SteelPathFilter)
      ? (steelPath as SteelPathFilter)
      : fallback.steelPath,
    voidStorms: params.get("storm") === "1",
    players: (SQUAD_SIZES as readonly number[]).includes(squad) ? squad : fallback.players,
    excluded: new Set(skip ? skip.split(",").filter(Boolean) : []),
    penaliseSteelPath: params.get("sppen") === "1",
  };
}
