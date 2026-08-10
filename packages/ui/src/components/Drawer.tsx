import { useRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "../lib/cx";
import { useFocusTrap } from "../lib/useFocusTrap";

export interface DrawerProps extends HTMLAttributes<HTMLDivElement> {
  open: boolean;
  onClose: () => void;
  /** Names the drawer for assistive technology. */
  label: string;
  children?: ReactNode;
}

/**
 * A panel that slides in over the page from the trailing edge.
 *
 * What the detail panel becomes once there is no room for it beside the table.
 * Below that width the two-column layout does not fit — subtract a 440px panel
 * from a 1024px viewport and the table is left under the 640px it needs — and
 * stacking the panel underneath meant scrolling past a screenful of table to
 * reach what you had just clicked.
 *
 * It is modal: the scrim absorbs the click that would otherwise land on the row
 * behind it, Escape closes it, focus moves inside on open and returns to the
 * row on close. A drawer that a keyboard can walk out of is a drawer that
 * strands the reader behind a scrim they cannot reach past.
 */
export function Drawer({ open, onClose, label, className, children, ...rest }: DrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef, open, onClose);

  if (!open) return null;

  return (
    <>
      {/* The scrim carries no role and no handler beyond dismissing: Escape and
          the panel's own close button are the routes a keyboard has. */}
      <div className="rf-drawer-scrim" onMouseDown={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        className={cx("rf-drawer", className)}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        {...rest}
      >
        {children}
      </div>
    </>
  );
}
