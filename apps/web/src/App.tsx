import { useMemo, useState } from "react";
import {
  Button,
  Chip,
  EmptyState,
  ExternalLinkIcon,
  Input,
  Price,
  RarityTag,
  SearchIcon,
  Skeleton,
  Table,
  TableCell,
  TableHeaderCell,
  TableRow,
  TierChip,
} from "relic-finder-ui";

import { FilterBar } from "./components/FilterBar";
import { QtyStepper } from "./components/QtyStepper";
import { ItemDetailPanel } from "./components/ItemDetailPanel";
import { RelicDetailPanel } from "./components/RelicDetailPanel";
import { WishlistPanel } from "./components/WishlistPanel";
import { useDropInfo, useItemPrices, useRelics } from "./api/queries";
import { bump, remove, useWishlist } from "./lib/wishlist";
import type { RelicItemRow, Reward } from "./api/types";
import {
  applyPriceCeiling,
  buildRows,
  emptyFilters,
  sortRows,
  type Filters,
  type SortColumn,
  type SortDirection,
} from "./lib/rows";
import { marketUrl } from "./lib/format";

/**
 * Rows rendered at once.
 *
 * 689 relics times six drops is roughly 4000 rows; the cap keeps the DOM small
 * and, just as importantly, keeps the price batch inside what warframe.market
 * will serve. Virtualisation is the real answer when filters stop being enough.
 */
const PAGE = 60;

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
      ...rows.slice(0, PAGE).map((row) => row.itemName),
      ...wishlist.entries.map((entry) => entry.itemName),
      ...selectedRewards.map((reward) => reward.itemName),
    ],
    [rows, wishlist.entries, selectedRewards],
  );
  const prices = useItemPrices(pricedNames);

  const visible = useMemo(() => {
    const ceiled = applyPriceCeiling(rows, filters.maxPrice, prices.data);
    return sortRows(ceiled, sort.column, sort.direction, prices.data).slice(0, PAGE);
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
        {relics.data && <Chip>{rows.length} results</Chip>}
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
          style={{ flex: 1, minWidth: 0, background: "var(--rf-surface-0)", overflow: "auto" }}
        >
          <Results
            rows={visible}
            total={rows.length}
            state={relics}
            prices={prices.data}
            pricesPending={prices.isPending}
            selected={selected}
            onSelect={(id, mode) => {
              setSelected(id);
              setPickedItem(null);
              // Picking a row while the wishlist is open should show what was
              // picked, not leave the click with no visible effect.
              setPanel(mode);
            }}
            sort={sort}
            onSort={toggleSort}
            filtered={filters.term.length > 0 || filters.tiers.size > 0 || filters.rarities.size > 0}
            quantityOf={wishlist.quantityOf}
          />
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

interface ResultsProps {
  rows: RelicItemRow[];
  total: number;
  state: ReturnType<typeof useRelics>;
  prices: Map<string, number | null> | undefined;
  pricesPending: boolean;
  selected: string | null;
  onSelect: (id: string, mode: "relic" | "item") => void;
  sort: { column: SortColumn; direction: SortDirection };
  onSort: (column: SortColumn) => void;
  filtered: boolean;
  quantityOf: (itemName: string) => number;
}

function Results({
  rows,
  total,
  state,
  prices,
  pricesPending,
  selected,
  onSelect,
  sort,
  onSort,
  filtered,
  quantityOf,
}: ResultsProps) {
  if (state.isPending) {
    return (
      <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
        {Array.from({ length: 12 }, (_, i) => (
          <Skeleton key={i} height={40} />
        ))}
      </div>
    );
  }

  if (state.isError) {
    return (
      <EmptyState
        tone="error"
        title="Could not load relics"
        description={String(state.error)}
        actions={
          <Button variant="outline" size="sm" onClick={() => state.refetch()}>
            Retry
          </Button>
        }
      />
    );
  }

  if (rows.length === 0) {
    return filtered ? (
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
    );
  }

  const dir = (column: SortColumn) => (sort.column === column ? sort.direction : null);

  return (
    <>
      <Table interactive framed={false}>
        <thead>
          <tr>
            <TableHeaderCell>Tier</TableHeaderCell>
            <TableHeaderCell>Relic</TableHeaderCell>
            <TableHeaderCell>Item</TableHeaderCell>
            <TableHeaderCell>Rarity</TableHeaderCell>
            <TableHeaderCell
              align="right"
              sortable
              sortDirection={dir("chance")}
              onSort={() => onSort("chance")}
            >
              Drop %
            </TableHeaderCell>
            <TableHeaderCell
              align="right"
              sortable
              sortDirection={dir("price")}
              onSort={() => onSort("price")}
            >
              Price
            </TableHeaderCell>
            <TableHeaderCell align="center">Wishlist</TableHeaderCell>
            <TableHeaderCell align="center">Market</TableHeaderCell>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <TableRow
              key={row.id}
              selected={row.id === selected}
              onClick={() => onSelect(row.id, "relic")}
            >
              <TableCell>
                <TierChip tier={row.tier} refinement={row.refinement} />
              </TableCell>
              <TableCell>{row.relicFullName}</TableCell>
              <TableCell
                onClick={(event) => {
                  event.stopPropagation();
                  onSelect(row.id, "item");
                }}
                style={{ cursor: "pointer" }}
                title={`What drops ${row.itemName}`}
              >
                {row.itemName}
              </TableCell>
              <TableCell>
                <RarityTag rarity={row.rarity} />
              </TableCell>
              <TableCell align="right" numeric>
                {row.chance.toFixed(2)}%
              </TableCell>
              <TableCell align="right" numeric>
                {pricesPending ? (
                  <Skeleton width={44} height={14} />
                ) : (
                  <Price value={prices?.get(row.itemName) ?? null} />
                )}
              </TableCell>
              <TableCell align="center">
                <QtyStepper
                  itemName={row.itemName}
                  qty={quantityOf(row.itemName)}
                  onIncrement={() =>
                    bump(
                      {
                        itemName: row.itemName,
                        tier: row.tier,
                        relicFullName: row.relicFullName,
                        refinement: row.refinement,
                      },
                      1,
                    )
                  }
                  onDecrement={() =>
                    bump(
                      {
                        itemName: row.itemName,
                        tier: row.tier,
                        relicFullName: row.relicFullName,
                        refinement: row.refinement,
                      },
                      -1,
                    )
                  }
                  onRemove={() => remove(row.itemName)}
                />
              </TableCell>
              <TableCell align="center">
                <Button
                  variant="ghost"
                  size="sm"
                  iconOnly
                  icon={<ExternalLinkIcon />}
                  aria-label={`Open ${row.itemName} on Warframe Market`}
                  onClick={(event) => {
                    event.stopPropagation();
                    window.open(marketUrl(row.itemName), "_blank", "noopener,noreferrer");
                  }}
                />
              </TableCell>
            </TableRow>
          ))}
        </tbody>
      </Table>

      {total > rows.length && (
        <p className="rf-text-caption rf-fg-muted" style={{ padding: "12px 18px" }}>
          Showing {rows.length} of {total}. Narrow it down with the search or the filters.
        </p>
      )}
    </>
  );
}
