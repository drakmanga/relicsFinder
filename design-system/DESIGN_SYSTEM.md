# Relic Finder — Orokin Design System

Specifica tecnica completa. Dark-only, desktop-first, React + Tailwind + shadcn/ui.
Versione 1.0 — 2026-08-06.

**File del sistema**

| File | Ruolo |
|---|---|
| `DESIGN_SYSTEM.md` | Questo documento. Fonte di verità per ogni regola. |
| `tokens.json` | Token in formato W3C DTCG. Sorgente per Style Dictionary / sync. |
| `globals.css` | Tema Tailwind v4 (`@theme`) + primitive di geometria Orokin. |
| `tailwind.config.ts` | Tema Tailwind v3 / shadcn + plugin utility di clipping. |
| `preview.html` | Pagina standalone con ogni token e componente renderizzato. |

---

## 0. Decisioni fondanti

| Ambito | Decisione | Conseguenza |
|---|---|---|
| Identità | Orokin / lore Warframe | Nero void, oro, geometria tagliata |
| Temi | Solo dark | Nessun token light. `color-scheme: dark` fisso |
| Priorità layout | Desktop-first | Tabella densa + detail panel 380px |
| Stack | React + Tailwind + shadcn | Token come CSS custom properties |
| Accento UI | Void purple, **non** oro | L'oro resta al brand e alla rarità Rare |
| Geometria | Full Orokin, ma **solo sui contenitori** | Righe e celle mai clippate |
| Rarità | Metalli fedeli al gioco | Bronzo / argento / oro |
| Tier | Colore proprio per era | Refinement = intensità dello stesso colore |
| Motion | Funzionale + 3 firme Orokin | Sweep, radiant-pulse, stagger |
| Accessibilità | WCAG 2.2 AA stretto | Ogni coppia colore verificata, tabella §2.5 |

### 0.1 Deviazioni dalle scelte iniziali (e perché)

Tre scelte sono state corrette in fase di verifica. Sono deviazioni consapevoli, non refusi.

1. **Font display: `Cinzel` invece di `Marcellus`.** Marcellus ha un solo peso (400). Con un H1 e un H2 sulla stessa pagina la gerarchia sarebbe affidata solo alla dimensione, e un serif 400 a 22px su fondo `#0B0A08` risulta anemico. Cinzel ha 400–700, è un romano lapidario — lettura Orokin ancora più letterale. Marcellus non compare più nemmeno come fallback: da quando Cinzel è self-hosted non può fallire il caricamento, quindi il fallback successivo deve essere un font già presente sulla macchina (`Georgia`).
2. **Axi ritarato da `#B45FD4` a `#DE8CE8`.** Il valore originale distava troppo poco dall'accento `#7C5CE6` (stessa famiglia, luminanza vicina): a chip e link adiacenti sembravano lo stesso colore.
3. **`#7C5CE6` non è mai un fill con testo sopra.** Verificato: 4.27:1 con ink, 3.97:1 con bone-50 — fallisce AA in entrambe le direzioni. Il bottone accento solido usa `void-700 #4E2FBF` + `bone-50` (7.25:1). Il `void-500` resta per fill decorativi, barre di selezione e stati senza testo.

---

## 1. Principi

1. **Il dato viene prima dell'ornamento.** Un giocatore cerca "dove droppa Lith V9" e "quanto costa". Prezzi, percentuali e nomi devono essere leggibili al primo colpo d'occhio. L'oro non decora mai qualcosa che ostacola la lettura.
2. **Un colore = un significato.** L'oro significa Rare/Radiant/brand. Il viola significa "azione o selezione dell'utente". Nessun colore ha due lavori.
3. **La geometria fa l'identità, non il colore delle superfici.** Le superfici sono neri caldi quasi indistinguibili; il carattere lo danno gli angoli tagliati e le cornici.
4. **Densità.** Il desktop mostra molte righe. Ogni pixel verticale in più su una riga costa una reliquia in meno a schermo.
5. **Niente ombre.** Con `clip-path` le `box-shadow` vengono ritagliate. La profondità è superficie + bordo.

---

## 2. Colore

### 2.1 Scale primitive

Nomi da usare in codice: `ink`, `bone`, `gold`, `void`.

**ink** — neri void, canvas e superfici

| Token | Hex | Uso |
|---|---|---|
| `ink-950` | `#0B0A08` | Canvas dell'app |
| `ink-900` | `#131210` | Pannelli, corpo tabella |
| `ink-800` | `#1A1815` | Card, header tabella, input |
| `ink-700` | `#23201A` | Hover fill, popover |
| `ink-600` | `#2B2720` | Dialog, dropdown |
| `ink-500` | `#3A3529` | Superficie massima / divider forte |

**bone** — neutri caldi, testo

| Token | Hex | Uso |
|---|---|---|
| `bone-50` | `#F2EDE3` | Testo primario |
| `bone-200` | `#D6CFC2` | Testo su fill scuri saturi |
| `bone-300` | `#B9B1A2` | Testo secondario |
| `bone-400` | `#9A9280` | Testo muted, label, placeholder |
| `bone-500` | `#6E6757` | Icone decorative |
| `bone-600` | `#5C5648` | Disabilitato |

**gold** — brand, azione primaria, Rare, Radiant

| Token | Hex | Uso |
|---|---|---|
| `gold-50` | `#FBF3D9` | Testo su fill oro pieno saturo |
| `gold-100` | `#F5E4AF` | Hover di testo brand |
| `gold-200` | `#F0CC66` | Testo brand su superfici alte |
| `gold-300` | `#E3B341` | **Testo brand / rarità Rare** |
| `gold-400` | `#D4A32F` | Hover del fill primario |
| `gold-500` | `#C9A227` | **Fill primario / brand** |
| `gold-600` | `#A08428` | Active del fill, bordo enfasi |
| `gold-700` | `#8A7423` | Bordo interattivo (3:1 verificato) |
| `gold-800` | `#5E4A13` | Bordo decorativo forte, scrollbar hover |
| `gold-900` | `#3A2D0C` | Fill oro spentissimo |

**void** — accento UI

