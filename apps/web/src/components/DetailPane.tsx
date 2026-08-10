import { DetailPanel } from "relic-finder-ui";

import { ItemDetailPanel } from "./ItemDetailPanel";
import { RelicDetailPanel } from "./RelicDetailPanel";
import { SetDetailPanel } from "./SetDetailPanel";
import type { PaneView } from "./ResultsPane";
import type {
  PriceMap,
  Refinement,
  Relic,
  RelicItemRow,
  RelicRow,
  Reward,
  DropInfo,
} from "../api/types";
import type { PrimeSet } from "../lib/setCompletion";

interface Props {
  view: PaneView;
  relics: Relic[];
  prices: PriceMap | undefined;
  pricesPending: boolean;

  relicRow: RelicRow | null;
  /** The other refinements of the relic on show, for the state switcher. */
  relicStates: Partial<Record<Refinement, Reward[]>>;
  /** Where the relic on show drops. */
  sites: DropInfo[];
  sitesPending: boolean;
  /** The part the search named, highlighted among the relic's six drops. */
  highlightItem: string | null;

  itemRow: RelicItemRow | null;

  set: PrimeSet | null;
  setRefinement: Refinement;
  onSetRefinement: (refinement: Refinement) => void;
  onToggleOwned: (itemName: string) => void;
  onToggleAllOwned: (itemNames: string[], owned: boolean) => void;

  onPickItem: (itemName: string) => void;
  onPickRelic: (relicFullName: string) => void;
  onBack: (() => void) | undefined;
  onClose: () => void;
}

/**
 * One panel per view rather than one panel with a mode.
 *
 * The Relics view shows relics and the Prime Items view shows parts, so which
 * panel to draw stopped being a question about the clicked cell. The views with
 * no panel — Wishlist, Ducanetor, Endo — are lists in their own right and have
 * nothing to open beside them.
 */
export function DetailPane({
  view,
  relics,
  prices,
  pricesPending,
  relicRow,
  relicStates,
  sites,
  sitesPending,
  highlightItem,
  itemRow,
  set,
  setRefinement,
  onSetRefinement,
  onToggleOwned,
  onToggleAllOwned,
  onPickItem,
  onPickRelic,
  onBack,
  onClose,
}: Props) {
  if (view === "wishlist" || view === "ducats" || view === "endo") return null;

  if (view === "sets") {
    return (
      <SetDetailPanel
        set={set}
        pricesPending={pricesPending}
        refinement={setRefinement}
        onRefinement={onSetRefinement}
        onToggle={onToggleOwned}
        onToggleAll={onToggleAllOwned}
        onPickItem={onPickItem}
        onPickRelic={onPickRelic}
        onBack={onBack}
        onClose={onClose}
      />
    );
  }

  if (view === "items") {
    return itemRow === null ? (
      <DetailPanel empty />
    ) : (
      <ItemDetailPanel
        row={itemRow}
        relics={relics}
        prices={prices}
        onPickItem={onPickItem}
        onPickRelic={onPickRelic}
        onBack={onBack}
        onClose={onClose}
      />
    );
  }

  return (
    <RelicDetailPanel
      row={relicRow}
      onPickItem={onPickItem}
      onBack={onBack}
      onClose={onClose}
      highlightItem={highlightItem}
      states={relicStates}
      prices={prices}
      sites={sites}
      sitesPending={sitesPending}
    />
  );
}
