import { Button } from "relic-finder-ui";

interface Props {
  itemName: string;
  /** Copies in hand. */
  owned: number;
  /** Copies the set is built from — the ceiling this counts up to. */
  needed: number;
  onChange: (copies: number) => void;
}

/**
 * How many copies of a piece are in hand, out of what the set needs.
 *
 * A stepper rather than a tick, because a tick cannot say "one Blade of two"
 * and 28 Prime sets are built from a doubled piece. It stops at what the set
 * needs: a spare beyond that is a thing to sell rather than a thing the set is
 * waiting for, and that question belongs to the wishlist's "ducat" kind.
 *
 * Not `QtyStepper`, which is the wishlist's: that one counts upwards without a
 * ceiling and carries a clear button, and "remove this from the wishlist" is
 * not a sentence about a thing you already own.
 *
 * The buttons are drawn at 32px and land in a 48px box, which is rule 7 bought
 * the way `.rf-hit-block` was built to buy it. The growth is safe here because
 * of the grid this sits in: what is above and below the stepper is the gap
 * between pieces and the piece's own farming line, which is indented past it —
 * so the box grows into space that is nobody's target rather than into a
 * neighbour's.
 */
export function OwnedStepper({ itemName, owned, needed, onChange }: Props) {
  const HIT = "rf-hit-block rf-hit-inline";

  return (
    <div className="rf-owned-qty" role="group" aria-label={`Copies of ${itemName} you have`}>
      <Button
        variant="outline"
        size="sm"
        className={HIT}
        disabled={owned === 0}
        aria-label={`One fewer ${itemName}`}
        onClick={(event) => {
          // The row underneath opens the piece; counting it is not opening it.
          event.stopPropagation();
          onChange(owned - 1);
        }}
      >
        −
      </Button>

      {/* The fraction rather than a bare count, on every piece and not only on
          a doubled one: "1" beside a piece that wants two is the reading this
          exists to correct, and a control that changes shape per row is one
          more thing to work out. */}
      <span className="rf-tabular rf-owned-qty-count">
        {owned}/{needed}
      </span>

      <Button
        variant="outline"
        size="sm"
        className={HIT}
        disabled={owned >= needed}
        aria-label={`One more ${itemName}`}
        onClick={(event) => {
          event.stopPropagation();
          onChange(owned + 1);
        }}
      >
        +
      </Button>
    </div>
  );
}
