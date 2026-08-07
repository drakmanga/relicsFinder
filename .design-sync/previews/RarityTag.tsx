import { RarityTag } from "relic-finder-ui";

const row: React.CSSProperties = { display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" };

export const Rarities = () => (
  <div style={row}>
    <RarityTag rarity="common" />
    <RarityTag rarity="uncommon" />
    <RarityTag rarity="rare" />
  </div>
);

export const Abbreviated = () => (
  <div style={row}>
    <RarityTag rarity="common" abbreviated />
    <RarityTag rarity="uncommon" abbreviated />
    <RarityTag rarity="rare" abbreviated />
  </div>
);

export const DotOnly = () => (
  <div style={row}>
    <RarityTag rarity="common" dotOnly />
    <RarityTag rarity="uncommon" dotOnly />
    <RarityTag rarity="rare" dotOnly />
    <span style={{ fontSize: 12, color: "var(--rf-fg-muted)" }}>
      Only when the label already exists elsewhere in the row.
    </span>
  </div>
);
