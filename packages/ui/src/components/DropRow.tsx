import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import { cx } from "../lib/cx";
import type { Rarity } from "../lib/types";
import { DropRate, Price } from "./Price";
import { RarityTag } from "./RarityTag";
import { VoidSigil } from "./icons";

export interface DropRowProps extends HTMLAttributes<HTMLDivElement> {
  /** Full item name. Shown in the title attribute when it has to truncate. */
  name: string;
  rarity: Rarity;
  /** Drop chance, e.g. 25.33. */
  chance?: number;
  /** Platinum price. `null` renders an em dash. */
  price?: number | null;
  /** Item thumbnail URL. Falls back to the void sigil. */
  image?: string;
  compact?: boolean;
  interactive?: boolean;
  /** Stagger index. Drives the 40ms cascade when inside a `rf-stagger` list. */
  index?: number;
  trailing?: ReactNode;
}

/**
 * A single relic drop.
 *
 * Item names are truncated with an ellipsis but never mid-word, and the whole
 * value stays reachable through the title attribute.
 */
export function DropRow({
  name,
  rarity,
  chance,
  price,
  image,
  compact = false,
  interactive = false,
  index,
  trailing,
  className,
  style,
  ...rest
}: DropRowProps) {
  return (
    <div
      className={cx(
        "rf-droprow",
        compact && "rf-droprow-compact",
        interactive && "rf-droprow-interactive",
        className,
      )}
      style={index === undefined ? style : ({ ...style, "--rf-i": index } as CSSProperties)}
      {...rest}
    >
      <span className="rf-droprow-img rf-clip">
        {image ? <img src={image} alt="" /> : <VoidSigil />}
      </span>

      <span className="rf-droprow-name" title={name}>
        {name}
      </span>

      {/* Always abbreviated: next to an explicit drop percentage the full word
          is redundant, and it costs the item name 25px it does not have. */}
      <span className="rf-droprow-rarity">
        <RarityTag rarity={rarity} abbreviated className="rf-text-caption" />
      </span>

      {chance !== undefined && (
        <span className="rf-droprow-rate">
          <DropRate value={chance} />
        </span>
      )}

      {price !== undefined && (
        <span className="rf-droprow-price">
          <Price value={price} />
        </span>
      )}

      {trailing}
    </div>
  );
}
