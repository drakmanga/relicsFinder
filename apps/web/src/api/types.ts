/**
 * Wire types — the exact shape Spring Boot sends.
 *
 * Mirrors relics.reliceApi.model.*. Two things to watch: `chance` is a String
 * on the Java side, not a number, and `Relic` is annotated
 * `@JsonInclude(NON_NULL)`, so `state` and `rewards` are absent rather than
 * null on the endpoints that build a Relic from the short constructors.
 */

export interface WireRewards {
  _id: string;
  itemName: string;
  rarity: string;
  chance: string;
}

export interface WireRelic {
  tier?: string;
  relicName: string;
  state?: string;
  rewards?: WireRewards[];
}

export interface WireDropInfo {
  mission: string;
  location: string;
  rotation: string;
  chance: string;
}

export interface WireRelicPrice {
  relicName: string;
  /** Null when the market has no listing for the relic. */
  averagePrice: number | null;
  /**
   * Trades completed on the relic in the last ninety days.
   *
   * Ninety and not the 48 hours a part's `volume` covers: relics trade far
   * more thinly — a median of 6 trades in ninety days against 42 for items —
   * so over two days most of the catalogue reads as zero. A price backed by
   * one sale is barely a price, and this is the only field that says so.
   *
   * Null when nothing has been read yet, and 0 when ninety days really did
   * pass without a trade. The single-relic `/market/{name}` endpoint answers a
   * bare average and always sends null here.
   */
  tradeCount90d: number | null;
}

/* -------------------------------------------------------------------------
   Domain types — what the UI works with.

   The design system's Tier / Refinement / Rarity unions are lowercase, and the
   backend's casing comes from Warframe's own drop tables, so everything is
   normalised on the way in.
   ---------------------------------------------------------------------- */

export type Tier = "lith" | "meso" | "neo" | "axi" | "requiem" | "vanguard";
export type Refinement = "intact" | "exceptional" | "flawless" | "radiant";
export type Rarity = "common" | "uncommon" | "rare";

export interface Reward {
  id: string;
  itemName: string;
  rarity: Rarity;
  /** Drop chance as a percentage, e.g. 25.33. */
  chance: number;
}

export interface Relic {
  tier: Tier;
  /**
   * Short name exactly as the backend sends it — `"V9"`, not `"Lith V9"`.
   * The tier is a separate field and is never part of this string.
   */
  relicName: string;
  /**
   * `"Lith V9"` — tier and short name joined. This is what the user reads and,
   * more importantly, what every name-addressed endpoint expects:
   * `/api/market/V9` answers 404, `/api/market/Lith%20V9` answers 200.
   */
  fullName: string;
  refinement: Refinement;
  rewards: Reward[];
}

/**
 * One relic with all four of its refinement states.
 *
 * `/api/relics` returns 2756 rows — 689 relics times four states — so the flat
 * list is grouped before it reaches the UI. Rewards are per state: the item
 * set stays the same, the chances do not.
 */
export interface RelicGroup {
  tier: Tier;
  relicName: string;
  fullName: string;
  states: Partial<Record<Refinement, Reward[]>>;
}

export interface DropInfo {
  mission: string;
  location: string;
  rotation: string;
  /** Chance of the relic dropping from that mission, as a percentage. */
  chance: number;
}

export interface RelicPrice {
  relicName: string;
  /** Platinum the relic itself trades for. Null when nobody is selling it. */
  averagePrice: number | null;
  /**
   * Trades completed on the relic in the last ninety days. Null when unknown.
   *
   * How much the price above is worth believing. Relic prices are thin — a
   * median of 6 trades in ninety days, with two thirds of the catalogue under
   * ten — so a relic listed at 190p is usually one lucky sale rather than a
   * market, and anything that reads the price as a going rate has to check
   * this first.
   */
  tradeCount90d: number | null;
}

/**
 * Relic name to its own market listing. Empty while the batch is in flight.
 *
 * The whole listing rather than the bare price, mirroring `PriceMap`: the
 * price and the trades behind it are read together by anything that judges
 * one, and a second map keyed the same way would be one more thing to keep in
 * step with this one.
 */
export type RelicPriceMap = Map<string, RelicPrice>;

/* ------------------------------------------------------------------------- */

/** The kinds of gear a Prime set can be. See lib/setCategories. */
export type SetCategory =
  | "warframe"
  | "primary"
  | "secondary"
  | "melee"
  | "sentinel"
  | "sentinel-weapon"
  | "archwing"
  | "arch-gun"
  | "arch-melee"
  | "pet";

/**
 * Why a price carries no ninety-day trend, as the backend spells it.
 *
 * Mirrors `relics.reliceApi.model.TrendGap`. Three causes, and the two the
 * browser could never work out for itself are the reason the field exists: an
 * item nobody has ever listed and a request the market did not answer arrive
 * here as the same empty price, and only the server saw which was which.
 *
 * Absent — on the wire and in the map — both when there IS a trend and when
 * the price cache has not reached the item yet. Those two share an absence on
 * purpose: a null trend beside a null gap means "not asked yet", which is the
 * one state that resolves itself in seconds and the one state a label would be
 * wrong about a moment later. A caller drawing that case draws the skeleton it
 * draws for the price beside it.
 */
