import { useState } from "react";
import {
  ArrowLeftIcon,
  Button,
  DetailPanel,
  Divider,
  ExternalLinkIcon,
  InfoIcon,
  OrokinStar,
  RarityTag,
  TierChip,
  XIcon,
} from "relic-finder-ui";

import { PlatPrice } from "./Plat";

import type { PriceMap, Refinement, Relic, RelicItemRow } from "../api/types";
import { partsOfSet, setOf, sourcesFor } from "../lib/sets";
import { ALL_REFINEMENTS, REFINEMENT_LABEL } from "../lib/rows";
import { marketUrl, priceOf } from "../lib/format";

interface Props {
  row: RelicItemRow;
  relics: Relic[];
  prices: PriceMap | undefined;
  /** Selecting a sibling part swaps the panel to it without touching the table. */
  onPickItem: (itemName: string) => void;
  /**
   * Opens one of the relics that drop this part, in the Relics view.
   *
   * "Dropped by" names four relics and then leaves the reader to go and find
   * one by hand; this is the way through, and the mirror of the contents list
   * in the relic panel.
   */
  onPickRelic: (relicFullName: string) => void;
  /** Steps back to whatever the panel was showing before. Absent at the start. */
  onBack?: () => void;
  /** Shuts the panel and clears the selection. */
  onClose: () => void;
}

/**
 * The item behind the clicked cell: where it comes from, and what set it
 * completes.
 *
 * The mirror of the relic panel. Someone farming a specific part needs the
 * opposite lookup — not "what is in this relic" but "which relics give me this".
 */
export function ItemDetailPanel({
  row,
  relics,
  prices,
  onPickItem,
  onPickRelic,
  onBack,
  onClose,
}: Props) {
  /**
   * Which refinement the chances are quoted at.
   *
   * Local to the panel rather than the global filter, exactly as in the relic
   * panel: "would radshare make this worth farming" is a question asked about
   * one part, and answering it should not rearrange the table behind it.
   */
  const [refinement, setRefinement] = useState<Refinement>("intact");
  const [hintOpen, setHintOpen] = useState(false);
  const sources = sourcesFor(relics, row.itemName);
  const meta = prices?.get(row.itemName);
  // The server derives the set from the item database, which knows what a name
  // like "Forma Blueprint" actually is; the local rule is the fallback for when
  // the price batch has not answered yet.
  const setName = meta?.setName ?? setOf(row.itemName);
  const siblings = setName ? partsOfSet(relics, setName).filter((p) => p !== row.itemName) : [];

  // One refinement at a time, so a relic is not listed four times at four
  // chances — and the chances shown are the ones for the state selected below.
  const atRefinement = sources.filter((source) => source.refinement === refinement);
  const listed = atRefinement.length > 0 ? atRefinement : sources;
  /*
    Every relic, not the first six. The list was capped and closed with "and 3
    more relics" — which names the count of the thing the reader came here to
    read, and hides the ones that might be unvaulted or cheaper. The panel
    scrolls; a list of nine costs nothing that a list of six does not.
  */
  const shown = listed;

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
    <DetailPanel
      key={row.itemName}
      badges={<RarityTag rarity={row.rarity} />}
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
      title={row.itemName}
      meta={setName ?? "Belongs to no set"}
    >
      <Divider />

      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <span className="rf-text-overline rf-fg-muted">Market price</span>
        <span style={{ marginLeft: "auto" }}>
          <PlatPrice value={priceOf(prices, row.itemName)} size="lg" />
        </span>
      </div>

      {meta?.ducats != null && (
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 6 }}>
          <span className="rf-text-overline rf-fg-muted">Ducats</span>
          <span
            className="rf-text-data-md"
            style={{ marginLeft: "auto", color: "var(--rf-currency-ducat)" }}
          >
            {meta.ducats}
          </span>
        </div>
      )}

      <Divider />

      <p className="rf-text-overline rf-fg-muted" style={{ marginBottom: 8 }}>
        Dropped by
      </p>

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
          <p style={{ margin: 0 }}>
            Refining moves chance towards the rare drop and away from the commons, so the
            odds below change with the state the relic is opened in.
          </p>
          <p style={{ margin: "8px 0 0" }}>
            The star marks the state where <em>this</em> part is likeliest — Radiant if it
            is the rare, Intact if it is a common, because for five drops out of six
            refining makes things worse.
          </p>
        </div>
      )}

      <input
        type="range"
        min={0}
        max={ALL_REFINEMENTS.length - 1}
        step={1}
        value={ALL_REFINEMENTS.indexOf(refinement)}
        onChange={(event) =>
          setRefinement(ALL_REFINEMENTS[Number(event.target.value)] ?? "intact")
        }
        aria-label="Refinement the drop chances are quoted at"
        aria-valuetext={REFINEMENT_LABEL[refinement]}
        style={{ width: "100%", accentColor: "var(--rf-gold-500)" }}
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
            {state === bestRefinement && (
              <OrokinStar
                width={9}
                height={9}
                style={{ marginLeft: 3, color: "var(--rf-gold-500)" }}
              />
            )}
          </span>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="rf-text-body-sm rf-fg-muted">No relic in the dataset contains it.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
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
              <TierChip tier={source.tier} refinement={source.refinement} />
              <span style={{ flex: 1, minWidth: 0 }}>{source.relicFullName}</span>
              <span className="rf-text-data-sm rf-fg-muted">{source.chance.toFixed(2)}%</span>
            </button>
          ))}
        </div>
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
                <PlatPrice value={priceOf(prices, part)} />
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
