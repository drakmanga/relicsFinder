import { TierChip } from "relic-finder-ui";

const row: React.CSSProperties = { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" };
const stack: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
  paddingLeft: 8,
};
const label: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--rf-fg-muted)",
  width: 64,
  flex: "none",
};

export const Tiers = () => (
  <div style={row}>
    <TierChip tier="lith" />
    <TierChip tier="meso" />
    <TierChip tier="neo" />
    <TierChip tier="axi" />
    <TierChip tier="requiem" />
  </div>
);

export const Refinements = () => (
  <div style={stack}>
    {(["lith", "meso", "neo", "axi"] as const).map((tier) => (
      <div key={tier} style={row}>
        <span style={label}>{tier}</span>
        <TierChip tier={tier} refinement="intact" showRefinement />
        <TierChip tier={tier} refinement="exceptional" showRefinement />
        <TierChip tier={tier} refinement="flawless" showRefinement />
        <TierChip tier={tier} refinement="radiant" showRefinement />
      </div>
    ))}
  </div>
);

export const RadiantPulse = () => (
  <div style={row}>
    <TierChip tier="axi" refinement="radiant" showRefinement pulse />
    <span style={{ fontSize: 12, color: "var(--rf-fg-muted)" }}>
      One pulsing element per view — on a list of Radiant relics, only the selected row.
    </span>
  </div>
);

export const InContext = () => (
  <div style={{ ...row, gap: 12 }}>
    <TierChip tier="lith" refinement="radiant" />
    <span style={{ fontSize: 13 }}>Lith V9</span>
    <span style={{ fontSize: 13, color: "var(--rf-fg-muted)" }}>Volt Prime Neuroptics</span>
  </div>
);
