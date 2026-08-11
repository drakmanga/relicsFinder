/**
 * Over 150 lines (rule 4). The mission list went to RelicDropSites and the
 * payout arithmetic to RelicPayout; what is left is the relic's identity, its
 * refinement slider and its contents — three things that read the same row and
 * would only be passed it again if they were split further.
 */
import { useState } from "react";
import {
  ArrowLeftIcon,
  Button,
  DetailPanel,
  Divider,
  InfoIcon,
  OrokinStar,
  TierChip,
  XIcon,
} from "relic-finder-ui";

import { PanelWishlist } from "./PanelWishlist";
import { PlatPrice } from "./Plat";
import { RelicContents } from "./RelicContents";
import { RelicDropSites } from "./RelicDropSites";
import { RelicPayout } from "./RelicPayout";
import { SectionLabel } from "./SectionLabel";

import type { DropInfo, PriceMap, Refinement, RelicRow, Reward, WishlistKind } from "../api/types";
import { ALL_REFINEMENTS, REFINEMENT_LABEL, bestRefinementByTrace } from "../lib/rows";
import { priceOf } from "../lib/format";

interface Props {
  row: RelicRow | null;
  /**
   * Part the user searched for, highlighted among the contents.
   *
   * Searching a part in this view answers "which relics hold it", and the
   * answer is only useful if the row can then show which of the six it was.
   */
  highlightItem?: string | null;
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
  /**
   * Opens the part the user clicked, in the view that is about parts.
   *
   * The contents list answers "what is in here"; the obvious next question is
   * "and where else do I get that one", which is the Prime Items view — so the
   * row is a way through to it rather than a dead label.
   */
  onPickItem: (itemName: string) => void;
  /** What the sealed relic sells for. Undefined while the batch is in flight. */
  price: number | null | undefined;
  /** Opens the relic's own price history. */
  onInfo: (relicFullName: string) => void;
  /** How many of a line the wishlist holds — the relic itself, and each drop. */
  quantityOf: (itemName: string, kind?: WishlistKind, refinement?: Refinement) => number;
  /** Steps back to whatever the panel was showing before. Absent at the start. */
  onBack?: () => void;
  /** Shuts the panel and clears the selection. */
  onClose: () => void;
}

/**
 * The relic behind the clicked row: what it contains, and where it drops.
 *
 * The contents are the point. A row shows one item, but someone who has just
 * cracked a relic wants to know what else was in it — that question had no
 * answer anywhere in the interface until now.
 */
export function RelicDetailPanel({
  row,
  highlightItem,
  states,
  prices,
  sites,
  sitesPending,
  onPickItem,
  price,
  onInfo,
  quantityOf,
  onBack,
  onClose,
}: Props) {
  const [refinement, setRefinement] = useState<Refinement | null>(null);
  /** Whether the full mission list is open. */

  if (!row) return <DetailPanel empty />;

  // Defaults to the row's own state and follows it when the user picks another
  // row, but sticks once they have moved the slider for this relic.
  const active = refinement ?? row.refinement;
  const rewards = states[active] ?? [];

  // The prices do not change with refinement — only the chances do — so this is
  // the same number the table shows, and is meant to be recognised as such.
  const best = rewards.reduce<number | null>((top, reward) => {
    const drop = priceOf(prices, reward.itemName);
    return drop != null && (top === null || drop > top) ? drop : top;
  }, null);

  const bestByTrace = bestRefinementByTrace(states, prices);

  return (
    <DetailPanel
      key={row.id}
      badges={<TierChip tier={row.tier} refinement={active} />}
      actions={
        <>
          {onBack && (
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              icon={<ArrowLeftIcon />}
              aria-label="Back to where this was opened from"
              title="Back"
              onClick={onBack}
            />
          )}
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            icon={<XIcon />}
            aria-label="Close the panel"
            title="Close"
            onClick={onClose}
          />
        </>
      }
      title={row.relicFullName}
      meta={`${rewards.length} rewards`}
    >
      <Divider />

      {/*
        What the relic itself costs, which is the other half of every decision
        in this panel: everything below says what opening one is worth, and
        that number means nothing without the price of buying one.
      */}
      <div className="rf-row-baseline-wide">
        <span className="rf-text-overline rf-fg-muted">Market price</span>
        <span className="rf-push rf-inline">
          <PlatPrice value={price ?? null} size="lg" />
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            icon={<InfoIcon />}
            aria-label={`Price history for ${row.relicFullName}`}
            title="Ninety days of completed trades"
            onClick={() => onInfo(row.relicFullName)}
          />
        </span>
      </div>

      {/*
        The relic itself, which is a different line from any of its drops: one
        is bought whole on the market and cracked, the others are bought
        finished. The steppers under Contents add those.
      */}
      <PanelWishlist
        seed={{
          itemName: row.relicFullName,
          kind: "relic",
          tier: row.tier,
          relicFullName: row.relicFullName,
          refinement: active,
        }}
        qty={quantityOf(row.relicFullName, "relic", active)}
        hint="The relic itself, unopened. Its drops have their own steppers below."
      />

      <SectionLabel
        hint={
          <>
            <p className="rf-flush">
              Refining a relic with void traces shifts the odds towards the rare and away from the
              commons. Four states, from Intact at no cost to Radiant at 100 traces.
            </p>
            <p className="rf-panel-note">
              The star marks the state that buys the most platinum per trace on <em>this</em> relic
              — which is often not Radiant, and on a relic whose rare is cheap is nothing at all,
              because the trade loses money. The full working is under Refining below.
            </p>
          </>
        }
      >
        Refinement
      </SectionLabel>

      <input
        type="range"
        min={0}
        max={ALL_REFINEMENTS.length - 1}
        step={1}
        value={ALL_REFINEMENTS.indexOf(active)}
        onChange={(event) => setRefinement(ALL_REFINEMENTS[Number(event.target.value)] ?? "intact")}
        aria-label="Refinement of this relic"
        aria-valuetext={REFINEMENT_LABEL[active]}
        className="rf-range"
      />

      <div className="rf-split">
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
            {state === bestByTrace && (
              <OrokinStar
                width={9}
                height={9}
                style={{ marginLeft: 3, color: "var(--rf-gold-500)", verticalAlign: "baseline" }}
              />
            )}
          </span>
        ))}
      </div>

      <SectionLabel
        hint={
          <>
            <p className="rf-flush">
              Platinum is what the part sells for. The gold number next to it is its{" "}
              <strong>ducat value</strong> — what Baro's kiosk pays if you dissolve it instead.
            </p>
            <p className="rf-panel-note">
              Per part, not per relic: a run gives you one drop, so only that one can ever be
              dissolved.
            </p>
          </>
        }
      >
        Contents
      </SectionLabel>

      <RelicContents
        row={row}
        rewards={rewards}
        refinement={active}
        prices={prices}
        highlightItem={highlightItem}
        onPickItem={onPickItem}
        quantityOf={quantityOf}
      />

      <RelicPayout rewards={rewards} states={states} prices={prices} refinement={active} />

      <RelicDropSites
        relicFullName={row.relicFullName}
        sites={sites}
        sitesPending={sitesPending}
        best={best}
      />
    </DetailPanel>
  );
}
