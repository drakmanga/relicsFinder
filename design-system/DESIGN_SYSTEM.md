# Relic Finder — Orokin Design System

Complete technical specification. Dark-only, desktop-first, React + Tailwind + shadcn/ui.
Version 1.0 — 2026-08-06.

**Files of the system**

| File | Role |
|---|---|
| `DESIGN_SYSTEM.md` | This document. The source of truth for every rule. |
| `tokens.json` | Tokens in W3C DTCG format. **The only place a design value is authored.** `packages/ui/src/styles/tokens.css` is generated from it by `npm run build:tokens` and is not committed — edit it and the next build discards the edit. |
| `globals.css` | Tailwind v4 theme (`@theme`) + the Orokin geometry primitives. |
| `tailwind.config.ts` | Tailwind v3 / shadcn theme + the clipping utility plugin. |
| `preview.html` | Standalone page rendering every token and component. |

---

## 0. Founding decisions

| Area | Decision | Consequence |
|---|---|---|
| Identity | Orokin / Warframe lore | Void black, gold, cut geometry |
| Themes | Dark only | No light tokens. `color-scheme: dark`, fixed |
| Layout priority | Desktop-first | Dense table + 380px detail panel |
| Stack | React + Tailwind + shadcn | Tokens as CSS custom properties |
| UI accent | Void purple, **not** gold | Gold stays with the brand and with Rare |
| Geometry | Full Orokin, but **on containers only** | Rows and cells are never clipped |
| Rarity | Metals faithful to the game | Bronze / silver / gold |
| Tier | A colour per era | Refinement = intensity of that same colour |
| Motion | Functional + three Orokin signatures | Sweep, radiant-pulse, stagger |
| Accessibility | Strict WCAG 2.2 AA | Every colour pair verified, table §2.5 |

### 0.1 Departures from the first draft (and why)

Three choices were corrected during verification. They are deliberate departures, not typos.

1. **Display font: `Cinzel` instead of `Marcellus`.** Marcellus has a single weight (400). With an H1 and an H2 on the same page the hierarchy would rest on size alone, and a 400-weight serif at 22px on `#0B0A08` reads anaemic. Cinzel carries 400–700 and is a lapidary roman — an even more literal Orokin reading. Marcellus is gone even as a fallback: now that Cinzel is self-hosted it cannot fail to load, so the next fallback has to be a font already on the machine (`Georgia`).
2. **Axi retuned from `#B45FD4` to `#DE8CE8`.** The original sat too close to the `#7C5CE6` accent — same family, similar luminance — so an adjacent chip and link read as the same colour.
3. **`#7C5CE6` is never a fill with text on it.** Verified: 4.27:1 against ink, 3.97:1 against bone-50 — it fails AA in both directions. The solid accent button uses `void-700 #4E2FBF` with `bone-50` (7.25:1). `void-500` stays for decorative fills, selection bars and states without text.

---

## 1. Principles

1. **The data comes before the ornament.** A player is looking for "where does Lith V9 drop" and "what does it cost". Prices, percentages and names have to be readable at a glance. Gold never decorates anything that gets in the way of reading.
2. **One colour, one meaning.** Gold means Rare / Radiant / brand. Purple means "user action or selection". No colour holds two jobs.
3. **The geometry carries the identity, not the colour of the surfaces.** The surfaces are warm blacks, nearly indistinguishable; the character comes from cut corners and frames.
4. **Density.** The desktop shows many rows. Every extra vertical pixel on a row costs one relic off the screen.
5. **No shadows.** `clip-path` cuts `box-shadow` away. Depth is surface plus border.

---

## 2. Colour

### 2.1 Primitive scales

Names to use in code: `ink`, `bone`, `gold`, `void`.

**ink** — void blacks, canvas and surfaces

| Token | Hex | Use |
|---|---|---|
| `ink-950` | `#0B0A08` | App canvas |
| `ink-900` | `#131210` | Panels, table body |
| `ink-800` | `#1A1815` | Cards, table header, inputs |
| `ink-700` | `#23201A` | Hover fill, popovers |
| `ink-600` | `#2B2720` | Dialogs, dropdowns |
| `ink-500` | `#3A3529` | Highest surface / strong divider |

**bone** — warm neutrals, text

| Token | Hex | Use |
|---|---|---|
| `bone-50` | `#F2EDE3` | Primary text |
| `bone-200` | `#D6CFC2` | Text on saturated dark fills |
| `bone-300` | `#B9B1A2` | Secondary text |
| `bone-400` | `#9A9280` | Muted text, labels, placeholders |
| `bone-500` | `#6E6757` | Decorative icons |
| `bone-600` | `#5C5648` | Disabled |

**gold** — brand, primary action, Rare, Radiant

| Token | Hex | Use |
|---|---|---|
| `gold-50` | `#FBF3D9` | Text on a saturated solid gold fill |
| `gold-100` | `#F5E4AF` | Brand text hover |
| `gold-200` | `#F0CC66` | Brand text on high surfaces |
| `gold-300` | `#E3B341` | **Brand text / Rare rarity** |
| `gold-400` | `#D4A32F` | Primary fill hover |
| `gold-500` | `#C9A227` | **Primary fill / brand** |
| `gold-600` | `#A08428` | Fill active, emphasis border |
| `gold-700` | `#8A7423` | Interactive border (3:1 verified) |
| `gold-800` | `#5E4A13` | Strong decorative border, scrollbar hover |
| `gold-900` | `#3A2D0C` | Deepest muted gold fill |

**void** — UI accent

| Token | Hex | Use |
|---|---|---|
| `void-100` | `#DCD2FD` | Text on a dark purple fill |
| `void-200` | `#C4B4FA` | — |
| `void-300` | `#B7A3F7` | Link hover |
| `void-400` | `#9B82F0` | **Links, focus ring, accent text, selection marker** |
| `void-500` | `#7C5CE6` | Decorative fills, bars, selection veils. **Never with text on it** |
| `void-600` | `#6647D6` | Accent button hover |
| `void-700` | `#4E2FBF` | **Accent button fill** (with `bone-50`) |
| `void-800` | `#3D24A0` | Accent button active |
| `void-900` | `#2B1970` | Very dark flat fill |