| Token | Hex | Uso |
|---|---|---|
| `void-100` | `#DCD2FD` | Testo su fill viola scuro |
| `void-200` | `#C4B4FA` | — |
| `void-300` | `#B7A3F7` | Link hover |
| `void-400` | `#9B82F0` | **Link, focus ring, testo accento, marker selezione** |
| `void-500` | `#7C5CE6` | Fill decorativi, barre, veli di selezione. **Mai con testo sopra** |
| `void-600` | `#6647D6` | Hover del bottone accento |
| `void-700` | `#4E2FBF` | **Fill bottone accento** (con `bone-50`) |
| `void-800` | `#3D24A0` | Active del bottone accento |
| `void-900` | `#2B1970` | Fill piatto molto scuro |

### 2.2 Colori di dominio

**Tier reliquia** — resi **solo come chip a fondo pieno con testo `ink-950`**. Mai come colore di testo su fondo scuro: sono tarati per il contrasto in negativo.

| Tier | Hex | Contrasto con `ink-950` |
|---|---|---|
| Lith | `#6BBEE0` | 9.49:1 |
| Meso | `#7FBF6A` | 9.01:1 |
| Neo | `#DB9463` | 7.94:1 |
| Axi | `#DE8CE8` | 8.50:1 |
| Requiem | `#B9B1A2` | 8.36:1 |

**Refinement** — non ha colori propri: modula il chip del tier.

| Refinement | Opacità chip | Cornice | Extra |
|---|---|---|---|
| Intact | 55% | nessuna | — |
| Exceptional | 70% | 1px `gold-800` | — |
| Flawless | 85% | 1px `gold-700` | — |
| Radiant | 100% | 1px `gold-500` | `animation: radiant 2400ms infinite` |

Il refinement è sempre accompagnato dal testo (`Intact`, `Radiant`, …) o dall'`aria-label`: l'opacità da sola non è un canale accessibile.

**Rarità drop** — usate **solo nella colonna drop**, come pallino 8px + testo colorato.

| Rarità | Hex | Contrasto su `surface-1` |
|---|---|---|
| Common | `#C97F3E` | 5.87:1 |
| Uncommon | `#B8BFC7` | 10.09:1 |
| Rare | `#E3B341` | 9.62:1 |

**Perché tier e rarità non si confondono anche se Neo e Common sono entrambi arancioni**: occupano canali visivi diversi e non appaiono mai nello stesso slot. Il tier è un chip pieno rettangolare-notched a inizio riga; la rarità è un pallino tondo + testo nella colonna drop. Forma, posizione e trattamento sono distinti prima ancora del colore.

**Valute**

| Token | Hex | Uso |
|---|---|---|
| `currency-platinum` | `#B8C9D9` | Prezzi in platinum |
| `currency-ducat` | `#D9B87A` | Valore in ducati |
| `currency-credit` | `#9A9280` | Crediti |

### 2.3 Token semantici

Da usare nei componenti. Non referenziare mai le primitive direttamente in un componente.

**Superfici**

| Token | Valore | Uso |
|---|---|---|
| `surface-0` | `ink-950` | Canvas |
| `surface-1` | `ink-900` | Pannelli, corpo tabella |
| `surface-2` | `ink-800` | Card, header tabella, input |
| `surface-3` | `ink-700` | Popover, hover di superfici |
| `surface-4` | `ink-600` | Dialog, dropdown |
| `scrim` | `#0B0A08CC` | Velo dietro i modali |

**Foreground**

| Token | Valore | AA su `surface-0` → `surface-4` |
|---|---|---|
| `fg-primary` | `#F2EDE3` | 16.96 → 12.73 |
| `fg-secondary` | `#B9B1A2` | 9.30 → 6.98 |
| `fg-muted` | `#9A9280` | 6.41 → 4.81 |
| `fg-disabled` | `#5C5648` | 2.71 → 2.04 (esente: elemento disabilitato) |
| `fg-brand` | `#E3B341` | 10.17 → 7.63 |
| `fg-accent` | `#9B82F0` | 6.45 → 4.84 |
| `fg-on-gold` | `#0B0A08` | 8.18 su `gold-500` |
| `fg-on-void` | `#F2EDE3` | 7.25 su `void-700` |

**Bordi**

| Token | Valore | Uso | Contrasto |
|---|---|---|---|
| `border-subtle` | `#221F19` | Divider di riga, hairline decorative | decorativo |
| `border-default` | `#2E2920` | Cornice standard dei pannelli | decorativo |
| `border-strong` | `#4A4030` | Separatori di sezione, scrollbar | decorativo |
| `border-interactive` | `#8A7423` | **Boundary di ogni controllo** | 3.26:1 min ✓ |
| `border-emphasis` | `#A08428` | Hover di controllo, cornice gilded | 4.12:1 min ✓ |
| `border-focus` | `#9B82F0` | Anello di focus | 4.84:1 min ✓ |

> **Regola vincolante.** Un bordo che è l'unico segnale della presenza di un controllo (input, select, bottone ghost/outline, checkbox) deve usare `border-interactive` o superiore. I bordi in alpha oro (`gold-500` all'8–34%) arrivano al massimo a 1.93:1: sono ammessi solo come ornamento, mai come confine funzionale.

**Azione**

| Token | Valore |
|---|---|
| `action-primary-bg` / `hover` / `active` | `gold-500` / `gold-400` / `gold-600` |
| `action-primary-fg` | `ink-950` |
| `action-accent-bg` / `hover` / `active` | `void-700` / `void-600` / `void-800` |
| `action-accent-fg` | `bone-50` |
| `action-ghost-bg-hover` | `#C9A2270F` |
| `action-danger-bg` / `fg` | `#A32B27` / `bone-50` |
| `action-disabled-bg` / `fg` | `ink-700` / `bone-600` |

**Stati di riga**

| Token | Valore |
|---|---|
| `state-row-hover` | `#C9A2270D` (oro 5%) |
| `state-row-selected` | `#7C5CE61A` (viola 10%) |
| `state-row-marker-hover` | `gold-500`, inset 2px a sinistra |
| `state-row-marker-selected` | `void-400`, inset 2px a sinistra |

**Feedback**

