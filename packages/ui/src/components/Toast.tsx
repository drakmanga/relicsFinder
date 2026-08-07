import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "../lib/cx";
import { XIcon } from "./icons";

export type ToastTone = "success" | "warning" | "danger" | "info";

export interface ToastProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  tone?: ToastTone;
  title: ReactNode;
  description?: ReactNode;
  onDismiss?: () => void;
  dismissLabel?: string;
}

/**
 * Toast.
 *
 * The tone lives in a 2px bar on the left edge, not in the surface — a fully
 * tinted panel would fight the gold and purple already in play.
 *
 * Errors never auto-dismiss. `role` follows the tone: `alert` for warning and
 * danger so it interrupts, `status` otherwise so it does not.
 */
export function Toast({
  tone = "info",
  title,
  description,
  onDismiss,
  dismissLabel = "Dismiss",
  className,
  ...rest
}: ToastProps) {
  const assertive = tone === "danger" || tone === "warning";

  return (
    <div
      role={assertive ? "alert" : "status"}
      aria-live={assertive ? "assertive" : "polite"}
      className={cx("rf-toast", "rf-clip", `rf-toast-${tone}`, className)}
      {...rest}
    >
      <span className="rf-toast-bar" />
      <div className="rf-toast-content">
        <p className="rf-toast-title">{title}</p>
        {description && <p className="rf-toast-desc">{description}</p>}
      </div>
      {onDismiss && (
        <button type="button" className="rf-toast-close rf-focus-ring" onClick={onDismiss} aria-label={dismissLabel}>
          <XIcon width={16} height={16} />
        </button>
      )}
    </div>
  );
}

export interface ToastRegionProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

/** Bottom-right stack. Three toasts is the ceiling. */
export function ToastRegion({ className, children, ...rest }: ToastRegionProps) {
  return (
    <div className={cx("rf-toast-region", className)} {...rest}>
      {children}
    </div>
  );
}
