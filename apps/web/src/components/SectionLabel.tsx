import { useState } from "react";
import type { ReactNode } from "react";
import { InfoIcon } from "relic-finder-ui";

/**
 * A section heading with the working behind it, one click away.
 *
 * Shared by the panels because the same question keeps coming up — "where does
 * this number come from" — and the answer is a paragraph, not a tooltip. It
 * stays folded so the panel reads as a column of figures, and unfolds in place
 * so the reader does not lose their spot.
 */
export function SectionLabel({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <p className="rf-text-overline rf-fg-muted rf-label-row">
        {children}
        {hint && (
          <button
            type="button"
            onClick={() => setOpen((was) => !was)}
            aria-expanded={open}
            aria-label={open ? "Hide the explanation" : "How this is worked out"}
            /*
              13px of icon, and rule 7 wants 44. It grows upwards and sideways
              because those are the directions with room: below it is the
              section's own first line, 10px down, and that line is a control on
              three of the panels. What it reaches instead is the heading beside
              it and the paragraph above — text, neither of them a target.

              It lands at 25x29 rather than 44, which is §5.4's third exception
              and not an oversight: growing the other 20px would take the row
              under it, and this control cannot be redrawn bigger without
              redrawing every section heading in every panel.

              The styling moved to a class because an inline `border: 0` would
              have won against the hit area, which IS a border.
            */
            className="rf-hint-toggle rf-hit-block-start rf-hit-inline"
            data-open={open || undefined}
          >
            <InfoIcon width={13} height={13} />
          </button>
        )}
      </p>

      {hint && open && (
        <div
          style={{
            // The overline above is uppercase and letter-spaced; prose is not,
            // and it inherits both unless they are put back.
            textTransform: "none",
            letterSpacing: "normal",
            fontSize: 12,
            lineHeight: 1.55,
            color: "var(--rf-fg-secondary)",
            background: "var(--rf-surface-3)",
            borderLeft: "2px solid var(--rf-gold-500)",
            padding: "10px 12px",
            marginBottom: 12,
          }}
        >
          {hint}
        </div>
      )}
    </>
  );
}
