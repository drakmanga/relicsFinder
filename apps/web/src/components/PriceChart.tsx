/**
 * Over 150 lines (rule 4). One chart: the geometry it computes and the SVG it
 * draws. The geometry is the half worth moving to lib/, and has not been.
 */
import { useMemo, useRef, useState } from "react";
import type { PricePoint } from "../api/types";

interface Props {
  points: PricePoint[];
  height?: number;
}

/**
 * Ninety days of completed trades.
 *
 * Hand-drawn SVG rather than a charting library: this is one series and one
 * interaction, and the smallest chart package would outweigh the app bundle.
 */
export function PriceChart({ points, height = 170 }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  const geometry = useMemo(() => {
    if (points.length < 2) return null;

    const values = points.map((p) => p.avgPrice);
    const min = Math.min(...values);
    const max = Math.max(...values);
    // A flat series would divide by zero and, worse, draw a line through the
    // middle implying variation there is not.
    const span = max - min || 1;

    const toX = (i: number) => (i / (points.length - 1)) * 100;
    const toY = (v: number) => 100 - ((v - min) / span) * 100;

    const line = points.map((p, i) => `${toX(i).toFixed(2)},${toY(p.avgPrice).toFixed(2)}`);

    return {
      line: line.join(" "),
      area: `0,100 ${line.join(" ")} 100,100`,
      toX,
      toY,
      min,
      max,
      first: values[0]!,
      last: values.at(-1)!,
    };
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
  const active = hover === null ? null : points[hover];

  /**
   * Maps a pointer position to the nearest day.
   *
   * Read off the wrapper's own box rather than the SVG's: the SVG is stretched
   * with `preserveAspectRatio="none"`, so its internal coordinates do not
   * correspond to pixels on either axis.
   */
  const onMove = (event: React.PointerEvent) => {
    const box = wrapRef.current?.getBoundingClientRect();
    if (!box || box.width === 0) return;

    const ratio = (event.clientX - box.left) / box.width;
    const index = Math.round(ratio * (points.length - 1));
    setHover(Math.min(points.length - 1, Math.max(0, index)));
  };

  return (
    <div>
      <div
        ref={wrapRef}
        style={{ position: "relative", height, touchAction: "none" }}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      >
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="rf-fill-block"
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

          {hover !== null && (
            <line
              x1={geometry.toX(hover)}
              x2={geometry.toX(hover)}
              y1={0}
              y2={100}
              stroke="var(--rf-border-strong)"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>

        {/* The dot is a DOM element, not an SVG circle: inside a stretched
            viewBox a circle would be drawn as an ellipse. */}
        {hover !== null && active && (
          <span
            style={{
              position: "absolute",
              left: `${geometry.toX(hover)}%`,
              top: `${geometry.toY(active.avgPrice)}%`,
              width: 7,
              height: 7,
              marginLeft: -3.5,
              marginTop: -3.5,
              borderRadius: "9999px",
              background: stroke,
              pointerEvents: "none",
            }}
          />
        )}

        {hover !== null && active && (
          <div
            style={{
              position: "absolute",
              // Flips to the left near the right edge so the readout never
              // leaves the dialog.
              left: hover > points.length * 0.6 ? undefined : `${geometry.toX(hover)}%`,
              right: hover > points.length * 0.6 ? `${100 - geometry.toX(hover)}%` : undefined,
              top: 0,
              transform: hover > points.length * 0.6 ? "translateX(-8px)" : "translateX(8px)",
              background: "var(--rf-surface-4)",
              border: "1px solid var(--rf-border-strong)",
              padding: "6px 10px",
              pointerEvents: "none",
              whiteSpace: "nowrap",
            }}
          >
            <div className="rf-text-caption rf-fg-muted">{active.date}</div>
            <div className="rf-text-data-md rf-plat">{active.avgPrice} p</div>
            <div className="rf-text-caption rf-fg-muted rf-tabular">
              {active.minPrice}–{active.maxPrice} · {active.volume} trades
            </div>
          </div>
        )}
      </div>

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
