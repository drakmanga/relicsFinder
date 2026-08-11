/**
 * Over 150 lines (rule 4) and it is all one decision: which of six tables the
 * current view is about. The length is the six branches and the props they
 * need, not logic that could live elsewhere.
 */
import { Button, EmptyState, Skeleton } from "relic-finder-ui";

import { DucanetorTable } from "./DucanetorTable";
import { EndoTable } from "./EndoTable";
import { ItemsTable } from "./ItemsTable";
import { ResultsTable } from "./ResultsTable";
import { SetsTable } from "./SetsTable";
import { WishlistTable } from "./WishlistTable";
import type {
  EndoOffer,
  PriceMap,
  Refinement,
  RelicPriceMap,
  RelicRow,
  WishlistKind,
} from "../api/types";
import type { PrimeItemRow } from "../lib/items";
import type { PrimeSet } from "../lib/setCompletion";
import type { RelicSortColumn, SortDirection } from "../lib/rows";
import type { WishlistEntry } from "../lib/wishlist";

export type PaneView = "relics" | "items" | "sets" | "wishlist" | "ducats" | "endo";

interface Props {
  view: PaneView;
  /** The relic catalogue's own request: everything except Endo waits on it. */
  catalogue: { isPending: boolean; isError: boolean; error: unknown; refetch: () => void };
  relicRows: RelicRow[];
  itemRows: PrimeItemRow[];
  sets: PrimeSet[];
  wishlistEntries: WishlistEntry[];
  endoOffers: EndoOffer[] | undefined;
  prices: PriceMap | undefined;
  pricesPending: boolean;
  relicPrices: RelicPriceMap | undefined;
  unvaulted: Set<string> | undefined;
  term: string;
  /** Every filter currently narrowing the list, in words, for the empty state. */
  activeFilters: string[];
  onClearFilters: () => void;
  quantityOf: (itemName: string, kind?: WishlistKind, refinement?: Refinement) => number;
  selectedRelic: string | null;
  onSelectRelic: (id: string) => void;
  selectedItem: string | null;
  onSelectItem: (itemName: string) => void;
  selectedSet: string | null;
  onSelectSet: (setName: string) => void;
  onInfo: (itemName: string) => void;
  /** Where a wishlist line leads when it is clicked. */
  onPickItem: (itemName: string) => void;
  onPickRelic: (relicFullName: string) => void;
  onShowEndo: () => void;
  sort: { column: RelicSortColumn; direction: SortDirection };
  onSort: (column: RelicSortColumn) => void;
}

/**
 * Whichever list the current view is about.
 *
 * One place decides which of the six tables is on screen, rather than the shell
 * carrying a nine-branch conditional in the middle of its layout.
 */
export function ResultsPane({
  view,
  catalogue,
  relicRows,
  itemRows,
  sets,
  wishlistEntries,
  endoOffers,
  prices,
  pricesPending,
  relicPrices,
  unvaulted,
  term,
  activeFilters,
  onClearFilters,
  quantityOf,
  selectedRelic,
  onSelectRelic,
  selectedItem,
  onSelectItem,
  selectedSet,
  onSelectSet,
  onInfo,
  onPickItem,
  onPickRelic,
  onShowEndo,
  sort,
  onSort,
}: Props) {
  // Ayatan offers come straight from the market: nothing here waits on the
  // relic catalogue, so it must not wait on its loading state.
  if (view === "endo") return <EndoTable active quantityOf={quantityOf} />;

  if (catalogue.isPending) {
    return (
      <div className="rf-skeleton-stack">
        {Array.from({ length: 12 }, (_, index) => (
          <Skeleton key={index} height={40} />
        ))}
      </div>
    );
  }

  if (catalogue.isError) {
    return (
      <EmptyState
        tone="error"
        title="Could not load relics"
        description={String(catalogue.error)}
        actions={
          <Button variant="outline" size="sm" onClick={catalogue.refetch}>
            Retry
          </Button>
        }
      />
    );
  }

  if (view === "ducats") {
    return <DucanetorTable prices={prices} onInfo={onInfo} quantityOf={quantityOf} />;
  }

  if (view === "sets") {
    return (
      <SetsTable
        sets={sets}
        pricesPending={pricesPending}
        selected={selectedSet}
        onSelect={onSelectSet}
      />
    );
  }

  if (view === "wishlist") {
    return (
      <WishlistTable
        entries={wishlistEntries}
        prices={prices}
        relicPrices={relicPrices}
        onInfo={onInfo}
        onPickItem={onPickItem}
        onPickRelic={onPickRelic}
        onShowEndo={onShowEndo}
        endoOffers={endoOffers}
      />
    );
  }

  const rowCount = view === "items" ? itemRows.length : relicRows.length;

  if (rowCount === 0) {
    /*
      The filters are named, not merely alluded to. A price ceiling left at 5p
      empties the whole catalogue and the bar that set it may well be collapsed
      — "no item matches the active filters" is then a riddle. Saying which
      ones, and offering to drop them, is the difference between a dead end and
      a wrong turn.
    */
    return activeFilters.length > 0 ? (
      <EmptyState
        title="No results"
        description={`Nothing matches ${activeFilters.join(", ")}.`}
        actions={
          <Button variant="outline" size="sm" onClick={onClearFilters}>
            Clear filters
          </Button>
        }
      />
    ) : (
      <EmptyState
        tone="initial"
        title="Search for a relic"
        description="The name of the relic, or of the Prime part you are after."
      />
    );
  }

  if (view === "items") {
    return (
      <ItemsTable
        rows={itemRows}
        prices={prices}
        quantityOf={quantityOf}
        selected={selectedItem}
        onSelect={onSelectItem}
        onInfo={onInfo}
      />
    );
  }

  return (
    <ResultsTable
      rows={relicRows}
      prices={prices}
      pricesPending={pricesPending}
      relicPrices={relicPrices}
      term={term}
      unvaulted={unvaulted}
      selected={selectedRelic}
      onSelect={onSelectRelic}
      quantityOf={quantityOf}
      sort={sort}
      onSort={onSort}
    />
  );
}