| Token | Hex | Uso testo | Fill |
|---|---|---|---|
| `success` | `#5FBF7F` | 8.71:1 ✓ | `success-dim #2E6B45` |
| `warning` | `#E0A63C` | 9.13:1 ✓ | `warning-dim #6B4E14` |
| `danger` | `#F07A75` | 7.30:1 ✓ | `danger-solid #A32B27` |
| `info` | `#6BBEE0` | 9.49:1 ✓ | `info-dim #22505F` |

### 2.4 Regole d'uso del colore

- **L'oro non è mai il colore di un link.** I link sono `void-400`. L'oro su testo significa "questo è Rare / Radiant / brand".
- **Un solo bottone `gold-500` per vista.** L'azione primaria è unica (tipicamente "Cerca" o "Apri su Warframe Market").
- **Il rosso non compare mai su un prezzo.** Un prezzo alto non è un errore. Le variazioni di prezzo usano `success`/`danger` solo sulla freccia delta, non sul numero.
- **Nessuna informazione affidata al solo colore.** Rarità = pallino + testo; refinement = opacità + testo; delta prezzo = colore + freccia + segno.
- **Alpha solo su nero.** I veli (`#C9A2270D`, `#7C5CE61A`) sono calibrati su `surface-0/1`. Su `surface-3/4` usare il token di superficie superiore, non sovrapporre altro velo.

### 2.5 Tabella dei contrasti verificati

Calcolati con la formula WCAG 2.x relative luminance. `s0…s4` = `surface-0…surface-4`.

| Colore | Hex | s0 | s1 | s2 | s3 | s4 | Verdetto |
|---|---|---|---|---|---|---|---|
| fg-primary | `#F2EDE3` | 16.96 | 16.05 | 15.18 | 13.92 | 12.73 | AAA ovunque |
| fg-secondary | `#B9B1A2` | 9.30 | 8.80 | 8.33 | 7.64 | 6.98 | AAA ovunque |
| fg-muted | `#9A9280` | 6.41 | 6.06 | 5.73 | 5.26 | 4.81 | AA ovunque |
| fg-brand `gold-300` | `#E3B341` | 10.17 | 9.62 | 9.10 | 8.35 | 7.63 | AAA ovunque |
| gold-500 | `#C9A227` | 8.18 | 7.74 | 7.32 | 6.71 | 6.14 | AAA ovunque |
| fg-accent `void-400` | `#9B82F0` | 6.45 | 6.10 | 5.77 | 5.29 | 4.84 | AA ovunque |
| void-500 | `#7C5CE6` | 4.27 | 4.04 | 3.82 | 3.50 | 3.20 | **solo non-testo** |
| rarity-common | `#C97F3E` | 6.21 | 5.87 | 5.56 | 5.10 | 4.66 | AA ovunque |
| rarity-uncommon | `#B8BFC7` | 10.66 | 10.09 | 9.55 | 8.75 | 8.00 | AAA ovunque |
| rarity-rare | `#E3B341` | 10.17 | 9.62 | 9.10 | 8.35 | 7.63 | AAA ovunque |
| success | `#5FBF7F` | 8.71 | 8.24 | 7.80 | 7.15 | 6.54 | AAA ovunque |
| warning | `#E0A63C` | 9.13 | 8.64 | 8.17 | 7.49 | 6.85 | AAA ovunque |
| danger | `#F07A75` | 7.30 | 6.91 | 6.53 | 5.99 | 5.48 | AA ovunque |
| info | `#6BBEE0` | 9.49 | 8.97 | 8.49 | 7.79 | 7.12 | AAA ovunque |
| platinum | `#B8C9D9` | 11.68 | 11.05 | 10.46 | 9.59 | 8.77 | AAA ovunque |
| ducat | `#D9B87A` | 10.45 | 9.88 | 9.35 | 8.58 | 7.84 | AAA ovunque |
| border-interactive | `#8A7423` | 4.34 | 4.10 | 3.88 | 3.56 | 3.26 | ≥3:1 non-testo ✓ |
| border-emphasis | `#A08428` | 5.49 | 5.19 | 4.91 | 4.51 | 4.12 | ≥3:1 non-testo ✓ |

**Testo su fill**

| Fill | Testo | Ratio | Verdetto |
|---|---|---|---|
| `gold-500 #C9A227` | `ink-950` | 8.18 | AAA |
| `gold-300 #E3B341` | `ink-950` | 10.17 | AAA |
| `void-700 #4E2FBF` | `bone-50` | 7.25 | AAA |
| `void-500 #7C5CE6` | `ink-950` | 4.27 | ✗ vietato |
| `void-500 #7C5CE6` | `bone-50` | 3.97 | ✗ vietato |
| tier chip (tutti) | `ink-950` | 7.94–9.49 | AAA |

**Valori sotto soglia da non usare mai come testo**: `void-500`, `#A6642E` (bronzo originale, 4.23), `#8A8271` (muted originale, 3.90 su s4), `#E5544F` (danger originale, 4.04 su s4).

---

## 3. Elevazione

Cinque livelli. Nessuna `box-shadow`: con `clip-path` verrebbe ritagliata. La profondità è **superficie + intensità del bordo**.

| Livello | Superficie | Bordo | Uso |
|---|---|---|---|
| `e0` | `surface-0` | nessuno | Canvas |
| `e1` | `surface-1` | `border-subtle` | Pannelli, corpo tabella, sidebar |
| `e2` | `surface-2` | `border-default` | Card, header tabella, input |
| `e3` | `surface-3` | `border-strong` | Popover, tooltip, hover di card |
| `e4` | `surface-4` | `border-emphasis` + scrim sul contenuto sottostante | Dialog, dropdown, command palette |

**Unica eccezione ammessa**: i layer flottanti `e3` e `e4` possono aggiungere `filter: drop-shadow(0 2px 6px rgb(0 0 0 / .5)) drop-shadow(0 8px 24px rgb(0 0 0 / .4))`. `drop-shadow` segue il `clip-path`, `box-shadow` no. Va applicato al wrapper `.o-frame`, non all'elemento clippato interno, altrimenti l'ombra viene disegnata due volte.

---

## 4. Geometria Orokin

### 4.1 Regola di scoping (vincolante)

