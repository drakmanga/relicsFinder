import { DropList, DropRow, DucatGlyph } from "relic-finder-ui";

import { QtyStepper } from "./QtyStepper";
import { bump, remove } from "../lib/wishlist";
import { priceOf } from "../lib/format";
import type { PriceMap, Refinement, RelicRow, Reward } from "../api/types";

interface Props {
  row: RelicRow;
  /** The relic's drops in the refinement currently on show. */
  rewards: Reward[];
  refinement: Refinement;
  prices: PriceMap | undefined;
  /** The part the search named, marked among the six. */
  highlightItem?: string | null;
  onPickItem: (itemName: string) => void;
  quantityOf: (itemName: string) => number;
}

/**
 * What a relic holds: six drops, each with its chance, its price, its ducat
 * value and a wishlist stepper.
 *
 * The stepper used to sit on the table row, back when a row was a relic paired
 * with one of its drops. A row is a relic now, and a relic is not a thing the
 * wishlist can hold — what you are collecting is the part. So the control
 * followed the parts here, where the six are listed and where the decision to
 * want one is actually made.
 *
 * The stepper is a sibling of the drop row rather than inside it: the row is
 * itself a button, being the way through to the part in the Prime Items view,
 * and buttons do not nest.
 */
export function RelicContents({
  row,
  rewards,
  refinement,
  prices,
  highlightItem,
  onPickItem,
  quantityOf,
}: Props) {
  return (
    <DropList key={refinement}>
      {rewards.map((reward, index) => {
        const isSelected = !!highlightItem && reward.itemName === highlightItem;
        const ducats = prices?.get(reward.itemName)?.ducats ?? null;

        const seed = {
          itemName: reward.itemName,
          kind: "part" as const,
          tier: row.tier,
          relicFullName: row.relicFullName,
          refinement,
        };

        return (
          <div
            key={reward.id || reward.itemName}
            // Same treatment as a selected table row, so the highlight reads as
            // "this is the one you clicked" rather than as decoration.
            className={`rf-relic-drop${isSelected ? " rf-relic-drop-marked" : ""}`}
          >
            <DropRow
              className="rf-droprow-roomy"
              name={reward.itemName}
              rarity={reward.rarity}
              chance={reward.chance}
              price={priceOf(prices, reward.itemName)}
              index={index}
              showImage={false}
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
                  className={`rf-relic-ducats rf-text-data-sm rf-tabular ${
                    ducats ? "rf-ducat" : "rf-fg-muted"
                  }`}
                  title={
                    ducats
                      ? `${ducats} ducats if dissolved at Baro's kiosk`
                      : "Not a Prime part — no ducat value"
                  }
                >
                  {ducats ?? "—"}
                  {ducats != null && <DucatGlyph className="rf-glyph-ducat" />}
                </span>
              }
            />

            <QtyStepper
              itemName={reward.itemName}
              qty={quantityOf(reward.itemName)}
              onIncrement={() => bump(seed, 1)}
              onDecrement={() => bump(seed, -1)}
              onRemove={() => remove(seed)}
            />
          </div>
        );
      })}
    </DropList>
  );
}
