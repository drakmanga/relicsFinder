import { Divider, Frame } from "relic-finder-ui";

export const Ornament = () => (
  <Frame notch="md" surface={1}>
    <div style={{ padding: 20 }}>
      <p style={{ fontSize: 15 }}>Contenuto della reliquia</p>
      <Divider />
      <p style={{ fontSize: 15 }}>Prezzi di mercato</p>
      <Divider />
      <p style={{ fontSize: 13, color: "var(--rf-fg-muted)" }}>
        A hairline interrupted by a gold diamond. Two per view is the ceiling — past that it
        stops reading as punctuation.
      </p>
    </div>
  </Frame>
);