`border-radius` è **0 ovunque**, tranne pallini/avatar/spinner (`9999px`). La silhouette la fa il `clip-path`.

| Elemento | Clip |
|---|---|
| Panel, card, dialog, drawer, sheet | ✅ `clip-orokin`, notch `lg` |
| Button, input, select, textarea | ✅ `clip-orokin`, notch `sm` |
| Chip, badge, tag, tier chip | ✅ `clip-octagon`, notch `xs` |
| Tooltip, popover, dropdown | ✅ `clip-orokin`, notch `sm` |
| Tab attivo, toast | ✅ `clip-orokin`, notch `sm` |
| **`tr`, `td`, `li`, divider, avatar, skeleton di riga** | ❌ **mai** |
| Immagini, icone | ❌ mai |

**Perché.** Clippare 200 righe di tabella significa 200 layer compositati con cornice a pseudo-elemento: repaint costoso, virtualizzazione a scatti e — peggio — l'anello di focus tagliato via sulla riga selezionata. Il wrapper della tabella porta il clip; le righe restano rettangolari e si distinguono con divider e fill.

### 4.2 Scala del notch

| Token | Valore | Applicazione |
|---|---|---|
| `notch-xs` | 4px | Chip, badge, tag |
| `notch-sm` | 6px | Bottoni, input, tab, tooltip, toast |
| `notch-md` | 10px | Card, popover, pannelli piccoli |
| `notch-lg` | 16px | Pannello dettaglio, sidebar, sezioni |
| `notch-xl` | 24px | Hero, dialog grandi, empty state a piena pagina |

Regola: il notch non supera mai **1/3 del lato corto** dell'elemento. Su un bottone alto 32px il massimo è `notch-md`; oltre, l'angolo mangia il testo.

### 4.3 Le tre forme

```
clip-orokin           clip-orokin-inverse       clip-octagon
(TL + BR tagliati)    (TR + BL tagliati)        (4 angoli tagliati)

  ╱────────────┐        ┌────────────╲            ╱──────────╲
 │             │        │             │          │            │
 │             │        │             │          │            │
 └────────────╱         ╲────────────┘            ╲──────────╱
```

- `clip-orokin` è la silhouette **di default**. Direzione della diagonale sempre la stessa in tutta l'app: alto-sinistra e basso-destra.
- `clip-orokin-inverse` solo per la metà speculare di un layout diviso (es. pannello dettaglio a destra affiancato alla tabella), così le due diagonali si guardano.
- `clip-octagon` solo per elementi piccoli e autonomi (chip, badge).

Implementazione in `globals.css`, utility `.clip-orokin`, `.clip-orokin-inverse`, `.clip-octagon`, profondità via `.notch-xs … .notch-xl`.

### 4.4 Bordi su superfici clippate

`border` e `outline` vengono ritagliati dal `clip-path`. L'unica tecnica corretta è la **doppia superficie**: un wrapper che *è* il bordo, e un figlio inset di 1px che porta la superficie reale.

```html
<div class="o-frame notch-lg">
  <div class="o-frame-inner">…contenuto…</div>
</div>
```

```css
.o-frame        { padding: 1px; background: var(--frame-color); clip-path: …notch…; }
.o-frame-inner  { background: var(--color-surface-1); clip-path: …notch − 1px…; }
```

Il notch interno è `notch − frame-width`: senza questa sottrazione lo spessore del bordo lungo la diagonale risulta ~1.41× più sottile che sui lati dritti.

**Cornice gilded** (`.o-frame--gilded`): il bordo è un gradiente a 135° che concentra l'oro sui due angoli tagliati e sfuma a `border-default` al centro. È l'inlay Orokin. Usarla su: pannello dettaglio, dialog, card di reliquia Radiant. Non su input o bottoni.

### 4.5 Ornamenti

- **Divider Orokin**: linea 1px `border-strong` con un rombo 6×6 `gold-700` centrato, interrotta di 12px per lato attorno al rombo. Solo tra sezioni maggiori, max 2 per vista.
- **Angolo inciso**: sui pannelli `e1` un tratto 1px `gold-800` lungo 24px che segue il taglio del notch, in alto a sinistra. Puramente decorativo.
- Nessun altro ornamento. Niente pattern di sfondo, niente texture: competono con le tabelle.

---

## 5. Tipografia

### 5.1 Famiglie

| Ruolo | Famiglia | Pesi | Note |
|---|---|---|---|
| Display | `Cinzel` | 400, 600, 700 | Titoli, nomi di reliquia in dettaglio, numeri hero. Fallback `Georgia`, `Times New Roman`, `serif` |
| UI | `Inter` (variable) | 400, 500, 600, 700 | Tutto il resto |
| Dati | `Inter` + `tabular-nums` | 400, 500, 600 | Prezzi, percentuali, quantità |

Caricamento: `woff2` self-hosted, `font-display: swap`. Nessuna richiesta di rete: niente CDN di font, quindi il sistema rende identico offline, dietro un proxy che blocca, e in giurisdizioni dove servire font da terze parti è un problema di privacy.

| Famiglia | Pesi | Subset | Peso file |
|---|---|---|---|
| Cinzel | 400, 600, 700 (tre file statici) | `latin` | 3 × 25 KB |
| Inter | variable 400–700 (un file) | `latin`, `latin-ext` | 47 + 83 KB |

Cinzel non carica `latin-ext`: imposta solo i titoli, e i nomi delle reliquie sono ASCII. Inter lo carica perché rende tutto il resto, incluso quello che l'utente digita. Non caricare la variable completa di Cinzel — sono 4 pesi inutilizzati.

I font restano file separati, **mai inlinati in base64**: 206 KB di data URI dentro un foglio di stile render-blocking ritarderebbero il primo paint di ogni pagina. Come file si scaricano in parallelo e `font-display: swap` dipinge subito con il fallback.

Cinzel è tutto-maiuscolo per costruzione: **non applicare mai `text-transform: uppercase`** sopra (raddoppierebbe la spaziatura ottica) e non usarlo mai sotto i 18px.

### 5.2 Scala

