import { useMemo } from "react";

import {
  useDropInfo,
  useEndoOffers,
  useItemPrices,
  useRelicPrices,
  useRelics,
  useUnvaultedNames,
} from "../api/queries";
import { useWishlist } from "./wishlist";
import { useOwned } from "./owned";
import { buildSets } from "./setCompletion";
import { applyItemPriceCeiling, buildItemRows, synthesiseItemRow } from "./items";
import {
  applyRelicPriceCeiling,
  applyVaultFilter,
  buildRelicRows,
  sortRelicRows,
  type Filters,
  type RelicSortColumn,
  type SortDirection,
} from "./rows";
import type { Refinement, Reward } from "../api/types";

interface Input {
  view: string;
  filters: Filters;
  selected: string | null;
  pickedItem: string | null;
  selectedSet: string | null;
  /** The refinement the Sets view quotes its farming route at. */
  setRefinement: Refinement;
  sort: { column: RelicSortColumn; direction: SortDirection };
}

/**
 * Everything the views read, derived from the catalogue and the market.
 *
 * Lifted out of App because it is the app's data layer rather than its layout:
 * eleven queries and fourteen derivations, none of which have an opinion about
 * where anything is drawn. What is left in App is the shell and the state the
 * user is holding.
 *
 * The order matters and is not alphabetical. Prices are read before the row
 * lists because the price ceiling filters both catalogue views, so the rows
 * cannot be built without them.
 */
