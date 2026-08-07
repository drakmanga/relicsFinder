import {
  Button,
  DetailPanel,
  Divider,
  DropList,
  DropRow,
  ExternalLinkIcon,
  Skeleton,
  TierChip,
} from "relic-finder-ui";

import { PlatPrice } from "./Plat";

import type { DropInfo, RelicItemRow, Reward } from "../api/types";
import { marketUrl } from "../lib/format";

interface Props {
  row: RelicItemRow | null;
  /** Every reward of the relic in the row's refinement state. */
  rewards: Reward[];
  prices: Map<string, number | null> | undefined;
  sites: DropInfo[];
  sitesPending: boolean;
}

/** How many missions to list before collapsing into a count. */
const SITES_SHOWN = 4;

/**
 * The relic behind the clicked row: what it contains, and where it drops.
 *
 * The contents are the point. A row shows one item, but someone who has just
 * cracked a relic wants to know what else was in it — that question had no
 * answer anywhere in the interface until now.
 */
export function RelicDetailPanel({ row, rewards, prices, sites, sitesPending }: Props) {
  if (!row) return <DetailPanel empty />;

  return (
    <DetailPanel
      key={row.id}
      badges={<TierChip tier={row.tier} refinement={row.refinement} />}
      title={row.relicFullName}
      meta={`${rewards.length} rewards · ${row.refinement}`}
    >
      <Divider />

      <p className="rf-text-overline rf-fg-muted" style={{ marginBottom: 8 }}>
        Contents
      </p>

      <DropList>
        {rewards.map((reward, index) => {
          const isSelected = reward.itemName === row.itemName;

          return (
            <div
              key={reward.id || reward.itemName}
              style={{
                // Same treatment as a selected table row, so the highlight
                // reads as "this is the one you clicked" rather than decoration.
                background: isSelected ? "var(--rf-state-row-selected, #7c5ce61a)" : undefined,
                boxShadow: isSelected ? "inset 2px 0 0 0 var(--rf-void-400)" : undefined,
              }}
            >
              <DropRow
                name={reward.itemName}
                rarity={reward.rarity}
                chance={reward.chance}
                price={prices?.get(reward.itemName) ?? null}
                index={index}
              />
            </div>
          );
        })}
      </DropList>

      <Divider />

      <p className="rf-text-overline rf-fg-muted" style={{ marginBottom: 8 }}>
        Where it drops
      </p>

      {sitesPending ? (
        <Skeleton height={40} />
      ) : sites.length === 0 ? (
        <p className="rf-text-body-sm rf-fg-muted">
          No mission drops it — the relic is vaulted.
        </p>
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {sites.slice(0, SITES_SHOWN).map((site, index) => (
              <div
                key={`${site.location}-${site.rotation}-${index}`}
                style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13 }}
              >
                <span style={{ flex: 1, minWidth: 0 }}>{site.location}</span>
                <span className="rf-text-caption rf-fg-muted">{site.mission}</span>
                {site.rotation && (
                  <span className="rf-text-caption rf-fg-muted">rot {site.rotation}</span>
                )}
                <span className="rf-text-data-sm rf-fg-muted" style={{ width: 48, textAlign: "right" }}>
                  {site.chance.toFixed(2)}%
                </span>
              </div>
            ))}
          </div>

          {sites.length > SITES_SHOWN && (
            <p className="rf-text-caption rf-fg-muted" style={{ marginTop: 8 }}>
              and {sites.length - SITES_SHOWN} more missions
            </p>
          )}
        </>
      )}

      <div style={{ marginTop: 20 }}>
        <Button
          variant="primary"
          icon={<ExternalLinkIcon />}
          style={{ width: "100%" }}
          onClick={() => window.open(marketUrl(row.itemName), "_blank", "noopener,noreferrer")}
        >
          Open {shortName(row.itemName)} on Warframe Market
        </Button>
      </div>

      <div style={{ marginTop: 12, display: "flex", alignItems: "baseline", gap: 8 }}>
        <span className="rf-text-caption rf-fg-muted">Selected part</span>
        <span style={{ marginLeft: "auto" }}>
          <PlatPrice value={prices?.get(row.itemName) ?? null} />
        </span>
      </div>
    </DetailPanel>
  );
}

/** Keeps the button label from wrapping to three lines on a long part name. */
function shortName(itemName: string) {
  const withoutBlueprint = itemName.replace(/\sblueprint$/i, "");
  return withoutBlueprint.length > 24 ? `${withoutBlueprint.slice(0, 23)}…` : withoutBlueprint;
}