export type TrendGap = "no-answer" | "no-listings" | "too-few-sales";

/* ------------------------------------------------------------------------- */

/**
 * Where a Prime set sits in the cycle its price follows.
 *
 * Mirrors `relics.reliceApi.model.PrimePhase`, which carries the measurement
 * behind the three phases and the reason there are three rather than the six a
 * clan guide draws. In short: on 2026-08-30 the sets in the drop tables had a
 * median ninety-day trend of -11,5% and 83% of them fell, the ones vaulted
 * within two years +9,4% with 85% rising, and the rest +0,7%.
 *
 * `"unknown"` is an answer, not a gap: the set is not dropping and no date says
 * when it stopped. Kavasa Prime is the one in the catalogue, and it is also
 * what a set absent from the lifecycle list altogether reads as — see
 * `lib/lifecycle`.
 */
export type PrimePhase = "dropping" | "recently-vaulted" | "long-vaulted" | "unknown";

/**
 * One set's phase, with the dates it was read from.
 *
 * The dates ride along because the screen showing the phase shows them too:
 * "vaulted since 2018" is what makes the badge a fact rather than an assertion.
 * Both are null for a set the item database does not carry, and `vaultDate`
 * alone is null for one that has never been vaulted — `phase` is what separates
 * those two.
 */
export interface PrimeLifecycle {
  setName: string;
  phase: PrimePhase;
  releaseDate: string | null;
  vaultDate: string | null;
}

/** Every set's phase, keyed by set name. See `lib/lifecycle`. */
export type LifecycleMap = Map<string, PrimeLifecycle>;

export interface WireItemPrice {
  itemName: string;
  averagePrice: number | null;
  median: number | null;
  volume: number | null;
  trend: number | null;
  /** Why `trend` is null. Absent on a payload captured before the field. */
  trendGap?: TrendGap | null;
  slug: string;
  ducats: number | null;
  setName: string | null;
  /** Free-form on the wire; narrowed to SetCategory on the way in. */
  category: SetCategory | null;
  /**
   * Optional because the captured payload in `lib/tierListPayload.ts` predates
   * the field, and because absent, null and 1 all mean the same thing to every
   * reader of it: one copy per set. See `ItemPrice.copiesPerSet`.
   */
  copiesPerSet?: number | null;
}

export interface ItemPrice {
  itemName: string;
  /**
   * Platinum, from trades completed in the last 48 hours — not from open
   * orders, whose buy and sell sides average to a number nobody trades at.
   * Null when nothing sold, or when the cache has not reached it yet.
   */
  averagePrice: number | null;
  /** Median of the same trades. Steadier than the mean on a thin market. */
  median: number | null;
  /** Trades in the window. A price backed by two sales is barely a price. */
  volume: number | null;
  /** Percent against the 90-day average. */
  trend: number | null;
  /**
   * Why `trend` is null. See `TrendGap` — including why it is absent for a
   * price the cache has not reached.
   *
   * Optional for the same reason `copiesPerSet` is: the captured payload in
   * `lib/tierListPayload.ts` predates the field, and a payload with no key
   * means the same thing there as a null does here.
   */
  trendGap?: TrendGap | null;
  slug: string;
  /** Static ducat value. Null for anything that is not a Prime part. */
  ducats: number | null;
  /** The Prime set it completes, e.g. "Volt Prime". Null when it has none. */
  setName: string | null;
  /**
   * What kind of gear that set is — the Sets view filters on it.
   *
   * One of the slugs in lib/setCategories. Null for anything the item database
   * does not list, which on the Sets view means "no category" rather than a
   * guess.
   */
  category: SetCategory | null;
  /**
   * How many copies of this part its set is built from.
   *
   * One almost everywhere, and two for 49 components across 28 sets — Kestrel
   * Prime is one Blueprint, one Grip and two Blades. Null when the item
   * database says nothing, which `buildSets` reads as one copy: that is what
   * every set was assumed to need before this arrived, so silence keeps the
   * answer the application already gave rather than emptying a set.
   *
   * Optional for the same reason it is nullable: a payload captured before the
   * field existed carries no key at all, and both spellings of silence have to
   * mean one copy rather than none.
   */
  copiesPerSet?: number | null;
}

/**
 * Everything known about the items on screen, keyed by item name.
 *
 * One map rather than three: price, ducats and set all arrive from the same
 * request, and splitting them would mean three lookups per row.
 */
export type PriceMap = Map<string, ItemPrice>;

/**
 * One relic, as the Relics table lists it.
 *
 * The table used to hold one row per relic-and-drop pairing, which meant a
 * relic appeared six times and the view answered "which parts exist" — a
 * question the Prime Items view already answers better. A row is a relic now,
 * and its contents live in the detail panel where they can be read together.
 */
export interface RelicRow {
  /** `"Lith V9|intact"` — stable while the refinement filter is unchanged. */
  id: string;
  tier: Tier;
  relicFullName: string;
  refinement: Refinement;
  rewards: Reward[];
}