### 2.2 Domain colours

**Relic tier** — rendered **only as a solid chip with `ink-950` text**. Never as text colour on a dark background: they are tuned for contrast in reverse.

| Tier | Hex | Contrast against `ink-950` |
|---|---|---|
| Lith | `#6BBEE0` | 9.49:1 |
| Meso | `#7FBF6A` | 9.01:1 |
| Neo | `#DB9463` | 7.94:1 |
| Axi | `#DE8CE8` | 8.50:1 |
| Requiem | `#B9B1A2` | 8.36:1 |
| Vanguard | `#9AA6EE` | 8.54:1 |

**Refinement** — has no colours of its own: it modulates the tier chip.

| Refinement | Chip opacity | Frame | Extra |
|---|---|---|---|
| Intact | 55% | none | — |
| Exceptional | 70% | 1px `gold-800` | — |
| Flawless | 85% | 1px `gold-700` | — |
| Radiant | 100% | 1px `gold-500` | `animation: radiant 2400ms infinite` |

Refinement always travels with its text (`Intact`, `Radiant`, …) or with an `aria-label`: opacity on its own is not an accessible channel.

**Drop rarity** — used **only in the drop column**, as an 8px dot plus coloured text.

| Rarity | Hex | Contrast on `surface-1` |
|---|---|---|
| Common | `#C97F3E` | 5.87:1 |
| Uncommon | `#B8BFC7` | 10.09:1 |
| Rare | `#E3B341` | 9.62:1 |

**Why tier and rarity never blur together even though Neo and Common are both orange**: they occupy different visual channels and never appear in the same slot. A tier is a solid notched chip at the start of the row; a rarity is a round dot plus text in the drop column. Shape, position and treatment are distinct before colour is even considered.

**Currencies**

| Token | Hex | Use |
|---|---|---|
| `currency-platinum` | `#B8C9D9` | Platinum prices |
| `currency-ducat` | `#D9B87A` | Ducat value |
| `currency-credit` | `#9A9280` | Credits |

### 2.3 Semantic tokens

These are what components use. Never reference a primitive directly from a component.

**Surfaces**

| Token | Value | Use |
|---|---|---|
| `surface-0` | `ink-950` | Canvas |
| `surface-1` | `ink-900` | Panels, table body |
| `surface-2` | `ink-800` | Cards, table header, inputs |
| `surface-3` | `ink-700` | Popovers, surface hover |
| `surface-4` | `ink-600` | Dialogs, dropdowns |
| `scrim` | `#0B0A08CC` | The veil behind modals |

**Foreground**

| Token | Value | AA on `surface-0` → `surface-4` |
|---|---|---|
| `fg-primary` | `#F2EDE3` | 16.96 → 12.73 |
| `fg-secondary` | `#B9B1A2` | 9.30 → 6.98 |
| `fg-muted` | `#9A9280` | 6.41 → 4.81 |
| `fg-disabled` | `#5C5648` | 2.71 → 2.04 (exempt: disabled element) |
| `fg-brand` | `#E3B341` | 10.17 → 7.63 |
| `fg-accent` | `#9B82F0` | 6.45 → 4.84 |
| `fg-on-gold` | `#0B0A08` | 8.18 on `gold-500` |
| `fg-on-void` | `#F2EDE3` | 7.25 on `void-700` |

**Borders**

| Token | Value | Use | Contrast |
|---|---|---|---|
| `border-subtle` | `#221F19` | Row dividers, decorative hairlines | decorative |
| `border-default` | `#2E2920` | Standard panel frame | decorative |
| `border-strong` | `#4A4030` | Section separators, scrollbar | decorative |
| `border-interactive` | `#8A7423` | **The boundary of every control** | 3.26:1 min ✓ |
| `border-emphasis` | `#A08428` | Control hover, gilded frame | 4.12:1 min ✓ |
| `border-focus` | `#9B82F0` | Focus ring | 4.84:1 min ✓ |

> **Binding rule.** A border that is the only signal a control is there — input, select, ghost or outline button, checkbox — must use `border-interactive` or stronger. Gold alpha borders (`gold-500` at 8–34%) reach 1.93:1 at best: they are allowed as ornament, never as a functional boundary.

**Action**

| Token | Value |
|---|---|
| `action-primary-bg` / `hover` / `active` | `gold-500` / `gold-400` / `gold-600` |
| `action-primary-fg` | `ink-950` |
| `action-accent-bg` / `hover` / `active` | `void-700` / `void-600` / `void-800` |
| `action-accent-fg` | `bone-50` |
| `action-ghost-bg-hover` | `#C9A2270F` |
| `action-danger-bg` / `fg` | `#A32B27` / `bone-50` |
| `action-disabled-bg` / `fg` | `ink-700` / `bone-600` |

**Row states**

| Token | Value |
|---|---|
| `state-row-hover` | `#C9A2270D` (gold 5%) |
| `state-row-selected` | `#7C5CE61A` (purple 10%) |
| `state-row-marker-hover` | `gold-500`, inset 2px on the left |
| `state-row-marker-selected` | `void-400`, inset 2px on the left |

**Feedback**

| Token | Hex | As text | Fill |
|---|---|---|---|
| `success` | `#5FBF7F` | 8.71:1 ✓ | `success-dim #2E6B45` |
| `warning` | `#E0A63C` | 9.13:1 ✓ | `warning-dim #6B4E14` |
| `danger` | `#F07A75` | 7.30:1 ✓ | `danger-solid #A32B27` |
| `info` | `#6BBEE0` | 9.49:1 ✓ | `info-dim #22505F` |

### 2.4 Rules for using colour

