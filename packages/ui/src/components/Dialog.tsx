import { useId, useRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "../lib/cx";
import { useFocusTrap } from "../lib/useFocusTrap";

export interface DialogProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  /** Action buttons, right-aligned. Primary action last. */
  footer?: ReactNode;
  /** Blocks closing on scrim click and Escape. Use only for destructive flows. */
  dismissible?: boolean;
  children?: ReactNode;
}

/**
 * Dialog.
 *
 * Surface-4 with the gilded frame and the widest notch. Escape closes it,
 * focus moves inside on open and returns to whatever opened it on close, and
 * the scrim absorbs the click that would otherwise land on the page behind.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  footer,
  dismissible = true,
  className,
  children,
  ...rest
}: DialogProps) {
  const titleId = useId();
  const descId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  /*
    Escape, focus in, focus back — and Tab held inside. The dialog had the
    first three and not the fourth, so a keyboard could tab out of it onto the
    page behind the scrim, where the pointer could not follow.
  */
  useFocusTrap(panelRef, open && dismissible, onClose);

  if (!open) return null;

  return (
    /*
      The scrim is not a control and deliberately has no role: it is the page
      behind the dialog, dimmed. Clicking it is a shortcut, not the only way
      out — Escape is bound above and the dialog carries its own close button —
      so there is nothing here for a keyboard user to be locked out of.
    */
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      className="rf-dialog-scrim"
      onMouseDown={(event) => {
        if (dismissible && event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={cx("rf-dialog", "rf-frame", "rf-frame-gilded", "rf-notch-xl", className)}
        {...rest}
      >
        <div className="rf-frame-inner rf-dialog-body">
          {title && (
            <p id={titleId} className="rf-text-display-sm">
              {title}
            </p>
          )}
          {description && (
            <p id={descId} className="rf-text-body-md rf-dialog-desc">
              {description}
            </p>
          )}
          {children && <div className="rf-dialog-content">{children}</div>}
          {footer && <div className="rf-dialog-footer">{footer}</div>}
        </div>
      </div>
    </div>
  );
}
