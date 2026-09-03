import type { HTMLAttributes } from "react";
import { cx } from "../lib/cx";

export interface UnlistedProps extends HTMLAttributes<HTMLSpanElement> {
  /** What is absent, in words. The default is the market's own answer. */
  what?: string;
}

/**
 * The placeholder for a value nobody has.
 *
 * It was a bare em dash in `fg-disabled`, which is two failures at once. The
 * colour scores 2.4:1 on these surfaces — WCAG exempts disabled controls, but
 * this is not a disabled control, it is a fact about the market, so the
 * exemption does not apply and `fg-muted` at 5.7:1 does the job. And an em dash
 * on its own is announced as "dash" or as nothing at all, so the meaning is
 * spelled out for anyone not reading the glyph.
 *
 * Here rather than in `apps/web`, where it lived until 2026-09-03. It knows
 * nothing about relics — it takes the word it stands in for as a prop, which is
 * how the tier list gets "Not ranked" out of it — so rule 9 puts it in the
 * library, and `Price` needed it: the branch that draws a missing price is in
 * this package and could not reach a component in the app, which is why that
 * branch still carried both faults this component was written to fix.
 */
export function Unlisted({ what = "Not listed", className, ...rest }: UnlistedProps) {
  return (
    <span className={cx("rf-unlisted", className)} title={what} {...rest}>
      <span aria-hidden="true">—</span>
      <span className="rf-sr-only">{what}</span>
    </span>
  );
}
