import { Frame } from "relic-finder-ui";

const grid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
  gap: 16,
};
const pad: React.CSSProperties = { padding: 16 };
const title: React.CSSProperties = { fontSize: 14, fontWeight: 600 };
const note: React.CSSProperties = { fontSize: 12, color: "var(--rf-fg-muted)", marginTop: 4 };

export const Variants = () => (
  <div style={grid}>
    <Frame notch="md">
      <div style={pad}>
        <p style={title}>default</p>
        <p style={note}>1px border-default. Panels and cards.</p>
      </div>
    </Frame>
    <Frame notch="md" variant="interactive">
      <div style={pad}>
        <p style={title}>interactive</p>
        <p style={note}>#8A7423 — 3:1 verified. Mandatory on controls.</p>
      </div>
    </Frame>
    <Frame notch="md" variant="gilded">
      <div style={pad}>
        <p style={title}>gilded</p>
        <p style={note}>Orokin inlay. Detail panel, dialogs, Radiant cards.</p>
      </div>
    </Frame>
  </div>
);

export const Notches = () => (
  <div style={grid}>
    {(["xs", "sm", "md", "lg", "xl"] as const).map((notch) => (
      <Frame key={notch} notch={notch} variant="interactive" surface={2}>
        <div style={{ ...pad, minHeight: 72 }}>
          <p style={title}>notch-{notch}</p>
        </div>
      </Frame>
    ))}
  </div>
);

export const Shapes = () => (
  <div style={grid}>
    <Frame notch="lg" variant="gilded" shape="orokin">
      <div style={{ ...pad, minHeight: 88 }}>
        <p style={title}>orokin</p>
        <p style={note}>Cuts top-left and bottom-right. The default.</p>
      </div>
    </Frame>
    <Frame notch="lg" variant="gilded" shape="inverse">
      <div style={{ ...pad, minHeight: 88 }}>
        <p style={title}>inverse</p>
        <p style={note}>Mirrored half of a split layout.</p>
      </div>
    </Frame>
    <Frame notch="lg" variant="gilded" shape="octagon">
      <div style={{ ...pad, minHeight: 88 }}>
        <p style={title}>octagon</p>
        <p style={note}>All four corners. Chips and badges.</p>
      </div>
    </Frame>
  </div>
);

export const Elevation = () => (
  <div style={grid}>
    {([0, 1, 2, 3, 4] as const).map((surface) => (
      <Frame key={surface} notch="md" surface={surface}>
        <div style={{ ...pad, minHeight: 72 }}>
          <p style={title}>surface-{surface}</p>
          <p style={note}>No shadows — clip-path cuts them.</p>
        </div>
      </Frame>
    ))}
  </div>
);
