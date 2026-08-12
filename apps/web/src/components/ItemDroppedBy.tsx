/**
 * Over 150 lines (rule 4): the relic list, the refinement it is quoted at, and
 * the paragraph explaining why the two cannot be separated — refining moves
 * chance off the commons and onto the rare, so the best state depends on which
 * part you are after.
 */
/**
 * Which relics drop this part, at the refinement the reader picks.
 *
 * Its own component because it owns a question of its own — "would radshare
 * make this worth farming" — and the state that answers it. That state is local
 * on purpose: asking it about one part must not rearrange the table behind the
 * panel.
 */
import { useState } from "react";
import { Divider, InfoIcon, OrokinStar, TierChip } from "relic-finder-ui";

import { ALL_REFINEMENTS, REFINEMENT_LABEL } from "../lib/rows";
import type { Refinement } from "../api/types";
import type { RelicSource } from "../lib/sets";

interface Props {
  /** Every relic that drops the part, in every refinement. */
  sources: RelicSource[];
  onPickRelic: (relicFullName: string) => void;
}

export function ItemDroppedBy({ sources, onPickRelic }: Props) {
  const [refinement, setRefinement] = useState<Refinement>("intact");
  const [hintOpen, setHintOpen] = useState(false);

  // One refinement at a time, so a relic is not listed four times at four
  // chances — and the chances shown are the ones for the state selected below.
  const atRefinement = sources.filter((source) => source.refinement === refinement);
  /*
    Every relic, not the first six. The list was capped and closed with "and 3
    more relics" — which names the count of the thing the reader came here to
    read, and hides the ones that might be unvaulted or cheaper. The panel
    scrolls; a list of nine costs nothing that a list of six does not.
  */
  const shown = atRefinement.length > 0 ? atRefinement : sources;

  /**
   * The refinement that gives this part its best odds.
   *
   * Radiant for a rare and Intact for a common, because refining takes chance
   * off the commons to give it to the rare — so "always go Radiant" is wrong
   * for five drops out of six, and which way it falls is exactly what someone
   * farming one specific part needs to know.
   */
  const bestRefinement = ALL_REFINEMENTS.reduce<Refinement | null>((best, state) => {
    const at = Math.max(
      0,
      ...sources.filter((source) => source.refinement === state).map((source) => source.chance),
    );
    if (at === 0) return best;

    const bestSoFar = best
      ? Math.max(
          0,
          ...sources.filter((source) => source.refinement === best).map((source) => source.chance),
        )
      : 0;

    return at > bestSoFar ? state : best;
  }, null);

  return (
    <>
      <Divider />

      <p className="rf-text-overline rf-fg-muted rf-stack-sm">Dropped by</p>

      {/*
      The chances below are only true of one refinement, and which one was
      never stated — a reader comparing 11% here against 20% somewhere else
      was comparing an Intact relic with a Radiant one without being told.
    */}
      <p
        className="rf-text-overline rf-fg-muted"
        style={{ marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}
      >
        Refinement
        <button
          type="button"
          onClick={() => setHintOpen((was) => !was)}
          aria-expanded={hintOpen}
          aria-label={hintOpen ? "Hide the explanation" : "What refinement does to these odds"}
          style={{
            display: "inline-flex",
            padding: 0,
            border: 0,
            background: "none",
            cursor: "pointer",
            color: hintOpen ? "var(--rf-gold-500)" : "inherit",
          }}
        >
          <InfoIcon width={13} height={13} />
        </button>
      </p>

      {hintOpen && (
        <div
          style={{
            textTransform: "none",
            letterSpacing: "normal",
            fontSize: 12,
            lineHeight: 1.55,
            color: "var(--rf-fg-secondary)",
            background: "var(--rf-surface-3)",
            borderLeft: "2px solid var(--rf-gold-500)",
            padding: "10px 12px",
            marginBottom: 10,
          }}
        >
          <p className="rf-flush">
            Refining moves chance towards the rare drop and away from the commons, so the odds below
            change with the state the relic is opened in.
          </p>
          <p className="rf-panel-note">
            The star marks the state where <em>this</em> part is likeliest — Radiant if it is the
            rare, Intact if it is a common, because for five drops out of six refining makes things
            worse.
          </p>
        </div>
      )}

      <input
        type="range"
        min={0}
        max={ALL_REFINEMENTS.length - 1}
        step={1}
        value={ALL_REFINEMENTS.indexOf(refinement)}
        onChange={(event) => setRefinement(ALL_REFINEMENTS[Number(event.target.value)] ?? "intact")}
        aria-label="Refinement the drop chances are quoted at"
        aria-valuetext={REFINEMENT_LABEL[refinement]}
        className="rf-range"
      />

      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
        {ALL_REFINEMENTS.map((state) => (
          <span
            key={state}
            style={{
              fontSize: 10,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: state === refinement ? "var(--rf-fg-primary)" : "var(--rf-fg-muted)",
            }}
          >
            {state === "exceptional" ? "Except." : REFINEMENT_LABEL[state]}
            {state === bestRefinement && <OrokinStar width={9} height={9} className="rf-star" />}
          </span>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="rf-text-body-sm rf-fg-muted">No relic in the dataset contains it.</p>
      ) : (
        <div className="rf-stack-6">
          {shown.map((source) => (
            <button
              key={`${source.relicFullName}-${source.refinement}`}
              type="button"
              className="rf-focus-ring"
              onClick={() => onPickRelic(source.relicFullName)}
              title={`${source.relicFullName} — open it in Relics`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 13,
                padding: "2px 0",
                background: "none",
                border: 0,
                cursor: "pointer",
                textAlign: "left",
                color: "var(--rf-fg-primary)",
              }}
            >
              {/* The chip sits in a column of its own width, so the names start
                  on one line. A tier chip is as wide as its label, and left to
                  themselves Axi, Lith, Meso and Neo pushed each name to a
                  different place — a list of nine relics arrived in an arc. */}
              <span className="rf-tier-slot">
                <TierChip tier={source.tier} refinement={source.refinement} />
              </span>
              <span className="rf-fill">{source.relicFullName}</span>
              <span className="rf-text-data-sm rf-fg-muted">{source.chance.toFixed(2)}%</span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}
