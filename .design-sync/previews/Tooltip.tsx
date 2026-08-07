import { Tooltip, Button, Price } from "relic-finder-ui";

const row: React.CSSProperties = {
  display: "flex",
  gap: 48,
  alignItems: "center",
  flexWrap: "wrap",
  padding: "56px 24px",
};

export const OnPrice = () => (
  <div style={row}>
    <Tooltip content="Prezzo medio delle ultime 24h · 47 ordini" defaultOpen>
      <Price value={45} size="lg" />
    </Tooltip>
  </div>
);

export const Placements = () => (
  <div style={{ ...row, gap: 64 }}>
    <Tooltip content="top" placement="top" defaultOpen>
      <Button variant="ghost">top</Button>
    </Tooltip>
    <Tooltip content="bottom" placement="bottom" defaultOpen>
      <Button variant="ghost">bottom</Button>
    </Tooltip>
    <Tooltip content="right" placement="right" defaultOpen>
      <Button variant="ghost">right</Button>
    </Tooltip>
  </div>
);

export const LongContent = () => (
  <div style={row}>
    <Tooltip
      content="I dati di Warframe Market vengono aggiornati ogni 15 minuti. Un timestamp compare sotto il prezzo quando il dato è più vecchio."
      defaultOpen
    >
      <Button variant="ghost">Freschezza dei dati</Button>
    </Tooltip>
  </div>
);
