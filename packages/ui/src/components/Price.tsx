import type { HTMLAttributes } from "react";
import { cx } from "../lib/cx";
import { Unlisted } from "./Unlisted";
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
 * fractions. An absent price is a dash and never a `0`, which would claim the
 * item is free rather than unpriced.
 *
 * That dash is `Unlisted` rather than the character. It used to be the
 * character, in `.rf-price-empty`, which was the disabled tone at 2.57:1 on a
 * fact about the market — and a glyph a screen reader announces as "dash" or as
 * nothing. `Unlisted` was written in the app for exactly those two faults and
 * could not be reached from here until it moved into this package.
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
        // No class for the missing case: what it looks like and what it says
        // are `Unlisted`'s, in one place, and a second marker here would be a
        // name with no rule behind it.
        missing ? undefined : `rf-price-${currency}`,
        className,
      )}
      {...rest}
    >
      {missing ? (
        <Unlisted />
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
