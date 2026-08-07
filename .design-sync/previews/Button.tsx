import { Button, SearchIcon, ExternalLinkIcon } from "relic-finder-ui";

export const Variants = () => (
  <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
    <Button variant="primary" icon={<SearchIcon />}>
      Cerca
    </Button>
    <Button variant="accent">Aggiungi alla wishlist</Button>
    <Button variant="outline">Filtra</Button>
    <Button variant="ghost">Annulla</Button>
    <Button variant="danger">Rimuovi</Button>
  </div>
);

export const Sizes = () => (
  <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
    <Button size="xs">24px</Button>
    <Button size="sm">32px</Button>
    <Button size="md">40px</Button>
    <Button size="lg">48px</Button>
  </div>
);

export const States = () => (
  <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
    <Button>Default</Button>
    <Button loading>Caricamento</Button>
    <Button disabled>Disabilitato</Button>
    <Button variant="outline" disabled>
      Outline disabilitato
    </Button>
  </div>
);

export const WithIcons = () => (
  <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
    <Button variant="primary" icon={<ExternalLinkIcon />}>
      Apri su Warframe Market
    </Button>
    <Button variant="ghost" iconOnly aria-label="Cerca" icon={<SearchIcon />} />
    <Button variant="outline" iconOnly aria-label="Apri" icon={<ExternalLinkIcon />} />
  </div>
);
