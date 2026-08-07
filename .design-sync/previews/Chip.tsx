import { Chip } from "relic-finder-ui";

const row: React.CSSProperties = { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" };

export const Counters = () => (
  <div style={row}>
    <Chip>23 risultati</Chip>
    <Chip>6 drop</Chip>
    <Chip>Radiant</Chip>
  </div>
);

export const Filters = () => (
  <div style={row}>
    <Chip variant="filter" onDismiss={() => {}}>
      Solo Axi
    </Chip>
    <Chip variant="filter" onDismiss={() => {}}>
      Prezzo &lt; 50p
    </Chip>
    <Chip variant="filter" onDismiss={() => {}}>
      Solo Rare
    </Chip>
  </div>
);

export const Suggestions = () => (
  <div style={row}>
    <Chip>Lith V9</Chip>
    <Chip>Volt Prime</Chip>
    <Chip>Meso B4</Chip>
  </div>
);