- **Gold is never the colour of a link.** Links are `void-400`. Gold on text means "this is Rare / Radiant / brand".
- **One `gold-500` button per view.** The primary action is singular — typically "Search" or "Open on Warframe Market".
- **Red never appears on a price.** A high price is not an error. Price movement uses `success`/`danger` on the delta arrow only, never on the number.
- **No information carried by colour alone.** Rarity = dot + text; refinement = opacity + text; price delta = colour + arrow + sign.
- **Alpha only over black.** The veils (`#C9A2270D`, `#7C5CE61A`) are calibrated against `surface-0/1`. On `surface-3/4` use the next surface token instead of stacking another veil.

### 2.5 Verified contrast table

Computed with the WCAG 2.x relative luminance formula. `s0…s4` = `surface-0…surface-4`.

| Colour | Hex | s0 | s1 | s2 | s3 | s4 | Verdict |
|---|---|---|---|---|---|---|---|
| fg-primary | `#F2EDE3` | 16.96 | 16.05 | 15.18 | 13.92 | 12.73 | AAA everywhere |
| fg-secondary | `#B9B1A2` | 9.30 | 8.80 | 8.33 | 7.64 | 6.98 | AAA everywhere |
| fg-muted | `#9A9280` | 6.41 | 6.06 | 5.73 | 5.26 | 4.81 | AA everywhere |
| fg-brand `gold-300` | `#E3B341` | 10.17 | 9.62 | 9.10 | 8.35 | 7.63 | AAA everywhere |
| gold-500 | `#C9A227` | 8.18 | 7.74 | 7.32 | 6.71 | 6.14 | AAA everywhere |
| fg-accent `void-400` | `#9B82F0` | 6.45 | 6.10 | 5.77 | 5.29 | 4.84 | AA everywhere |
| void-500 | `#7C5CE6` | 4.27 | 4.04 | 3.82 | 3.50 | 3.20 | **non-text only** |
| rarity-common | `#C97F3E` | 6.21 | 5.87 | 5.56 | 5.10 | 4.66 | AA everywhere |
| rarity-uncommon | `#B8BFC7` | 10.66 | 10.09 | 9.55 | 8.75 | 8.00 | AAA everywhere |
| rarity-rare | `#E3B341` | 10.17 | 9.62 | 9.10 | 8.35 | 7.63 | AAA everywhere |
| success | `#5FBF7F` | 8.71 | 8.24 | 7.80 | 7.15 | 6.54 | AAA everywhere |
| warning | `#E0A63C` | 9.13 | 8.64 | 8.17 | 7.49 | 6.85 | AAA everywhere |
| danger | `#F07A75` | 7.30 | 6.91 | 6.53 | 5.99 | 5.48 | AA everywhere |
| info | `#6BBEE0` | 9.49 | 8.97 | 8.49 | 7.79 | 7.12 | AAA everywhere |
| platinum | `#B8C9D9` | 11.68 | 11.05 | 10.46 | 9.59 | 8.77 | AAA everywhere |
| ducat | `#D9B87A` | 10.45 | 9.88 | 9.35 | 8.58 | 7.84 | AAA everywhere |
| border-interactive | `#8A7423` | 4.34 | 4.10 | 3.88 | 3.56 | 3.26 | ≥3:1 non-text ✓ |
| border-emphasis | `#A08428` | 5.49 | 5.19 | 4.91 | 4.51 | 4.12 | ≥3:1 non-text ✓ |

**Text on fills**

| Fill | Text | Ratio | Verdict |
|---|---|---|---|
| `gold-500 #C9A227` | `ink-950` | 8.18 | AAA |
| `gold-300 #E3B341` | `ink-950` | 10.17 | AAA |
| `void-700 #4E2FBF` | `bone-50` | 7.25 | AAA |
| `void-500 #7C5CE6` | `ink-950` | 4.27 | ✗ forbidden |
| `void-500 #7C5CE6` | `bone-50` | 3.97 | ✗ forbidden |
| tier chips (all) | `ink-950` | 7.94–9.49 | AAA |

**Values below threshold, never to be used as text**: `void-500`, `#A6642E` (the original bronze, 4.23), `#8A8271` (the original muted, 3.90 on s4), `#E5544F` (the original danger, 4.04 on s4).

---

## 3. Elevation

Five levels. No `box-shadow`: `clip-path` would cut it away. Depth is **surface plus border intensity**.

| Level | Surface | Border | Use |
|---|---|---|---|
| `e0` | `surface-0` | none | Canvas |
| `e1` | `surface-1` | `border-subtle` | Panels, table body, sidebar |
| `e2` | `surface-2` | `border-default` | Cards, table header, inputs |
| `e3` | `surface-3` | `border-strong` | Popovers, tooltips, card hover |
| `e4` | `surface-4` | `border-emphasis` + a scrim over what is underneath | Dialogs, dropdowns, command palette |

**The one permitted exception**: the floating layers `e3` and `e4` may add `filter: drop-shadow(0 2px 6px rgb(0 0 0 / .5)) drop-shadow(0 8px 24px rgb(0 0 0 / .4))`. `drop-shadow` follows the `clip-path`; `box-shadow` does not. Apply it to the `.o-frame` wrapper, not to the clipped child, or the shadow is drawn twice.

---

## 4. Orokin geometry

### 4.1 Scoping rule (binding)

`border-radius` is **0 everywhere**, except dots, avatars and spinners (`9999px`). The silhouette comes from `clip-path`.

| Element | Clip |
|---|---|
| Panel, card, dialog, drawer, sheet | ✅ `clip-orokin`, notch `lg` |
| Button, input, select, textarea | ✅ `clip-orokin`, notch `sm` |
| Chip, badge, tag, tier chip | ✅ `clip-octagon`, notch `xs` |
| Tooltip, popover, dropdown | ✅ `clip-orokin`, notch `sm` |
| Active tab, toast | ✅ `clip-orokin`, notch `sm` |
| **`tr`, `td`, `li`, dividers, avatars, row skeletons** | ❌ **never** |
| Images, icons | ❌ never |

