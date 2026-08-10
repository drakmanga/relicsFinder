import { useEffect, type RefObject } from "react";

/** Everything the platform will focus, minus what has been taken out of the order. */
const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

const focusableWithin = (container: HTMLElement) =>
  [...container.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (element) => element.offsetParent !== null || element === document.activeElement,
  );

/**
 * Keeps Tab inside an overlay, closes it on Escape, and gives focus back to
 * whatever opened it.
 *
 * An overlay that does not trap focus is an overlay a keyboard walks straight
 * out of, into the page it is covering — where the pointer cannot follow,
 * because the scrim is in the way. Restoring focus on close matters just as
 * much: without it the next Tab starts from the top of the document, and the
 * reader loses the row they were on.
 *
 * The trap is deliberately re-read on every Tab rather than captured on open:
 * these overlays load their content after they appear, so the list of what is
 * focusable inside them is not knowable at the point they open.
 */
export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  active: boolean,
  onClose: () => void,
) {
  useEffect(() => {
    if (!active) return;

    const opener = document.activeElement as HTMLElement | null;
    const container = containerRef.current;
    container?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !container) return;

      const focusable = focusableWithin(container);
      if (focusable.length === 0) {
        // Nothing inside to land on: hold focus on the container rather than
        // letting Tab escape to the page behind the scrim.
        event.preventDefault();
        container.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const current = document.activeElement;

      if (!event.shiftKey && (current === last || !container.contains(current))) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && (current === first || current === container)) {
        event.preventDefault();
        last.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      opener?.focus();
    };
  }, [containerRef, active, onClose]);
}
