import { useMemo, useState } from "react";
import {
  Button,
  Chip,
  EmptyState,
  Input,
  SearchIcon,
  Skeleton,
  Tabs,
} from "relic-finder-ui";

import { FilterBar } from "./components/FilterBar";
import { ItemDetailPanel } from "./components/ItemDetailPanel";
import { DucanetorTable } from "./components/DucanetorTable";
import { EndoTable } from "./components/EndoTable";
import { ItemInfoDialog } from "./components/ItemInfoDialog";
import { WishlistTable } from "./components/WishlistTable";
import { ItemsTable } from "./components/ItemsTable";
import { ResultsTable } from "./components/ResultsTable";
import { RelicDetailPanel } from "./components/RelicDetailPanel";
import { useDropInfo, useEndoOffers, useItemPrices, useRelics } from "./api/queries";
import { useWishlist } from "./lib/wishlist";
import { buildItemRows } from "./lib/items";
import type { Refinement, RelicItemRow, Reward } from "./api/types";
import {
  applyPriceCeiling,
  buildRows,
  emptyFilters,
  sortRows,
  type Filters,
  type SortColumn,
  type SortDirection,
} from "./lib/rows";


type View = "relics" | "items" | "wishlist" | "ducats" | "endo";

/**
 * Views that browse the relic catalogue.
 *
 * Only these get the search box, the filter bar and the detail panel: the other
 * three are lists in their own right — a wishlist the user built, and two
 * rankings of what the market is offering right now — and none of them has
 * anything for a relic filter to act on.
 */
const isCatalogue = (view: View) => view === "relics" || view === "items";