**Why.** Clipping 200 table rows means 200 composited layers with pseudo-element frames: expensive repaints, stuttering virtualization and — worse — the focus ring cut away on the selected row. The table wrapper carries the clip; rows stay rectangular and are told apart by dividers and fills.

### 4.2 The notch scale

| Token | Value | Applied to |
|---|---|---|
| `notch-xs` | 4px | Chips, badges, tags |
| `notch-sm` | 6px | Buttons, inputs, tabs, tooltips, toasts |
| `notch-md` | 10px | Cards, popovers, small panels |
| `notch-lg` | 16px | Detail panel, sidebar, sections |
| `notch-xl` | 24px | Hero, large dialogs, full-page empty states |

Rule: the notch never exceeds **one third of the element's short side**. On a 32px-tall button the maximum is `notch-md`; beyond that the corner eats the text.

### 4.3 The three shapes

```
clip-orokin           clip-orokin-inverse       clip-octagon
(TL + BR cut)         (TR + BL cut)             (all four cut)

  ╱────────────┐        ┌────────────╲            ╱──────────╲
 │             │        │             │          │            │
 │             │        │             │          │            │
 └────────────╱         ╲────────────┘            ╲──────────╱
```

- `clip-orokin` is the **default** silhouette. The diagonal always runs the same way across the app: top-left and bottom-right.
- `clip-orokin-inverse` only for the mirrored half of a split layout — a detail panel on the right beside the table — so the two diagonals face each other.
- `clip-octagon` only for small self-contained elements: chips, badges.

Implemented in `globals.css` as the utilities `.clip-orokin`, `.clip-orokin-inverse`, `.clip-octagon`, with depth from `.notch-xs … .notch-xl`.

### 4.4 Borders on clipped surfaces

`border` and `outline` are cut away by `clip-path`. The only correct technique is the **double surface**: a wrapper that *is* the border, and a child inset by 1px carrying the real surface.

```html
<div class="o-frame notch-lg">
  <div class="o-frame-inner">…content…</div>
</div>
```

```css
.o-frame        { padding: 1px; background: var(--frame-color); clip-path: …notch…; }
.o-frame-inner  { background: var(--color-surface-1); clip-path: …notch − 1px…; }
```

The inner notch is `notch − frame-width`: without that subtraction the border along the diagonal comes out about 1.41× thinner than on the straight sides.

**Gilded frame** (`.o-frame--gilded`): the border is a 135° gradient concentrating gold on the two cut corners and fading to `border-default` in the middle. This is the Orokin inlay. Use it on the detail panel, dialogs and Radiant relic cards. Not on inputs or buttons.

### 4.5 Ornaments

- **Orokin divider**: a 1px `border-strong` line with a 6×6 `gold-700` diamond centred on it, broken for 12px on each side of the diamond. Between major sections only, at most two per view.
- **Engraved corner**: on `e1` panels, a 1px `gold-800` stroke 24px long following the notch cut, top left. Purely decorative.
- Nothing else. No background patterns, no textures: they compete with the tables.

---

## 5. Typography

### 5.1 Families

| Role | Family | Weights | Notes |
|---|---|---|---|
| Display | `Cinzel` | 400, 600, 700 | Titles, relic names in the detail panel, hero numbers. Fallback `Georgia`, `Times New Roman`, `serif` |
| UI | `Inter` (variable) | 400, 500, 600, 700 | Everything else |
| Data | `Inter` + `tabular-nums` | 400, 500, 600 | Prices, percentages, quantities |

Loading: self-hosted `woff2`, `font-display: swap`. No network request: no font CDN, so the system renders identically offline, behind a proxy that blocks, and in jurisdictions where serving third-party fonts is a privacy problem.

| Family | Weights | Subset | File size |
|---|---|---|---|
| Cinzel | 400, 600, 700 (three static files) | `latin` | 3 × 25 KB |
| Inter | variable 400–700 (one file) | `latin`, `latin-ext` | 47 + 83 KB |

Cinzel does not load `latin-ext`: it sets titles only, and relic names are ASCII. Inter does, because it renders everything else, including whatever the user types. Do not load the full Cinzel variable — that is four unused weights.

The fonts stay separate files and are **never inlined as base64**: 206 KB of data URI inside a render-blocking stylesheet would delay the first paint of every page. As files they download in parallel and `font-display: swap` paints immediately with the fallback.

Cinzel is all-caps by construction: **never apply `text-transform: uppercase`** on top of it — that would double the optical spacing — and never use it below 18px.

### 5.2 Scale

| Token | Size / LH | Family | Weight | Tracking | Use |
|---|---|---|---|---|---|
| `display-xl` | 48 / 1.05 | Cinzel | 600 | +0.01em | Hero, landing title |
| `display-lg` | 36 / 1.10 | Cinzel | 600 | +0.01em | Page title |
| `display-md` | 28 / 1.15 | Cinzel | 600 | +0.01em | Relic name in the detail panel |
| `display-sm` | 22 / 1.20 | Cinzel | 600 | +0.01em | Dialog title, section title |
| `heading-lg` | 18 / 1.30 | Inter | 600 | 0 | Card title |
| `heading-md` | 16 / 1.40 | Inter | 600 | 0 | Subsection |
| `heading-sm` | 14 / 1.40 | Inter | 600 | 0 | Inline title, strong label |
| `body-lg` | 16 / 1.60 | Inter | 400 | 0 | Lead paragraph |
| `body-md` | 15 / 1.55 | Inter | 400 | 0 | **Body default** |
| `body-sm` | 13 / 1.50 | Inter | 400 | 0 | **Table cells**, secondary text |
| `caption` | 12 / 1.40 | Inter | 400 | 0 | Notes, timestamps, helper text |
| `overline` | 11 / 1.20 | Inter | 600 | +0.12em | Column headers, eyebrows. `uppercase` |
| `data-lg` | 20 / 1.20 | Inter tnum | 600 | 0 | Featured price |
| `data-md` | 14 / 1.20 | Inter tnum | 500 | 0 | Price in a table |
| `data-sm` | 13 / 1.20 | Inter tnum | 400 | 0 | Drop percentage |

