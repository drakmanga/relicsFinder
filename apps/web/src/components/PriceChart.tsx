import { useMemo } from "react";
import type { PricePoint } from "../api/types";

interface Props {
  points: PricePoint[];
  height?: number;
}

/**
 * Ninety days of completed trades.
 *
 * Hand-drawn SVG rather than a charting library: this is one series with no
 * interaction, and the smallest chart package would outweigh the whole app
 * bundle for it.
 */
export function PriceChart({ points, height = 160 }: Props) {
  const geometry = useMemo(() => {
    if (points.length < 2) return null;

    const values = points.map((p) => p.avgPrice);
    const min = Math.min(...values);
    const max = Math.max(...values);
    // A flat series would divide by zero and, worse, draw a line through the
    // middle that implies variation there isn't.
    const span = max - min || 1;

    const width = 100;
    const toX = (i: number) => (i / (points.length - 1)) * width;
    const toY = (v: number) => 100 - ((v - min) / span) * 100;

    const line = points.map((p, i) => `${toX(i).toFixed(2)},${toY(p.avgPrice).toFixed(2)}`);
    const area = `0,100 ${line.join(" ")} ${width},100`;

    return { line: line.join(" "), area, min, max, first: values[0]!, last: values.at(-1)! };
  }, [points]);

  if (!geometry) {
    return (
      <p className="rf-text-body-sm rf-fg-muted">
        Not enough trades in the last 90 days to draw a chart.
      </p>
    );
  }

  const rising = geometry.last >= geometry.first;
  const stroke = rising ? "var(--rf-success)" : "var(--rf-danger)";

  return (
    <div>
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{ width: "100%", height, display: "block" }}
        role="img"
        aria-label={`Price over 90 days, from ${geometry.first} to ${geometry.last} platinum`}
      >
        <polygon points={geometry.area} fill={stroke} opacity={0.12} />
        <polyline
          points={geometry.line}
          fill="none"
          stroke={stroke}
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
        />
      </svg>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 6,
          fontSize: 12,
          color: "var(--rf-fg-muted)",
        }}
      >
        <span>{points[0]?.date}</span>
        <span className="rf-tabular">
          min {geometry.min} · max {geometry.max}
        </span>
        <span>{points.at(-1)?.date}</span>
      </div>
    </div>
  );
}
