import { Skeleton, SkeletonStack, Frame } from "relic-finder-ui";

export const Lines = () => (
  <div style={{ maxWidth: 420 }}>
    <SkeletonStack lines={5} />
  </div>
);

export const CardPlaceholder = () => (
  <Frame notch="md" surface={2}>
    <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10, width: 280 }}>
      <Skeleton width="40%" height={20} />
      <Skeleton width="70%" height={16} />
      <Skeleton />
      <Skeleton />
      <Skeleton width="60%" />
    </div>
  </Frame>
);

export const TableRows = () => (
  <Frame notch="lg" surface={1}>
    <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8, width: 480 }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <Skeleton key={i} height={40} />
      ))}
      <p style={{ fontSize: 12, color: "var(--rf-fg-muted)" }}>
        Row placeholders are 40px and never clipped — a skeleton with the Orokin silhouette
        promises a shape the real row will not have.
      </p>
    </div>
  </Frame>
);