export function App() {
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [sort, setSort] = useState<{ column: SortColumn; direction: SortDirection }>({
    column: "chance",
    direction: "desc",
  });
  const [selected, setSelected] = useState<string | null>(null);
  /**
   * Which side of the row is on show. The row is a relic paired with an item,
   * so the cell that was clicked is enough to tell the two apart — no extra
   * control, and no second panel competing for the same 380px.
   */
  const [panel, setPanel] = useState<"relic" | "item">("relic");
  const [pickedItem, setPickedItem] = useState<string | null>(null);
  const [view, setView] = useState<View>("relics");
  /** Item whose info dialog is open. Null closes it. */
  const [infoItem, setInfoItem] = useState<string | null>(null);


  const relics = useRelics();
  const wishlist = useWishlist();

  /**
   * The wishlist shows what a saved sculpture costs today, which needs the same
   * offers the Endo view ranks. Fetched only when there is a sculpture to price:
   * the query is shared, so opening the Endo tab afterwards costs nothing.
   */
  const wantsSculptures = wishlist.entries.some((entry) => entry.kind === "endo");
  const endoOffers = useEndoOffers(view === "wishlist" && wantsSculptures);

  const rows = useMemo(
    () => buildRows(relics.data ?? [], filters),
    [relics.data, filters],
  );

  // Resolved against the full row set rather than the visible page: sorting by
  // price reorders the page, and a selection must not vanish because the row
  // it points at moved past the cut.
  const selectedRow = useMemo(
    () => rows.find((row) => row.id === selected) ?? null,
    [rows, selected],
  );

  const itemRows = useMemo(
    () => (view === "items" ? buildItemRows(relics.data ?? [], filters) : []),
    [view, relics.data, filters],
  );

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

  /**
   * What the item panel should show.
   *
   * In the relics view it is the clicked row, optionally swapped to a sibling
   * part. In the Prime Items view there is no relic row at all, so one is
   * synthesised from the first relic that drops the item — the panel only needs
   * a name, a rarity and somewhere to have come from.
   */
  const itemPanelRow = useMemo((): RelicItemRow | null => {
    const name = pickedItem ?? selectedRow?.itemName ?? null;
    if (!name) return null;
    if (selectedRow) return pickedItem ? { ...selectedRow, itemName: name } : selectedRow;

    for (const relic of relics.data ?? []) {
      if (relic.refinement !== "intact") continue;
      const reward = relic.rewards.find((r) => r.itemName === name);
      if (!reward) continue;

      return {
        id: `${relic.fullName}|${relic.refinement}|${name}`,
        tier: relic.tier,
        relicFullName: relic.fullName,
        refinement: relic.refinement,
        itemName: name,
        rarity: reward.rarity,
        chance: reward.chance,
      };
    }
    return null;
  }, [pickedItem, selectedRow, relics.data]);

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

  const visible = useMemo(() => {
    const ceiled = applyPriceCeiling(rows, filters.maxPrice, prices.data);
    return sortRows(ceiled, sort.column, sort.direction, prices.data);
  }, [rows, filters.maxPrice, prices.data, sort]);




  const toggleSort = (column: SortColumn) =>
    setSort((current) =>
      current.column === column
        ? { column, direction: current.direction === "desc" ? "asc" : "desc" }
        : { column, direction: "desc" },
    );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh" }}>
      <header
        style={{
          height: 56,
          flex: "none",
          display: "flex",
          alignItems: "center",
          gap: 28,
          padding: "0 18px",
          background: "var(--rf-surface-2)",
          borderBottom: "1px solid var(--rf-border-default)",
        }}
      >
        <span
          style={{
            flex: "none",
            fontFamily: "var(--rf-font-display)",
            fontSize: 17,
            letterSpacing: "0.14em",
            color: "var(--rf-gold-300)",
          }}
        >
          RELIC FINDER
        </span>

        <Tabs
          label="Views"
          value={view}
          onChange={(id) => setView(id as typeof view)}
          items={[
            { id: "relics", label: "Relics" },
            { id: "items", label: "Prime Items" },
            { id: "wishlist", label: `Wishlist · ${wishlist.totalItems}` },
            { id: "ducats", label: "Ducanetor" },
            { id: "endo", label: "Endo" },
          ]}
        />

      </header>

      {/* Search and filters act on the catalogue, not on the list. */}
      {isCatalogue(view) && (
      <div
        style={{
          flex: "none",
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "14px 18px",
          background: "var(--rf-surface-1)",
          borderBottom: "1px solid var(--rf-border-default)",
        }}
      >
        <div style={{ flex: 1, minWidth: 0, maxWidth: 720 }}>
          <Input
            icon={<SearchIcon />}
            placeholder="Lith V9, Volt Prime Neuroptics…"
            value={filters.term}
            onChange={(event) => setFilters({ ...filters, term: event.target.value })}
            aria-label="Search relic or item"
            trailing={
              <Button
                variant={filtersOpen ? "accent" : "ghost"}
                size="sm"
                onClick={() => setFiltersOpen((open) => !open)}
              >
                Filters {filtersOpen ? "▴" : "▾"}
              </Button>
            }
          />
        </div>
        {relics.data && (
          <Chip>{view === "items" ? itemRows.length : visible.length} results</Chip>
        )}
      </div>
      )}

      {filtersOpen && isCatalogue(view) && (
        <FilterBar filters={filters} onChange={setFilters} />
      )}

      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          gap: 1,
          background: "var(--rf-border-default)",
        }}
      >
        <main
          style={{ flex: 1, minWidth: 0, background: "var(--rf-surface-0)", overflow: "hidden" }}
        >
          {/* Ayatan offers come straight from the market: nothing here waits on
              the relic catalogue, so it must not wait on its loading state. */}
          {view === "endo" ? (
            <EndoTable active quantityOf={wishlist.quantityOf} />
          ) : relics.isPending ? (
            <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              {Array.from({ length: 12 }, (_, i) => (
                <Skeleton key={i} height={40} />
              ))}
            </div>
          ) : relics.isError ? (
            <EmptyState
              tone="error"
              title="Could not load relics"
              description={String(relics.error)}
              actions={
                <Button variant="outline" size="sm" onClick={() => relics.refetch()}>
                  Retry
                </Button>
              }
            />
          ) : view === "ducats" ? (
            <DucanetorTable
              prices={prices.data}
              onInfo={setInfoItem}
              quantityOf={wishlist.quantityOf}
            />
          ) : view === "wishlist" ? (
            <WishlistTable
              entries={wishlist.entries}
              prices={prices.data}
              onInfo={setInfoItem}
              endoOffers={endoOffers.data}
            />
          ) : (view === "items" ? itemRows.length : visible.length) === 0 ? (
            filters.term || filters.tiers.size > 0 || filters.rarities.size > 0 ? (
              <EmptyState
                title="No results"
                description="No item matches the search and the active filters."
              />
            ) : (
              <EmptyState
                tone="initial"
                title="Search for a relic"
                description="The name of the relic, or of the Prime part you are after."
              />
            )
          ) : view === "items" ? (
            <ItemsTable
              rows={itemRows}
              prices={prices.data}
              quantityOf={wishlist.quantityOf}
              selected={pickedItem}
              onSelect={(itemName) => {
                setPickedItem(itemName);
                setPanel("item");
              }}
              onInfo={setInfoItem}
            />
          ) : (
            <ResultsTable
              rows={visible}
              prices={prices.data}
              pricesPending={prices.isPending}
              selected={selected}
              onSelect={(id, mode) => {
                setSelected(id);
                setPickedItem(null);
                setPanel(mode);
              }}
              sort={sort}
              onSort={toggleSort}
              quantityOf={wishlist.quantityOf}
              onInfo={setInfoItem}
            />
          )}
        </main>

        {!isCatalogue(view) ? null : panel === "item" && itemPanelRow ? (
          <ItemDetailPanel
            row={itemPanelRow}
            relics={relics.data ?? []}
            prices={prices.data}
            onPickItem={setPickedItem}
          />
        ) : (
          <RelicDetailPanel
            row={selectedRow}
            states={selectedStates}
            prices={prices.data}
            sites={selectedSites.data ?? []}
            sitesPending={selectedSites.isPending}
          />
        )}
      </div>

      <ItemInfoDialog
        itemName={infoItem}
        prices={prices.data}
        onClose={() => setInfoItem(null)}
      />
    </div>
  );
}
