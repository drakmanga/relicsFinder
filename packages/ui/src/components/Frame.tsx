import type { ElementType, HTMLAttributes, ReactNode } from "react";
import { cx } from "../lib/cx";
import type { Notch } from "../lib/types";

export type FrameVariant = "default" | "interactive" | "gilded" | "danger" | "none";
export type FrameShape = "orokin" | "inverse" | "octagon";

export interface FrameProps extends HTMLAttributes<HTMLElement> {
  /** Corner cut depth. Never exceed a third of the element's short side. */
  notch?: Notch;
  /**
   * `interactive` is mandatory whenever the border is the only signal that a
   * control is there — it is the token verified at 3:1 against every surface.
   * `gilded` is the Orokin inlay: use it on the detail panel, dialogs and
   * Radiant relic cards, never on inputs or buttons.
   */
  variant?: FrameVariant;
  /** `inverse` mirrors the diagonal for the opposite half of a split layout. */
  shape?: FrameShape;
  /** Background of the inner surface. Defaults to surface-1. */
  surface?: 0 | 1 | 2 | 3 | 4;
  /** Adds the floating drop-shadow. Only for popovers, dropdowns and dialogs. */
  floating?: boolean;
  /** Class applied to the inner surface rather than the border layer. */
  innerClassName?: string;
  as?: ElementType;
  children?: ReactNode;
}

const SURFACE_CLASS = ["rf-e0", "rf-e1", "rf-e2", "rf-e3", "rf-e4"] as const;

/**
 * The border primitive for clipped surfaces.
 *
 * clip-path cuts away both `box-shadow` and `outline`, so a border cannot be
 * drawn the ordinary way. Frame draws it as a second surface: the outer
 * element *is* the border, the inner one is inset by the frame width and
 * carries the real background. The inner notch subtracts that width, otherwise
 * the border reads noticeably thinner along the diagonal than on the straight
 * edges.
 *
 * The same structure produces the focus ring: on `:focus-visible` anywhere
 * inside, the frame grows to 2px and turns void-400, so the ring follows the
 * notched silhouette exactly.
 */
export function Frame({
  notch = "md",
  variant = "default",
  shape = "orokin",
  surface = 1,
  floating = false,
  className,
  innerClassName,
  as,
  children,
  ...rest
}: FrameProps) {
  const Tag = (as ?? "div") as ElementType;

  return (
    <Tag
      className={cx(
        "rf-frame",
        `rf-notch-${notch}`,
        shape === "inverse" && "rf-frame-inverse",
        shape === "octagon" && "rf-frame-octagon",
        variant === "interactive" && "rf-frame-interactive",
        variant === "gilded" && "rf-frame-gilded",
        variant === "danger" && "rf-frame-danger",
        floating && "rf-float",
        className,
      )}
      {...rest}
    >
      <div className={cx("rf-frame-inner", SURFACE_CLASS[surface], innerClassName)}>{children}</div>
    </Tag>
  );
}