| Token | Size / LH | Famiglia | Peso | Tracking | Uso |
|---|---|---|---|---|---|
| `display-xl` | 48 / 1.05 | Cinzel | 600 | +0.01em | Hero, titolo landing |
| `display-lg` | 36 / 1.10 | Cinzel | 600 | +0.01em | Titolo di pagina |
| `display-md` | 28 / 1.15 | Cinzel | 600 | +0.01em | Nome reliquia nel detail panel |
| `display-sm` | 22 / 1.20 | Cinzel | 600 | +0.01em | Titolo di dialog, titolo di sezione |
| `heading-lg` | 18 / 1.30 | Inter | 600 | 0 | Titolo di card |
| `heading-md` | 16 / 1.40 | Inter | 600 | 0 | Sottosezione |
| `heading-sm` | 14 / 1.40 | Inter | 600 | 0 | Titolo inline, label forte |
| `body-lg` | 16 / 1.60 | Inter | 400 | 0 | Testo introduttivo |
| `body-md` | 15 / 1.55 | Inter | 400 | 0 | **Default del corpo** |
| `body-sm` | 13 / 1.50 | Inter | 400 | 0 | **Celle di tabella**, testo secondario |
| `caption` | 12 / 1.40 | Inter | 400 | 0 | Nota, timestamp, helper |
| `overline` | 11 / 1.20 | Inter | 600 | +0.12em | Header di colonna, eyebrow. `uppercase` |
| `data-lg` | 20 / 1.20 | Inter tnum | 600 | 0 | Prezzo in evidenza |
| `data-md` | 14 / 1.20 | Inter tnum | 500 | 0 | Prezzo in tabella |
| `data-sm` | 13 / 1.20 | Inter tnum | 400 | 0 | Percentuale di drop |

Massimo 3 livelli tipografici distinti per vista, oltre a corpo e dati.

### 5.3 Regole sui numeri

- Ogni numero allineato in colonna usa `font-variant-numeric: tabular-nums` e `text-align: right`. Senza tabular-nums le cifre di larghezza diversa fanno ballare la colonna dei prezzi.
- Prezzi platinum: intero, nessun decimale, suffisso `p` in `fg-muted` a `caption`, spazio sottile prima → `45 p`.
- Percentuali di drop: due decimali, sempre — `25.33%`, `11.00%`, `2.00%`. Warframe pubblica questi valori con 2 decimali; troncarli fa perdere la corrispondenza con la tabella ufficiale.
- Quantità e conteggi: separatore migliaia `.` (locale IT) via `Intl.NumberFormat`.
- Delta prezzo: segno esplicito + freccia + colore → `▲ +12%` in `success`, `▼ −8%` in `danger`.
- Mai numeri in Cinzel sotto i 20px: i numerali lapidari a corpo piccolo sono illeggibili.

### 5.4 Testo

- Lunghezza massima di riga per prosa: `72ch`.
- Nomi di item (`Volt Prime Neuroptics`) non vanno mai troncati a metà parola: `text-overflow: ellipsis` sull'ultima parola intera, con `title` attributo per il valore completo.
- Nessun `text-transform: uppercase` fuori da `overline` e chip tier.

---

## 6. Spazio e layout

### 6.1 Scala di spaziatura

Base 4px. Non usare valori fuori scala.

| Token | px | Uso tipico |
|---|---|---|
| `1` | 4 | Gap icona↔testo dentro un chip |
| `2` | 8 | Gap icona↔testo, padding verticale chip |
| `3` | 12 | Padding orizzontale di cella, gap tra chip |
| `4` | 16 | Padding di card, gap tra campi |
| `5` | 20 | — |
| `6` | 24 | Padding di pannello, gap tra gruppi |
| `8` | 32 | Gap tra sezioni |
| `10` | 40 | — |
| `12` | 48 | Margine di sezione maggiore |
| `16` | 64 | Padding verticale di pagina |
| `20` / `24` | 80 / 96 | Empty state, hero |

### 6.2 Griglia e layout

- Container max: **1600px**, centrato, padding laterale 24px (≥1280px) / 16px (sotto).
- Griglia interna: 12 colonne, gutter 24px.
- Shell desktop a tre zone:

```
┌──────────────────────────────────────────────────────────────┐
│ Topbar 56px — logo · search · azioni                         │
├────────────┬────────────────────────────┬────────────────────┤
│ Sidebar    │ Risultati (flex, min 640)  │ Detail panel       │
│ 260px      │ tabella densa              │ 380px  ← sticky    │
│ filtri     │ righe 40px                 │ clip-orokin-inverse│
└────────────┴────────────────────────────┴────────────────────┘
```

- Sidebar `260px`, collassabile a `56px` (solo icone) sotto 1440px.
- Detail panel `380px` fisso, `position: sticky; top: 56px`, altezza `calc(100dvh - 56px)`, scroll interno indipendente.
- Gap tra le zone: 1px di `border-subtle`, non spazio bianco. La densità è il punto.

### 6.3 Breakpoint e degradazione

| BP | Larghezza | Comportamento |
|---|---|---|
| `2xl` | ≥1536 | Layout pieno, sidebar espansa |
| `xl` | ≥1280 | Layout pieno, sidebar collassata a icone |
| `lg` | ≥1024 | Detail panel diventa **overlay drawer** da destra (`420px`), tabella a piena larghezza |
| `md` | ≥768 | Tabella riduce a 4 colonne: tier, reliquia, drop migliore, prezzo |
| `sm` | <768 | Tabella → **lista di card**. Una card per reliquia: header tier + nome, 6 righe drop, footer prezzo |

Sotto `lg` i target touch salgono a 44×44px minimi; le righe passano a `row-comfortable` 48px.

---

## 7. Dimensioni dei controlli

| Token | Altezza | Padding X | Font | Icona | Notch |
|---|---|---|---|---|---|
| `control-xs` | 24px | 8px | `caption` | 16px | `xs` |
| `control-sm` | 32px | 12px | `body-sm` | 16px | `sm` |
| `control-md` | 40px | 16px | `body-md` | 20px | `sm` |
| `control-lg` | 48px | 20px | `body-lg` | 24px | `md` |

Default: `control-md`. Nelle toolbar dense: `control-sm`. Icon-button: quadrato della stessa altezza.

