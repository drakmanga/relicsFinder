# design-sync notes — relic-finder-ui

Repo-specific gotchas. Read this before any re-sync.

## Setup

- **The repo is an npm workspaces monorepo** since 2026-08-07:
  `packages/ui` (the design system) and `apps/web` (the React frontend).
  Build the library with `npm run build:ui` from the root.
- Converter invocation from the repo root:

  ```sh
  node .ds-sync/package-build.mjs --config .design-sync/config.json \
    --node-modules ./node_modules --entry ./packages/ui/dist/index.js --out ./ds-bundle
  ```

  `--node-modules` points at the **root** `node_modules`: workspaces hoist
  `react` there and `packages/ui/node_modules` is sparse.

- **Paths inside `config.json` are package-relative, not repo-relative.**
  `srcDir: "src"`, `cssEntry: "dist/styles.css"` resolve against
  `packages/ui/`, because the converter derives the package root from
  `--entry`. Rewriting them as `packages/ui/...` makes the converter look in
  `packages/ui/packages/ui/...` and silently skip them.
- `npm run verify` runs 38 SSR render assertions against the components before
  anything else touches them. Run it after any component edit — it catches a
  component that silently renders nothing, which the converter would happily
  ship as a card.
- **playwright**: `--with-deps` fails on this machine (Nobara/Fedora, no
  `apt-get`). Install the browser only: `npx playwright install chromium`.
  `playwright` is a devDependency of the package so `package-validate.mjs`
  resolves it from the repo root.

## Config decisions

- `cfg.provider = OrokinProvider` is **mandatory**, not cosmetic. Every style is
  scoped under `.rf-root`, which only the provider renders. Without it every
  card came out unstyled on white — that was the first thing the render check
  caught.
- The 19 icon exports are excluded from cards via `componentSrcMap: null`. They
  stay in the bundle and remain importable; 19 tiles each holding a 24px glyph
  is noise in the DS pane. They are enumerated in `conventions.md` instead.
- `cardMode` overrides: `Dialog` single (overlay), `Table`/`Tooltip`/`Frame`/
  `Card`/`DetailPanel`/`OrokinProvider`/`Skeleton` column (wide stories). The
  last two were added after `[GRID_OVERFLOW]` flagged them.

## Design-system bugs the render check found

Kept here because they are the kind of thing that regresses silently.

- **Reset specificity.** `.rf-root button { color: inherit }` scores (0,1,1) and
  beat every (0,1,0) component colour rule, so primary buttons rendered light
  text on gold. Fixed with `:where(button, input, select, textarea)`, which
  contributes zero specificity. Do not un-wrap that selector.
- **Transparent frame inner.** `.rf-frame` paints the border colour across its
  whole box and the inner sits on top, so a `transparent` inner reveals gold
  rather than the page — outline buttons rendered as solid gold blocks. The
  inner is now opaque via `--rf-frame-inner-bg`.
- **Inline frame descender.** `.rf-btn-outline-wrap` as an inline box left
  descender space under the button, showing a gold band. Both levels are now
  `inline-flex`.
- **Focus ring hijacking the dialog.** `.rf-frame:focus-visible` matched the
  dialog panel (it takes `focus()` on open), replacing its gilded border with a
  permanent purple ring; and a plain `:has(:focus-visible)` lights every
  ancestor frame when an input is focused. The rule is now
  `:has(:focus-visible):not(:has(.rf-frame :focus-visible))` — innermost frame
  only.
- **Invisible skeletons.** surface-2 → surface-3 is 1.06:1, and outright
  invisible on a surface-2 card. The shimmer is now ink-700 → ink-500.
- **DropRow name starvation.** In the 380px detail panel the fixed rarity/rate/
  price slots left ~60px for the item name (`Brat…`). Rarity is now always
  abbreviated with a 64px slot, rate 48px, price 52px, gap 10px, and the panel
  padding dropped to 16px.

## Fonts

Self-hosted, no network dependency. `src/styles/fonts.css` holds the
`@font-face` rules; the woff2 live in `src/styles/fonts/` and esbuild copies
them to `dist/fonts/` (`assetNames: "fonts/[name]"`). `cfg.extraFonts` points at
`dist/styles.css`, which the converter parses to copy the woff2 into the
bundle's `fonts/` and emit a canonical `fonts/fonts.css`; the duplicate
`@font-face` blocks left in `_ds_bundle.css` are replaced by
`/* @ds-font-face-dropped */` comments, which is correct, not a failure.

- Cinzel, `latin` only, **one variable file for 400–700** (25KB). Google serves
  a single variable woff2 for every Cinzel weight: the first download produced
  three byte-identical copies under three names, 50KB of pure duplication. One
  `@font-face` with `font-weight: 400 700` replaces them. Vite had already
  deduplicated them by content hash, which is how it surfaced.
- Inter variable 400–700, `latin` + `latin-ext` (47 + 83KB) — renders everything
  else, including user input.
- **Deliberately not base64.** Inlining all of it made `styles.css` 335KB, and
  CSS is render-blocking, so every page would wait on the glyphs before
  painting. As separate files they fetch in parallel under `font-display: swap`.
- `Marcellus` was removed from the display stack. It only ever existed as a
  fallback for network-loaded Cinzel; with Cinzel self-hosted it can never be
  reached, and validate flagged it as `[FONT_MISSING]`. The stack is now
  `"Cinzel", Georgia, "Times New Roman", serif`.

Both families are SIL OFL 1.1, so self-hosting and redistribution are permitted.

## Known render warns (expected — not new)

- None. Validate exits clean with zero warnings.
- 6 components ship the floor card by design: `DropList`, `TabPanel`,
  `ToastRegion`, `TableRow`, `TableCell`, `TableHeaderCell`. They are
  sub-components whose only true render is inside their parent, and they are
  composed there (`Table`, `Tabs`, `Toast`, `DetailPanel`). Authoring solo cards
  for them would show a row with no table around it.

## Re-sync risks

- **The woff2 are committed binaries.** `src/styles/fonts/` holds 206KB that no
  build step can regenerate. If they are ever lost, re-fetch from Google Fonts'
  `css2` endpoint with a Chrome user-agent (the response only exposes woff2 to
  modern UAs) and keep the `unicode-range` values — dropping them makes the
  browser download every subset for a single glyph.
- **Cinzel is a deviation from the written spec.** `DESIGN_SYSTEM.md` §0.1
  records why (Marcellus ships a single weight). If someone "fixes" the font
  stack back to Marcellus, heading hierarchy collapses at 22px *and* validate
  fails `[FONT_MISSING]`, because Marcellus is not shipped.
- **`conventions.md` names real classes and tokens.** Every name in it was
  grepped against `_ds_bundle.css` and the `components/` tree at sync time. Any
  rename in `src/styles/` invalidates it silently — re-run that validation
  rather than trusting it.
- **The design spec and the code are two sources.** `design-system/tokens.json`
  and `src/styles/tokens.css` hold the same values in two places. They were
  consistent at sync time; nothing enforces it.
- **Grades are keyed to the authored `.tsx` files.** They carry forward for
  free as long as `.design-sync/previews/` and the preview-affecting config are
  untouched.
