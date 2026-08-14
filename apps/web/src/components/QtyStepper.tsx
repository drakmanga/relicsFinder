import { Button, XIcon } from "relic-finder-ui";

interface Props {
  itemName: string;
  qty: number;
  size?: "xs" | "sm";
  onIncrement: () => void;
  onDecrement: () => void;
  onRemove: () => void;
}

/**
 * Wishlist quantity control: `− N +`, with a clear button that only appears
 * once there is something to clear.
 *
 * Every handler stops propagation. The control sits inside a clickable table
 * row, and without it adding an item would also change what the detail panel
 * is showing.
 */
export function QtyStepper({
  itemName,
  qty,
  size = "xs",
  onIncrement,
  onDecrement,
  onRemove,
}: Props) {
  const stop = (event: React.MouseEvent, action: () => void) => {
    event.stopPropagation();
    action();
  };

  return (
    <div className="rf-qty">
      <Button
        variant="outline"
        size={size}
        aria-label={`Remove one ${itemName} from the wishlist`}
        disabled={qty === 0}
        onClick={(event) => stop(event, onDecrement)}
      >
        −
      </Button>

      <span
        className="rf-tabular"
        style={{
          fontSize: 12,
          minWidth: 16,
          textAlign: "center",
          color: qty === 0 ? "var(--rf-fg-muted)" : "var(--rf-fg-primary)",
        }}
      >
        {qty}
      </span>

      <Button
        variant="outline"
        size={size}
        aria-label={`Add one ${itemName} to the wishlist`}
        onClick={(event) => stop(event, onIncrement)}
      >
        +
      </Button>

      {/* Kept in the layout when hidden so the row does not shift on the first add. */}
      <span className={qty > 0 ? undefined : "rf-qty-slot"}>
        <Button
          variant="ghost"
          size="sm"
          iconOnly
          icon={<XIcon />}
          aria-label={`Remove ${itemName} from the wishlist`}
          onClick={(event) => stop(event, onRemove)}
        />
      </span>
    </div>
  );
}
