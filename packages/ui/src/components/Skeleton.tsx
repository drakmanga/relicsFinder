import type { HTMLAttributes } from "react";
import { cx } from "../lib/cx";

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  width?: string | number;
  height?: string | number;
}

/**
 * Skeleton.
 *
 * Never clipped, even inside a notched panel: a row placeholder that takes the
 * Orokin silhouette promises a shape the real row will not have.
 *
 * Two seconds is the ceiling. Past that the interface should be showing an
 * error or an empty state, not a shimmer.
 */
export function Skeleton({
  width = "100%",
  height = 12,
  className,
  style,
  ...rest
}: SkeletonProps) {
  return (
    <div
      className={cx("rf-skeleton", className)}
      style={{ width, height, ...style }}
      aria-hidden="true"
      {...rest}
    />
  );
}

export interface SkeletonStackProps extends HTMLAttributes<HTMLDivElement> {
  /** Number of placeholder lines. */
  lines?: number;
  /** Height of each line. Table rows must use 40px to avoid layout shift. */
  lineHeight?: number;
}

/** A run of skeleton lines, the last one short so it reads as text. */
export function SkeletonStack({
  lines = 5,
  lineHeight = 12,
  className,
  ...rest
}: SkeletonStackProps) {
  return (
    <div className={cx("rf-skeleton-stack", className)} aria-busy="true" {...rest}>
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton key={index} height={lineHeight} width={index === lines - 1 ? "60%" : "100%"} />
      ))}
    </div>
  );
}