At most three distinct typographic levels per view, on top of body and data.

### 5.3 Rules for numbers

- Every number aligned in a column uses `font-variant-numeric: tabular-nums` and `text-align: right`. Without tabular numerals, digits of different widths make the price column wobble.
- Platinum prices: whole numbers, no decimals, a `p` suffix in `fg-muted` at `caption`, hair space before → `45 p`.
- Drop percentages: two decimals, always — `25.33%`, `11.00%`, `2.00%`. Warframe publishes these with two decimals; truncating breaks the match with the official table.
- Quantities and counts: thousands separator via `Intl.NumberFormat`.
- Price delta: explicit sign + arrow + colour → `▲ +12%` in `success`, `▼ −8%` in `danger`.
- Never set numbers in Cinzel below 20px: lapidary numerals at small sizes are unreadable.

### 5.4 Text

- Maximum line length for prose: `72ch`.
- Item names (`Volt Prime Neuroptics`) are never truncated mid-word: `text-overflow: ellipsis` on the last whole word, with a `title` attribute carrying the full value.
- No `text-transform: uppercase` outside `overline` and tier chips.

---

## 6. Space and layout

### 6.1 Spacing scale

Base 4px. Do not use off-scale values.

| Token | px | Typical use |
|---|---|---|
| `1` | 4 | Icon↔text gap inside a chip |
| `2` | 8 | Icon↔text gap, chip vertical padding |
| `3` | 12 | Cell horizontal padding, gap between chips |
| `4` | 16 | Card padding, gap between fields |
| `5` | 20 | — |
| `6` | 24 | Panel padding, gap between groups |
| `8` | 32 | Gap between sections |
| `10` | 40 | — |
| `12` | 48 | Major section margin |
| `16` | 64 | Page vertical padding |
| `20` / `24` | 80 / 96 | Empty states, hero |

### 6.2 Grid and layout

- Container max: **1600px**, centred, 24px side padding (≥1280px) / 16px below that.
- Inner grid: 12 columns, 24px gutter.
- Three-zone desktop shell:

```
┌──────────────────────────────────────────────────────────────┐
│ Topbar 56px — logo · search · actions                        │
├────────────┬────────────────────────────┬────────────────────┤
│ Sidebar    │ Results (flex, min 640)    │ Detail panel       │
│ 260px      │ dense table                │ 380px  ← sticky    │
│ filters    │ 40px rows                  │ clip-orokin-inverse│
└────────────┴────────────────────────────┴────────────────────┘
```

- Sidebar `260px`, collapsing to `56px` (icons only) below 1440px.
- Detail panel fixed at `380px`, `position: sticky; top: 56px`, height `calc(100dvh - 56px)`, scrolling independently.
- The gap between zones is 1px of `border-subtle`, not whitespace. Density is the point.

### 6.3 Breakpoints and degradation

| BP | Width | Behaviour |
|---|---|---|
| `2xl` | ≥1536 | Full layout, sidebar expanded |
| `xl` | ≥1280 | Full layout, sidebar collapsed to icons |
| `lg` | ≥1024 | Detail panel becomes an **overlay drawer** from the right (`420px`), table full width |
| `md` | ≥768 | Table drops to four columns: tier, relic, best drop, price |
| `sm` | <768 | Table → **list of cards**. One card per relic: tier + name header, six drop rows, price footer |

Below `lg`, touch targets rise to a 44×44px minimum and rows switch to `row-comfortable` 48px.

### 6.4 The content shell — outer full-width, inner constrained

Two levels, always. A **band** spans the viewport and owns the background, the
border and any sticky behaviour; the **shell** inside it holds the content and
carries the gutter. Never put the cap on the element that paints the background,
or the background stops where the content stops and the page reads as a card
floating on nothing.

```html
<header class="rf-band rf-topbar">   <!-- full width: background, border -->
  <div class="rf-shell rf-topbar-inner">…</div>   <!-- capped and centred -->
</header>
```

| Token | Value | Meaning |
|---|---|---|
| `--rf-content-max` | `1440px` | Ceiling for the widest content — this app's eight-column tables. A **ceiling, not a target** |
| `--rf-measure` | `68ch` | Running prose, narrower than the shell and independent of it |
| `--rf-side` | `max(space-6, (100vw − content-max) / 2)` | The gutter, **derived**: 24px below 1488, growing above it |

`--rf-side` is `.rf-shell`'s `padding-inline` and nothing else — cap and gutter
are one rule, so moving `--rf-content-max` moves both. 1440 rather than the 1280
of a content site because squeezing eight columns into 1280 costs more in
truncation than it buys in line length.

### 6.5 What scales with what

Three axes, and every value belongs to exactly one.

| Axis | What | How |
|---|---|---|
| The **window** | Layout, gutters, column counts, panel width | Breakpoints and `clamp()`. Never responds to font-size preference |
| The **user** | Reading text, and only reading text | Every `font-size` is a `--rf-text-*` token, all `rem` |
| **Neither** | Touch targets, hairlines, icon boxes, notch depth | `--rf-touch-target`, `--rf-hairline`: px on purpose |

`.rf-root` sets `font-size: max(1rem, var(--rf-reading-floor))`. On the root
`1rem` is the browser's own preference, so the floor catches a preference set
below the size the design was drawn at while leaving a raised one untouched. A
flat `px` root size overrides the reader in both directions and fails WCAG 1.4.4.

> **Trap.** Table widths in `px` do not survive text zoom. The columns are
> percentages of the table, so at 200% the text doubles inside a table that did
> not, and every column truncates at once. `.rf-table`'s minimum is `40rem` —
> the same 640px at the default preference — and the wide tables declare their
> own floor the same way, so the pane scrolls sideways instead.

---

## 7. Control sizes

