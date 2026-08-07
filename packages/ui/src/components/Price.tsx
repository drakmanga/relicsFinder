import type { HTMLAttributes } from "react";
import { cx } from "../lib/cx";
import type { Currency } from "../lib/types";

export interface PriceProps extends HTMLAttributes<HTMLSpanElement> {
  /** `null` and `undefined` render an em dash, never a zero. */
  value?: number | null;
  /** Upper bound. Renders `12 – 18 p` with an en dash. */
  max?: number | null;
  currency?: Currency;
  size?: "md" | "lg";
  /** Hides the unit suffix, for columns that label the unit in the header. */
  hideSuffix?: boolean;
}

const SUFFIX: Record<Currency, string> = {
  platinum: "p",
  ducat: "d",
  credit: "cr",
};

const formatter = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 0 });

/**
 * Price.
 *
 * Platinum prices are whole numbers — Warframe Market does not trade
 * fractions. An absent price is an em dash in the disabled tone: rendering `0`
 * would claim the item is free rather than unpriced.
 */
export function Price({
  value,
  max,
  currency = "platinum",
  size = "md",
  hideSuffix = false,
  className,
  ...rest
}: PriceProps) {
  const missing = value === null || value === undefined;

  return (
    <span
      className={cx(
        "rf-price",
        `rf-price-${size}`,
        missing ? "rf-price-empty" : `rf-price-${currency}`,
        className,
      )}
      {...rest}
    >
      {missing ? (
        "—"
      ) : (
        <>
          {formatter.format(value)}
          {max !== null && max !== undefined && ` – ${formatter.format(max)}`}
          {!hideSuffix && <span className="rf-price-suffix">{SUFFIX[currency]}</span>}
        </>
      )}
    </span>
  );
}

export interface PriceDeltaProps extends HTMLAttributes<HTMLSpanElement> {
  /** Percentage change. Sign drives both the arrow and the colour. */
  value: number;
}

/**
 * Price movement.
 *
 * The colour and the arrow live on the delta, never on the price itself: a
 * high price is not an error, and colouring the number red would say it was.
 */
export function PriceDelta({ value, className, ...rest }: PriceDeltaProps) {
  const direction = value > 0 ? "up" : value < 0 ? "down" : "flat";
  const arrow = value > 0 ? "▲" : value < 0 ? "▼" : "—";
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";

  return (
    <span className={cx("rf-delta", `rf-delta-${direction}`, className)} {...rest}>
      {arrow} {sign}
      {Math.abs(value)}%
    </span>
  );
}

export interface DropRateProps extends HTMLAttributes<HTMLSpanElement> {
  /** Percentage, e.g. 25.33. */
  value: number;
}

/**
 * Drop chance.
 *
 * Always two decimals, matching the official drop tables exactly — truncating
 * to `25%` breaks the correspondence players verify against.
 */
export function DropRate({ value, className, ...rest }: DropRateProps) {
  return (
    <span className={cx("rf-text-data-sm", className)} {...rest}>
      {value.toFixed(2)}%
    </span>
  );
}
