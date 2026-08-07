import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "../lib/cx";
import { Frame } from "./Frame";
import type { FrameVariant } from "./Frame";
import type { Notch } from "../lib/types";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** `gilded` marks a Radiant relic or an otherwise significant card. */
  variant?: FrameVariant;
  notch?: Notch;
  header?: ReactNode;
  footer?: ReactNode;
  /** Removes the body padding so a list can run edge to edge. */
  flush?: boolean;
  children?: ReactNode;
}

/**
 * Card — the relic surface below the `lg` breakpoint, where the dense table
 * gives way to one card per relic.
 */
export function Card({
  variant = "default",
  notch = "md",
  header,
  footer,
  flush = false,
  className,
  children,
  ...rest
}: CardProps) {
  return (
    <Frame
      variant={variant}
      notch={notch}
      surface={2}
      className={className}
      innerClassName={cx(!flush && "rf-card-body")}
      {...rest}
    >
      {header && <div className="rf-card-header">{header}</div>}
      {children}
      {footer && <div className="rf-card-footer">{footer}</div>}
    </Frame>
  );
}
