import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "../lib/cx";
import { TIER_GLYPH } from "./icons";
import { REFINEMENT_LABEL, TIER_LABEL } from "../lib/types";
import type { Refinement, Tier } from "../lib/types";

export interface TierChipProps extends HTMLAttributes<HTMLSpanElement> {
  tier: Tier;
  /**
   * Modulates the chip rather than adding a colour of its own: opacity climbs
   * from 55% (Intact) to 100% (Radiant) and the gold frame tightens.
   */
  refinement?: Refinement;
  /**
   * Shows the refinement name instead of the tier name. Some label must always
   * be visible — opacity on its own is not an accessible channel.
   */
  showRefinement?: boolean;
  /** Hides the tier glyph. The glyph carries the era as a diamond count. */
  hideGlyph?: boolean;
  /**
   * Radiant pulse. Cap this at one element per view: on a list of thirty
   * Radiant relics only the selected row should pulse.
   */
  pulse?: boolean;
  children?: ReactNode;
}

/**
 * Relic tier chip.
 *
 * Filled with the tier colour and ink text — the tier palette is tuned for
 * contrast in negative (7.94:1 to 9.49:1) and must never be used as text on a
 * dark surface.
 *
 * Neo (#DB9463) sits close to Common (#C97F3E), and that is deliberate: the
 * two never share a slot. The tier is a filled chip at the start of a row, the
 * rarity is a round dot in the drop column — different shape, different
 * position, different treatment, before colour is even considered.
 */
export function TierChip({
  tier,
  refinement = "intact",
  showRefinement = false,
  hideGlyph = false,
  pulse = false,
  className,
  children,
  ...rest
}: TierChipProps) {
  const Glyph = TIER_GLYPH[tier];
  const label = children ?? (showRefinement ? REFINEMENT_LABEL[refinement] : TIER_LABEL[tier]);

  return (
    <span
      className={cx(
        "rf-chip",
        "rf-chip-tier",
        "rf-clip-octagon",
        `rf-tier-${tier}`,
        `rf-ref-${refinement}`,
        pulse && "rf-anim-radiant",
        className,
      )}
      aria-label={`${TIER_LABEL[tier]} ${REFINEMENT_LABEL[refinement]}`}
      {...rest}
    >
      {!hideGlyph && <Glyph />}
      {label}
    </span>
  );
}

export interface ChipProps extends HTMLAttributes<HTMLSpanElement> {
  /** `filter` is an active filter pill, `count` a neutral counter. */
  variant?: "filter" | "count";
  /** Renders a dismiss affordance and wires its handler. */
  onDismiss?: () => void;
  dismissLabel?: string;
  children?: ReactNode;
}

/** Filter and counter chip. */
export function Chip({
  variant = "count",
  onDismiss,
  dismissLabel = "Remove",
  className,
  children,
  ...rest
}: ChipProps) {
  return (
    <span className={cx("rf-chip", `rf-chip-${variant}`, "rf-clip-octagon", className)} {...rest}>
      {children}
      {onDismiss && (
        <button type="button" className="rf-chip-dismiss" onClick={onDismiss} aria-label={dismissLabel}>
          ×
        </button>
      )}
    </span>
  );
}
