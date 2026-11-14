import { Button, XIcon } from "relic-finder-ui";

import { RelicPicker } from "./RelicPicker";
import { REFINEMENT_LABEL } from "../lib/rows";
import { totalOwnedRelics } from "../lib/ownedRelics";
import type { OwnedRelic, Refinement } from "../api/types";

interface Props {
  entries: OwnedRelic[];
  /** Every relic's full name, once, for the picker. */
  names: string[];
  onAdd: (relicName: string, refinement: Refinement, quantity: number) => void;
  /** Sets one line's count; zero removes it. */
  onSet: (relicName: string, refinement: Refinement, quantity: number) => void;
  /** The server's reason for refusing the last save, when it refused one. */
  error: string | null;
}

/**
 * The relics the player is holding: the picker that adds them and the list
 * that edits them.
 *
 * One line per relic and refinement, so Neo N16 Intact and Neo N16 Radiant are
 * two lines with two counts.
 */
export function RelicInventory({ entries, names, onAdd, onSet, error }: Props) {
  return (
    <section className="rf-crack-inventory" aria-labelledby="rf-crack-inventory-title">
      <h3 id="rf-crack-inventory-title" className="rf-text-heading-md rf-crack-section-title">
        Your relics · {totalOwnedRelics(entries)}
      </h3>

      <RelicPicker names={names} onAdd={onAdd} />

      {/* An alert rather than a polite region: the refusal answers a click
          the reader just made, and the list has already been put back. */}
      {error && (
        <p role="alert" className="rf-text-body-sm rf-crack-error">
          {error}
        </p>
      )}

      {entries.length === 0 ? (
        <p className="rf-text-body-sm rf-fg-muted">
          No relics yet. Warframe has no public inventory, so they are entered by hand.
        </p>
      ) : (
        <ul className="rf-crack-owned" aria-label="Relics held">
          {entries.map((entry) => {
            const label = `${entry.relicName} ${REFINEMENT_LABEL[entry.refinement]}`;
            const set = (quantity: number) => onSet(entry.relicName, entry.refinement, quantity);

            return (
              <li key={`${entry.relicName}|${entry.refinement}`} className="rf-crack-owned-row">
                <span className="rf-crack-owned-name">
                  {entry.relicName}
                  <span className="rf-text-caption rf-fg-muted">
                    {" "}
                    {REFINEMENT_LABEL[entry.refinement]}
                  </span>
                </span>

                {/* `.rf-qty` is the wishlist stepper's own row, reused for
                    the same `− N +` shape at the same size. */}
                <div className="rf-qty">
                  <Button
                    variant="outline"
                    size="xs"
                    aria-label={`One fewer ${label}`}
                    onClick={() => set(entry.quantity - 1)}
                  >
                    −
                  </Button>
                  <span className="rf-tabular rf-crack-owned-qty">{entry.quantity}</span>
                  <Button
                    variant="outline"
                    size="xs"
                    aria-label={`One more ${label}`}
                    onClick={() => set(entry.quantity + 1)}
                  >
                    +
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    iconOnly
                    icon={<XIcon />}
                    className="rf-qty-remove"
                    aria-label={`Remove ${label}`}
                    onClick={() => set(0)}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
