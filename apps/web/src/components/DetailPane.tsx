/**
 * Over 150 lines (rule 4), most of it the prop list three different panels
 * need. The alternative is three prop types saying the same thing.
 */
import { DetailPanel, Drawer } from "relic-finder-ui";

import { ItemDetailPanel } from "./ItemDetailPanel";
import { RelicDetailPanel } from "./RelicDetailPanel";
import { SetDetailPanel } from "./SetDetailPanel";
import type { PaneView } from "./ResultsPane";
import type {
  DropInfo,
  PriceMap,
  Refinement,
  Relic,
  RelicItemRow,
  RelicRow,
  Reward,
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

  /**
   * Below `lg` the panel is a modal drawer over the table rather than a column
   * beside it, and it exists only while something is selected.
   */
  asDrawer: boolean;
}

/**
 * One panel per view rather than one panel with a mode.
 *
 * The Relics view shows relics and the Prime Items view shows parts, so which
 * panel to draw stopped being a question about the clicked cell. The views with
 * no panel — Wishlist, Ducanetor, Endo — are lists in their own right and have
 * nothing to open beside them.
 */
export function DetailPane(props: Props) {
  const { view, asDrawer, onClose } = props;

  if (view === "wishlist" || view === "ducats" || view === "endo") return null;

  const panel = <Panel {...props} />;

  if (!asDrawer) return panel;

  /*
    As a drawer the panel is not a permanent column, so an empty one has nothing
    to say and should not be sitting over the table. What the view is currently
    pointing at decides whether there is a drawer at all.
  */
  const pointingAtSomething =
    view === "sets"
      ? props.set !== null
      : view === "items"
        ? props.itemRow !== null
        : props.relicRow !== null;

  return (
    <Drawer open={pointingAtSomething} onClose={onClose} label="Details">
      {panel}
    </Drawer>
  );
}

/** The panel itself, the same whether it stands in a column or inside a drawer. */
function Panel({
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
