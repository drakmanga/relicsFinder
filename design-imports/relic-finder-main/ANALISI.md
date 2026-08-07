# Relic Finder — Main Screen (import da Claude Design)

Ricognizione del 2026-08-07. **Niente ancora implementato.**

Sorgente canonica: progetto `82b30910-ffd9-4ff8-987b-1d568f7e1fd1`,
`templates/relic-finder-main/RelicFinderMain.dc.html`. Il file non è copiato qui
di proposito — è 20 KB di markup e trascriverlo a mano introdurrebbe errori
silenziosi. Si rilegge con `DesignSync(get_file)` al momento di implementare.

In questa cartella:

- `support.js` — runtime DC generato (67 KB, "do not edit"). Parsa `<x-dc>`,
  `x-import`, `sc-for` e i binding `{{ }}`, e monta la classe `DCLogic`. È lo
  shim di anteprima di Claude Design: **l'app vera non lo userà**.
- `ds-base.js` — 15 righe che iniettano `fonts/fonts.css`, `_ds_bundle.css`,
  `styles.css` e `_ds_bundle.js` da `../..`. Serve solo dentro il progetto
  Design; nell'app i componenti arrivano da `import` normali.

## Cosa ha prodotto

Una schermata sola, con dentro più di quanto avessi chiesto.

**Struttura**

| Zona | Contenuto |
|---|---|
| Topbar 56px sticky | wordmark, nav `Relics` / `Prime Items`, bottone `Wishlist · N` |
| Barra ricerca | `Input` con icona lente, toggle `Filters ▾` nello slot trailing, chip contatore risultati |
| Barra filtri collassabile | 4 gruppi affiancati: Tier, Rarity, Refinement, Max price (slider 0–500) |
| Main | due viste alternative (`Relics` / `Prime Items`), ognuna una `Table` densa |
| Pannello destro 380px | alterna `detail` e `wishlist`, entrambi dentro `DetailPanel` |
| Sezione in fondo | i 4 stati: initial, no results, API error, loading |

**Logica** — `DCLogic` con stato reale, non mockup statico:

- Filtri toggle per tier/rarità/refinement, slider prezzo.
- Ordinamento su Drop % e Prezzo con inversione della direzione.
- Selezione riga → aggiorna il pannello dettaglio.
- Wishlist con stepper `− qty +` su ogni riga di entrambe le tabelle e nel
  pannello; quantità a 0 rimuove la voce; totale e conteggio "sotto target".
- **Slider di raffinazione che ricalcola le percentuali di drop.** La tabella
  `traceRows` contiene i valori veri di Warframe: Intact 25.33/11/2 →
  Radiant 16.67/20/10, con il costo in void traces (0/25/50/100). Non se l'è
  inventato: sono i numeri corretti.

## Da decidere prima di implementare

1. **La lingua è cambiata in inglese.** Il prompt era in italiano, l'output è
   tutto in inglese (`Search for a relic`, `results`, `Wishlist`). Va deciso se
   l'app è in italiano, in inglese, o localizzata.
2. **I filtri non sono nella sidebar.** Il prompt chiedeva una sidebar 260px;
   ha fatto una barra orizzontale collassabile sotto la ricerca. Per una
   tabella densa è probabilmente meglio — restituisce larghezza ai dati — ma è
   una deviazione dalla spec §6.2, che va aggiornata o rifiutata.
3. **Scope cresciuto.** La vista `Prime Items` e tutta la wishlist con gli
   stepper non erano richieste. Sono feature in roadmap, quindi utili, ma sono
   decisioni di prodotto prese dall'agente.

## Difetti trovati

- **Bug reale**: le etichette sotto lo slider di raffinazione rendono come
  `IntactExcept.FlawlessRadiant` — un'unica stringa senza separazione. Sono
  quattro testi in un solo nodo dentro un `justify-content:space-between`, che
  quindi non ha niente da distribuire.
- **`Tabs` non è stato usato.** La navigazione `Relics` / `Prime Items` è fatta
  con bottoni custom `.rf-nav`. È esattamente il caso d'uso di `Tabs`: o si usa
  il componente, o `Tabs` va ripensato perché evidentemente non convinceva.
- **Il template combatte il design system in due punti**, ed entrambi sono
  segnali che il DS non calzava:
  - `.rf-droprow-rarity` riespande le etichette abbreviate con
    `font-size:0` + `::after{content:"Uncommon"}`. Ha aggirato l'abbreviazione
    che avevo introdotto per far stare i nomi nel pannello a 380px.
  - `.rf-view thead th{padding:15px 0}` sovrascrive l'altezza header di 36px
    fissata dalla spec §10.4.
- **Componente mancante nel DS**: il toggle filtro `.rf-tog` (superficie,
  bordo, stato `on` via opacità) è scritto a mano nel template. Se resta,
  merita di diventare un componente vero.
- `resultCount` è hardcoded a 23 nella vista relics.

## Cosa significa implementare

Il `.dc.html` **non** è codice dell'app: è un template del runtime di Claude
Design. Implementarlo significa tradurre markup e `DCLogic` in React vero che
importa `relic-finder-ui`, dentro un frontend che oggi non esiste — il repo
remoto ha ancora `relic-finder.html` statico servito da Spring Boot.

Ordine sensato quando ci si mette:
1. Scaffold del frontend React (Vite) collegato al backend Spring Boot.
2. Traduzione della schermata, componente per componente.
3. Sostituzione dei dati finti con le chiamate reali all'API Warframe Market.
