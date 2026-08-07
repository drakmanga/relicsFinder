import { Input, SearchIcon } from "relic-finder-ui";

const stack: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 16, maxWidth: 420 };

export const Search = () => (
  <div style={stack}>
    <Input
      icon={<SearchIcon />}
      placeholder="Lith V9 o Volt Prime…"
      shortcut="⌘K"
      aria-label="Cerca reliquia"
    />
  </div>
);

export const WithLabel = () => (
  <div style={stack}>
    <Input label="Nome reliquia" defaultValue="Meso B4" helper="Nome della reliquia o dell'item Prime." />
  </div>
);

export const Error = () => (
  <div style={stack}>
    <Input
      icon={<SearchIcon />}
      label="Nome reliquia"
      defaultValue="Xyz 99"
      error={'Nessuna reliquia corrisponde a "Xyz 99"'}
    />
  </div>
);

export const Sizes = () => (
  <div style={stack}>
    <Input size="sm" placeholder="control-sm · 32px" />
    <Input size="md" placeholder="control-md · 40px" />
    <Input size="lg" icon={<SearchIcon />} placeholder="control-lg · 48px" shortcut="⌘K" />
  </div>
);
