import { useState } from "react";
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

import type { DropInfo, PriceMap, Refinement, RelicItemRow, Reward } from "../api/types";
import { ALL_REFINEMENTS, REFINEMENT_LABEL } from "../lib/rows";
import { marketUrl, priceOf } from "../lib/format";

interface Props {
  row: RelicItemRow | null;
  /**
   * Rewards of the relic in every refinement state.
   *
   * All four are passed rather than one: the panel has its own slider, so a
   * player can compare "what do I get if I refine this" without disturbing the
   * filter that governs the table behind it.
   */
  states: Partial<Record<Refinement, Reward[]>>;
  prices: PriceMap | undefined;
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
export function RelicDetailPanel({ row, states, prices, sites, sitesPending }: Props) {
  const [refinement, setRefinement] = useState<Refinement | null>(null);

  if (!row) return <DetailPanel empty />;

  // Defaults to the row's own state and follows it when the user picks another
  // row, but sticks once they have moved the slider for this relic.
  const active = refinement ?? row.refinement;
  const rewards = states[active] ?? [];

  return (
    <DetailPanel
      key={row.id}
      badges={<TierChip tier={row.tier} refinement={active} />}
      title={row.relicFullName}
      meta={`${rewards.length} rewards`}
    >
      <Divider />

      <p className="rf-text-overline rf-fg-muted" style={{ marginBottom: 8 }}>
        Refinement
      </p>

      <input
        type="range"
        min={0}
        max={ALL_REFINEMENTS.length - 1}
        step={1}
        value={ALL_REFINEMENTS.indexOf(active)}
        onChange={(event) =>
          setRefinement(ALL_REFINEMENTS[Number(event.target.value)] ?? "intact")
        }
        aria-label="Refinement of this relic"
        aria-valuetext={REFINEMENT_LABEL[active]}
        style={{ width: "100%", accentColor: "var(--rf-gold-500)" }}
      />

      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        {ALL_REFINEMENTS.map((state) => (
          <span
            key={state}
            style={{
              fontSize: 10,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: state === active ? "var(--rf-fg-primary)" : "var(--rf-fg-muted)",
            }}
          >
            {state === "exceptional" ? "Except." : REFINEMENT_LABEL[state]}
          </span>
        ))}
      </div>

      <p className="rf-text-overline rf-fg-muted" style={{ marginBottom: 8 }}>
        Contents
      </p>

      <DropList key={active}>
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
                price={priceOf(prices, reward.itemName)}
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
          Open on Warframe Market
        </Button>
      </div>

      <div style={{ marginTop: 12, display: "flex", alignItems: "baseline", gap: 8 }}>
        <span className="rf-text-caption rf-fg-muted">Selected part</span>
        <span style={{ marginLeft: "auto" }}>
          <PlatPrice value={priceOf(prices, row.itemName)} />
        </span>
      </div>
    </DetailPanel>
  );
}