| Token | Height | Padding X | Font | Icon | Notch |
|---|---|---|---|---|---|
| `control-xs` | 24px | 8px | `caption` | 16px | `xs` |
| `control-sm` | 32px | 12px | `body-sm` | 16px | `sm` |
| `control-md` | 40px | 16px | `body-md` | 20px | `sm` |
| `control-lg` | 48px | 20px | `body-lg` | 24px | `md` |

Default: `control-md`. In dense toolbars: `control-sm`. Icon buttons: square, same height.

Table rows: `row-compact` 32px, `row` 40px (**default**), `row-comfortable` 48px.

---

## 8. Motion

### 8.1 Tokens

| Token | Value | Use |
|---|---|---|
| `dur-instant` | 80ms | Icon colour change, pressed |
| `dur-fast` | 120ms | Hover, focus, row fill |
| `dur-base` | 180ms | Popover, tab and accordion enter/exit |
| `dur-slow` | 280ms | Drawers, dialogs |
| `dur-sweep` | 420ms | Signature: the detail panel opening |
| `dur-pulse` | 2400ms | Signature: the Radiant pulse |
| `stagger` | 40ms | Signature: the cascade down the drop rows |

| Easing | Curve | Use |
|---|---|---|
| `standard` | `cubic-bezier(.2,.8,.2,1)` | Default for state transitions |
| `enter` | `cubic-bezier(0,.6,.3,1)` | Entering elements |
| `exit` | `cubic-bezier(.4,0,1,1)` | Leaving elements |
| `orokin` | `cubic-bezier(.16,1,.3,1)` | The three signatures only |

### 8.2 The three signatures

1. **Detail panel sweep** — on opening, the panel reveals left to right with `clip-path: inset(0 100% 0 0)` → `inset(0)`, a 16px translation, 420ms `orokin`. The effect is content materialising inside a frame that is already there, rather than sliding into it.
2. **Radiant pulse** — on the chip of a Radiant relic only: `drop-shadow(0 0 6px #C9A22766)` coming and going over 2400ms. Never more than one pulsing element per view. If the list holds thirty Radiant relics, the pulse goes on the selected row **only**.
3. **Drop stagger** — the six drop rows of a relic enter with `o-rise` (6px + fade, 180ms), offset by 40ms. Capped at six: the last starts at 200ms, still read as simultaneous. Never apply it to lists of variable length — over forty rows the last would arrive at 1.6s.

### 8.3 Rules

- No transitions on `width`, `height`, `top/left`. Only `opacity`, `transform`, `background-color`, `clip-path`, `filter`.
- No infinite animation beyond `radiant` and the skeletons.
- Skeletons: linear 1400ms shimmer, never more than two seconds total before showing an error or empty state.
- `prefers-reduced-motion: reduce` → sweep, radiant, stagger and shimmer are **switched off**, not merely shortened; every other transition is forced to 120ms. Already implemented in `globals.css`.

---

## 9. Iconography

### 9.1 UI set — Lucide

- `lucide-react`, `stroke-width: 1.5`, `currentColor`, viewBox 24.
- Sizes: `16` (inline in text), **`20` (default)**, `24` (primary actions, empty states).
- Alignment: icon and text on the optical baseline, gap `space-2` (8px).
- An icon on its own is a control only if it carries an `aria-label`.

Canonical map:

| Concept | Icon |
|---|---|
| Search | `search` |
| Filter | `sliders-horizontal` |
| Sort | `arrow-up-down` |
| External link / Market | `external-link` |
| Favourite / wishlist | `star` |
| Inventory | `package` |
| Price history | `trending-up` |
| Price alert | `bell` |
| Copy | `copy` |
| Close | `x` |
| Info | `info` |
| Error | `alert-triangle` |
| No results | `search-x` |

### 9.2 Custom glyphs

Proprietary SVGs, viewBox 24, `fill: currentColor`, no stroke, optimised for 16–24px.

| Glyph | Shape | Use |
|---|---|---|
| `tier-lith` | Single diamond | Lith chip |
| `tier-meso` | Two stacked diamonds | Meso chip |
| `tier-neo` | Three diamonds in a triangle | Neo chip |
| `tier-axi` | Four diamonds in a lozenge | Axi chip |
| `tier-vanguard` | Double chevron | Vanguard chip |
| `rarity-common` | Hollow circle | Drop column |
| `rarity-uncommon` | Half-filled circle | Drop column |
| `rarity-rare` | Filled circle with a halo | Drop column |
| `platinum` | Six-sided facet | Prices |
| `ducat` | Orokin toroid | Ducat value |
| `orokin-star` | Four-pointed star | Marks the best option in a list |
| `void-sigil` | Octagonal sigil | Logo, empty states, loader |

The tier glyphs gain a diamond with each era: the count is a second channel, independent of colour. Requiem and Vanguard sit outside that sequence and carry marks of their own rather than a sixth diamond, which would assert a rank they do not hold.

### 9.3 Images

- Item images from Warframe Market or the wiki: container `clip-orokin notch-sm`, `object-fit: contain`, `surface-2` background.
- Placeholder while loading: `o-skeleton`, same dimensions, no layout shift (`aspect-ratio` always declared).
- No full-bleed art behind text.

---

## 10. Components

Every component lists anatomy, sizes and states. States not listed do not exist.

### 10.1 Button

Variants: `primary`, `accent`, `outline`, `ghost`, `danger`.

| Variant | Fill | Text | Border |
|---|---|---|---|
| `primary` | `gold-500` → hover `gold-400` → active `gold-600` | `ink-950` | none |
| `accent` | `void-700` → `void-600` → `void-800` | `bone-50` | none |
| `outline` | transparent → hover `#C9A2270F` | `fg-primary` | 1px `border-interactive` → hover `border-emphasis` |
| `ghost` | transparent → hover `#C9A2270F` | `fg-secondary` → hover `fg-primary` | none |
| `danger` | `#A32B27` → hover `#C0332E` | `bone-50` | none |

