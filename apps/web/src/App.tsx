import { useEffect, useMemo, useState } from "react";
import { Button, Chip, Input, SearchIcon, Tabs } from "relic-finder-ui";

import { DetailPane } from "./components/DetailPane";
import { FilterBar } from "./components/FilterBar";
import { ResultsPane } from "./components/ResultsPane";
import { ItemInfoDialog } from "./components/ItemInfoDialog";
import {
  useDropInfo,
  useEndoOffers,
  useItemPrices,
  useRelicPrices,
  useRelics,
  useUnvaultedNames,
} from "./api/queries";
import { useWishlist } from "./lib/wishlist";
import { useOwned } from "./lib/owned";
import { buildSets } from "./lib/setCompletion";
import { applyItemPriceCeiling, buildItemRows, synthesiseItemRow } from "./lib/items";
import { fromSearch, toSearch } from "./lib/urlState";
import type { Refinement, Reward } from "./api/types";
import {
  applyRelicPriceCeiling,
  applyVaultFilter,
  buildRelicRows,
  emptyFilters,
  sortRelicRows,
  type Filters,
  type RelicSortColumn,
  type SortDirection,
} from "./lib/rows";


type View = "relics" | "items" | "sets" | "wishlist" | "ducats" | "endo";

/**
 * Views that browse the relic catalogue.
 *
 * Only these get the search box, the filter bar and the detail panel: the other
 * three are lists in their own right — a wishlist the user built, and two
 * rankings of what the market is offering right now — and none of them has
 * anything for a relic filter to act on.
 */
type CatalogueView = "relics" | "items";

const isCatalogue = (view: View): view is CatalogueView =>
  view === "relics" || view === "items";