export function useCatalogue({
  view,
  filters,
  selected,
  pickedItem,
  selectedSet,
  setRefinement,
  sort,
}: Input) {
  const relics = useRelics();
  const unvaulted = useUnvaultedNames();
  const wishlist = useWishlist();
  const ownedParts = useOwned();

  /**
   * The wishlist shows what a saved sculpture costs today, which needs the same
   * offers the Endo view ranks. Fetched only when there is a sculpture to price:
   * the query is shared, so opening the Endo tab afterwards costs nothing.
   */
  const wantsSculptures = wishlist.entries.some((entry) => entry.kind === "endo");
  const endoOffers = useEndoOffers(view === "wishlist" && wantsSculptures);

  // Prices only for what is about to be shown: the batch is one request, but it
  // is still forty market lookups on the server the first time round.
  // Wishlist entries join the batch even when scrolled out of the results:
  // the panel total needs their prices, and asking separately would double the
  // number of market lookups.
  /**
   * Every distinct part in the dataset, priced in one request.
   *
   * The list is stable, so this is a single query whatever the user filters or
   * scrolls to — and sorting by price needs the whole set anyway.
   *
   * Read before the row lists rather than after them: the price ceiling is a
   * filter now, on both catalogue views, so the rows cannot be built without it.
   */
  const pricedNames = useMemo(() => {
    const names = new Set<string>();
    for (const relic of relics.data ?? []) {
      if (relic.refinement !== "intact") continue;
      for (const reward of relic.rewards) names.add(reward.itemName);
    }
    return [...names];
  }, [relics.data]);
  const prices = useItemPrices(pricedNames);

  const rows = useMemo(() => buildRelicRows(relics.data ?? [], filters), [relics.data, filters]);

  /**
   * The relic the panel is showing.
   *
   * Resolved against the full row set rather than the visible page: sorting by
   * price reorders the page, and a selection must not vanish because the row it
   * points at moved past the cut.
   *
   * When the selection names a relic the filters exclude, it is rebuilt from
   * the catalogue instead of coming back empty. That happens on purpose:
   * following a relic out of "Dropped by" lands on one that the search term
   * behind it never matched, and answering with a blank panel would make the
   * link look broken rather than the filter narrow.
   */
  const selectedRow = useMemo(() => {
    if (!selected) return null;

    const inView = rows.find((row) => row.id === selected);
    if (inView) return inView;

    const [fullName, refinement] = selected.split("|");
    const relic = (relics.data ?? []).find(
      (r) => r.fullName === fullName && r.refinement === refinement,
    );
    if (!relic) return null;

    return {
      id: selected,
      tier: relic.tier,
      relicFullName: relic.fullName,
      refinement: relic.refinement,
      rewards: relic.rewards,
    };
  }, [rows, selected, relics.data]);

  const itemRows = useMemo(() => {
    if (view !== "items") return [];

    const built = buildItemRows(relics.data ?? [], filters);

    // A part is droppable when any relic holding it is in rotation: one
    // unvaulted source is enough, and the other five being vaulted changes
    // nothing about whether it can be farmed tonight.
    const names = unvaulted.data;
    const vaulted =
      filters.vault === "all" || !names
        ? built
        : built.filter(
            (row) =>
              row.relicNames.some((name) => names.has(name)) === (filters.vault === "farmable"),
          );

    return applyItemPriceCeiling(vaulted, filters.maxPrice, prices.data);
  }, [view, relics.data, filters, unvaulted.data, prices.data]);

  // The row carries one item; the panel shows the whole relic, so the other
  // five rewards are looked up rather than re-fetched.
  const statesByRelic = useMemo(() => {
    const map = new Map<string, Partial<Record<Refinement, Reward[]>>>();
    for (const relic of relics.data ?? []) {
      const entry = map.get(relic.fullName) ?? {};
      entry[relic.refinement] = relic.rewards;
      map.set(relic.fullName, entry);
    }
    return map;
  }, [relics.data]);

  const selectedStates = useMemo(
    () => (selectedRow ? (statesByRelic.get(selectedRow.relicFullName) ?? {}) : {}),
    [statesByRelic, selectedRow],
  );

  const selectedSites = useDropInfo(selectedRow?.relicFullName ?? null);

  /** Every filter currently narrowing the list, in words, for the empty state. */
  const activeFilters = useMemo(() => {
    const active: string[] = [];

    if (filters.term.trim()) active.push(`the search "${filters.term.trim()}"`);
    if (filters.tiers.size > 0) active.push(`tier ${[...filters.tiers].join(", ")}`);
    if (view === "items" && filters.rarities.size > 0) {
      active.push(`rarity ${[...filters.rarities].join(", ")}`);
    }
    if (filters.vault !== "all")
      active.push(filters.vault === "farmable" ? "droppable" : "vaulted");
    if (filters.maxPrice !== null) active.push(`a ceiling of ${filters.maxPrice}p`);
    if (filters.refinement !== "intact") active.push(filters.refinement);

    return active;
  }, [filters, view]);

  /**
   * How many of those came from the filter bar.
   *
   * Shown beside the toggle when the bar is collapsed. A ceiling left at 5p
   * empties the catalogue, and with the bar shut there was nothing on screen
   * saying so — the count is what turns "the app is broken" back into "I have
   * three filters on".
   */
  const activeBarFilters = useMemo(() => {
    let count = 0;
    if (filters.tiers.size > 0) count += 1;
    if (view === "items" && filters.rarities.size > 0) count += 1;
    if (filters.vault !== "all") count += 1;
    if (filters.maxPrice !== null) count += 1;
    if (filters.refinement !== "intact") count += 1;
    return count;
  }, [filters, view]);

  /**
   * What the item panel should show.
   *
   * Only the Prime Items view has one, and it has no relic row behind it, so a
   * row is synthesised from the first relic that drops the part — the panel
   * needs a name, a rarity and somewhere to have come from.
   */
  const itemPanelRow = useMemo(
    () => synthesiseItemRow(relics.data ?? [], pickedItem),
    [pickedItem, relics.data],
  );

  /**
   * What each relic itself sells for.
   *
   * Asked for the rows the filters left, not the whole catalogue: the batch is
   * a server-side queue, and asking for six hundred relics when thirty are
   * being looked at puts the ones on screen behind the rest.
   */
  const relicPrices = useRelicPrices(
    // The Sets view prices relics too — the farming route is quoted in the
    // cost of the relics it takes — and there the whole catalogue is in play.
    view === "relics" || view === "sets"
      ? (relics.data ?? [])
          .filter((relic) => relic.refinement === "intact")
          .map((relic) => relic.fullName)
      : [],
  );

  /**
   * Every Prime set, with what each one still needs.
   *
   * Built only for the view that shows it: the pass walks the whole catalogue
   * and the result changes with every tick of a checkbox, so paying for it
   * behind another tab would be a re-render nobody sees.
   */
  const sets = useMemo(
    () =>
      view === "sets"
        ? buildSets(
            relics.data ?? [],
            ownedParts.owned,
            prices.data,
            relicPrices.data,
            setRefinement,
          )
        : [],
    [view, relics.data, ownedParts.owned, prices.data, relicPrices.data, setRefinement],
  );

  const visibleSets = useMemo(() => {
    const term = filters.term.trim().toLowerCase();
    if (!term) return sets;

    // The set name or any piece in it: someone who remembers "Akbolto" should
    // not have to know it is the set and not the part.
    return sets.filter(
      (set) =>
        set.setName.toLowerCase().includes(term) ||
        set.parts.some((part) => part.itemName.toLowerCase().includes(term)),
    );
  }, [sets, filters.term]);

  const selectedSetRow = useMemo(
    () => sets.find((set) => set.setName === selectedSet) ?? null,
    [sets, selectedSet],
  );

  const visible = useMemo(() => {
    const farmable = applyVaultFilter(rows, filters.vault, unvaulted.data);
    const ceiled = applyRelicPriceCeiling(farmable, filters.maxPrice, prices.data);
    return sortRelicRows(ceiled, sort.column, sort.direction, prices.data, relicPrices.data);
  }, [rows, filters.vault, unvaulted.data, filters.maxPrice, prices.data, sort, relicPrices.data]);

  /**
   * The part the search names, if it names one.
   *
   * Searching a part in this view lists the relics that hold it; the panel then
   * points at which of the six it is, so the answer does not stop at "one of
   * these".
   */
  const searchedItem = useMemo(() => {
    const term = filters.term.trim().toLowerCase();
    if (!term || !selectedRow) return null;

    return (
      selectedRow.rewards.find((r) => r.itemName.toLowerCase().includes(term))?.itemName ?? null
    );
  }, [filters.term, selectedRow]);

  return {
    relics,
    unvaulted,
    wishlist,
    ownedParts,
    endoOffers,
    prices,
    relicPrices,
    selectedRow,
    selectedStates,
    selectedSites,
    itemRows,
    itemPanelRow,
    activeFilters,
    activeBarFilters,
    visible,
    visibleSets,
    selectedSetRow,
    searchedItem,
  };
}
