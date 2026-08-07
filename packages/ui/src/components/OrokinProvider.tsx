import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "../lib/cx";

export interface OrokinProviderProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
  /** Stretches the root to the full viewport height. */
  fullHeight?: boolean;
}

/**
 * Root wrapper for the design system.
 *
 * Every style ships scoped under `.rf-root`, so components rendered outside
 * this provider come out unstyled — no tokens, no fonts, no surfaces. Wrap the
 * application once, as high as possible.
 *
 * The system is dark-only by design: there is no theme prop and no light
 * palette. `color-scheme: dark` is set here so native controls and scrollbars
 * follow.
 */
export function OrokinProvider({
  children,
  fullHeight = false,
  className,
  style,
  ...rest
}: OrokinProviderProps) {
  return (
    <div
      className={cx("rf-root", className)}
      style={fullHeight ? { minHeight: "100dvh", ...style } : style}
      {...rest}
    >
      {children}
    </div>
  );
}