export function App() {
  // Read once, so a shared link opens on the state it describes rather than on
  // the default and then jumping.
  const initial = fromSearch(window.location.search, emptyFilters());

  /**
   * One set of filters per catalogue view, not one for the app.
   *
   * A ceiling of 20p is a sensible question to ask of a list of parts and a
   * meaningless one to ask of a list of relics, where it caps the best drop
   * instead; refinement likewise means "which state am I reading" on one and
   * "which state am I farming at" on the other. Sharing them meant a filter set
   * on one tab silently emptied the other, and the bar that explained it was on
   * the tab the user had just left.
   *
   * The link is read into whichever view it names — its filters describe that
   * view, not the other one.
   */
  const [viewFilters, setViewFilters] = useState<Record<CatalogueView, Filters>>(() => ({
    relics: emptyFilters(),
    items: emptyFilters(),
    ...(isCatalogue(initial.view as View) ? { [initial.view]: initial.filters } : {}),
  }));
  /**
   * The search term, deliberately shared by every view.
   *
   * It sits above the filter bar rather than in it, and it is a question about
   * the game — "where is Volt Prime Neuroptics" — not about the list being
   * read. Someone who searches a part on Relics and switches to Prime Items is
   * following the same question into another view, and re-typing it there would
   * be the tool losing the thread.
   */
  const [term, setTerm] = useState(initial.filters.term);
  /**
   * Open where there is room for it, shut where there is not.
   *
   * The bar is five groups tall on a narrow screen, which on a phone is the
   * whole viewport: opening by default meant the first thing the app showed was
   * its filters and none of the list they filter. Read once at mount rather
   * than watched, so resizing never yanks the bar away from someone using it.
   * 1024px is --rf-bp-lg, the same width at which the detail panel stops being
   * a column.
   */
  const [filtersOpen, setFiltersOpen] = useState(
    () => window.matchMedia("(min-width: 1024px)").matches,
  );
  /** Alphabetical: the Relics view is a catalogue, and A comes first. */
  const [sort, setSort] = useState<{ column: RelicSortColumn; direction: SortDirection }>({
    column: "relic",
    direction: "asc",
  });
  const [selected, setSelected] = useState<string | null>(initial.selected);
  const [pickedItem, setPickedItem] = useState<string | null>(initial.pickedItem);
  const [view, setView] = useState<View>(initial.view as View);
  /** Item whose info dialog is open. Null closes it. */
  const [infoItem, setInfoItem] = useState<string | null>(null);
  /** Set the panel is showing, by name. */
  const [selectedSet, setSelectedSet] = useState<string | null>(null);
  /**
   * Refinement the farming route assumes, for the Sets view only.
   *
   * Its own state rather than the shared filter: the filter decides which rows
   * the relics table lists, and asking "how many Radiant runs would this take"
   * should not empty the table behind another tab.
   */
  const [setRefinement, setSetRefinement] = useState<Refinement>("intact");

  /**
   * Where the panel came from, one step per jump.
   *
   * Following a relic into one of its parts, then into a part of that part's
   * set, then into a relic that drops it, is a chain someone walks while
   * deciding what to farm — and the way back matters as much as the way in.
   * The browser's own Back cannot serve: the whole view is written with
   * replaceState so that typing in the search box does not bury the history
   * under one entry per keystroke.
   */
  const [trail, setTrail] = useState<
    { view: View; selected: string | null; pickedItem: string | null }[]
  >([]);

  /**
   * The filters in force, which is the current view's own set plus the shared
   * term. Views without a filter bar still search, so they get the term over an
   * otherwise empty set rather than borrowing another view's filters.
   */
  const filters: Filters = useMemo(
    () => (isCatalogue(view) ? { ...viewFilters[view], term } : { ...emptyFilters(), term }),
    [view, viewFilters, term],
  );

  /** Routes a change from the filter bar: the term is shared, the rest is not. */
  const setFilters = (next: Filters) => {
    setTerm(next.term);
    if (isCatalogue(view)) {
      setViewFilters((current) => ({ ...current, [view]: { ...next, term: "" } }));
    }
  };

  /**
   * Writes the state back into the address bar.
   *
   * `replaceState`, not `pushState`: typing four letters into the search box
   * would otherwise leave four history entries, and pressing Back would walk
   * them one keystroke at a time. The URL stays shareable either way, and the
   * popstate listener below keeps the Back button meaningful across the entries
   * the browser does create.
   */
  useEffect(() => {
    const search = toSearch({ view, filters, selected, pickedItem });
    if (search !== window.location.search) {
      window.history.replaceState(null, "", `${window.location.pathname}${search}`);
    }
  }, [view, filters, selected, pickedItem]);

  useEffect(() => {
    const onPop = () => {
      const next = fromSearch(window.location.search, emptyFilters());
      setView(next.view as View);
      setTerm(next.filters.term);
      // The entry's filters belong to the view it names, and only that one: the
      // other view's are left as the user had them.
      if (isCatalogue(next.view as View)) {
        setViewFilters((current) => ({
          ...current,
          [next.view]: { ...next.filters, term: "" },
        }));
      }
      setSelected(next.selected);
      setPickedItem(next.pickedItem);
    };

    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  /**
   * Follows a part from a relic's contents into the view that is about parts.
   *
   * The row synthesises its own panel entry from the catalogue, so nothing has
   * to be visible in the table first and the user's search survives the jump.
   */
  const openItem = (itemName: string) => {
    setTrail((steps) => [...steps, { view, selected, pickedItem }]);
    setPickedItem(itemName);
    setView("items");
  };

  /**
   * The reverse: a relic named under "Dropped by" opens in the relics table.
   *
   * The id carries the refinement the table is filtered to, not the one the
   * item panel was quoting — the row has to exist in the list being shown, and
   * it is that list the selection points into.
   */
  const openRelic = (relicFullName: string) => {
    setTrail((steps) => [...steps, { view, selected, pickedItem }]);
    // The Relics view's own refinement, not the one in force where the click
    // happened: the row has to exist in the list being opened, and since the
    // filters are per view that list is filtered by its own state.
    setSelected(`${relicFullName}|${viewFilters.relics.refinement}`);
    setView("relics");
  };

  /** One step back along the trail, never further. */
  const goBack = () => {
    const previous = trail[trail.length - 1];
    if (!previous) return;

    setTrail(trail.slice(0, -1));
    setView(previous.view);
    setSelected(previous.selected);
    setPickedItem(previous.pickedItem);
  };

  /**
   * Closes the panel and forgets how it was reached.
   *
   * The trail describes a walk through the panel; with the panel shut there is
   * nothing to walk back to, and a Back button that reopened it would be a
   * second, quieter way of undoing the close.
   */
  const closePanel = () => {
    setTrail([]);
    setSelected(null);
    setPickedItem(null);
    setSelectedSet(null);
  };

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

  const rows = useMemo(
    () => buildRelicRows(relics.data ?? [], filters),
    [relics.data, filters],
  );

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
    if (filters.vault !== "all") active.push(filters.vault === "farmable" ? "droppable" : "vaulted");
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

    return selectedRow.rewards.find((r) => r.itemName.toLowerCase().includes(term))?.itemName ?? null;
  }, [filters.term, selectedRow]);

  const toggleSort = (column: RelicSortColumn) =>
    setSort((current) =>
      current.column === column
        ? { column, direction: current.direction === "desc" ? "asc" : "desc" }
        : // A name starts at A, a number starts at its largest: nobody asks for
          // the least valuable relic first.
          { column, direction: column === "relic" ? "asc" : "desc" },
    );

  return (
    <div className="rf-app">
      {/* Every band below is full-bleed and carries its own background and
          border; the shell inside it caps the content at --rf-content-max and
          centres it. Before this the app was full-bleed at every width, which
          on a 1920 monitor meant an 1884px line with an 18px gutter. */}
      <header className="rf-band rf-topbar">
        <div className="rf-shell rf-topbar-inner">
          {/*
            The name is the way home, which is what a masthead is for everywhere
            else on the web. It closes the panel too: landing on Relics with a
            part still open in the panel beside it would be halfway back rather
            than back.
          */}
          <button
            type="button"
            className="rf-brand rf-focus-ring"
            onClick={() => {
              setView("relics");
              closePanel();
            }}
            aria-label="Relic Finder — back to the relics"
          >
            RELIC FINDER
          </button>

          <Tabs
            label="Views"
            value={view}
            onChange={(id) => setView(id as typeof view)}
            items={[
              { id: "relics", label: "Relics" },
              { id: "items", label: "Prime Items" },
              { id: "sets", label: "Sets" },
              { id: "wishlist", label: `Wishlist · ${wishlist.totalItems}` },
              { id: "ducats", label: "Ducanetor" },
              { id: "endo", label: "Endo" },
            ]}
          />
        </div>
      </header>

      {/* Search and filters act on the catalogue, not on the list. */}
      {(isCatalogue(view) || view === "sets") && (
        <div className="rf-band rf-searchbar">
          <div className="rf-shell rf-searchbar-inner">
            <div className="rf-search-field">
              {/*
                Nothing trails the field. The Filters toggle used to, which put
                a control that only shows and hides a bar inside the box you
                type into — the one place where a button reads as "do the
                search".
              */}
              <Input
                icon={<SearchIcon />}
                placeholder="Lith V9, Volt Prime Neuroptics…"
                value={filters.term}
                onChange={(event) => setFilters({ ...filters, term: event.target.value })}
                aria-label="Search relic or item"
              />
            </div>
            {relics.data && (
              <Chip>
                {view === "items"
                  ? itemRows.length
                  : view === "sets"
                    ? visibleSets.length
                    : visible.length}{" "}
                results
              </Chip>
            )}
          </div>
        </div>
      )}

      {/* The toggle lives with the thing it toggles, and stays put when the bar
          folds away — otherwise closing the filters would take the only control
          that reopens them with it. */}
      {isCatalogue(view) && (
        <div className={`rf-band rf-filterstrip${filtersOpen ? "" : " rf-filterstrip-closed"}`}>
          <div className="rf-shell rf-filterstrip-inner">
            <Button
              variant={filtersOpen ? "accent" : "ghost"}
              size="sm"
              onClick={() => setFiltersOpen((open) => !open)}
              aria-expanded={filtersOpen}
              aria-controls="rf-filter-bar"
            >
              Filters {filtersOpen ? "▴" : "▾"}
            </Button>
            {!filtersOpen && activeBarFilters > 0 && (
              <span className="rf-text-caption rf-fg-muted">{activeBarFilters} active</span>
            )}
          </div>
        </div>
      )}

      {filtersOpen && isCatalogue(view) && (
        <div className="rf-band rf-filterband">
          <div className="rf-shell">
            <FilterBar id="rf-filter-bar" filters={filters} onChange={setFilters} view={view} />
          </div>
        </div>
      )}

      {/* Below --rf-bp-lg the shell's two columns become two rows: subtract a
          440px panel from a 1024px viewport and the table is left under the
          640px it needs. See .rf-results in app.css. */}
      {/* Below --rf-bp-lg the shell's two columns become two rows: subtract a
          440px panel from a 1024px viewport and the table is left under the
          640px it needs. See .rf-results in app.css. */}
      <div className="rf-band rf-resultsband">
        <div className="rf-shell rf-results">
          <main className="rf-results-main">
            <ResultsPane
              view={view}
              catalogue={relics}
              relicRows={visible}
              itemRows={itemRows}
              sets={visibleSets}
              wishlistEntries={wishlist.entries}
              endoOffers={endoOffers.data}
              prices={prices.data}
              pricesPending={prices.isPending}
              relicPrices={relicPrices.data}
              unvaulted={unvaulted.data}
              term={filters.term}
              activeFilters={activeFilters}
              onClearFilters={() => setFilters({ ...emptyFilters(), term: filters.term })}
              quantityOf={wishlist.quantityOf}
              selectedRelic={selected}
              onSelectRelic={setSelected}
              selectedItem={pickedItem}
              onSelectItem={setPickedItem}
              selectedSet={selectedSet}
              onSelectSet={setSelectedSet}
              onInfo={setInfoItem}
              sort={sort}
              onSort={toggleSort}
            />
          </main>

          <DetailPane
            view={view}
            relics={relics.data ?? []}
            prices={prices.data}
            pricesPending={prices.isPending}
            relicRow={selectedRow}
            relicStates={selectedStates}
            sites={selectedSites.data ?? []}
            sitesPending={selectedSites.isPending}
            highlightItem={searchedItem}
            itemRow={itemPanelRow}
            set={selectedSetRow}
            setRefinement={setRefinement}
            onSetRefinement={setSetRefinement}
            onToggleOwned={ownedParts.toggle}
            onToggleAllOwned={ownedParts.setAll}
            onPickItem={openItem}
            onPickRelic={openRelic}
            onBack={trail.length > 0 ? goBack : undefined}
            onClose={closePanel}
          />
        </div>
      </div>

      <ItemInfoDialog
        itemName={infoItem}
        prices={prices.data}
        onClose={() => setInfoItem(null)}
      />
    </div>
  );
}
