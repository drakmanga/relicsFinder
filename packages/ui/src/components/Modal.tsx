import { useRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "../lib/cx";
import { useFocusTrap } from "../lib/useFocusTrap";

export interface ModalProps extends HTMLAttributes<HTMLDivElement> {
  open: boolean;
  onClose: () => void;
  /** Names the modal for assistive technology. */
  label: string;
  children?: ReactNode;
}

/**
 * A bare modal surface: a scrim, and whatever is handed to it centred on top.
 *
 * `Dialog` is the other half of this pair and imposes a shape — a title, a
 * description, a footer of actions — which is right for a question being asked
 * and wrong for a panel that already carries its own heading and frame. This
 * one contributes no chrome of its own beyond the scrim, so what goes inside
 * looks exactly as it does anywhere else.
 *
 * Modal in the full sense: Escape closes it, Tab is held inside, focus moves in
 * on open and returns to whatever opened it, and the scrim absorbs the click
 * that would otherwise land on the page behind.
 */
export function Modal({ open, onClose, label, className, children, ...rest }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useFocusTrap(panelRef, open, onClose);

  if (!open) return null;

  return (
    /*
      The scrim is not a control and deliberately carries no role: it is the
      page behind, dimmed. Clicking it is a shortcut, not the only way out —
      Escape is bound above and the panel carries its own close button.
    */
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      className="rf-modal-scrim"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className={cx("rf-modal", className)}
        {...rest}
      >
        {children}
      </div>
    </div>
  );
}
