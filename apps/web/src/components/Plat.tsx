import { PlatinumGlyph, Price } from "relic-finder-ui";
import type { ComponentProps } from "react";

/**
 * The platinum glyph, sized to sit on a line of text.
 *
 * `flex: none` matters: inside the flex rows that hold a price it would
 * otherwise be the first thing squeezed when the column gets tight.
 */
export function PlatGlyph({ size = 13 }: { size?: number }) {
  return (
    <PlatinumGlyph
      style={{
        width: size,
        height: size,
        flex: "none",
        color: "var(--rf-currency-platinum)",
        display: "block",
      }}
    />
  );
}

/**
 * A price with its currency glyph.
 *
 * The design puts the glyph beside every amount rather than only in the column
 * header, so a number lifted out of context still says what it is denominated
 * in. The glyph is hidden when there is no price: an em dash followed by a
 * platinum mark would read as "costs — platinum" instead of "not listed".
 */
export function PlatPrice(props: ComponentProps<typeof Price>) {
  const missing = props.value === null || props.value === undefined;

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      <Price {...props} />
      {!missing && <PlatGlyph size={props.size === "lg" ? 15 : 13} />}
    </span>
  );
}
