import type { HTMLAttributes } from "react";
import { cx } from "../lib/cx";
import { RARITY_LABEL } from "../lib/types";
import type { Rarity } from "../lib/types";

export interface RarityTagProps extends HTMLAttributes<HTMLSpanElement> {
  rarity: Rarity;
  /** Abbreviates to Com. / Unc. / Rare for narrow columns. */
  abbreviated?: boolean;
  /** Drops the label, leaving the dot. Requires a label elsewhere in the row. */
  dotOnly?: boolean;
}

const ABBREVIATION: Record<Rarity, string> = {
  common: "Com.",
  uncommon: "Unc.",
  rare: "Rare",
};

/**
 * Drop rarity.
 *
 * Always a dot plus text, never colour alone — the metals are faithful to the
 * game (bronze, silver, gold) and bronze against gold is not a distinction
 * anyone should have to make by hue. When `dotOnly` is used the label has to
 * exist somewhere else in the row; the accessible name stays on the element
 * either way.
 */
export function RarityTag({
  rarity,
  abbreviated = false,
  dotOnly = false,
  className,
  ...rest
}: RarityTagProps) {
  const label = abbreviated ? ABBREVIATION[rarity] : RARITY_LABEL[rarity];

  return (
    <span
      className={cx("rf-rarity", `rf-rarity-${rarity}`, className)}
      aria-label={dotOnly ? RARITY_LABEL[rarity] : undefined}
      {...rest}
    >
      <span className="rf-rarity-dot" />
      {!dotOnly && label}
    </span>
  );
}