- Geometry: `clip-orokin`, `notch-sm` (`notch-xs` on `control-xs`).
- Typography: `body-md` weight 600. No uppercase.
- Icon to the left of the text, 8px gap. Icon-only: square, `aria-label` mandatory.
- **Disabled**: `action-disabled-bg` + `action-disabled-fg`, `cursor: not-allowed`, `aria-disabled="true"`. Never `opacity` on the whole button — that drops the border below threshold too.
- **Loading**: a 16px spinner in place of the icon, text unchanged, `aria-busy="true"`, width frozen.
- **Focus**: a 2px `border-focus` frame (see §12).
- One `primary` per view.

### 10.2 Input / Search

- Height `control-md` 40px (`control-lg` 48px for the main search).
- Surface `surface-2`, 1px `border-interactive` border, `clip-orokin notch-sm`.
- Placeholder `fg-muted`. Text `fg-primary` `body-md`.
- Leading icon 20px `fg-muted`; a trailing clear button once there is a value.
- Hover: `border-emphasis`. Focus: 2px `border-focus` frame.
- Error: `danger` border, message below in `caption` `danger`, `aria-invalid="true"`, `aria-describedby` pointing at the message.
- The main search is `640px` at most, centred in the topbar, with `⌘K` as a hint in an `fg-muted` chip on the right.

### 10.3 Chip / Badge

| Type | Geometry | Fill | Text | Height |
|---|---|---|---|---|
| Tier | `clip-octagon notch-xs` | tier colour (opacity from refinement) | `ink-950` | 20px |
| Rarity | none (8px dot + text) | — | rarity colour | inline |
| Active filter | `clip-octagon notch-xs` | `#7C5CE61A` | `void-400` | 24px |
| Count | `clip-octagon notch-xs` | `surface-3` | `fg-secondary` | 20px |

Tier chip: 8px padding X, `overline` 11px 600 uppercase tracking 0.12em, 12px tier glyph on the left.

### 10.4 Table (dense)

Canonical column structure for search results:

| Column | Width | Alignment | Typography |
|---|---|---|---|
| Tier | 88px | left | chip |
| Relic | 160px | left | `body-sm` 500 |
| Item | `1fr` (min 200px) | left | `body-sm` |
| Rarity | 110px | left | dot + `body-sm` |
| Drop % | 72px | right | `data-sm` tnum |
| Price | 96px | right | `data-md` tnum, `currency-platinum` |
| Action | 40px | center | ghost icon button |

- Header: 36px, sticky at **`top: 0`**, `surface-2`, `overline`, 1px `border-default` bottom border.

> **Trap.** The table wrapper carries `overflow-x: auto`, which makes it a scroll container: sticky headers anchor to *that* container, not to the viewport. Any offset other than `0` — say `56px`, to "sit below the topbar" — pushes the header down inside the container and over the first rows. The topbar offset belongs to the shell layout, never to the headers' `top`.
- Row: 40px, `body-sm`, 1px `border-subtle` divider, 12px padding X.
- Hover: `#C9A2270D` fill + `inset 2px 0 0 gold-500` marker on the first cell.
- Selected: `#7C5CE61A` fill + `void-400` marker, `aria-selected="true"`.
- Zebra striping: **no**. With seven columns and 1px dividers it is noise.
- Sort: clickable header, 14px arrow to the right of the label, correct `aria-sort`.
- The wrapper carries `clip-orokin notch-lg` + `.o-frame`. Rows are never clipped.
- Past a hundred rows: virtualization, with a fixed 40px row height as a requirement.
- **`table-layout: fixed`, and every header cell carries a width.** Cell text is
  one line, truncated with an ellipsis; cells holding a control keep their
  overflow visible so the focus ring survives.

> **Trap.** Automatic table layout measures the rows the browser currently has. A virtualised table only ever has a screenful of them, so scrolling swaps in longer names and every column resizes as it goes — the table shivers. The same mechanism lets one row widen its column, which is how appending a search match to a name pushed the whole layout sideways. Fixed layout makes width a property of the table rather than of whatever happens to be on screen; the price is that a header cell with no width gets an equal share, so widths are not optional.

### 10.5 Detail panel

- Width `380px`, `surface-1`, `.o-frame--gilded`, `clip-orokin-inverse notch-lg` (mirroring the table).
- Sticky below the topbar, scrolling internally.
- Anatomy: tier + refinement chip → relic name in `display-md` Cinzel → meta (drop location, rotation) in `caption fg-muted` → Orokin divider → the six drops → divider → price block → `Open on Warframe Market` CTA (`primary`, full width).
- Entrance: the 420ms sweep signature. The six drop rows enter on a 40ms stagger.
- Empty (no relic selected): `void-sigil` 48px `bone-500`, `body-sm fg-muted` text, centred.

### 10.6 Drop row

A row inside the detail panel, 48px:

```
[img 32px] Volt Prime Neuroptics          ● Rare      25.33%     45 p
           ^body-sm fg-primary          ^gold-300   ^data-sm    ^data-md
                                                     fg-muted    platinum
```

- The rarity dot is 8px, `border-radius: full`, in the rarity colour.
- Hover: `#C9A2270D` fill, the name turns into a `void-400` link.

### 10.7 Relic card (below `lg`)

- `surface-2`, `.o-frame`, `clip-orokin notch-md`, 16px padding.
- Header: tier chip + `heading-md` name + `data-lg` price on the right.
- Body: six compact drop rows (36px).
- Footer: `border-subtle` above, Market link + ducat value.
- Radiant: `.o-frame--gilded` plus the pulse, only on the expanded card.

### 10.8 Dialog

- `surface-4`, `.o-frame--gilded`, `clip-orokin notch-xl`, max-width 560px.
- Scrim `#0B0A08CC`, `backdrop-filter: blur(2px)`.
- Title `display-sm` Cinzel, body `body-md`, footer with right-aligned actions, 12px gap.
- Enter: `o-rise` 280ms `enter` plus a 180ms scrim fade. Exit: 180ms `exit`.
- Focus trap, `Esc` closes, focus returns to the trigger.

