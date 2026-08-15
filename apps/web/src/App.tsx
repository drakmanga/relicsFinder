/**
 * Over 150 lines (rule 4). State and navigation moved to lib/useViewState, the
 * data layer to lib/useCatalogue, and the two big conditionals to ResultsPane
 * and DetailPane. What is left is the shell: five bands and the props they hand
 * down, which is the one thing that cannot be moved somewhere else.
 */
import { Button, Chip, Input, SearchIcon, TabPanel, Tabs } from "relic-finder-ui";

import { DetailPane } from "./components/DetailPane";
import { FilterBar } from "./components/FilterBar";
import { FilterSummary } from "./components/FilterSummary";
import { ResultsPane } from "./components/ResultsPane";
import { ItemInfoDialog } from "./components/ItemInfoDialog";
import { LastUpdated } from "./components/LastUpdated";
import { PriceStatus } from "./components/PriceStatus";
import { RelicInfoDialog } from "./components/RelicInfoDialog";
import { emptyFilters, type RelicSortColumn } from "./lib/rows";
import { useCatalogue } from "./lib/useCatalogue";
import { isCatalogue, useViewState } from "./lib/useViewState";

export function App() {
  const {
    view,
    setView,
    filters,
    setFilters,
    filtersOpen,
    setFiltersOpen,
    sort,
    setSort,
    selected,
    setSelected,
    pickedItem,
    setPickedItem,
    infoItem,
    infoKind,
    showInfo,
    wishlistSection,
    setWishlistSection,
    showWishlist,
    infoRelic,
    setInfoRelic,
    selectedSet,
    setSelectedSet,
    setRefinement,
    setSetRefinement,
    setCategories,
    setSetCategories,
    setStatus,
    setSetStatus,
    trail,
    openItem,
    openRelic,
    goBack,
    closePanel,
  } = useViewState();

  const {
    relics,
    unvaulted,
    wishlist,
    ownedParts,
    endoOffers,
    prices,
    relicPrices,
    priceProgress,
    relicPriceProgress,
    setPriceProgress,
    setPricesQuery,
    selectedRow,
    selectedStates,
    selectedSites,
    itemRows,
    itemPanelRow,
    activeFilters,
    activeBarFilters,
    visible,
    visibleSets,
    allSets,
    setPriceBySet,
    selectedSetRow,
    searchedItem,
  } = useCatalogue({
    view,
    filters,
    selected,
    pickedItem,
    selectedSet,
    setRefinement,
    setCategories,
    setStatus,
    sort,
  });

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

          {/* In the masthead rather than above the table, because it answers
              for every view including the three with no search band — and a
              reader looking for how old a number is looks up, once, in the
              same place each time. */}
          <LastUpdated endo={view === "endo"} />
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
            {/* The count changes as the user types and again when prices land,
                and it is the only feedback that a filter did anything. Polite,
                so it waits for a pause rather than interrupting the typing it
                is reporting on. */}
            {relics.data && (
              <Chip aria-live="polite">
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
            {/* Shut, the strip is not an empty shelf: it says what the bar it
                hides is doing, lets each of those filters go with one click,
                and offers back the ones this browser asks for most. The count
                is the fallback for the widths where the chips would wrap the
                strip onto a second row. */}
            {!filtersOpen && (
              <>
                <FilterSummary filters={filters} view={view} onChange={setFilters} />
                {activeBarFilters > 0 && (
                  <span className="rf-text-caption rf-fg-muted rf-filter-count">
                    {activeBarFilters} active
                  </span>
                )}
              </>
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

      {/* Above the results rather than inside them: it speaks for every view
          that shows a price, including the three that have no search band, and
          a status line that moved with the tab would be a different line each
          time. Absent at rest, so the shell is unchanged once prices land. */}
      <PriceStatus
        batches={[
          { progress: priceProgress, isError: prices.isError, refetch: () => prices.refetch() },
          {
            progress: relicPriceProgress,
            isError: relicPrices.isError,
            refetch: () => relicPrices.refetch(),
          },
          {
            progress: setPriceProgress,
            isError: setPricesQuery.isError,
            refetch: () => setPricesQuery.refetch(),
          },
        ]}
      />

      {/* One column at every width: the detail panel opens over the table as a
          modal rather than beside it. See DetailPane. */}
      <div className="rf-band rf-resultsband">
        {/* The panel the tabs point at. Only the selected one is rendered — the
            views are different questions, not five hidden copies of one. */}
        <TabPanel id={view} value={view} className="rf-shell rf-results">
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
              pricesFilling={priceProgress.filling}
              relicPrices={relicPrices.data}
              relicPricesFilling={relicPriceProgress.filling}
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
              onInfo={showInfo}
              onPickItem={openItem}
              onPickRelic={openRelic}
              onShowEndo={() => setView("endo")}
              onSetOwnedAll={ownedParts.setAll}
              onPickSet={setSelectedSet}
              allSets={allSets}
              setPrices={setPriceBySet}
              setPricesFilling={setPriceProgress.filling}
              setCategories={setCategories}
              onSetCategories={setSetCategories}
              setStatus={setStatus}
              onSetStatus={setSetStatus}
              wishlistSection={wishlistSection}
              onWishlistSection={setWishlistSection}
              sort={sort}
              onSort={toggleSort}
            />
          </main>

          <DetailPane
            view={view}
            relics={relics.data ?? []}
            prices={prices.data}
            pricesFilling={priceProgress.filling}
            relicRow={selectedRow}
            relicPrice={selectedRow ? relicPrices.data?.get(selectedRow.relicFullName) : undefined}
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
            quantityOf={wishlist.quantityOf}
            onPickItem={openItem}
            onPickRelic={openRelic}
            onInfoRelic={setInfoRelic}
            onOpenWishlist={showWishlist}
            onBack={trail.length > 0 ? goBack : undefined}
            onClose={closePanel}
          />
        </TabPanel>
      </div>

      <ItemInfoDialog
        itemName={infoItem}
        kind={infoKind}
        prices={prices.data}
        quantityOf={wishlist.quantityOf}
        onOpenWishlist={showWishlist}
        onClose={() => showInfo(null)}
      />

      <RelicInfoDialog relicFullName={infoRelic} onClose={() => setInfoRelic(null)} />
    </div>
  );
}
