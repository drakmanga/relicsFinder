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
            style={{
              display: "inline-flex",
              padding: 0,
              border: 0,
              background: "none",
              cursor: "pointer",
              color: open ? "var(--rf-gold-500)" : "inherit",
              transition: "color var(--rf-dur-fast) var(--rf-ease-standard)",
            }}
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
