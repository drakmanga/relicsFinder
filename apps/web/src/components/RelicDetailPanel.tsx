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
import type { ReactNode } from "react";
import {
  ArrowLeftIcon,
  Button,
  DetailPanel,
  Divider,
  DropList,
  DropRow,
  DucatGlyph,
  InfoIcon,
  OrokinStar,
  TierChip,
  XIcon,
} from "relic-finder-ui";

import { PlatPrice } from "./Plat";
import { RelicDropSites } from "./RelicDropSites";

import type { DropInfo, PriceMap, Refinement, RelicRow, Reward } from "../api/types";
import {
  ALL_REFINEMENTS,
  REFINEMENT_LABEL,
  TRACE_COST,
  atLeastOnce,
  expectedValue,
  squadValue,
} from "../lib/rows";
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
 * A section heading that can explain itself.
 *
 * The numbers under "What it pays" are the least self-evident in the tool: a
 * squad payout is a best-of-n, not a sum or an average, and nothing on screen
 * says so. The explanation belongs next to them rather than in a README nobody
 * has open while deciding which relic to crack.
 *
 * The note opens in the flow rather than in a tooltip. The panel's gilded frame
 * clips to a notched shape, and a clip-path cuts off absolutely positioned
 * children — a floating bubble came out sliced down its left edge, and no
 * placement fixes that. Pushing the section down instead costs nothing: the
 * panel already scrolls, and the text stays selectable and readable on touch,
 * where hover does not exist.
 */
