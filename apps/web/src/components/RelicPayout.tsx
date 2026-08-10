/**
 * What a relic pays, and what refining it costs.
 *
 * Two blocks that belong together and nowhere else: the payout per squad size,
 * and the ladder of refinement states against the void traces each one takes.
 * Both are arithmetic over the same rewards and the same prices, and both are
 * the numbers the decision to open a relic actually turns on — which is why
 * they came out of the panel as one piece rather than two.
 */
import { Divider, OrokinStar } from "relic-finder-ui";

import { PlatPrice } from "./Plat";
import { SectionLabel } from "./SectionLabel";
import {
  ALL_REFINEMENTS,
  bestRefinementByTrace,
  REFINEMENT_LABEL,
  TRACE_COST,
  atLeastOnce,
  expectedValue,
  squadValue,
} from "../lib/rows";
import type { PriceMap, Refinement, Reward } from "../api/types";

interface Props {
  /** The rewards of the state currently on show. */
  rewards: Reward[];
  /** Every state's rewards, for the ladder. */
  states: Partial<Record<Refinement, Reward[]>>;
  prices: PriceMap | undefined;
  /** The state the panel is showing. */
  refinement: Refinement;
}

export function RelicPayout({ rewards, states, prices, refinement }: Props) {
  // The rare is what a squad is actually chasing, so it is the drop whose odds
  // are worth restating per squad size.
  const rare = rewards.find((reward) => reward.rarity === "rare") ?? null;

  const bestByTrace = bestRefinementByTrace(states, prices);

  // Refining is always measured against Intact, whatever the slider is showing:
  // that is the state the relic arrives in, so it is the only baseline a cost
  // in traces can be compared to.
  const baseValue = expectedValue(states.intact ?? [], prices);

  return (
    <>
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
                color: state === refinement ? "var(--rf-fg-primary)" : "var(--rf-fg-muted)",
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
    </>
  );
}
