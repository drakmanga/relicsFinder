/**
 * Over 150 lines (rule 4), and not because it should be.
 *
 * The drop sites came out into RelicDropSites; what is left is four blocks that
 * still belong together — refinement, contents, squad value, the trace ladder —
 * because each reads the same relic and the same prices, and splitting them
 * would mean passing the whole row to four siblings to save nothing. The next
 * cut is the trace ladder, which is the only block with arithmetic of its own.
 */
import { useState } from "react";
import {
  ArrowLeftIcon,
  Button,
  DetailPanel,
  Divider,
  DropList,
  DropRow,
  DucatGlyph,
  OrokinStar,
  TierChip,
  XIcon,
} from "relic-finder-ui";

import { RelicDropSites } from "./RelicDropSites";
import { RelicPayout } from "./RelicPayout";
import { SectionLabel } from "./SectionLabel";

import type { DropInfo, PriceMap, Refinement, RelicRow, Reward } from "../api/types";
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
    const price = priceOf(prices, reward.itemName);
    return price != null && (top === null || price > top) ? price : top;
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

      <DropList key={active}>
        {rewards.map((reward, index) => {
          const isSelected = !!highlightItem && reward.itemName === highlightItem;
          const ducats = prices?.get(reward.itemName)?.ducats ?? null;

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
                showImage={false}
                className="rf-droprow-roomy"
                interactive
                role="button"
                tabIndex={0}
                title={`${reward.itemName} — open it in Prime Items`}
                onClick={() => onPickItem(reward.itemName)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onPickItem(reward.itemName);
                  }
                }}
                trailing={
                  <span
                    className="rf-text-data-sm rf-tabular"
                    style={{
                      width: 42,
                      flex: "none",
                      textAlign: "right",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "flex-end",
                      gap: 3,
                      color: ducats ? "var(--rf-currency-ducat)" : "var(--rf-fg-muted)",
                    }}
                    title={
                      ducats
                        ? `${ducats} ducats if dissolved at Baro's kiosk`
                        : "Not a Prime part — no ducat value"
                    }
                  >
                    {ducats ?? "—"}
                    {ducats != null && <DucatGlyph style={{ width: 11, height: 11 }} />}
                  </span>
                }
              />
            </div>
          );
        })}
      </DropList>

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