export interface RelicItemRow {
  /** Stable across refinements, so selection and wishlist keys survive a filter change. */
  id: string;
  tier: Tier;
  relicFullName: string;
  refinement: Refinement;
  itemName: string;
  rarity: Rarity;
  chance: number;
}

/** One day of completed trades, for the price chart. */
export interface PricePoint {
  date: string;
  avgPrice: number;
  median: number;
  minPrice: number;
  maxPrice: number;
  volume: number;
}

/** How much of the price catalogue the server has filled. */
export interface MarketStatus {
  cached: number;
  fresh: number;
  queued: number;
  /**
   * ISO instant of the NEWEST price held, so the label reflects the warmer
   * actually running. Null while the cache is empty. Deliberately not the
   * oldest: an entry that fell out of the current sweep list stays cached
   * forever and would otherwise pin the label to that one stale reading.
   */
  asOf: string | null;
  /**
   * How many times a price has actually changed since the server started.
   *
   * The marker an open tab watches. Its value means nothing on its own — only
   * that it moved — and it is counted on the price rather than on the read, so
   * a sweep that re-reads a number and finds it unchanged does not ask six
   * hundred prices to be fetched again. See `lib/priceRefresh`.
   */
  revision: number;
}

/**
 * Whether a newer Relic Finder has been released.
 *
 * `known` is the field to read first. False means the backend could not reach
 * GitHub, which offline is ordinary rather than a fault: everything below it is
 * then null, and the right thing to render is nothing at all — not "you are up
 * to date", which would be a claim nobody checked.
 *
 * `windows` arrives on every answer whatever this install is, because a Windows
 * update hangs off it and a second call to fetch it would spend one of GitHub's
 * sixty requests an hour on something this answer already had. There is no
 * Docker counterpart: compose resolves image names out of the operator's own
 * files, so a reference from here would be a second answer to a question
 * something else already answers.
 */
export interface UpdateStatus {
  current: string;
  latest: string | null;
  updateAvailable: boolean;
  known: boolean;
  releaseName: string | null;
  /** Markdown, as GitHub holds it. `lib/releaseNotes` is what makes it readable. */
  releaseNotes: string | null;
  releaseUrl: string | null;
  publishedAt: string | null;
  platform: "windows" | "docker" | "unknown";
  windows: { url: string; name: string; size: number; digest: string | null } | null;
  checkedAt: string;
}

/**
 * How far the application has got updating itself.
 *
 * Two platforms answer here and the stages say which is working: a Windows
 * install downloads a setup, checks it and runs it; a container install pulls
 * images and is rebuilt on them. Anything else answers `failed` with
 * `not-supported`.
 *
 * `problem` is a code and not a sentence: the wording belongs on the screen that
 * shows it, and `lib/updateInstall` is where it turns into English.
 *
 * `self-update-off` is the one refusal that is not a fault. A container install
 * gets it before anybody clicks, because replacing a container needs control of
 * Docker and the shipped compose file does not hand it over — so the screen
 * shows the two commands instead of a button.
 */
export interface UpdateInstall {
  stage: "idle" | "downloading" | "verifying" | "starting" | "pulling" | "recreating" | "failed";
  problem:
    | "not-windows"
    | "not-docker"
    | "not-supported"
    | "self-update-off"
    | "no-update"
    | "no-setup"
    | "no-digest"
    | "download-failed"
    | "digest-mismatch"
    | "launch-failed"
    | "recreate-failed"
    | null;
  /** Bytes of the setup written so far. Always zero on a container install. */
  downloaded: number;
  /** Bytes the release says the setup is. Zero when nothing is being fetched. */
  total: number;
}

/** When the Ayatan offers were last read. Their own clock: they expire in five
 *  minutes, where a price may be hours old and still be the price. */
export interface EndoStatus {
  asOf: string | null;
}

/** One wishlist line as the server stores it. */
/**
 * What a wishlist line is for. Part of its identity, not a label.
 *
 * "relic" is the odd one: its `itemName` is a relic's full name rather than a
 * part's, so it is priced from the relic price map and never appears in the
 * item one. Everything else about a line works the same.
 */
export type WishlistKind = "part" | "ducat" | "endo" | "relic" | "set";

/**
 * One line of the owned list as the server stores it.
 *
 * A count rather than a bare name, because a set is not one copy of each piece.
 * The endpoint still accepts and answers a plain string for a list written
 * before that was true — see `lib/owned`, which reads one as one copy.
 */
export interface WireOwnedEntry {
  itemName: string;
  quantity: number;
}

export interface WireWishlistEntry {
  itemName: string;
  kind: WishlistKind;
  tier: string;
  relicFullName: string;
  refinement: string;
  quantity: number;
}

/** One Ayatan sell order, with the Endo it yields. */
export interface EndoOffer {
  itemName: string;
  slug: string;
  platinum: number;
  cyanStars: number;
  amberStars: number;
  endo: number;
  ratio: number;
  seller: string;
  quantity: number;
}
