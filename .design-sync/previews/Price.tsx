import { Price, PriceDelta, DropRate } from "relic-finder-ui";

const row: React.CSSProperties = { display: "flex", gap: 24, alignItems: "baseline", flexWrap: "wrap" };
const stack: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 14 };

export const Currencies = () => (
  <div style={row}>
    <Price value={45} />
    <Price value={140} currency="ducat" />
    <Price value={25000} currency="credit" />
  </div>
);

export const Sizes = () => (
  <div style={row}>
    <Price value={45} size="md" />
    <Price value={145} size="lg" />
  </div>
);

export const MissingAndRange = () => (
  <div style={stack}>
    <div style={row}>
      <Price value={null} />
      <span style={{ fontSize: 12, color: "var(--rf-fg-muted)" }}>
        An absent price is an em dash — never a zero, which would claim the item is free.
      </span>
    </div>
    <div style={row}>
      <Price value={45} max={100} currency="ducat" />
      <span style={{ fontSize: 12, color: "var(--rf-fg-muted)" }}>Range, en dash.</span>
    </div>
  </div>
);

export const WithDelta = () => (
  <div style={stack}>
    <div style={row}>
      <Price value={45} size="lg" />
      <PriceDelta value={12} />
    </div>
    <div style={row}>
      <Price value={12} size="lg" />
      <PriceDelta value={-8} />
    </div>
    <span style={{ fontSize: 12, color: "var(--rf-fg-muted)" }}>
      Colour and arrow live on the delta, never on the price: a high price is not an error.
    </span>
  </div>
);

export const DropRates = () => (
  <div style={row}>
    <DropRate value={25.33} />
    <DropRate value={11} />
    <DropRate value={2} />
    <span style={{ fontSize: 12, color: "var(--rf-fg-muted)" }}>
      Always two decimals — it has to match the official drop tables exactly.
    </span>
  </div>
);