function SectionLabel({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <p
        className="rf-text-overline rf-fg-muted"
        style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}
      >
        {children}
        {hint && (
          <button
            type="button"
            onClick={() => setOpen((was) => !was)}
            aria-expanded={open}
            aria-label={open ? "Hide the explanation" : "How this is worked out"}
            style={{
              display: "inline-flex",
              padding: 0,
              border: 0,
              background: "none",
              cursor: "pointer",
              color: open ? "var(--rf-gold-500)" : "inherit",
              transition: "color var(--rf-dur-fast) var(--rf-ease-standard)",
            }}
          >
            <InfoIcon width={13} height={13} />
          </button>
        )}
      </p>

      {hint && open && (
        <div
          style={{
            // The overline above is uppercase and letter-spaced; prose is not,
            // and it inherits both unless they are put back.
            textTransform: "none",
            letterSpacing: "normal",
            fontSize: 12,
            lineHeight: 1.55,
            color: "var(--rf-fg-secondary)",
            background: "var(--rf-surface-3)",
            borderLeft: "2px solid var(--rf-gold-500)",
            padding: "10px 12px",
            marginBottom: 12,
          }}
        >
          {hint}
        </div>
      )}
    </>
  );
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

  // Refining is always measured against Intact, whatever the slider is showing:
  // that is the state the relic arrives in, so it is the only baseline a cost
  // in traces can be compared to.
  const baseValue = expectedValue(states.intact ?? [], prices);

  /**
   * The refinement that buys the most value per void trace.
   *
   * Not always Radiant, and that is the point: refining moves chance off the
   * commons and onto the rare, so on a relic whose rare is cheap the hundred
   * traces of a Radiant buy less than the twenty-five of an Exceptional, and
   * sometimes buy nothing at all. Intact is excluded — it costs no traces, so
   * it has no rate — and a relic where every trade is a loss gets no star
   * rather than the least bad one.
   */
  const bestByTrace =
    ALL_REFINEMENTS.reduce<{ state: Refinement; rate: number } | null>((best, state) => {
      const traces = TRACE_COST[state];
      if (traces === 0) return best;

      const rate = (expectedValue(states[state] ?? [], prices) - baseValue) / traces;
      if (rate <= 0) return best;

      return best === null || rate > best.rate ? { state, rate } : best;
    }, null)?.state ?? null;

  // The rare is what a squad is actually chasing, so it is the drop whose odds
  // are worth restating per squad size.
  const rare = rewards.find((reward) => reward.rarity === "rare") ?? null;

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

      <Divider />

      <SectionLabel
        hint={
          <>
            <p className="rf-flush">
              In a squad everyone opens their own copy, all the rewards are revealed, and the squad
              keeps <strong>one — the best of them</strong>. So the payout is a best of four rolls,
              not an average: more players is a better roll, not more loot.
            </p>
            <p className="rf-panel-note">
              Left: the chance that <em>at least one</em> player hits the rare. Right: what a run is
              worth on average at that squad size, at today's prices.
            </p>
          </>
        }
      >
        What it pays
      </SectionLabel>

      {/*
        Squad size, not refinement, is the biggest lever on a relic's value:
        four players open four copies and the group keeps the best of the four
        rolls, so the payout is a best-of-n, not an average. This is the whole
        reason radshare squads exist and it was nowhere in the interface.
      */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 14 }}>
        {[1, 2, 3, 4].map((players) => (
          <div key={players} className="rf-stat-row">
            <span className="rf-fill rf-fg-secondary">
              {players === 1 ? "Solo" : `Squad of ${players}`}
            </span>
            <span className="rf-text-caption rf-fg-muted" style={{ width: 96, textAlign: "right" }}>
              {rare ? `rare ${atLeastOnce(rare.chance, players).toFixed(1)}%` : ""}
            </span>
            <span className="rf-text-data-sm" style={{ width: 60, textAlign: "right" }}>
              <PlatPrice value={Math.round(squadValue(rewards, prices, players))} />
            </span>
          </div>
        ))}
      </div>

      <SectionLabel
        hint={
          <>
            <p className="rf-flush">
              What each refinement state is worth, and what it costs in void traces.
            </p>
            <p className="rf-panel-note">
              The last column is <strong>platinum gained per trace spent</strong>, measured against
              Intact. It can be negative: refining moves chance off the commons and onto the rare,
              so on a relic whose rare is cheap the trade loses money.
            </p>
          </>
        }
      >
        Refining
      </SectionLabel>

      {/*
        Traces are the currency here, so the column that matters is platinum per
        trace. Sometimes it is negative: refining moves chance from the commons
        to the rare, and on a relic whose rare is cheap that trade loses money.
      */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 4 }}>
        {ALL_REFINEMENTS.map((state) => {
          const value = expectedValue(states[state] ?? [], prices);
          const gain = value - baseValue;
          const traces = TRACE_COST[state];

          return (
            <div
              key={state}
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 8,
                fontSize: 13,
                color: state === active ? "var(--rf-fg-primary)" : "var(--rf-fg-muted)",
              }}
            >
              <span className="rf-fill">
                {REFINEMENT_LABEL[state]}
                {state === bestByTrace && (
                  <OrokinStar
                    width={10}
                    height={10}
                    style={{ marginLeft: 5, color: "var(--rf-gold-500)" }}
                  />
                )}
              </span>
              <span
                className="rf-text-caption rf-fg-muted"
                style={{ width: 62, textAlign: "right" }}
              >
                {traces === 0 ? "free" : `${traces} traces`}
              </span>
              <span
                className="rf-text-data-sm rf-tabular"
                style={{ width: 50, textAlign: "right" }}
              >
                {value.toFixed(1)} p
              </span>
              <span
                className="rf-text-caption rf-tabular"
                style={{
                  width: 74,
                  textAlign: "right",
                  color:
                    traces === 0
                      ? "var(--rf-fg-muted)"
                      : gain > 0
                        ? "var(--rf-success)"
                        : "var(--rf-danger)",
                }}
              >
                {traces === 0 ? "—" : `${gain >= 0 ? "+" : ""}${(gain / traces).toFixed(3)} p/tr`}
              </span>
            </div>
          );
        })}
      </div>

      <RelicDropSites
        relicFullName={row.relicFullName}
        sites={sites}
        sitesPending={sitesPending}
        best={best}
      />
    </DetailPanel>
  );
}
