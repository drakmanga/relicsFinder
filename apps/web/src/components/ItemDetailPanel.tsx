import {
  Button,
  DetailPanel,
  Divider,
  ExternalLinkIcon,
  Price,
  RarityTag,
  TierChip,
} from "relic-finder-ui";

import type { Relic, RelicItemRow } from "../api/types";
import { partsOfSet, setOf, sourcesFor } from "../lib/sets";
import { marketUrl } from "../lib/format";

interface Props {
  row: RelicItemRow;
  relics: Relic[];
  prices: Map<string, number | null> | undefined;
  /** Selecting a sibling part swaps the panel to it without touching the table. */
  onPickItem: (itemName: string) => void;
}

/** Relics listed before the list collapses into a count. */
const SOURCES_SHOWN = 6;

/**
 * The item behind the clicked cell: where it comes from, and what set it
 * completes.
 *
 * The mirror of the relic panel. Someone farming a specific part needs the
 * opposite lookup — not "what is in this relic" but "which relics give me this".
 */
export function ItemDetailPanel({ row, relics, prices, onPickItem }: Props) {
  const sources = sourcesFor(relics, row.itemName);
  const setName = setOf(row.itemName);
  const siblings = setName ? partsOfSet(relics, setName).filter((p) => p !== row.itemName) : [];

  // Only Intact rows, so one relic is not listed four times at four chances.
  const intactSources = sources.filter((source) => source.refinement === "intact");
  const shown = (intactSources.length > 0 ? intactSources : sources).slice(0, SOURCES_SHOWN);
  const totalSources = intactSources.length > 0 ? intactSources.length : sources.length;

  return (
    <DetailPanel
      key={row.itemName}
      badges={<RarityTag rarity={row.rarity} />}
      title={row.itemName}
      meta={setName ?? "Belongs to no set"}
    >
      <Divider />

      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <span className="rf-text-overline rf-fg-muted">Market price</span>
        <span style={{ marginLeft: "auto" }}>
          <Price value={prices?.get(row.itemName) ?? null} size="lg" />
        </span>
      </div>

      <Divider />

      <p className="rf-text-overline rf-fg-muted" style={{ marginBottom: 8 }}>
        Dropped by
      </p>

      {shown.length === 0 ? (
        <p className="rf-text-body-sm rf-fg-muted">No relic in the dataset contains it.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {shown.map((source) => (
            <div
              key={`${source.relicFullName}-${source.refinement}`}
              style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}
            >
              <TierChip tier={source.tier} />
              <span style={{ flex: 1, minWidth: 0 }}>{source.relicFullName}</span>
              <span className="rf-text-data-sm rf-fg-muted">{source.chance.toFixed(2)}%</span>
            </div>
          ))}
        </div>
      )}

      {totalSources > SOURCES_SHOWN && (
        <p className="rf-text-caption rf-fg-muted" style={{ marginTop: 8 }}>
          and {totalSources - SOURCES_SHOWN} more relics
        </p>
      )}

      {setName && siblings.length > 0 && (
        <>
          <Divider />

          <p className="rf-text-overline rf-fg-muted" style={{ marginBottom: 8 }}>
            Rest of {setName}
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {siblings.map((part) => (
              <button
                key={part}
                type="button"
                className="rf-focus-ring"
                onClick={() => onPickItem(part)}
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 8,
                  padding: "4px 0",
                  background: "none",
                  border: 0,
                  cursor: "pointer",
                  textAlign: "left",
                  fontSize: 13,
                  color: "var(--rf-fg-primary)",
                }}
              >
                <span
                  style={{
                    flex: 1,
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  title={part}
                >
                  {part.replace(`${setName} `, "")}
                </span>
                <Price value={prices?.get(part) ?? null} />
              </button>
            ))}
          </div>
        </>
      )}

      <div style={{ marginTop: 20 }}>
        <Button
          variant="primary"
          icon={<ExternalLinkIcon />}
          style={{ width: "100%" }}
          onClick={() => window.open(marketUrl(row.itemName), "_blank", "noopener,noreferrer")}
        >
          Open on Warframe Market
        </Button>
      </div>
    </DetailPanel>
  );
}
