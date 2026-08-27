import type { Rarity, Refinement, Tier } from "../api/types";
import {
  ALL_RARITIES,
  ALL_REFINEMENTS,
  ALL_TIERS,
  ALL_VAULT_FILTERS,
  DEFAULT_REFINEMENT,
  type Filters,
  type VaultFilter,
} from "./rows";
import { ALL_TIER_SORTS, DEFAULT_TIER_SORT, type TierSortColumn } from "./tierList";

/**
 * The whole view, in the address bar.
 *
 * Everything the user has chosen — which tab, what they searched, every filter,
 * which relic is open — lives here, so a screen can be sent to someone else or
 * bookmarked and reopened as it was. Without it "farmable Axi relics under 20p"
 * is a set of clicks to describe rather than a link to send, and the browser's
 * back button does nothing at all.
 */
/** Every view the app can show. A link naming anything else opens on the first. */
export const ALL_VIEWS = [
  "relics",
  "items",
  "sets",
  "wishlist",
  "ducats",
  "endo",
  "tiers",
] as const;

export type UrlView = (typeof ALL_VIEWS)[number];

export interface UrlState {
  view: UrlView;
  filters: Filters;
  selected: string | null;
  pickedItem: string | null;
  /**
   * The tier list's own two controls, written as `tvault` and `tsort`.
   *
   * Its own keys rather than the `vault` one beside them, even though the
   * population filter is the same three-way choice. `filters.vault` belongs to
   * `Filters`, which is per-catalogue-view state — the tier list is not a
   * catalogue view, so it would have needed either a filter set nothing else
   * in it applies to, or a special case in the writer. Two keys and no
   * conditional is the cheaper of the two, and it means a link can carry a
   * relics filter and a tier-list population at once without either standing
   * for the other.
   */
  tierVault: VaultFilter;
  tierSort: TierSortColumn;
}

/** Only what differs from the default is written, so a clean view is a clean URL. */
export function toSearch(state: UrlState): string {
  const params = new URLSearchParams();
  const { filters } = state;

  if (state.view !== "relics") params.set("view", state.view);
  if (filters.term.trim()) params.set("q", filters.term.trim());
  if (filters.tiers.size > 0) params.set("tier", [...filters.tiers].join(","));
  if (filters.rarities.size > 0) params.set("rarity", [...filters.rarities].join(","));
  if (filters.refinement !== DEFAULT_REFINEMENT) params.set("ref", filters.refinement);
  if (filters.vault !== "all") params.set("vault", filters.vault);
  if (filters.maxPrice !== null) params.set("max", String(filters.maxPrice));
  if (state.selected) params.set("relic", state.selected);
  if (state.pickedItem) params.set("item", state.pickedItem);
  if (state.tierVault !== "all") params.set("tvault", state.tierVault);
  if (state.tierSort !== DEFAULT_TIER_SORT) params.set("tsort", state.tierSort);

  const search = params.toString();
  return search ? `?${search}` : "";
}

const pickMany = <T extends string>(raw: string | null, allowed: readonly T[]): Set<T> => {
  if (!raw) return new Set();
  // An unknown value is dropped rather than kept: a hand-edited or outdated URL
  // must not be able to put the app in a state its own controls cannot reach.
  return new Set(raw.split(",").filter((v): v is T => (allowed as readonly string[]).includes(v)));
};

const pickOne = <T extends string>(raw: string | null, allowed: readonly T[], fallback: T): T =>
  (allowed as readonly string[]).includes(raw ?? "") ? (raw as T) : fallback;

export function fromSearch(search: string, base: Filters): UrlState {
  const params = new URLSearchParams(search);

  const max = Number(params.get("max"));

  return {
    // Checked like every other value: an unknown view left the app with no
    // search bar, no tab highlighted and a table nothing said belonged to it.
    view: pickOne<UrlView>(params.get("view"), ALL_VIEWS, "relics"),
    selected: params.get("relic"),
    pickedItem: params.get("item"),
    // Both checked the same way as everything above: the tier list ranks the
    // population it is given, so a `tvault` nobody validated would rank the
    // relics against a set of relics that is not on screen.
    tierVault: pickOne<VaultFilter>(params.get("tvault"), ALL_VAULT_FILTERS, "all"),
    tierSort: pickOne<TierSortColumn>(params.get("tsort"), ALL_TIER_SORTS, DEFAULT_TIER_SORT),
    filters: {
      ...base,
      term: params.get("q") ?? "",
      tiers: pickMany<Tier>(params.get("tier"), ALL_TIERS),
      rarities: pickMany<Rarity>(params.get("rarity"), ALL_RARITIES),
      refinement: pickOne<Refinement>(params.get("ref"), ALL_REFINEMENTS, DEFAULT_REFINEMENT),
      vault: pickOne<VaultFilter>(params.get("vault"), ["all", "farmable", "vaulted"], "all"),
      maxPrice: params.has("max") && Number.isFinite(max) && max >= 0 ? max : null,
    },
  };
}
