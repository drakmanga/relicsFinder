import { DropRow, Frame } from "relic-finder-ui";

export const RelicContents = () => (
  <Frame notch="md" surface={1}>
    <div style={{ padding: 8 }}>
      <DropRow name="Volt Prime Neuroptics" rarity="rare" chance={2} price={45} interactive />
      <DropRow name="Braton Prime Receiver" rarity="uncommon" chance={11} price={12} interactive />
      <DropRow name="Lex Prime Barrel" rarity="uncommon" chance={11} price={8} interactive />
      <DropRow name="Forma Blueprint" rarity="common" chance={25.33} price={null} interactive />
      <DropRow name="Nyx Prime Chassis" rarity="common" chance={25.33} price={6} interactive />
      <DropRow name="Odonata Prime Systems" rarity="common" chance={25.33} price={5} interactive />
    </div>
  </Frame>
);

export const Compact = () => (
  <Frame notch="md" surface={2}>
    <div style={{ padding: 8 }}>
      <DropRow name="Volt Prime Neuroptics" rarity="rare" chance={2} price={45} compact />
      <DropRow name="Braton Prime Receiver" rarity="uncommon" chance={11} price={12} compact />
      <DropRow name="Forma Blueprint" rarity="common" chance={25.33} price={null} compact />
    </div>
  </Frame>
);

export const LongName = () => (
  <Frame notch="md" surface={1}>
    <div style={{ padding: 8, maxWidth: 380 }}>
      <DropRow
        name="Akstiletto Prime Blueprint And Receiver Assembly"
        rarity="uncommon"
        chance={11}
        price={18}
      />
      <span style={{ fontSize: 12, color: "var(--rf-fg-muted)" }}>
        Truncates with an ellipsis; the whole name stays in the title attribute.
      </span>
    </div>
  </Frame>
);
