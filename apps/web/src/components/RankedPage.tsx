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
      className={onClick ? "rf-focus-ring" : undefined}
      onClick={onClick}
      style={onClick ? { cursor: "pointer" } : undefined}
    >
      <div style={{ padding: "14px 16px", display: "flex", gap: 14, alignItems: "flex-start" }}>
        <span
          className="rf-text-display-sm"
          style={{ color: rank === 1 ? "var(--rf-gold-300)" : "var(--rf-fg-disabled)", lineHeight: 1 }}
        >
          {rank}
        </span>

        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            title={title}
            style={{
              fontSize: 14,
              fontWeight: 600,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {title}
          </div>
          {subtitle && (
            <div className="rf-text-caption rf-fg-muted" style={{ marginTop: 2 }}>
              {subtitle}
            </div>
          )}
          {meta && <div style={{ marginTop: 8 }}>{meta}</div>}
        </div>

        <div style={{ textAlign: "right", flex: "none" }}>
          <div className="rf-text-overline rf-fg-muted">{figureLabel}</div>
          <div style={{ marginTop: 2 }}>{figure}</div>
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
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div
        style={{
          flex: "none",
          padding: "20px 24px 16px",
          background: "var(--rf-surface-1)",
          borderBottom: "1px solid var(--rf-border-subtle)",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-end", gap: 24, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 260 }}>
            <h2 className="rf-text-display-sm" style={{ margin: 0 }}>
              {title}
            </h2>
            <p className="rf-text-body-sm rf-fg-muted" style={{ margin: "6px 0 0", maxWidth: "68ch" }}>
              {lead}
            </p>
          </div>
          {controls}
        </div>

        {highlights && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 12,
              marginTop: 18,
            }}
          >
            {highlights}
          </div>
        )}
      </div>

      <div style={{ flex: 1, minHeight: 0 }}>{children}</div>

      {footnote && (
        <div
          style={{
            flex: "none",
            padding: "10px 24px",
            borderTop: "1px solid var(--rf-border-subtle)",
            background: "var(--rf-surface-1)",
          }}
        >
          {footnote}
        </div>
      )}
    </div>
  );
}
