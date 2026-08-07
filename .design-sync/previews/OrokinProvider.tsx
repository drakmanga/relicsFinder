import { OrokinProvider, Button, TierChip, Price, Input, SearchIcon } from "relic-finder-ui";

/**
 * The provider is the root wrapper: every style ships scoped under `.rf-root`,
 * so components rendered outside it come out with no tokens, no fonts and no
 * surfaces. These cells show the same content wrapped and unwrapped.
 */
export const Wrapped = () => (
  <OrokinProvider>
    <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
      <p style={{ fontFamily: "var(--rf-font-display)", fontSize: 28, fontWeight: 600 }}>Lith V9</p>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <TierChip tier="lith" refinement="radiant" />
        <Price value={45} size="lg" />
      </div>
      <Input icon={<SearchIcon />} placeholder="Cerca reliquia…" />
      <div>
        <Button variant="primary">Cerca</Button>
      </div>
    </div>
  </OrokinProvider>
);

export const AppShell = () => (
  <OrokinProvider>
    <div
      style={{
        height: 56,
        display: "flex",
        alignItems: "center",
        gap: 24,
        padding: "0 24px",
        background: "var(--rf-surface-1)",
        borderBottom: "1px solid var(--rf-border-default)",
      }}
    >
      <span
        style={{
          fontFamily: "var(--rf-font-display)",
          fontSize: 17,
          fontWeight: 700,
          letterSpacing: "0.04em",
          color: "var(--rf-gold-300)",
        }}
      >
        RELIC FINDER
      </span>
      <div style={{ flex: 1, maxWidth: 420 }}>
        <Input icon={<SearchIcon />} placeholder="Lith V9 o Volt Prime…" shortcut="⌘K" />
      </div>
      <Button variant="accent" size="sm">
        Wishlist
      </Button>
    </div>
  </OrokinProvider>
);
