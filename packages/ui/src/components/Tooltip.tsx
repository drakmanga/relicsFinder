import { useId, useState } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "../lib/cx";

export type TooltipPlacement = "top" | "bottom" | "left" | "right";

export interface TooltipProps extends Omit<HTMLAttributes<HTMLSpanElement>, "content"> {
  content: ReactNode;
  placement?: TooltipPlacement;
  /** Open delay. 0ms on close, so leaving never feels sticky. */
  delay?: number;
  /**
   * Renders the tooltip already open. For previews, screenshots and visual
   * tests — a hover-only state cannot be captured statically.
   */
  defaultOpen?: boolean;
  children: ReactNode;
}

/**
 * Tooltip.
 *
 * Never interactive and never the only source of information — it explains,
 * it does not carry content the user needs. Opens after 400ms and closes
 * immediately, and responds to focus as well as hover so keyboard users get it
 * too.
 */
export function Tooltip({
  content,
  placement = "top",
  delay = 400,
  defaultOpen = false,
  className,
  children,
  ...rest
}: TooltipProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [timer, setTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const id = useId();

  const show = () => {
    const handle = setTimeout(() => setOpen(true), delay);
    setTimer(handle);
  };

  const hide = () => {
    if (timer) clearTimeout(timer);
    setTimer(null);
    setOpen(false);
  };

  return (
    /*
      The wrapper is not itself interactive — whatever it wraps is. The mouse
      handlers are mirrored by `onFocus`/`onBlur` immediately below, so the
      tooltip opens for a keyboard exactly as it does for a pointer, which is
      the thing this rule exists to check.
    */
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <span
      className={cx("rf-tooltip-wrap", className)}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={() => setOpen(true)}
      onBlur={hide}
      aria-describedby={open ? id : undefined}
      {...rest}
    >
      {children}
      {open && (
        <span id={id} role="tooltip" className={cx("rf-tooltip", "rf-clip", `rf-tooltip-${placement}`)}>
          {content}
        </span>
      )}
    </span>
  );
}