Righe tabella: `row-compact` 32px, `row` 40px (**default**), `row-comfortable` 48px.

---

## 8. Motion

### 8.1 Token

| Token | Valore | Uso |
|---|---|---|
| `dur-instant` | 80ms | Cambio colore di icona, pressed |
| `dur-fast` | 120ms | Hover, focus, fill di riga |
| `dur-base` | 180ms | Enter/exit di popover, tab, accordion |
| `dur-slow` | 280ms | Drawer, dialog |
| `dur-sweep` | 420ms | Firma: apertura del detail panel |
| `dur-pulse` | 2400ms | Firma: pulsazione Radiant |
| `stagger` | 40ms | Firma: cascata sulle righe di drop |

| Easing | Curva | Uso |
|---|---|---|
| `standard` | `cubic-bezier(.2,.8,.2,1)` | Default per transizioni di stato |
| `enter` | `cubic-bezier(0,.6,.3,1)` | Elementi che entrano |
| `exit` | `cubic-bezier(.4,0,1,1)` | Elementi che escono |
| `orokin` | `cubic-bezier(.16,1,.3,1)` | Solo per le tre firme |

### 8.2 Le tre firme

1. **Sweep del detail panel** — all'apertura il pannello si rivela da sinistra a destra con `clip-path: inset(0 100% 0 0)` → `inset(0)`, traslazione 16px, 420ms `orokin`. Effetto: il contenuto sembra "materializzarsi" nel telaio, non scivolarci dentro.
2. **Radiant pulse** — solo il chip di una reliquia Radiant: `drop-shadow(0 0 6px #C9A22766)` che va e viene su 2400ms. Mai più di un elemento pulsante per vista. Se la lista contiene 30 reliquie Radiant, la pulsazione va **solo** sulla riga selezionata.
3. **Stagger dei drop** — le 6 righe di drop di una reliquia entrano con `o-rise` (6px + fade, 180ms) sfalsate di 40ms. Cap a 6: l'ultima parte a 200ms, ancora percepita come simultanea. Non applicare mai a liste di lunghezza variabile — su 40 righe l'ultima arriverebbe a 1.6s.

### 8.3 Regole

- Nessuna transizione su `width`, `height`, `top/left`. Solo `opacity`, `transform`, `background-color`, `clip-path`, `filter`.
- Nessuna animazione infinita oltre a `radiant` e agli skeleton.
- Skeleton: shimmer 1400ms lineare, mai più di 2s totali prima di mostrare uno stato di errore o vuoto.
- `prefers-reduced-motion: reduce` → sweep, radiant, stagger e shimmer **disattivati** (non solo accorciati); ogni altra transizione forzata a 120ms. Già implementato in `globals.css`.

---

## 9. Iconografia

### 9.1 Set UI — Lucide

- `lucide-react`, `stroke-width: 1.5`, `currentColor`, viewBox 24.
- Dimensioni: `16` (inline nel testo), **`20` (default)**, `24` (azioni primarie, empty state).
- Allineamento: icona e testo su baseline ottica, gap `space-2` (8px).
- Un'icona da sola è un controllo solo se ha `aria-label`.

Mappa canonica:

| Concetto | Icona |
|---|---|
| Cerca | `search` |
| Filtra | `sliders-horizontal` |
| Ordina | `arrow-up-down` |
| Link esterno / Market | `external-link` |
| Preferito / wishlist | `star` |
| Inventario | `package` |
| Storico prezzi | `trending-up` |
| Notifica prezzo | `bell` |
| Copia | `copy` |
| Chiudi | `x` |
| Info | `info` |
| Errore | `alert-triangle` |
| Nessun risultato | `search-x` |

### 9.2 Glifi custom

10 SVG proprietari, viewBox 24, `fill: currentColor`, nessuno stroke, ottimizzati per 16–24px.

| Glifo | Forma | Uso |
|---|---|---|
| `tier-lith` | Rombo singolo | Chip Lith |
| `tier-meso` | Rombo doppio verticale | Chip Meso |
| `tier-neo` | Rombo triplo a triangolo | Chip Neo |
| `tier-axi` | Rombo quadruplo a losanga | Chip Axi |
| `rarity-common` | Cerchio vuoto | Colonna drop |
| `rarity-uncommon` | Cerchio semipieno | Colonna drop |
| `rarity-rare` | Cerchio pieno con alone | Colonna drop |
| `platinum` | Sfaccettatura a 6 lati | Prezzi |
| `ducat` | Toroide Orokin | Valore ducati |
| `void-sigil` | Sigillo ottagonale | Logo, empty state, loader |

I glifi tier crescono in numero di rombi con l'era: il conteggio è un secondo canale, indipendente dal colore.

### 9.3 Immagini

- Le immagini di item da Warframe Market/wiki: contenitore `clip-orokin notch-sm`, `object-fit: contain`, sfondo `surface-2`.
- Placeholder durante il caricamento: `o-skeleton`, stesse dimensioni, nessun layout shift (`aspect-ratio` sempre dichiarato).
- Nessuna arte a piena bleed dietro il testo.

---

## 10. Componenti

Ogni componente elenca: anatomia, dimensioni, stati. Gli stati non elencati non esistono.

### 10.1 Button

Varianti: `primary`, `accent`, `outline`, `ghost`, `danger`.

| Variante | Fill | Testo | Bordo |
|---|---|---|---|
| `primary` | `gold-500` → hover `gold-400` → active `gold-600` | `ink-950` | nessuno |
| `accent` | `void-700` → `void-600` → `void-800` | `bone-50` | nessuno |
| `outline` | trasparente → hover `#C9A2270F` | `fg-primary` | 1px `border-interactive` → hover `border-emphasis` |
| `ghost` | trasparente → hover `#C9A2270F` | `fg-secondary` → hover `fg-primary` | nessuno |
| `danger` | `#A32B27` → hover `#C0332E` | `bone-50` | nessuno |

