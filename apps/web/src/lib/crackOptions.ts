/**
 * The Relic Crack tab's controls, and how they travel in the address bar.
 *
 * Their own module rather than more fields spelled out in `urlState`: they
 * are one question ("rank my relics under these conditions, shown this way"),
 * and `urlState` only has to hand them a `URLSearchParams` either way.
 */

/** Steel Path fissures: either kind, only them, or none of them. */
export type SteelPathFilter = "both" | "only" | "none";

export const ALL_STEEL_PATH: SteelPathFilter[] = ["both", "only", "none"];
export const SQUAD_SIZES = [1, 2, 3, 4] as const;

export interface CrackOptions {
  steelPath: SteelPathFilter;
  /** Whether Railjack Void Storms are considered at all. */
  voidStorms: boolean;
  /** 1 alone, 2–4 a radshare. */
  players: number;
  /** Mission types the reader will not play, as the worldstate spells them. */
  excluded: Set<string>;
  /** Count Steel Path as slower — for a player who finds it hard. See `relicCrack`. */
  penaliseSteelPath: boolean;
  /**
   * The ranking drawn as one block per fissure ("go here, open these")
   * rather than one line per relic. Same rows and figures either way.
   */
  byFissure: boolean;
  /** Only the relics to open now: the waits and the unpriced hidden. */
  onlyOpen: boolean;
}

/**
 * Where the tab opens.
 *
 * Both kinds of fissure, since Steel Path is a filter first and a difficulty only when the
 * reader says so. No Void Storms: those are Railjack missions, a different
 * loadout and a different session, and nobody cracking relics on the star
 * chart wants them recommended unasked. Alone, because a radshare is a squad
 * the reader has to have found first.
 */
export const defaultCrackOptions = (): CrackOptions => ({
  steelPath: "both",
  voidStorms: false,
  players: 1,
  excluded: new Set(),
  penaliseSteelPath: false,
  byFissure: false,
  onlyOpen: false,
});

/** Writes only what differs from the default, so a clean tab is a clean URL. */
export function writeCrackParams(params: URLSearchParams, options: CrackOptions) {
  if (options.steelPath !== "both") params.set("sp", options.steelPath);
  if (options.voidStorms) params.set("storm", "1");
  if (options.players !== 1) params.set("squad", String(options.players));
  if (options.excluded.size > 0) params.set("skip", [...options.excluded].sort().join(","));
  if (options.penaliseSteelPath) params.set("sppen", "1");
  if (options.byFissure) params.set("by", "fissure");
  if (options.onlyOpen) params.set("open", "1");
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
  const steelPath = params.get("sp");
  const skip = params.get("skip");

  return {
    steelPath: ALL_STEEL_PATH.includes(steelPath as SteelPathFilter)
      ? (steelPath as SteelPathFilter)
      : fallback.steelPath,
    voidStorms: params.get("storm") === "1",
    players: (SQUAD_SIZES as readonly number[]).includes(squad) ? squad : fallback.players,
    excluded: new Set(skip ? skip.split(",").filter(Boolean) : []),
    penaliseSteelPath: params.get("sppen") === "1",
    byFissure: params.get("by") === "fissure",
    onlyOpen: params.get("open") === "1",
  };
}
