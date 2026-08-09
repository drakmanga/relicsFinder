import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "../lib/cx";
import { VoidSigil } from "./icons";

export interface DetailPanelProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  /** Chips shown above the title — tier, refinement, counters. */
  badges?: ReactNode;
  /**
   * Controls sitting opposite the badges: closing the panel, stepping back.
   *
   * On the badge row rather than below the title, so they stay in the same
   * place whatever the panel is showing and never push the content down.
   */
  actions?: ReactNode;
  /** Relic name. Rendered in Cinzel at display-md. */
  title?: ReactNode;
  /** Drop location, rotation, per-run chance. */
  meta?: ReactNode;
  /** Shown when no relic is selected. */
  emptyTitle?: ReactNode;
  emptyDescription?: ReactNode;
  /** Renders the empty state instead of the children. */
  empty?: boolean;
  /** Plays the 420ms sweep. Re-key the component to replay it on selection. */
  animate?: boolean;
  children?: ReactNode;
}

/**
 * Relic detail panel — 380px, sticky beside the results table.
 *
 * Uses the mirrored silhouette (`inverse`) so its diagonal faces the table's,
 * and the gilded frame, which is the Orokin inlay reserved for the panel,
 * dialogs and Radiant cards.
 *
 * The sweep is the signature entrance: the content is revealed left to right
 * inside a frame that is already there, so it materialises rather than slides.
 */
export function DetailPanel({
  badges,
  actions,
  title,
  meta,
  empty = false,
  emptyTitle = "No relic selected",
  emptyDescription = "Pick a relic to see its drops and prices.",
  animate = true,
  className,
  children,
  ...rest
}: DetailPanelProps) {
  return (
    <aside className={cx("rf-detail", className)} {...rest}>
      <div className="rf-frame rf-frame-gilded rf-frame-inverse rf-notch-lg">
        <div className={cx("rf-frame-inner", "rf-detail-body", animate && "rf-anim-sweep")}>
          {empty ? (
            <div className="rf-detail-empty">
              <VoidSigil />
              <p className="rf-text-heading-md rf-fg-secondary">{emptyTitle}</p>
              <p className="rf-text-body-sm rf-fg-muted">{emptyDescription}</p>
            </div>
          ) : (
            <>
              {(badges || actions) && (
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                    alignItems: "center",
                    minHeight: 24,
                  }}
                >
                  {badges}
                  {actions && (
                    <span style={{ marginLeft: "auto", display: "flex", gap: 4 }}>{actions}</span>
                  )}
                </div>
              )}
              {title && <p className="rf-text-display-md rf-detail-title">{title}</p>}
              {meta && <p className="rf-detail-meta">{meta}</p>}
              {children}
            </>
          )}
        </div>
      </div>
    </aside>
  );
}

/**
 * Ornament divider — a hairline interrupted by a gold diamond. Two per view is
 * the ceiling; past that it stops reading as punctuation.
 */
export function Divider({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cx("rf-divider", className)} role="separator" {...rest}>
      <span className="rf-divider-mark" />
    </div>
  );
}

export interface DropListProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Plays the 40ms cascade. Only for fixed-length lists — a relic has six
   * drops, so the last one lands at 200ms and still reads as simultaneous. On
   * a forty-row list the tail would arrive 1.6s late.
   */
  stagger?: boolean;
  children?: ReactNode;
}

/** Container for the six drops of a relic. */
export function DropList({ stagger = true, className, children, ...rest }: DropListProps) {
  return (
    <div className={cx(stagger && "rf-stagger", className)} {...rest}>
      {children}
    </div>
  );
}