- Geometria: `clip-orokin`, `notch-sm` (`notch-xs` su `control-xs`).
- Tipografia: `body-md` peso 600. Nessun uppercase.
- Icona a sinistra del testo, gap 8px. Icon-only: quadrato, `aria-label` obbligatorio.
- **Disabled**: `action-disabled-bg` + `action-disabled-fg`, `cursor: not-allowed`, `aria-disabled="true"`. Mai `opacity` sull'intero bottone (spegne anche il bordo sotto soglia).
- **Loading**: spinner 16px al posto dell'icona, testo invariato, `aria-busy="true"`, larghezza congelata.
- **Focus**: frame a 2px `border-focus` (vedi §12).
- Un solo `primary` per vista.

### 10.2 Input / Search

- Altezza `control-md` 40px (`control-lg` 48px per la search principale).
- Superficie `surface-2`, bordo 1px `border-interactive`, `clip-orokin notch-sm`.
- Placeholder `fg-muted`. Testo `fg-primary` `body-md`.
- Icona leading 20px `fg-muted`; clear-button trailing quando c'è valore.
- Hover: bordo `border-emphasis`. Focus: frame 2px `border-focus`.
- Errore: bordo `danger`, messaggio sotto in `caption` `danger`, `aria-invalid="true"`, `aria-describedby` al messaggio.
- La search principale è larga `640px` max, centrata nella topbar, con `⌘K` come hint in un chip `fg-muted` a destra.

### 10.3 Chip / Badge

| Tipo | Geometria | Fill | Testo | Altezza |
|---|---|---|---|---|
| Tier | `clip-octagon notch-xs` | colore tier (opacità da refinement) | `ink-950` | 20px |
| Rarità | nessuna (pallino 8px + testo) | — | colore rarità | inline |
| Filtro attivo | `clip-octagon notch-xs` | `#7C5CE61A` | `void-400` | 24px |
| Conteggio | `clip-octagon notch-xs` | `surface-3` | `fg-secondary` | 20px |

Chip tier: padding X 8px, `overline` 11px 600 uppercase tracking 0.12em, glifo tier 12px a sinistra.

### 10.4 Table (densa)

Struttura di colonna canonica per i risultati di ricerca:

| Colonna | Larghezza | Allineamento | Tipografia |
|---|---|---|---|
| Tier | 88px | left | chip |
| Reliquia | 160px | left | `body-sm` 500 |
| Item | `1fr` (min 200px) | left | `body-sm` |
| Rarità | 110px | left | pallino + `body-sm` |
| Drop % | 72px | right | `data-sm` tnum |
| Prezzo | 96px | right | `data-md` tnum, `currency-platinum` |
| Azione | 40px | center | icon-button ghost |

- Header: 36px, sticky **`top: 0`**, `surface-2`, `overline`, bordo inferiore 1px `border-default`.

> **Trappola.** Il wrapper della tabella ha `overflow-x: auto`, e questo lo rende un contenitore di scroll: lo sticky degli header si ancora a *quel* contenitore, non al viewport. Un offset diverso da `0` (per esempio `56px` per "scendere sotto la topbar") spinge l'header dentro il contenitore e lo fa sovrapporre alle prime righe. L'offset della topbar va gestito dal layout della shell, mai dal `top` degli header.
- Riga: 40px, `body-sm`, divider 1px `border-subtle`, padding X 12px.
- Hover: fill `#C9A2270D` + marker `inset 2px 0 0 gold-500` sulla prima cella.
- Selected: fill `#7C5CE61A` + marker `void-400`, `aria-selected="true"`.
- Zebra: **no**. Con 7 colonne e divider a 1px è rumore.
- Sort: header cliccabile, freccia 14px a destra del label, `aria-sort` corretto.
- Il wrapper porta `clip-orokin notch-lg` + `.o-frame`. Le righe non sono mai clippate.
- Oltre 100 righe: virtualizzazione, altezza di riga fissa a 40px obbligatoria.

### 10.5 Detail panel

- Larghezza `380px`, `surface-1`, `.o-frame--gilded`, `clip-orokin-inverse notch-lg` (specchia la tabella).
- Sticky sotto la topbar, scroll interno.
- Anatomia: chip tier + refinement → nome reliquia `display-md` Cinzel → meta (drop location, rotation) in `caption fg-muted` → divider Orokin → lista dei 6 drop → divider → blocco prezzi → CTA `Apri su Warframe Market` (`primary`, full width).
- Ingresso: firma sweep 420ms. Le 6 righe drop entrano con stagger 40ms.
- Vuoto (nessuna reliquia selezionata): `void-sigil` 48px `bone-500`, testo `body-sm fg-muted`, centrato.

### 10.6 Drop row

Riga interna al detail panel, 48px:

```
[img 32px] Volt Prime Neuroptics          ● Rare      25.33%     45 p
           ^body-sm fg-primary          ^gold-300   ^data-sm    ^data-md
                                                     fg-muted    platinum
```

- Il pallino di rarità è 8px, `border-radius: full`, colore rarità.
- Hover: fill `#C9A2270D`, il nome diventa link `void-400`.

### 10.7 Card reliquia (sotto `lg`)

- `surface-2`, `.o-frame`, `clip-orokin notch-md`, padding 16px.
- Header: chip tier + nome `heading-md` + prezzo `data-lg` a destra.
- Corpo: 6 drop row compatte (36px).
- Footer: `border-subtle` sopra, link Market + valore ducati.
- Radiant: `.o-frame--gilded` + pulse solo se è la card espansa.

### 10.8 Dialog

- `surface-4`, `.o-frame--gilded`, `clip-orokin notch-xl`, max-width 560px.
- Scrim `#0B0A08CC`, `backdrop-filter: blur(2px)`.
- Titolo `display-sm` Cinzel, corpo `body-md`, footer con azioni allineate a destra, gap 12px.
- Enter: `o-rise` 280ms `enter` + fade dello scrim 180ms. Exit: 180ms `exit`.
- Focus trap, `Esc` chiude, focus torna al trigger.

### 10.9 Tooltip / Popover

- Tooltip: `surface-4`, `clip-orokin notch-sm`, `caption`, padding 6px 10px, delay 400ms in / 0ms out, max-width 280px. Mai interattivo.
- Popover: `surface-3`, `.o-frame`, `clip-orokin notch-md`, padding 16px, `drop-shadow` float.

### 10.10 Toast

