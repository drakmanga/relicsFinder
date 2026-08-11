import { useEffect, useMemo, useState } from "react";

import { emptyFilters, type Filters, type RelicSortColumn, type SortDirection } from "./rows";
import { fromSearch, toSearch } from "./urlState";
import type { Refinement } from "../api/types";

export type View = "relics" | "items" | "sets" | "wishlist" | "ducats" | "endo";

/**
 * Views that browse the relic catalogue.
 *
 * Only these get the search box, the filter bar and the detail panel: the other
 * three are lists in their own right — a wishlist the user built, and two
 * rankings of what the market is offering right now — and none of them has
 * anything for a relic filter to act on.
 */
export type CatalogueView = "relics" | "items";

export const isCatalogue = (view: View): view is CatalogueView =>
  view === "relics" || view === "items";

/**
 * Everything the user is currently holding: which view, which filters, what is
 * selected, and how they got there.
 *
 * All of it is in the address bar, so a screen can be sent to someone else or
 * bookmarked and reopened as it was. Lifted out of App because it is state and
 * navigation rather than layout, and because the trail, the URL and the
 * per-view filters all read and write the same handful of values — separating
 * them would mean threading setters between three hooks to no benefit.
 */
export function useViewState() {
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
  /** Relic whose price history is open. Its own state: the two dialogs read
      different endpoints, and a single string could not say which. */
  const [infoRelic, setInfoRelic] = useState<string | null>(null);
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

  return {
    view,
    setView,
    viewFilters,
    filters,
    setFilters,
    term,
    filtersOpen,
    setFiltersOpen,
    sort,
    setSort,
    selected,
    setSelected,
    pickedItem,
    setPickedItem,
    infoItem,
    setInfoItem,
    infoRelic,
    setInfoRelic,
    selectedSet,
    setSelectedSet,
    setRefinement,
    setSetRefinement,
    trail,
    openItem,
    openRelic,
    goBack,
    closePanel,
  };
}
