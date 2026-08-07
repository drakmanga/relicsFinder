import {
  Table,
  TableRow,
  TableCell,
  TableHeaderCell,
  TierChip,
  RarityTag,
  Price,
  DropRate,
  Button,
  ExternalLinkIcon,
} from "relic-finder-ui";

const rows = [
  { tier: "lith", ref: "radiant", relic: "Lith V9", item: "Volt Prime Neuroptics", rarity: "rare", rate: 2, price: 45 },
  { tier: "meso", ref: "flawless", relic: "Meso B4", item: "Braton Prime Receiver", rarity: "uncommon", rate: 11, price: 12 },
  { tier: "neo", ref: "exceptional", relic: "Neo Z5", item: "Forma Blueprint", rarity: "common", rate: 25.33, price: null },
  { tier: "axi", ref: "radiant", relic: "Axi A2", item: "Odonata Prime Systems", rarity: "rare", rate: 10, price: 145 },
  { tier: "lith", ref: "intact", relic: "Lith K3", item: "Lex Prime Barrel", rarity: "uncommon", rate: 11, price: 8 },
  { tier: "meso", ref: "intact", relic: "Meso N6", item: "Nyx Prime Chassis", rarity: "common", rate: 25.33, price: 6 },
] as const;

export const Results = () => (
  <Table interactive>
    <thead>
      <tr>
        <TableHeaderCell>Tier</TableHeaderCell>
        <TableHeaderCell>Reliquia</TableHeaderCell>
        <TableHeaderCell>Item</TableHeaderCell>
        <TableHeaderCell>Rarità</TableHeaderCell>
        <TableHeaderCell align="right" sortable sortDirection={null}>
          Drop
        </TableHeaderCell>
        <TableHeaderCell align="right" sortable sortDirection="desc">
          Prezzo
        </TableHeaderCell>
        <TableHeaderCell align="center">{""}</TableHeaderCell>
      </tr>
    </thead>
    <tbody>
      {rows.map((r, i) => (
        <TableRow key={r.relic} selected={i === 0}>
          <TableCell>
            <TierChip tier={r.tier} refinement={r.ref} />
          </TableCell>
          <TableCell>{r.relic}</TableCell>
          <TableCell>{r.item}</TableCell>
          <TableCell>
            <RarityTag rarity={r.rarity} />
          </TableCell>
          <TableCell align="right" numeric>
            <DropRate value={r.rate} />
          </TableCell>
          <TableCell align="right" numeric>
            <Price value={r.price} />
          </TableCell>
          <TableCell align="center">
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              aria-label="Apri su Warframe Market"
              icon={<ExternalLinkIcon />}
            />
          </TableCell>
        </TableRow>
      ))}
    </tbody>
  </Table>
);

export const Density = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
    {(["compact", "default", "comfortable"] as const).map((density) => (
      <div key={density}>
        <p
          style={{
            fontSize: 11,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--rf-fg-muted)",
            marginBottom: 8,
          }}
        >
          {density}
        </p>
        <Table density={density} interactive>
          <thead>
            <tr>
              <TableHeaderCell>Tier</TableHeaderCell>
              <TableHeaderCell>Reliquia</TableHeaderCell>
              <TableHeaderCell align="right">Prezzo</TableHeaderCell>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 2).map((r) => (
              <TableRow key={r.relic}>
                <TableCell>
                  <TierChip tier={r.tier} refinement={r.ref} />
                </TableCell>
                <TableCell>{r.relic}</TableCell>
                <TableCell align="right" numeric>
                  <Price value={r.price} />
                </TableCell>
              </TableRow>
            ))}
          </tbody>
        </Table>
      </div>
    ))}
  </div>
);

export const Unframed = () => (
  <Table framed={false} interactive>
    <thead>
      <tr>
        <TableHeaderCell>Reliquia</TableHeaderCell>
        <TableHeaderCell>Item</TableHeaderCell>
        <TableHeaderCell align="right">Prezzo</TableHeaderCell>
      </tr>
    </thead>
    <tbody>
      {rows.slice(0, 4).map((r) => (
        <TableRow key={r.relic}>
          <TableCell>{r.relic}</TableCell>
          <TableCell>{r.item}</TableCell>
          <TableCell align="right" numeric>
            <Price value={r.price} />
          </TableCell>
        </TableRow>
      ))}
    </tbody>
  </Table>
);
