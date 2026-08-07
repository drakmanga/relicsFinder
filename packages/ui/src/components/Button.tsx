import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "../lib/cx";
import type { ControlSize } from "../lib/types";

export type ButtonVariant = "primary" | "accent" | "outline" | "ghost" | "danger";

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "size"> {
  /**
   * `primary` is the gold fill — exactly one per view, on the single action
   * that matters (Search, Open on Warframe Market).
   *
   * `accent` is the void-purple fill. It uses void-700 rather than void-500:
   * void-500 fails AA against both ink and bone, so it never carries text.
   */
  variant?: ButtonVariant;
  size?: ControlSize;
  /** Replaces the leading icon with a spinner and freezes the width. */
  loading?: boolean;
  /** Leading icon. Rendered at the size the control token specifies. */
  icon?: ReactNode;
  /** Square icon-only button. `aria-label` becomes mandatory. */
  iconOnly?: boolean;
  children?: ReactNode;
}

const SPINNER_SIZE: Record<ControlSize, string> = {
  xs: "rf-spinner-sm",
  sm: "rf-spinner-sm",
  md: "rf-spinner-md",
  lg: "rf-spinner-lg",
};

function ButtonBase({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  iconOnly = false,
  disabled,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      className={cx(
        "rf-btn",
        `rf-btn-${size}`,
        `rf-btn-${variant}`,
        variant !== "outline" && "rf-clip",
        iconOnly && `rf-btn-icon-${size}`,
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <span className={cx("rf-spinner", SPINNER_SIZE[size])} /> : icon}
      {!iconOnly && children}
    </button>
  );
}

/**
 * Button.
 *
 * The `outline` variant is wrapped in a frame rather than given a border:
 * clip-path would cut a plain border away, and the frame is also what draws
 * the focus ring along the notched silhouette.
 *
 * Disabled state swaps both fill and label to the disabled tokens instead of
 * lowering opacity — dimming the whole element drags the border below the 3:1
 * boundary threshold along with the text.
 */
export function Button({ variant = "primary", ...props }: ButtonProps) {
  if (variant === "outline") {
    const notch = props.size === "lg" ? "rf-notch-md" : props.size === "xs" ? "rf-notch-xs" : "rf-notch-sm";
    return (
      <span className={cx("rf-btn-outline-wrap", "rf-frame", "rf-frame-interactive", notch)}>
        <span className="rf-frame-inner rf-frame-inner-plain">
          <ButtonBase variant="outline" {...props} />
        </span>
      </span>
    );
  }

  return <ButtonBase variant={variant} {...props} />;
}