### 10.9 Tooltip / Popover

- Tooltip: `surface-4`, `clip-orokin notch-sm`, `caption`, 6px 10px padding, 400ms in / 0ms out, max-width 280px. Never interactive.
- Popover: `surface-3`, `.o-frame`, `clip-orokin notch-md`, 16px padding, floating `drop-shadow`.

### 10.10 Toast

- `surface-4`, `.o-frame`, `clip-orokin notch-sm`, a 2px bar on the left in the semantic colour.
- 360px wide, bottom right, stack of at most three, auto-dismiss after 5s (errors: never auto-dismiss).
- `role="status"` for info and success, `role="alert"` for warning and danger.

### 10.11 Tabs

- Height 36px, `body-sm` 500 text, `fg-muted` → active `fg-primary`.
- Active: `surface-2` fill + `clip-orokin notch-sm` + a 2px `gold-500` bar underneath.
- Bar transition: 180ms `standard`.

### 10.12 Skeleton / Empty / Error

| State | Treatment |
|---|---|
| Skeleton | `surface-2`→`surface-3` blocks, 1400ms shimmer. Same height as the real content. Table rows: 40px, **unclipped**. Two seconds maximum |
| Empty (no results) | `search-x` 48px `bone-500`, `heading-md` title, `body-sm fg-muted` text, `outline` CTA with a search suggestion |
| Empty (initial state) | `void-sigil` 64px `gold-800`, `display-sm` Cinzel title, three example-search chips (`Lith V9`, `Volt Prime`, `Meso B4`) |
| Error | `alert-triangle` 48px `danger`, `heading-md` title, technical message in `caption fg-muted`, `Retry` CTA in `outline` |
| Offline / API down | A persistent `warning` toast plus a `warning-dim` banner below the topbar |

---

## 11. Price patterns

Warframe Market is the source. Price is the second reason the app exists, and it has rules of its own.

- Main price: `data-md` 500 `currency-platinum`, `p` suffix in `caption fg-muted`.
- Featured price (detail panel): `data-lg` 600.
- A missing price is not `0`: show `—` in `fg-disabled`, never a zero.
- Freshness: past fifteen minutes, a timestamp in `caption fg-muted` under the price (`updated 22 min ago`). Past an hour, an `info` icon with a tooltip.
- Range: `12 – 18 p` with an en dash and hair spaces.
- Delta: `▲ +12%` / `▼ −8%`, colour on the arrow and the percentage, never on the price.
- The Warframe Market link is always `external-link` + `rel="noopener noreferrer"` + `target="_blank"`, with an explicit `aria-label` (`Open Volt Prime Neuroptics on Warframe Market`).

---

## 12. Focus, states, accessibility

### 12.1 Focus

`outline` is cut away by `clip-path`. Two mechanisms:

- **Clipped elements** (buttons, inputs, clickable cards): they sit inside an `.o-frame`. On `:focus-visible` the frame switches to `padding: 2px` and `background: border-focus`. The ring follows the notched silhouette exactly.
- **Unclipped elements** (links, table rows, tabs): `.o-focus-ring` → `outline: 2px solid #9B82F0; outline-offset: 2px`.

The ring is always `void-400` (4.84:1 minimum against every surface). Never gold: it would read as the hover state.

### 12.2 Requirements

- Text contrast ≥ 4.5:1 (§2.5 verifies every token).
- Boundary contrast for controls and informative icons ≥ 3:1 → `border-interactive` and up.
- Targets: 40×40px on desktop, **44×44px below `lg`**. Icon buttons in a dense toolbar: 32px with the clickable area extended to 40px through padding.
- No information carried by colour alone (§2.4).
- `prefers-reduced-motion` respected (§8.3).
- 200% zoom without horizontal scrolling: below `lg` the table becomes cards.
- Tab order: topbar → search → sidebar → table → detail panel.
- Table rows: `role="row"`, navigable with ↑↓, `Enter` opens the detail panel, `Esc` clears the selection.
- Every asynchronous result update announced in an `aria-live="polite"` region (`23 relics found`).

### 12.3 Canonical states

Every interactive component implements exactly: `default`, `hover`, `focus-visible`, `active`, `disabled`, and where relevant `loading`, `selected`, `error`.

---

## 13. Token conventions

- Format: `{category}-{scale|role}-{variant}` → `gold-500`, `fg-muted`, `action-primary-bg-hover`.
- Components use **semantic tokens only**. `bg-gold-500` inside a component is a review error; the correct token is `bg-action-primary`.
- Domain tokens (`tier-*`, `rarity-*`, `currency-*`) are the exception: they map game concepts rather than UI roles, and are used directly.
- A new colour is verified against `surface-0…4` first, then added to `tokens.json`, then to `globals.css`, then to the table in §2.5. In that order.
- `tokens.json` is the source. `globals.css` and `tailwind.config.ts` can be generated from it with Style Dictionary.

---

## 14. Do / Don't

| ✅ | ❌ |
|---|---|
| `clip-path` on panels, cards, buttons, chips | `clip-path` on `tr`, `td`, `li`, avatars |
| Borders through the double-surface `.o-frame` technique | `border` or `outline` directly on a clipped element |
| Elevation from surface + border | `box-shadow` (it gets clipped away) |
| Gold for Rare, Radiant, brand, primary action | Gold for links |
| `void-700` as a fill with text | `void-500` as a fill with text (3.97:1) |
| Rarity as dot + text | Rarity as colour alone |
| `tabular-nums` on every numeric column | Proportional digits in prices |
| Cinzel ≥18px, never uppercased on top | Cinzel at 13px inside a cell |
| One `primary` per view | Three gold buttons side by side |
| One pulsing Radiant element per view | Thirty rows pulsing together |
| `—` for a missing price | `0 p` for a missing price |
| Below `lg`: table → cards | Horizontal table scrolling on mobile |
