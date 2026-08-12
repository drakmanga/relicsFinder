import { CheckIcon } from "relic-finder-ui";

interface Props {
  /** What the tick is about, for the control's name. */
  label: string;
  /**
   * How much of it is in hand.
   *
   * Three states rather than two because a row can be a whole set: "some" is
   * the honest answer for three pieces out of four, and a box that showed those
   * as unticked would be asking the reader to tick something they have already
   * half done.
   */
  state: "none" | "some" | "all";
  onToggle: () => void;
}

/**
 * "I have this one", from the row itself.
 *
 * A button rather than a `Checkbox`: the row it sits in is clickable — it opens
 * the part — and a label tied to an input swallows that click for the whole
 * cell. The box is drawn rather than native for the same reason.
 *
 * Ticking is how the Sets view stays honest, and it is the only way in: one
 * click per part on Prime Items, one for a whole set on Sets. Reading the list
 * out of the game instead would need a tool that lifts a session token from the
 * running process, which is not something this application will ask anyone to
 * run.
 */
export function OwnedBox({ label, state, onToggle }: Props) {
  const marked = state !== "none";

  return (
    <button
      type="button"
      /*
        `role="checkbox"` rather than a pressed button, because "mixed" is a
        state the platform already has a name for and `aria-pressed` does not.
      */
      role="checkbox"
      aria-checked={state === "all" ? true : state === "some" ? "mixed" : false}
      aria-label={
        state === "all"
          ? `You have ${label} — untick it`
          : state === "some"
            ? `You have part of ${label} — tick the rest`
            : `Mark ${label} as owned`
      }
      title={
        state === "all" ? "You have this" : state === "some" ? "Partly yours" : "Mark as owned"
      }
      className={marked ? "rf-focus-ring rf-ownedbox rf-ownedbox-on" : "rf-focus-ring rf-ownedbox"}
      onClick={(event) => {
        // The row underneath opens the part; ticking it is not opening it.
        event.stopPropagation();
        onToggle();
      }}
    >
      {/* The drawn box is a child, not the button itself: the button is the hit
          area, which grows to 44px where a finger is the pointer while the box
          stays the size it reads best at. */}
      <span className="rf-ownedbox-mark">
        {state === "all" && <CheckIcon width={13} height={13} />}
        {state === "some" && <span className="rf-ownedbox-part" />}
      </span>
    </button>
  );
}
