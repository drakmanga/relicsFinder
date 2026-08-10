import type { ReactNode } from "react";
import { Frame } from "relic-finder-ui";

interface HighlightProps {
  rank: number;
  title: string;
  subtitle?: string;
  /** The number the ranking is built on. */
  figure: ReactNode;
  figureLabel: string;
  meta?: ReactNode;
  onClick?: () => void;
}

/**
 * The top of a ranking, as three cards.
 *
 * A ranked table answers "what is best" only after the reader has parsed a row
 * of numbers. Lifting the first three out says it before they read anything,
 * and gives the page somewhere to breathe — the tables here are dense by
 * necessity, so the density has to start somewhere other than the first pixel.
 */
export function Highlight({
  rank,
  title,
  subtitle,
  figure,
  figureLabel,
  meta,
  onClick,
}: HighlightProps) {
  return (
    <Frame
      notch="md"
      // Only the leader is gilded. Three gold frames would rank nothing.
      variant={rank === 1 ? "gilded" : "default"}
      surface={2}
      className={onClick ? "rf-highlight-clickable rf-focus-ring" : undefined}
      onClick={onClick}
    >
      <div className="rf-highlight">
        <span
          className={`rf-text-display-sm rf-highlight-rank${rank === 1 ? " rf-highlight-rank-first" : ""}`}
        >
          {rank}
        </span>

        <div className="rf-highlight-body">
          <div title={title} className="rf-highlight-title">
            {title}
          </div>
          {subtitle && <div className="rf-text-caption rf-fg-muted rf-highlight-sub">{subtitle}</div>}
          {meta && <div className="rf-highlight-meta">{meta}</div>}
        </div>

        <div className="rf-highlight-figure">
          <div className="rf-text-overline rf-fg-muted">{figureLabel}</div>
          <div className="rf-highlight-sub">{figure}</div>
        </div>
      </div>
    </Frame>
  );
}

interface PageProps {
  title: string;
  lead: string;
  /** Filters or toggles, right-aligned in the header. */
  controls?: ReactNode;
  highlights?: ReactNode;
  footnote?: ReactNode;
  children: ReactNode;
}

/**
 * Shell for the two ranking views.
 *
 * Shared so Ducanetor and Endo cannot drift apart: they answer the same shape
 * of question — what is the best value right now — and should look like they
 * belong to the same tool.
 */
export function RankedPage({ title, lead, controls, highlights, footnote, children }: PageProps) {
  return (
    <div className="rf-ranked">
      <div className="rf-ranked-head">
        <div className="rf-ranked-headline">
          <div className="rf-ranked-heading">
            <h2 className="rf-text-display-sm rf-ranked-title">{title}</h2>
            <p className="rf-text-body-sm rf-fg-muted rf-prose rf-ranked-lead">{lead}</p>
          </div>
          {controls}
        </div>

        {highlights && <div className="rf-ranked-highlights">{highlights}</div>}
      </div>

      <div className="rf-ranked-body">{children}</div>

      {footnote && <div className="rf-ranked-foot">{footnote}</div>}
    </div>
  );
}
