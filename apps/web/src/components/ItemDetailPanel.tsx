/**
 * Over 150 lines (rule 4), just. The relic list and its refinement state went
 * to ItemDroppedBy and the chart was already its own component; what is left is
 * the part's own figures and the rest of its set.
 */
import {
  ArrowLeftIcon,
  Button,
  DetailPanel,
  Divider,
  ExternalLinkIcon,
  RarityTag,
  XIcon,
} from "relic-finder-ui";

import { PlatPrice } from "./Plat";
import { ItemDroppedBy } from "./ItemDroppedBy";
import { PanelWishlist } from "./PanelWishlist";

import type { PriceMap, Relic, RelicItemRow, WishlistKind } from "../api/types";
import { partsOfSet, setOf, sourcesFor } from "../lib/sets";
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
  /** How many of this part the wishlist holds, for the stepper in the header. */
  quantityOf: (itemName: string, kind?: WishlistKind) => number;
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
  quantityOf,
  onBack,
  onClose,
}: Props) {
  const sources = sourcesFor(relics, row.itemName);
  const meta = prices?.get(row.itemName);
  // The server derives the set from the item database, which knows what a name
  // like "Forma Blueprint" actually is; the local rule is the fallback for when
  // the price batch has not answered yet.
  const setName = meta?.setName ?? setOf(row.itemName);
  const siblings = setName ? partsOfSet(relics, setName).filter((p) => p !== row.itemName) : [];

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

      <div className="rf-row-baseline-wide">
        <span className="rf-text-overline rf-fg-muted">Market price</span>
        <span className="rf-push">
          <PlatPrice value={priceOf(prices, row.itemName)} size="lg" />
        </span>
      </div>

      {meta?.ducats != null && (
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 6 }}>
          <span className="rf-text-overline rf-fg-muted">Ducats</span>
          <span className="rf-text-data-md rf-push rf-ducat">{meta.ducats}</span>
        </div>
      )}

      <PanelWishlist
        seed={{
          itemName: row.itemName,
          kind: "part",
          tier: row.tier,
          relicFullName: row.relicFullName,
          refinement: row.refinement,
        }}
        qty={quantityOf(row.itemName)}
      />

      <ItemDroppedBy sources={sources} onPickRelic={onPickRelic} />

      {setName && siblings.length > 0 && (
        <>
          <Divider />

          <p className="rf-text-overline rf-fg-muted rf-stack-sm">Rest of {setName}</p>

          <div className="rf-stack">
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

      <div className="rf-mt-5">
        <Button
          variant="primary"
          icon={<ExternalLinkIcon />}
          className="rf-full"
          onClick={() => window.open(marketUrl(row.itemName), "_blank", "noopener,noreferrer")}
        >
          Open on Warframe Market
        </Button>
      </div>
    </DetailPanel>
  );
}
