import type { Config } from "tailwindcss";

/**
 * Relic Finder — Orokin Design System (Tailwind v3 / shadcn-compatible).
 *
 * If the project is on Tailwind v4, prefer `globals.css` (@theme) and use this
 * file only for the `plugins` block, which v4 still consumes.
 *
 * Hard rules encoded here:
 *  - `borderRadius` is stripped to none/full. Surfaces get their silhouette
 *    from `clip-path` utilities, not from rounded corners.
 *  - `boxShadow` is stripped to none. Elevation is surface + border intensity;
 *    box-shadow is clipped away by clip-path anyway.
 */
const config: Config = {
  darkMode: "class", // app ships permanently in dark; class kept for shadcn compat
  content: ["./src/**/*.{ts,tsx}", "./index.html"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#0B0A08",
          900: "#131210",
          800: "#1A1815",
          700: "#23201A",
          600: "#2B2720",
          500: "#3A3529",
        },
        bone: {
          50: "#F2EDE3",
          200: "#D6CFC2",
          300: "#B9B1A2",
          400: "#9A9280",
          500: "#6E6757",
          600: "#5C5648",
        },
        gold: {
          50: "#FBF3D9",
          100: "#F5E4AF",
          200: "#F0CC66",
          300: "#E3B341",
          400: "#D4A32F",
          500: "#C9A227",
          600: "#A08428",
          700: "#8A7423",
          800: "#5E4A13",
          900: "#3A2D0C",
        },
        void: {
          100: "#DCD2FD",
          200: "#C4B4FA",
          300: "#B7A3F7",
          400: "#9B82F0",
          500: "#7C5CE6",
          600: "#6647D6",
          700: "#4E2FBF",
          800: "#3D24A0",
          900: "#2B1970",
        },
        tier: {
          lith: "#6BBEE0",
          meso: "#7FBF6A",
          neo: "#DB9463",
          axi: "#DE8CE8",
          requiem: "#B9B1A2",
          vanguard: "#9AA6EE",
        },
        rarity: {
          common: "#C97F3E",
          uncommon: "#B8BFC7",
          rare: "#E3B341",
        },
        currency: {
          platinum: "#B8C9D9",
          ducat: "#D9B87A",
          credit: "#9A9280",
        },
        surface: {
          0: "#0B0A08",
          1: "#131210",
          2: "#1A1815",
          3: "#23201A",
          4: "#2B2720",
        },
        fg: {
          primary: "#F2EDE3",
          secondary: "#B9B1A2",
          muted: "#9A9280",
          disabled: "#5C5648",
          brand: "#E3B341",
          accent: "#9B82F0",
          "on-gold": "#0B0A08",
          "on-void": "#F2EDE3",
        },
        stroke: {
          subtle: "#221F19",
          DEFAULT: "#2E2920",
          strong: "#4A4030",
          interactive: "#8A7423",
          emphasis: "#A08428",
          focus: "#9B82F0",
        },
        success: { DEFAULT: "#5FBF7F", dim: "#2E6B45" },
        warning: { DEFAULT: "#E0A63C", dim: "#6B4E14" },
        danger: { DEFAULT: "#F07A75", solid: "#A32B27" },
        info: { DEFAULT: "#6BBEE0", dim: "#22505F" },
      },

      fontFamily: {
        display: ["Cinzel", "Georgia", "Times New Roman", "serif"],
        ui: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        data: ["Inter", "system-ui", "sans-serif"],
      },

      fontSize: {
        "display-xl": ["48px", { lineHeight: "1.05", letterSpacing: "0.01em", fontWeight: "600" }],
        "display-lg": ["36px", { lineHeight: "1.1", letterSpacing: "0.01em", fontWeight: "600" }],
        "display-md": ["28px", { lineHeight: "1.15", letterSpacing: "0.01em", fontWeight: "600" }],
        "display-sm": ["22px", { lineHeight: "1.2", letterSpacing: "0.01em", fontWeight: "600" }],
        "heading-lg": ["18px", { lineHeight: "1.3", fontWeight: "600" }],
        "heading-md": ["16px", { lineHeight: "1.4", fontWeight: "600" }],
        "heading-sm": ["14px", { lineHeight: "1.4", fontWeight: "600" }],
        "body-lg": ["16px", { lineHeight: "1.6" }],
        "body-md": ["15px", { lineHeight: "1.55" }],
        "body-sm": ["13px", { lineHeight: "1.5" }],
        caption: ["12px", { lineHeight: "1.4" }],
        overline: ["11px", { lineHeight: "1.2", letterSpacing: "0.12em", fontWeight: "600" }],
        "data-lg": ["20px", { lineHeight: "1.2" }],
        "data-md": ["14px", { lineHeight: "1.2" }],
        "data-sm": ["13px", { lineHeight: "1.2" }],
      },

      spacing: {
        sidebar: "260px",
        detail: "380px",
        topbar: "56px",
        "row-compact": "32px",
        row: "40px",
        "row-comfortable": "48px",
      },

      maxWidth: {
        container: "1600px",
        prose: "72ch",
      },

      // Surfaces are notched, never rounded.
      borderRadius: {
        none: "0px",
        DEFAULT: "0px",
        full: "9999px",
      },

      // Elevation is surface + border, not shadow. Only the scrim overlay
      // and the two float layers may deviate, via drop-shadow filters.
      boxShadow: {
        none: "none",
      },

      dropShadow: {
        float: ["0 2px 6px rgba(0,0,0,0.5)", "0 8px 24px rgba(0,0,0,0.4)"],
        "gold-glow": "0 0 12px rgba(201,162,39,0.28)",
      },

      transitionTimingFunction: {
        standard: "cubic-bezier(0.2,0.8,0.2,1)",
        enter: "cubic-bezier(0,0.6,0.3,1)",
        exit: "cubic-bezier(0.4,0,1,1)",
        orokin: "cubic-bezier(0.16,1,0.3,1)",
      },

      transitionDuration: {
        instant: "80ms",
        fast: "120ms",
        base: "180ms",
        slow: "280ms",
        sweep: "420ms",
      },

      zIndex: {
        raised: "10",
        sticky: "100",
        dropdown: "1000",
        overlay: "1100",
        modal: "1200",
        toast: "1300",
        tooltip: "1400",
      },

      keyframes: {
        "o-sweep": {
          from: { opacity: "0", transform: "translateX(16px)", clipPath: "inset(0 100% 0 0)" },
          to: { opacity: "1", transform: "translateX(0)", clipPath: "inset(0 0 0 0)" },
        },
        "o-rise": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "o-radiant-pulse": {
          "0%,100%": { filter: "drop-shadow(0 0 0 transparent)", opacity: "1" },
          "50%": { filter: "drop-shadow(0 0 6px rgba(201,162,39,0.4))", opacity: "0.92" },
        },
        "o-shimmer": {
          from: { backgroundPosition: "-200% 0" },
          to: { backgroundPosition: "200% 0" },
        },
      },

      animation: {
        sweep: "o-sweep 420ms cubic-bezier(0.16,1,0.3,1) both",
        rise: "o-rise 180ms cubic-bezier(0,0.6,0.3,1) both",
        radiant: "o-radiant-pulse 2400ms cubic-bezier(0.2,0.8,0.2,1) infinite",
        shimmer: "o-shimmer 1400ms linear infinite",
      },
    },
  },

  plugins: [
    // Orokin clip utilities: `clip-orokin`, `clip-octagon`, `clip-orokin-inverse`
    // plus notch-depth modifiers `notch-xs … notch-xl`.
    ({ addUtilities }: { addUtilities: (u: Record<string, unknown>) => void }) => {
      const cut = "var(--notch, 10px)";
      addUtilities({
        ".notch-xs": { "--notch": "4px" },
        ".notch-sm": { "--notch": "6px" },
        ".notch-md": { "--notch": "10px" },
        ".notch-lg": { "--notch": "16px" },
        ".notch-xl": { "--notch": "24px" },
        ".clip-orokin": {
          clipPath: `polygon(${cut} 0, 100% 0, 100% calc(100% - ${cut}), calc(100% - ${cut}) 100%, 0 100%, 0 ${cut})`,
        },
        ".clip-orokin-inverse": {
          clipPath: `polygon(0 0, calc(100% - ${cut}) 0, 100% ${cut}, 100% 100%, ${cut} 100%, 0 calc(100% - ${cut}))`,
        },
        ".clip-octagon": {
          clipPath: `polygon(${cut} 0, calc(100% - ${cut}) 0, 100% ${cut}, 100% calc(100% - ${cut}), calc(100% - ${cut}) 100%, ${cut} 100%, 0 calc(100% - ${cut}), 0 ${cut})`,
        },
        ".tabular": {
          fontVariantNumeric: "tabular-nums",
          fontFeatureSettings: '"tnum" 1',
        },
      });
    },
  ],
};

export default config;
