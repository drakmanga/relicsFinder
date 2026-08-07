# Relic Finder — Orokin conventions

Dark-only design system for a Warframe relic search tool. There is no light
theme and no theme prop: `color-scheme: dark` is fixed.

## Wrap everything in `OrokinProvider`

Every style ships scoped under `.rf-root`, which `OrokinProvider` renders.
A component placed outside it gets **no tokens, no fonts and no surfaces** —
it renders as browser-default text on a white page. Wrap once, as high as
possible.

```jsx
<OrokinProvider fullHeight>
  <Button variant="primary" icon={<SearchIcon />}>Cerca</Button>
</OrokinProvider>
```

## Styling idiom: CSS custom properties, not utility classes

Style your own layout with `var(--rf-*)` custom properties. There is no utility
class framework here — the only classes you should ever write are the handful of
Orokin primitives listed below.

| Family | Real names |
|---|---|
| Surfaces | `--rf-surface-0` … `--rf-surface-4` |
| Foreground | `--rf-fg-primary`, `--rf-fg-secondary`, `--rf-fg-muted`, `--rf-fg-disabled`, `--rf-fg-brand`, `--rf-fg-accent` |
| Borders | `--rf-border-subtle`, `--rf-border-default`, `--rf-border-strong`, `--rf-border-interactive`, `--rf-border-emphasis`, `--rf-border-focus` |
| Brand / accent | `--rf-gold-50` … `--rf-gold-900`, `--rf-void-100` … `--rf-void-900` |
| Domain | `--rf-tier-lith\|meso\|neo\|axi\|requiem`, `--rf-rarity-common\|uncommon\|rare`, `--rf-currency-platinum\|ducat\|credit` |
| Feedback | `--rf-success`, `--rf-warning`, `--rf-danger`, `--rf-info` |
| Space | `--rf-space-1` … `--rf-space-24` (4px base) |
| Type | `--rf-font-display`, `--rf-font-ui`, `--rf-font-data` |
| Motion | `--rf-dur-fast\|base\|slow\|sweep\|pulse`, `--rf-ease-standard\|enter\|exit\|orokin` |
| Notch | `--rf-notch-xs\|sm\|md\|lg\|xl` |

Text sizing has classes because the scale is fixed: `rf-text-display-xl|lg|md|sm`,
`rf-text-heading-lg|md|sm`, `rf-text-body-lg|md|sm`, `rf-text-caption`,
`rf-text-overline`, `rf-text-data-lg|md|sm`. Add `rf-tabular` to any column of
numbers.

## Geometry: notches, never rounded corners

`border-radius` is `0` on every surface. The silhouette comes from `clip-path`:
`rf-clip` (cuts top-left + bottom-right, the default), `rf-clip-inverse`
(mirrored half of a split layout), `rf-clip-octagon` (chips and badges only),
with depth from `rf-notch-xs` … `rf-notch-xl`.

**Clip containers only** — never table rows, cells, list items, avatars or
skeletons.

Two rules follow from `clip-path` and are easy to get wrong:

- **`box-shadow` and `outline` are cut away.** Elevation is surface + border
  intensity, and a border is drawn with the double-surface `rf-frame` /
  `rf-frame-inner` pair (`rf-frame-interactive` for controls,
  `rf-frame-gilded` for the Orokin inlay). Use the `Frame` component rather than
  writing it by hand.
- **Focus rings ride the frame.** Anything inside `rf-frame` gets a ring
  automatically; unclipped elements (links, rows, tabs) use `rf-focus-ring`.

## Domain rules that are not negotiable

- Gold means Rare, Radiant, brand, or the primary action. **Links are
  `--rf-fg-accent`, never gold.** One `variant="primary"` button per view.
- `--rf-void-500` is never a fill with text on it (3.97:1). The accent button
  fill is `--rf-void-700`.
- Rarity is a dot **plus** text (`RarityTag`); tier is a filled chip
  (`TierChip`). They never share a slot, which is why Neo and Common can both be
  orange.
- A missing price is `—`, never `0` — `<Price value={null} />` does this.
- Drop chances carry two decimals (`25.33%`), matching the official tables.
- One pulsing Radiant element per view, maximum.

## Where the truth lives

Read `_ds/<folder>/styles.css` and its imports for the real token values, and
`components/general/<Name>/<Name>.prompt.md` for a component's API. Icons are
not preview cards but are fully exported: the Orokin glyphs `LithGlyph`,
`MesoGlyph`, `NeoGlyph`, `AxiGlyph`, `RequiemGlyph`, `CommonGlyph`,
`UncommonGlyph`, `RareGlyph`, `PlatinumGlyph`, `DucatGlyph`, `VoidSigil`, and
the UI set `SearchIcon`, `SearchXIcon`, `ExternalLinkIcon`, `AlertTriangleIcon`,
`XIcon`, `ArrowUpIcon`, `ArrowDownIcon`, `ArrowUpDownIcon`.

## An idiomatic build

```jsx
<OrokinProvider fullHeight>
  <div style={{ display: "flex", gap: 1, background: "var(--rf-border-subtle)" }}>
    <Table interactive>
      <thead>
        <tr>
          <TableHeaderCell>Tier</TableHeaderCell>
          <TableHeaderCell>Reliquia</TableHeaderCell>
          <TableHeaderCell align="right" sortable sortDirection="desc">Prezzo</TableHeaderCell>
        </tr>
      </thead>
      <tbody>
        <TableRow selected>
          <TableCell><TierChip tier="lith" refinement="radiant" /></TableCell>
          <TableCell>Lith V9</TableCell>
          <TableCell align="right" numeric><Price value={45} /></TableCell>
        </TableRow>
      </tbody>
    </Table>

    <DetailPanel
      badges={<TierChip tier="lith" refinement="radiant" />}
      title="Lith V9"
      meta="Hepit · Void · Rotation A"
    >
      <Divider />
      <DropList>
        <DropRow name="Volt Prime Neuroptics" rarity="rare" chance={2} price={45} index={0} />
      </DropList>
    </DetailPanel>
  </div>
</OrokinProvider>
```
