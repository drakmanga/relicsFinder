import { useMemo, useState } from "react";
import {
  Button,
  Chip,
  DetailPanel,
  Divider,
  DropList,
  DropRow,
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
import { useDropInfo, useItemPrices, useRelics } from "./api/queries";
import type { RelicItemRow } from "./api/types";
import {
  applyPriceCeiling,
  buildRows,
  emptyFilters,
  sortRows,
  type Filters,
  type SortColumn,
  type SortDirection,
} from "./lib/rows";
import { relativeTime } from "./lib/format";

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

  const relics = useRelics();

  const rows = useMemo(
    () => buildRows(relics.data ?? [], filters),
    [relics.data, filters],
  );

  // Prices only for what is about to be shown: the batch is one request, but it
  // is still forty market lookups on the server the first time round.
  const visibleNames = useMemo(
    () => rows.slice(0, PAGE).map((row) => row.itemName),
    [rows],
  );
  const prices = useItemPrices(visibleNames);

  const visible = useMemo(() => {
    const ceiled = applyPriceCeiling(rows, filters.maxPrice, prices.data);
    return sortRows(ceiled, sort.column, sort.direction, prices.data).slice(0, PAGE);
  }, [rows, filters.maxPrice, prices.data, sort]);

  const selectedRow = useMemo(
    () => visible.find((row) => row.id === selected) ?? null,
    [visible, selected],
  );

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
            aria-label="Cerca reliquia o item"
            trailing={
              <Button
                variant={filtersOpen ? "accent" : "ghost"}
                size="sm"
                onClick={() => setFiltersOpen((open) => !open)}
              >
                Filtri {filtersOpen ? "▴" : "▾"}
              </Button>
            }
          />
        </div>
        {relics.data && <Chip>{rows.length} risultati</Chip>}
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
            onSelect={setSelected}
            sort={sort}
            onSort={toggleSort}
            filtered={filters.term.length > 0 || filters.tiers.size > 0 || filters.rarities.size > 0}
          />
        </main>

        <ItemDetail row={selectedRow} price={prices.data?.get(selectedRow?.itemName ?? "")} />
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
  onSelect: (id: string) => void;
  sort: { column: SortColumn; direction: SortDirection };
  onSort: (column: SortColumn) => void;
  filtered: boolean;
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
        title="Impossibile caricare le reliquie"
        description={String(state.error)}
        actions={
          <Button variant="outline" size="sm" onClick={() => state.refetch()}>
            Riprova
          </Button>
        }
      />
    );
  }

  if (rows.length === 0) {
    return filtered ? (
      <EmptyState
        title="Nessun risultato"
        description="Nessun item corrisponde alla ricerca e ai filtri attivi."
      />
    ) : (
      <EmptyState
        tone="initial"
        title="Cerca una reliquia"
        description="Nome della reliquia o dell'item Prime."
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
            <TableHeaderCell>Reliquia</TableHeaderCell>
            <TableHeaderCell>Item</TableHeaderCell>
            <TableHeaderCell>Rarità</TableHeaderCell>
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
              Prezzo
            </TableHeaderCell>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <TableRow
              key={row.id}
              selected={row.id === selected}
              onClick={() => onSelect(row.id)}
            >
              <TableCell>
                <TierChip tier={row.tier} refinement={row.refinement} />
              </TableCell>
              <TableCell>{row.relicFullName}</TableCell>
              <TableCell>{row.itemName}</TableCell>
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
            </TableRow>
          ))}
        </tbody>
      </Table>

      {total > rows.length && (
        <p className="rf-text-caption rf-fg-muted" style={{ padding: "12px 18px" }}>
          Mostrati {rows.length} di {total}. Restringi con la ricerca o i filtri.
        </p>
      )}
    </>
  );
}

function ItemDetail({
  row,
  price,
}: {
  row: RelicItemRow | null;
  price: number | null | undefined;
}) {
  const drops = useDropInfo(row?.relicFullName ?? null);

  if (!row) return <DetailPanel empty />;

  const sites = drops.data ?? [];

  return (
    <DetailPanel
      key={row.id}
      badges={<TierChip tier={row.tier} refinement={row.refinement} />}
      title={row.relicFullName}
      meta={row.itemName}
    >
      <Divider />

      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <RarityTag rarity={row.rarity} />
        <span className="rf-text-data-md rf-fg-muted">{row.chance.toFixed(2)}%</span>
        <span style={{ marginLeft: "auto" }}>
          <Price value={price ?? null} size="lg" />
        </span>
      </div>

      <Divider />

      <p className="rf-text-overline rf-fg-muted" style={{ marginBottom: 8 }}>
        Dove droppa
      </p>

      {drops.isPending ? (
        <Skeleton height={40} />
      ) : sites.length === 0 ? (
        <p className="rf-text-body-sm rf-fg-muted">
          Nessuna missione la droppa: la reliquia è vaulted.
        </p>
      ) : (
        <DropList>
          {sites.slice(0, 6).map((site, index) => (
            <DropRow
              key={`${site.location}-${site.rotation}-${index}`}
              name={`${site.location} · ${site.mission}`}
              rarity={row.rarity}
              chance={site.chance}
              index={index}
            />
          ))}
        </DropList>
      )}

      {sites.length > 6 && (
        <p className="rf-text-caption rf-fg-muted" style={{ marginTop: 8 }}>
          e altre {sites.length - 6} missioni
        </p>
      )}

      <div style={{ marginTop: 20 }}>
        <Button
          variant="primary"
          icon={<ExternalLinkIcon />}
          style={{ width: "100%" }}
          onClick={() =>
            window.open(
              `https://warframe.market/items/${row.itemName
                .toLowerCase()
                .replace(/ blueprint$/, "")
                .replace(/[^a-z0-9]+/g, "_")
                .replace(/^_+|_+$/g, "")}`,
              "_blank",
              "noopener,noreferrer",
            )
          }
        >
          Apri su Warframe Market
        </Button>
      </div>

      {drops.dataUpdatedAt > 0 && (
        <p className="rf-text-caption rf-fg-muted" style={{ marginTop: 12 }}>
          aggiornato {relativeTime(drops.dataUpdatedAt)}
        </p>
      )}
    </DetailPanel>
  );
}
