import { Card, TierChip, Price, DropRow, Button, ExternalLinkIcon } from "relic-finder-ui";

const grid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: 16,
};

export const RelicCards = () => (
  <div style={grid}>
    <Card
      variant="gilded"
      header={
        <>
          <div>
            <TierChip tier="axi" refinement="radiant" />
            <p style={{ fontSize: 16, fontWeight: 600, marginTop: 10 }}>Axi A2</p>
            <p style={{ fontSize: 12, color: "var(--rf-fg-muted)" }}>Radiant · Xini, Eris</p>
          </div>
          <Price value={145} size="lg" />
        </>
      }
      footer={
        <>
          <Button variant="ghost" size="sm" icon={<ExternalLinkIcon />}>
            Market
          </Button>
          <Price value={45} max={100} currency="ducat" />
        </>
      }
    >
      <div style={{ marginTop: 12, borderTop: "1px solid var(--rf-border-subtle)" }}>
        <DropRow name="Odonata Prime Systems" rarity="rare" price={145} compact />
        <DropRow name="Akstiletto Prime Barrel" rarity="uncommon" price={18} compact />
        <DropRow name="Forma Blueprint" rarity="common" price={null} compact />
      </div>
    </Card>

    <Card
      header={
        <>
          <div>
            <TierChip tier="meso" refinement="intact" />
            <p style={{ fontSize: 16, fontWeight: 600, marginTop: 10 }}>Meso B4</p>
            <p style={{ fontSize: 12, color: "var(--rf-fg-muted)" }}>Intact · Ukko, Void</p>
          </div>
          <Price value={12} size="lg" />
        </>
      }
    >
      <div style={{ marginTop: 12, borderTop: "1px solid var(--rf-border-subtle)" }}>
        <DropRow name="Braton Prime Receiver" rarity="uncommon" price={12} compact />
        <DropRow name="Nyx Prime Chassis" rarity="common" price={6} compact />
        <DropRow name="Lex Prime Barrel" rarity="common" price={8} compact />
      </div>
    </Card>
  </div>
);

export const Variants = () => (
  <div style={grid}>
    <Card>
      <p style={{ fontSize: 14, fontWeight: 600 }}>default</p>
      <p style={{ fontSize: 12, color: "var(--rf-fg-muted)", marginTop: 4 }}>
        Surface-2 with a plain frame.
      </p>
    </Card>
    <Card variant="gilded">
      <p style={{ fontSize: 14, fontWeight: 600 }}>gilded</p>
      <p style={{ fontSize: 12, color: "var(--rf-fg-muted)", marginTop: 4 }}>
        Marks a Radiant relic or an otherwise significant card.
      </p>
    </Card>
    <Card variant="interactive">
      <p style={{ fontSize: 14, fontWeight: 600 }}>interactive</p>
      <p style={{ fontSize: 12, color: "var(--rf-fg-muted)", marginTop: 4 }}>
        For a card that is itself a control.
      </p>
    </Card>
  </div>
);