- `surface-4`, `.o-frame`, `clip-orokin notch-sm`, barra 2px a sinistra col colore semantico.
- Larghezza 360px, in basso a destra, stack di max 3, auto-dismiss 5s (errori: mai auto-dismiss).
- `role="status"` per info/success, `role="alert"` per warning/danger.

### 10.11 Tabs

- Altezza 36px, testo `body-sm` 500, `fg-muted` → attivo `fg-primary`.
- Attivo: fill `surface-2` + `clip-orokin notch-sm` + barra 2px `gold-500` in basso.
- Transizione della barra: 180ms `standard`.

### 10.12 Skeleton / Empty / Error

| Stato | Trattamento |
|---|---|
| Skeleton | Blocchi `surface-2`→`surface-3` shimmer 1400ms. Stessa altezza del contenuto reale. Righe di tabella: 40px, **non clippate**. Max 2s |
| Empty (nessun risultato) | `search-x` 48px `bone-500`, titolo `heading-md`, testo `body-sm fg-muted`, CTA `outline` con un suggerimento di ricerca |
| Empty (stato iniziale) | `void-sigil` 64px `gold-800`, titolo `display-sm` Cinzel, tre chip di ricerca-esempio (`Lith V9`, `Volt Prime`, `Meso B4`) |
| Error | `alert-triangle` 48px `danger`, titolo `heading-md`, messaggio tecnico in `caption fg-muted`, CTA `Riprova` `outline` |
| Offline / API down | Toast `warning` persistente + banner `warning-dim` sotto la topbar |

---

## 11. Pattern di prezzo

Warframe Market è la fonte. Il prezzo è il secondo motivo per cui l'app esiste: ha regole proprie.

- Prezzo principale: `data-md` 500 `currency-platinum`, suffisso `p` in `caption fg-muted`.
- Prezzo in evidenza (detail panel): `data-lg` 600.
- Un prezzo assente non è `0`: si mostra `—` in `fg-disabled`, mai zero.
- Freschezza: se il dato ha più di 15 minuti, timestamp in `caption fg-muted` sotto il prezzo (`aggiornato 22 min fa`). Oltre 1 ora, icona `info` con tooltip.
- Range: `12 – 18 p` con en-dash, spazi sottili.
- Delta: `▲ +12%` / `▼ −8%`, colore su freccia e percentuale, mai sul prezzo.
- Il link a Warframe Market è sempre `external-link` + `rel="noopener noreferrer"` + `target="_blank"`, con `aria-label` esplicito (`Apri Volt Prime Neuroptics su Warframe Market`).

---

## 12. Focus, stati, accessibilità

### 12.1 Focus

`outline` viene ritagliato da `clip-path`. Due meccanismi:

- **Elementi clippati** (bottoni, input, card cliccabili): stanno dentro un `.o-frame`. Su `:focus-visible` il frame passa a `padding: 2px` e `background: border-focus`. L'anello segue esattamente la silhouette notchata.
- **Elementi non clippati** (link, righe di tabella, tab): `.o-focus-ring` → `outline: 2px solid #9B82F0; outline-offset: 2px`.

L'anello è sempre `void-400` (4.84:1 minimo contro ogni superficie). Mai oro: si confonderebbe con lo stato hover.

### 12.2 Requisiti

- Contrasto testo ≥ 4.5:1 (§2.5 verifica ogni token).
- Contrasto di boundary di controlli e icone informative ≥ 3:1 → `border-interactive` in su.
- Target: 40×40px desktop, **44×44px sotto `lg`**. Icon-button in toolbar densa: 32px con area cliccabile estesa a 40px via padding.
- Nessuna informazione veicolata dal solo colore (§2.4).
- `prefers-reduced-motion` rispettato (§8.3).
- Zoom 200% senza scroll orizzontale: sotto `lg` la tabella diventa card.
- Ordine di tabulazione: topbar → search → sidebar → tabella → detail panel.
- Righe della tabella: `role="row"` navigabili con frecce ↑↓, `Enter` apre il detail panel, `Esc` deseleziona.
- Ogni aggiornamento asincrono di risultati annunciato in una live region `aria-live="polite"` (`23 reliquie trovate`).

### 12.3 Stati canonici

Ogni componente interattivo implementa esattamente: `default`, `hover`, `focus-visible`, `active`, `disabled`, e dove pertinente `loading`, `selected`, `error`.

---

## 13. Convenzioni dei token

- Formato: `{categoria}-{scala|ruolo}-{variante}` → `gold-500`, `fg-muted`, `action-primary-bg-hover`.
- Nei componenti si usano **solo token semantici**. `bg-gold-500` in un componente è un errore di review; il token corretto è `bg-action-primary`.
- I token di dominio (`tier-*`, `rarity-*`, `currency-*`) sono l'eccezione: mappano concetti di gioco, non ruoli UI, e si usano direttamente.
- Nuovo colore = prima si verifica il contrasto contro `surface-0…4`, poi si aggiunge a `tokens.json`, poi a `globals.css`, poi alla tabella §2.5. In quest'ordine.
- `tokens.json` è la sorgente. `globals.css` e `tailwind.config.ts` sono generabili da lì con Style Dictionary.

---

## 14. Do / Don't

| ✅ | ❌ |
|---|---|
| `clip-path` su pannelli, card, bottoni, chip | `clip-path` su `tr`, `td`, `li`, avatar |
| Bordo con la tecnica `.o-frame` a doppia superficie | `border` o `outline` diretti su elemento clippato |
| Elevazione con superficie + bordo | `box-shadow` (viene ritagliata) |
| Oro per Rare, Radiant, brand, azione primaria | Oro per i link |
| `void-700` come fill con testo | `void-500` come fill con testo (3.97:1) |
| Rarità = pallino + testo | Rarità = solo colore |
| `tabular-nums` su ogni colonna numerica | Cifre proporzionali nei prezzi |
| Cinzel ≥18px, mai uppercase sopra | Cinzel a 13px in una cella |
| Un `primary` per vista | Tre bottoni oro affiancati |
| Un elemento Radiant pulsante per vista | 30 righe che pulsano insieme |
| `—` per prezzo mancante | `0 p` per prezzo mancante |
| Sotto `lg`: tabella → card | Scroll orizzontale della tabella su mobile |
