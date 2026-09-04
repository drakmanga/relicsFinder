import { cx } from "../lib/cx";

export interface ProgressBarProps {
  /** How much is done, in whatever unit `total` is in. */
  value: number;

  /** The whole. A bar with nothing to measure against renders nothing. */
  total: number;

  /**
   * What is being measured, for a reader who cannot see the bar.
   *
   * Required rather than optional: a bar with no label announces a bare
   * percentage, which tells somebody how far along something is without ever
   * saying what.
   */
  label: string;

  className?: string;
}

/**
 * How far something has got, as a bar.
 *
 * A native `<progress>` rather than two divs, for one reason that decides it:
 * the number lives in an attribute, so nothing here writes a width into markup.
 * A hand-built bar needs an inline style for the fill on every render, which is
 * the rule this project does not bend. The element also arrives with the role
 * and the value semantics a div would have to re-declare by hand and get wrong.
 *
 * Determinate only. Something whose size is not known does not get a bar here —
 * it gets a sentence, which is more honest than a stripe that moves forever.
 */
export function ProgressBar({ value, total, label, className }: ProgressBarProps) {
  if (total <= 0) return null;

  return (
    <progress
      className={cx("rf-progress", className)}
      aria-label={label}
      value={Math.min(Math.max(value, 0), total)}
      max={total}
    />
  );
}
