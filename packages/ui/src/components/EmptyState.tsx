import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "../lib/cx";
import { AlertTriangleIcon, SearchXIcon, VoidSigil } from "./icons";

export type EmptyStateTone = "initial" | "empty" | "error";

export interface EmptyStateProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  /**
   * `initial` is the pre-search state — the gold void sigil, a Cinzel title
   * and example queries. `empty` is a search that returned nothing. `error` is
   * a failed request, and carries the technical detail so it can be reported.
   */
  tone?: EmptyStateTone;
  title: ReactNode;
  description?: ReactNode;
  /** Icon override. Each tone already has a sensible default. */
  icon?: ReactNode;
  /** Buttons or suggestion chips. */
  actions?: ReactNode;
}

/**
 * Empty, initial and error states.
 *
 * An error shows the technical detail (`HTTP 503 Service Unavailable`) in
 * caption tone — vague failures are unreportable, and this app depends on a
 * third-party API that does go down.
 */
export function EmptyState({
  tone = "empty",
  title,
  description,
  icon,
  actions,
  className,
  ...rest
}: EmptyStateProps) {
  const defaultIcon =
    tone === "initial" ? (
      <VoidSigil className="rf-empty-icon rf-empty-icon-initial" />
    ) : tone === "error" ? (
      <AlertTriangleIcon className="rf-empty-icon rf-empty-icon-error" />
    ) : (
      <SearchXIcon className="rf-empty-icon" />
    );

  return (
    <div
      className={cx("rf-empty", className)}
      role={tone === "error" ? "alert" : undefined}
      {...rest}
    >
      {icon ?? defaultIcon}
      <p className={tone === "initial" ? "rf-text-display-sm" : "rf-text-heading-md"}>{title}</p>
      {description && (
        <p className={cx(tone === "error" ? "rf-text-caption" : "rf-text-body-sm", "rf-empty-desc")}>
          {description}
        </p>
      )}
      {actions && <div className="rf-empty-actions">{actions}</div>}
    </div>
  );
}
