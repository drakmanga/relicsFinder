import { useMemo, useState } from "react";
import {
  Button,
  Chip,
  EmptyState,
  Input,
  SearchIcon,
  Skeleton,
} from "relic-finder-ui";

import { FilterBar } from "./components/FilterBar";
import { ItemDetailPanel } from "./components/ItemDetailPanel";
import { ResultsTable } from "./components/ResultsTable";
import { RelicDetailPanel } from "./components/RelicDetailPanel";
import { WishlistPanel } from "./components/WishlistPanel";
import { useDropInfo, useItemPrices, useRelics } from "./api/queries";
import { useWishlist } from "./lib/wishlist";
import { useDebounced } from "./lib/useDebounced";
import type { Reward } from "./api/types";
import {
  applyPriceCeiling,
  buildRows,
  emptyFilters,
  sortRows,
  type Filters,
  type SortColumn,
  type SortDirection,
} from "./lib/rows";


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
  const [panel, setPanel] = useState<"relic" | "item" | "wishlist">("relic");
  const [pickedItem, setPickedItem] = useState<string | null>(null);

  /** Item names the virtualiser currently has on screen. */
  const [windowItems, setWindowItems] = useState<string[]>([]);
  const settledWindow = useDebounced(windowItems, 400);

  const relics = useRelics();
  const wishlist = useWishlist();

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

  // The row carries one item; the panel shows the whole relic, so the other
  // five rewards are looked up rather than re-fetched.
  const rewardsByRelic = useMemo(() => {
    const map = new Map<string, Reward[]>();
    for (const relic of relics.data ?? []) {
      map.set(`${relic.fullName}|${relic.refinement}`, relic.rewards);
    }
    return map;
  }, [relics.data]);

  const selectedRewards = useMemo(
    () =>
      selectedRow
        ? (rewardsByRelic.get(`${selectedRow.relicFullName}|${selectedRow.refinement}`) ?? [])
        : [],
    [rewardsByRelic, selectedRow],
  );

  const selectedSites = useDropInfo(selectedRow?.relicFullName ?? null);

  // Prices only for what is about to be shown: the batch is one request, but it
  // is still forty market lookups on the server the first time round.
  // Wishlist entries join the batch even when scrolled out of the results:
  // the panel total needs their prices, and asking separately would double the
  // number of market lookups.
  const pricedNames = useMemo(
    () => [
      ...settledWindow,
      ...wishlist.entries.map((entry) => entry.itemName),
      ...selectedRewards.map((reward) => reward.itemName),
    ],
    [settledWindow, wishlist.entries, selectedRewards],
  );
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
            fontFamily: "var(--rf-font-display)",
            fontSize: 17,
            letterSpacing: "0.14em",
            color: "var(--rf-gold-300)",
          }}
        >
          RELIC FINDER
        </span>

        <div style={{ marginLeft: "auto" }}>
          <Button
            variant={panel === "wishlist" ? "accent" : "outline"}
            size="sm"
            onClick={() => setPanel((current) => (current === "wishlist" ? "relic" : "wishlist"))}
          >
            Wishlist · {wishlist.totalItems}
          </Button>
        </div>
      </header>

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
        {relics.data && <Chip>{visible.length} results</Chip>}
      </div>

      {filtersOpen && <FilterBar filters={filters} onChange={setFilters} />}

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
          {relics.isPending ? (
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
          ) : visible.length === 0 ? (
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
              onVisibleItems={setWindowItems}
            />
          )}
        </main>

        {panel === "wishlist" ? (
          <WishlistPanel
            entries={wishlist.entries}
            prices={prices.data}
            pricesUpdatedAt={prices.dataUpdatedAt}
          />
        ) : panel === "item" && selectedRow ? (
          <ItemDetailPanel
            row={pickedItem ? { ...selectedRow, itemName: pickedItem } : selectedRow}
            relics={relics.data ?? []}
            prices={prices.data}
            onPickItem={setPickedItem}
          />
        ) : (
          <RelicDetailPanel
            row={selectedRow}
            rewards={selectedRewards}
            prices={prices.data}
            sites={selectedSites.data ?? []}
            sitesPending={selectedSites.isPending}
          />
        )}
      </div>
    </div>
  );
}
