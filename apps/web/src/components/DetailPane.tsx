/**
 * Over 150 lines (rule 4), most of it the prop list three different panels
 * need. The alternative is three prop types saying the same thing.
 */
import { DetailPanel, Modal } from "relic-finder-ui";

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
  WishlistKind,
} from "../api/types";
import type { PrimeSet } from "../lib/setCompletion";

interface Props {
  view: PaneView;
  relics: Relic[];
  prices: PriceMap | undefined;
  /** Whether more prices are still expected. See lib/priceProgress. */
  pricesFilling: boolean;

  relicRow: RelicRow | null;
  /** What the relic on show sells for, sealed. */
  relicPrice: number | null | undefined;
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
  /** Opens the wishlist at the section a panel's line belongs to. */
  onOpenWishlist: (section: WishlistKind) => void;
  onPickRelic: (relicFullName: string) => void;
  onBack: (() => void) | undefined;
  onClose: () => void;

  /** Opens the price history of the relic on show. */
  onInfoRelic: (relicFullName: string) => void;
  /** How many of a line the wishlist already holds, for the steppers inside. */
  quantityOf: (itemName: string, kind?: WishlistKind, refinement?: Refinement) => number;
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
  const { view, onClose } = props;

  // The wishlist is a list of plans, and a set line is one of them: its panel
  // opens over the list rather than instead of it, so closing hands the reader
  // back to the line they clicked. The two rankings have nothing with a panel.
  if (view === "ducats" || view === "endo") return null;

  /*
    The panel opens over the table rather than beside it, at every width.

    As a permanent column it took 440px of a screen whose whole point is a wide
    dense table, and it stood there empty whenever nothing was selected — a
    third of the window reserved for an answer nobody had asked for yet. As a
    modal it exists only while something is open, so the table gets the room
    back and the panel gets the reader's whole attention when it does appear.
  */
  const pointingAtSomething =
    view === "sets" || view === "wishlist"
      ? props.set !== null
      : view === "items"
        ? props.itemRow !== null
        : props.relicRow !== null;

  return (
    /* Wide, because the panels inside lay their sections out in columns rather
       than in one tall stack — see .rf-panel-cols. At the default 34rem the
       relic panel was a metre of scrolling inside a modal. */
    <Modal open={pointingAtSomething} onClose={onClose} label="Details" className="rf-modal-wide">
      <Panel {...props} />
    </Modal>
  );
}

/** The panel itself, the same whether it stands in a column or inside a drawer. */
function Panel({
  view,
  relics,
  prices,
  pricesFilling,
  relicRow,
  relicPrice,
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
  onInfoRelic,
  onOpenWishlist,
  onBack,
  onClose,
  quantityOf,
}: Props) {
  if (view === "sets" || view === "wishlist") {
    return (
      <SetDetailPanel
        set={set}
        pricesFilling={pricesFilling}
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
        quantityOf={quantityOf}
        onOpenWishlist={onOpenWishlist}
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
      price={relicPrice}
      onInfo={onInfoRelic}
      quantityOf={quantityOf}
      onOpenWishlist={onOpenWishlist}
    />
  );
}
