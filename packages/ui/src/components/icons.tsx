import type { ComponentType, ReactNode, SVGProps } from "react";
import type { Rarity, Tier } from "../lib/types";

export type IconProps = SVGProps<SVGSVGElement>;

/**
 * The ten Orokin glyphs. viewBox 24, filled with currentColor, no strokes —
 * they stay legible from 12px up.
 *
 * The tier glyphs gain one diamond per era (Lith 1 … Axi 4), so the count is a
 * second channel that works independently of colour.
 */
function glyph(path: ReactNode, displayName: string) {
  const Component = (props: IconProps) => (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      {path}
    </svg>
  );
  Component.displayName = displayName;
  return Component;
}

export const LithGlyph = glyph(<path d="M12 5 15 12 12 19 9 12Z" />, "LithGlyph");

export const MesoGlyph = glyph(
  <>
    <path d="M12 2.5 14.5 8 12 13.5 9.5 8Z" />
    <path d="M12 10.5 14.5 16 12 21.5 9.5 16Z" />
  </>,
  "MesoGlyph",
);

export const NeoGlyph = glyph(
  <>
    <path d="M12 2 14.2 6.5 12 11 9.8 6.5Z" />
    <path d="M7 12 9.2 16.5 7 21 4.8 16.5Z" />
    <path d="M17 12 19.2 16.5 17 21 14.8 16.5Z" />
  </>,
  "NeoGlyph",
);

export const AxiGlyph = glyph(
  <>
    <path d="M12 1.5 14 5.5 12 9.5 10 5.5Z" />
    <path d="M12 14.5 14 18.5 12 22.5 10 18.5Z" />
    <path d="M5.5 8 7.5 12 5.5 16 3.5 12Z" />
    <path d="M18.5 8 20.5 12 18.5 16 16.5 12Z" />
  </>,
  "AxiGlyph",
);

export const RequiemGlyph = glyph(
  <path d="M12 2.5 20 12 12 21.5 4 12Z M12 6.6 7.4 12 12 17.4 16.6 12Z" />,
  "RequiemGlyph",
);

/**
 * Vanguard: a double chevron, not a diamond count.
 *
 * Lith through Axi count diamonds because they are one sequence of eras. Requiem
 * and Vanguard sit outside it, so they carry a silhouette of their own rather
 * than a fifth and sixth diamond that would imply a rank they do not have.
 */
export const VanguardGlyph = glyph(
  <>
    <path d="M12 2.5 20 11 17.4 11 12 5.4 6.6 11 4 11Z" />
    <path d="M12 11 20 19.5 17.4 19.5 12 13.9 6.6 19.5 4 19.5Z" />
  </>,
  "VanguardGlyph",
);

export const CommonGlyph = glyph(
  <path d="M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm0 2.2a5.8 5.8 0 1 1 0 11.6 5.8 5.8 0 0 1 0-11.6Z" />,
  "CommonGlyph",
);

export const UncommonGlyph = glyph(
  <path d="M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm0 2.2a5.8 5.8 0 1 1 0 11.6V6.2Z" />,
  "UncommonGlyph",
);

export const RareGlyph = glyph(
  <>
    <circle cx="12" cy="12" r="5.5" />
    <path
      d="M12 2.5a9.5 9.5 0 1 0 0 19 9.5 9.5 0 0 0 0-19Zm0 1.6a7.9 7.9 0 1 1 0 15.8 7.9 7.9 0 0 1 0-15.8Z"
      opacity=".45"
    />
  </>,
  "RareGlyph",
);

export const PlatinumGlyph = glyph(
  <path d="M12 2.5 20 7v10l-8 4.5L4 17V7l8-4.5Zm0 3.4L7 8.7v6.6l5 2.8 5-2.8V8.7l-5-2.8Z" />,
  "PlatinumGlyph",
);

export const DucatGlyph = glyph(
  <path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 2.4a6.6 6.6 0 1 1 0 13.2 6.6 6.6 0 0 1 0-13.2Zm0 3.1a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" />,
  "DucatGlyph",
);

export const VoidSigil = glyph(
  <path d="M8.2 2h7.6L22 8.2v7.6L15.8 22H8.2L2 15.8V8.2L8.2 2Zm.9 2.2L4.2 9.1v5.8l4.9 4.9h5.8l4.9-4.9V9.1l-4.9-4.9H9.1Zm2.9 3.3 4.4 4.5-4.4 4.5-4.4-4.5 4.4-4.5Z" />,
  "VoidSigil",
);

export const TIER_GLYPH: Record<Tier, ComponentType<IconProps>> = {
  lith: LithGlyph,
  meso: MesoGlyph,
  neo: NeoGlyph,
  axi: AxiGlyph,
  requiem: RequiemGlyph,
  vanguard: VanguardGlyph,
};

export const RARITY_GLYPH: Record<Rarity, ComponentType<IconProps>> = {
  common: CommonGlyph,
  uncommon: UncommonGlyph,
  rare: RareGlyph,
};

/* --- UI icons. Stroke 1.5, currentColor — the Lucide contract. ----------- */

function strokeIcon(path: ReactNode, displayName: string) {
  const Component = (props: IconProps) => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {path}
    </svg>
  );
  Component.displayName = displayName;
  return Component;
}

export const SearchIcon = strokeIcon(
  <>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </>,
  "SearchIcon",
);

export const SearchXIcon = strokeIcon(
  <>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
    <path d="m8.5 8.5 5 5m0-5-5 5" />
  </>,
  "SearchXIcon",
);

export const ExternalLinkIcon = strokeIcon(
  <>
    <path d="M14 4h6v6" />
    <path d="M20 4 11 13" />
    <path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
  </>,
  "ExternalLinkIcon",
);

export const AlertTriangleIcon = strokeIcon(
  <>
    <path d="M12 4 2.5 20h19L12 4Z" />
    <path d="M12 10v4" />
    <path d="M12 17h.01" />
  </>,
  "AlertTriangleIcon",
);

export const XIcon = strokeIcon(<path d="M18 6 6 18M6 6l12 12" />, "XIcon");

export const InfoIcon = strokeIcon(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5" />
    <path d="M12 8h.01" />
  </>,
  "InfoIcon",
);

export const TrendingUpIcon = strokeIcon(
  <>
    <path d="m3 17 6-6 4 4 8-8" />
    <path d="M15 7h6v6" />
  </>,
  "TrendingUpIcon",
);

export const ArrowUpDownIcon = strokeIcon(
  <>
    <path d="m7 4 0 16M7 4 4 7M7 4l3 3" />
    <path d="m17 20 0-16M17 20l3-3M17 20l-3-3" />
  </>,
  "ArrowUpDownIcon",
);

export const ArrowUpIcon = strokeIcon(<path d="M12 20V4M12 4l-5 5M12 4l5 5" />, "ArrowUpIcon");

export const ArrowDownIcon = strokeIcon(<path d="M12 4v16M12 20l-5-5M12 20l5-5" />, "ArrowDownIcon");
