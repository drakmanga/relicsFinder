import {
  DetailPanel,
  DropList,
  DropRow,
  Divider,
  TierChip,
  Chip,
  Price,
  PriceDelta,
  Button,
  ExternalLinkIcon,
} from "relic-finder-ui";

const drops = [
  { name: "Volt Prime Neuroptics", rarity: "rare", chance: 2, price: 45 },
  { name: "Braton Prime Receiver", rarity: "uncommon", chance: 11, price: 12 },
  { name: "Lex Prime Barrel", rarity: "uncommon", chance: 11, price: 8 },
  { name: "Forma Blueprint", rarity: "common", chance: 25.33, price: null },
  { name: "Nyx Prime Chassis", rarity: "common", chance: 25.33, price: 6 },
  { name: "Odonata Prime Systems", rarity: "common", chance: 25.33, price: 5 },
] as const;

export const Selected = () => (
  <DetailPanel
    badges={
      <>
        <TierChip tier="lith" refinement="radiant" pulse />
        <Chip>Radiant</Chip>
      </>
    }
    title="Lith V9"
    meta="Hepit · Void · Rotation A — 12.5% per run"
  >
    <Divider />
    <p
      style={{
        fontSize: 11,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: "var(--rf-fg-muted)",
        marginBottom: 8,
      }}
    >
      Contenuto
    </p>
    <DropList>
      {drops.map((d, i) => (
        <DropRow
          key={d.name}
          name={d.name}
          rarity={d.rarity}
          chance={d.chance}
          price={d.price}
          index={i}
          interactive
        />
      ))}
    </DropList>

    <Divider />

    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
      <div>
        <p
          style={{
            fontSize: 11,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--rf-fg-muted)",
          }}
        >
          Valore medio
        </p>
        <div style={{ display: "flex", gap: 8, alignItems: "baseline", marginTop: 4 }}>
          <Price value={13} size="lg" />
          <PriceDelta value={12} />
        </div>
        <p style={{ fontSize: 12, color: "var(--rf-fg-muted)", marginTop: 2 }}>aggiornato 4 min fa</p>
      </div>
      <div style={{ textAlign: "right" }}>
        <p
          style={{
            fontSize: 11,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--rf-fg-muted)",
          }}
        >
          Ducati
        </p>
        <div style={{ marginTop: 4 }}>
          <Price value={45} max={100} currency="ducat" hideSuffix />
        </div>
      </div>
    </div>

    <div style={{ marginTop: 20 }}>
      <Button variant="primary" icon={<ExternalLinkIcon />} style={{ width: "100%" }}>
        Apri su Warframe Market
      </Button>
    </div>
  </DetailPanel>
);

export const Empty = () => <DetailPanel empty />;
