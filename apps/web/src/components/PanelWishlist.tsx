import { QtyStepper } from "./QtyStepper";
import { bump, remove, type WishlistEntry } from "../lib/wishlist";

interface Props {
  /** The line this stepper edits, minus the quantity it is about to set. */
  seed: Omit<WishlistEntry, "qty">;
  qty: number;
  /** One line saying what exactly is being added, when it could be read two ways. */
  hint?: string;
}

/**
 * The wishlist stepper at the head of a detail panel, for the thing the panel
 * is about.
 *
 * The tables carry a stepper per row, but a panel is where someone lands after
 * following a part through three views, and asking them to go back to the row
 * they came from to add it is asking them to leave the answer they just found.
 */
export function PanelWishlist({ seed, qty, hint }: Props) {
  return (
    <div className="rf-panel-wishlist">
      <div className="rf-row-baseline-wide">
        <span className="rf-text-overline rf-fg-muted">Wishlist</span>
        <span className="rf-push">
          <QtyStepper
            itemName={seed.itemName}
            qty={qty}
            onIncrement={() => bump(seed, 1)}
            onDecrement={() => bump(seed, -1)}
            onRemove={() => remove(seed)}
          />
        </span>
      </div>
      {hint && <p className="rf-text-caption rf-fg-muted rf-flush rf-mt-1">{hint}</p>}
    </div>
  );
}
