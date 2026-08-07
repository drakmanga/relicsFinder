import { useEffect, useId, useRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "../lib/cx";

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
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    returnFocusRef.current = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && dismissible) onClose();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      returnFocusRef.current?.focus();
    };
  }, [open, dismissible, onClose]);

  if (!open) return null;

  return (
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
