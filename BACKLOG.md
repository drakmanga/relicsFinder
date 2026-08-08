# Backlog — dallo scaffold alla schermata di Claude Design

Aperto il 2026-08-07 su revisione dell'utente.

**Stato al 2026-08-07 sera**: fatti §1, §2, §3, §4, §5, §7 e §6.1, §6.2, §6.3,
§6.6, §6.7.

Resta fuori solo **§6.5 (wishlist lato server)**, che richiede un concetto di utente — decisione
architetturale che il progetto non ha preso. Riferimento visivo:
`design-imports/relic-finder-main/target-screenshot.png`. Sorgente autorevole:
`templates/relic-finder-main/RelicFinderMain.dc.html` nel progetto Claude Design
`82b30910-ffd9-4ff8-987b-1d568f7e1fd1`.

Oggi `apps/web` ha ricerca, filtri, tabella a granularità item con prezzi reali
e ordinamento, e un pannello dettaglio con i luoghi di drop. Mancano wishlist,
navigazione e vista Prime Items.

---

## 1. ~~Tabella a granularità item~~ — FATTO

Nello scaffold ogni riga è **una reliquia**. Nel target ogni riga è una coppia
**reliquia × item**: `Axi A2 / Odonata Prime Systems`, `Lith V9 / Volt Prime
Neuroptics`. Colonne del target:

```
TIER | RELIC | ITEM | RARITY | DROP % ⇅ | PRICE ⇅ | WISHLIST | MARKET
```

Va rifatta prima di ogni altra cosa, perché wishlist, prezzo e ordinamento
vivono tutti sulla riga-item.

**Volumi**: 4134 righe. ~~Serve virtualizzazione~~ — **fatta** con
`@tanstack/react-virtual`: tutte le righe sono raggiungibili, ~29 nel DOM. Il
batch dei prezzi segue la finestra visibile con 400ms di debounce, altrimenti
scorrere farebbe partire una richiesta per frame.

## 2. ~~Filtri~~ — FATTO

Barra orizzontale collassabile sotto la ricerca, aperta di default, quattro
gruppi separati da un bordo verticale:

| Gruppo | Controllo | Stato nel target |
|---|---|---|
| TIER | 5 `TierChip` come toggle | Neo e Requiem spenti (opacità ridotta) |
| RARITY | 3 `RarityTag` come toggle | Common spento |
| REFINEMENT | 4 etichette testuali maiuscole | solo Radiant acceso, bordo oro |
| MAX PRICE | slider oro 0–500 + valore `375 p` + glifo platinum | — |

Il toggle `Filters ▴/▾` sta **dentro lo slot `trailing` dell'`Input`**, non
accanto. È un `Button` variant `accent` quando aperto, `ghost` quando chiuso.

Il pattern toggle (superficie, bordo, opacità come stato on/off) **non esiste
nel design system** — nel template di Claude Design è CSS scritto a mano
(`.rf-tog`). Va deciso se diventa un componente vero o resta locale all'app.

## 3. ~~Wishlist~~ — FATTO (senza delta)

Due parti.

**Nella tabella**: colonna `WISHLIST` con stepper `− N +`, più una `×` che
compare solo quando la quantità è maggiore di zero. La quantità a zero è in
`fg-disabled`. Ogni click deve fermare la propagazione, altrimenti seleziona
anche la riga.

**Nel pannello destro**: la wishlist sostituisce il dettaglio, non ci convive.
Il bottone `Wishlist · N` in topbar alterna i due. Contenuto:

- chip `N items`, titolo `WISHLIST` in Cinzel, meta `Prices updated N minutes ago`
- una riga per voce: tier chip, nome item troncato, prezzo + glifo + delta
  (verde `▲ +6%`, rosso `▼ −3%`), stepper, `×`, link market
- `LIST TOTAL 247 p` e `UNDER TARGET 2 / 3`
- bottone primario oro `Open the list on Warframe Market`

**Persistenza**: nessun endpoint. Va su `localStorage`, con una chiave versionata
per poter migrare quando il backend la esporrà.

**Non implementato**: il delta `▲ +12%` (serve lo storico prezzi, §6.4) e
`UNDER TARGET`, che implica un prezzo obiettivo per voce — nel mock è finto
(`target` nello stato del template) e va deciso se lo imposta l'utente. Al loro
posto il pannello segnala quanti item non sono quotati, così il totale non
finge che valgano zero.

## 4. ~~Navigazione e vista Prime Items~~ — FATTO

Fatto con il componente `Tabs` del design system, non con bottoni custom come
nel template di Claude Design.

Vista Prime Items: una riga per pezzo invece che per coppia reliquia × pezzo —
552 righe contro 4134. Costruita dai soli stati Intact, altrimenti ogni reliquia
verrebbe contata quattro volte fra le fonti.

## 5. Differenze grafiche minori rispetto al target

- Riga selezionata: fill viola + marcatore a sinistra. Nello scaffold c'è già
  via `TableRow selected`, ma va verificato dopo il rifacimento della tabella.
- ~~Glifo platinum accanto a ogni prezzo e nell'intestazione~~ — **fatto**.
  Nascosto quando il prezzo manca: un trattino seguito dal simbolo si
  leggerebbe come "costa — platinum" invece di "non quotato".
- Le percentuali di drop sono allineate a destra con due decimali — già corretto
  nello scaffold.
- ~~Lingua~~ — **fatto**: interfaccia, `lang` del documento e formattazione delle
  date relative sono in inglese.


## Bloccanti lato backend

Verificati contro un'istanza in esecuzione il 2026-08-07. Senza questi, le
funzionalità sopra restano parziali o con dati finti.

| Serve a | Stato |
|---|---|
| Prezzo per singolo item | **fatto** — `GET /api/market/item/{name}` e `POST /api/market/items` |
| Luogo di drop | **fatto** — dalle drop table ufficiali, non più scraping |
| Stato vaulted | **fatto** — presenza nelle drop table |
| Ducati (vista Prime Items) | **manca** |
| Storico prezzi (delta `▲ +12%`) | **manca** — nessuna persistenza del prezzo precedente |
| Persistenza wishlist | nessun endpoint |


## 8. ~~Tab Endo~~ — FATTA

Studiata e costruita il 2026-08-08. L'analisi qui sotto resta perché è la
ragione per cui la vista è fatta così: **non si costruisce come il Ducanetor**.

Com'è finita:

- `EndoService` tiene tutte e **undici** le sculture con base, socket e
  moltiplicatore verificati, legge gli ordini v2 e calcola l'endo reale offerta
  per offerta.
- `EndoController` espone `GET /api/endo/offers`, già ordinato per endo/platino.
- `EndoTable` mostra una riga per **offerta**, non per scultura, con il filtro
  "solo già piene" e le prime tre in evidenza.
- Le stelle sciolte restano fuori per scelta, non per ignoranza: si comprano per
  riempire una scultura, non per scioglierle. La vista lo dice in fondo.

### Le sculture non hanno un prezzo, hanno un prezzo per stato

Sono **11** commerciabili, non 6. Ognuna ha un numero fisso di socket per stelle
Cyan e Amber, e il valore in endo dipende da **quante stelle sono montate**:

```
Endo = (B + 50·C + 100·A) × (1 + M·(C + A) / S)

B = valore base (scultura vuota)      C, A = stelle Cyan e Amber montate
S = socket totali                     M = 0.5 Anasa · 3.0 Chattraka/Hemakara/Kitha/Zambuka · 2.0 le altre
```

Verificata contro i valori della wiki su tutte e undici: torna esatta.

| Scultura | Base | Socket | Piena | Moltiplicatore |
|---|---|---|---|---|
| Anasa | 2000 | 2C 2A | 3450 | 0.5 |
| Kitha | 450 | 4C 1A | 3000 | 3.0 |
| Orta | 650 | 3C 1A | 2700 | 2.0 |
| Chattraka | 450 | 2C 1A | 2600 | 3.0 |
| Hemakara | 450 | 2C 1A | 2600 | 3.0 |
| Zambuka | 450 | 2C 1A | 2600 | 3.0 |
| Vaya | 400 | 2C 1A | 1800 | 2.0 |
| Piv | 375 | 2C 1A | 1725 | 2.0 |
| Valana | 325 | 2C 1A | 1575 | 2.0 |
| Sah | 300 | 2C 1A | 1500 | 2.0 |
| Ayr | 325 | 3C 0A | 1425 | 2.0 |

Una Anasa vuota vale 2000, piena 3450. Sono due prodotti diversi allo stesso
nome — ed è esattamente quello che si vede nelle due righe del market con 3450 e
2000 accanto.

### Conseguenza: serve un endpoint diverso

`statistics` aggrega gli scambi **senza distinguere il riempimento**, quindi il
prezzo medio di una Anasa mescola vuote e piene ed è inutilizzabile qui.

Serve invece l'endpoint degli **ordini aperti**, che porta il dato per ordine:

```
GET https://api.warframe.market/v2/orders/item/{slug}
→ { type, platinum, quantity, amberStars, cyanStars, visible, user:{ status, ingameName } }
```

`amberStars` e `cyanStars` sono i campi che risolvono tutto.

### Verifica su dati veri

Interrogando le 10 sculture e tenendo solo i venditori **in gioco** (`status:
"ingame"` — un ordine di chi è offline non è comprabile ora):

```
135 venditori disponibili
 1. Valana  3p  2C/1A  1575 endo  →  525 endo/plat
 2. Orta    6p  3C/1A  2700 endo  →  450
 5. Vaya    4p  2C/1A  1800 endo  →  450
 6. Anasa   8p  2C/2A  3450 endo  →  431
```

Per confronto, il Ducanetor migliore rende ~21 ducati per platino. Le due
classifiche non sono comparabili fra loro, ma internamente hanno la stessa
forma.

### Come va costruita, quando ci si mette

1. **Backend**: un servizio che interroga i 10 slug degli ordini, con la stessa
   cache e lo stesso rate limiter dei prezzi. Dieci richieste, non 550 — costa
   pochissimo, ma va rinfrescato più spesso: gli ordini aperti cambiano in
   continuazione, mentre i prezzi degli scambi conclusi no. Un TTL di 5 minuti.
2. **Filtro sui venditori online**: senza, la classifica si riempie di offerte
   ferme da mesi che non si possono comprare.
3. **La riga è un ordine, non un item.** Va mostrato venditore, platino, stelle
   montate, endo risultante e il rapporto — più il comando `/w` da incollare in
   gioco, che è il modo in cui si compra davvero.
4. ~~**Anche le stelle sciolte**~~ — **scartato**. Sono commerciabili, ma si
   comprano per riempire una scultura che si ha già, non per scioglierle:
   metterle nella stessa classifica risponderebbe a una domanda che nessuno fa.

### ~~Dubbi rimasti~~ — chiusi il 2026-08-08

- **Chattraka**: risolta. La wiki la elenca fra le undici sculture — 2 Cyan,
  1 Amber, base 450, piena 2600 — cioè esattamente la forma di Hemakara e
  Zambuka, che fissa il moltiplicatore a 3.0: `(450 + 100 + 100) × 4 = 2600`.
  È commerciabile solo su **v2** (`/v1/items/ayatan_chattraka_sculpture` dà 404,
  l'item è stato aggiunto a ottobre 2025), e la vista usa già v2 per le stelle,
  quindi è entrata senza toccare altro. Si compra da Nightcap, rango 3, 75
  Fergolyte, una a settimana — per questo è più cara delle altre a parità di
  endo.
- **Stelle sciolte**: chiuso per scelta, vedi il punto 4 qui sopra.

---

## 6. Modifiche da fare al backend

Da qui in poi si tocca `src/main/java/relics/reliceApi/`. Ora che il repo è
unico, frontend e backend si muovono nello stesso commit.

### 6.1 ~~Riparare quello che è già scritto ma non funziona~~ — FATTO

**`RelicDropInfoController` / `RelicDropInfoService`** — `/api/relics/drop-info/{name}`
risponde 200 con `[]` per ogni reliquia, sia col nome corto (`A1`) che con
quello intero (`Axi A1`). Il modello `DropInfoRelic` esiste già ed è quello
giusto (`mission`, `location`, `rotation`, `chance`): è il servizio che non
popola. Va capito da dove dovrebbe leggere — probabilmente lo scraping jsoup,
visto che `jsoup` è già fra le dipendenze del `pom.xml`.

**`RelicVaultedController`** — `/api/relics/isVaulted/{name}` e
`/api/relics/unvaulted` rispondono **500 su ogni chiamata**, quindi l'eccezione
è sistematica e non dipende dall'input. Da guardare per prima: è la più veloce
da chiudere.

### 6.2 ~~Prezzo per singolo item~~ — FATTO

Oggi `RelicMarketController` espone solo `/api/market/{relicName}` →
`RelicPrice{relicName, averagePrice}`, cioè il prezzo di una reliquia intera.
Il design mostra il prezzo **di ogni item** in tabella e usa la somma per il
totale della wishlist.

Serve qualcosa come:

```
GET  /api/market/item/{itemName}      → ItemPrice{itemName, averagePrice, ducats?}
POST /api/market/items                → List<ItemPrice>   (batch, corpo: lista di nomi)
```

La versione batch non è un lusso: una schermata di risultati chiede 20–40 prezzi
insieme, e `warframe.market` ha un rate limit. Senza batch il frontend fa
decine di richieste in parallelo e viene strozzato.

`RelicMarketService` già parla con warframe.market via WebFlux, quindi la
chiamata c'è: va generalizzata dal nome-reliquia al nome-item, e va aggiunta una
cache lato server (anche solo `@Cacheable` con TTL di 10–15 minuti) così il
prezzo si paga una volta per tutti gli utenti invece che una volta per browser.

**Attenzione ai nomi**: il JSON dei drop scrive `Volt Prime Neuroptics Blueprint`,
warframe.market usa slug come `volt_prime_neuroptics`. La normalizzazione va
fatta lato server, una volta, non replicata nel frontend.


### 6.7 ~~Rarità sbagliate nella fonte dati~~ — FATTO

`relics.json` etichetta come `Uncommon` tutti i drop al 25.33%, che sono
`Common`. La stringa `Common` non compare **da nessuna parte** nel dataset:
sulle sole reliquie Intact ci sono 2067 `Uncommon@25.33`, 1378 `Uncommon@11` e
689 `Rare@2`.

Corretto in `RelicLoadService`: ogni servizio carica da lì, quindi la
correzione copre tutti gli endpoint e nessun client deve replicare la tabella.
Il frontend ora si fida della rarità che riceve.

Attenzione a chi ci mette mano: **la tabella deve restare indicizzata per stato
di raffinazione e non si può sostituire con un ordinamento**. A Flawless il 20%
è Common, a Radiant il 20% è Uncommon, e sempre a Radiant le tre Common (16.67%)
stanno *sotto* le due Uncommon (20%) — l'ordine si inverte.

### 6.3 ~~Ducati~~ — FATTO

Fatto: `ItemPrice` ora porta `ducats` e `setName`, quindi arrivano con la stessa
richiesta dei prezzi invece che con una in più.

La fonte è il database WFCD (`warframe-items`), otto categorie invece di
`All.json` — 12 MB contro 55 MB, e il resto sono quest, mod e risorse senza
valore in ducati. Cache di 24 ore: il dato si muove solo all'uscita di un Prime.

Anche il **set** si deriva lì, come previsto dal §7b: il database sa che
`Volt Prime Neuroptics Blueprint` è il componente `Neuroptics` del set
`Volt Prime`, e che `Forma Blueprint` non è nessuno dei due.

### 6.4 ~~Storico prezzi e delta~~ — FATTO, senza database

**Il database non serviva.** warframe.market espone già 90 giorni di scambi
conclusi in `statistics_closed`, nella stessa risposta da cui si legge il
prezzo. Esposto su `GET /api/market/item/{name}/history`, alimenta il grafico
del popup e il delta `vs 90-day avg` senza persistere nulla.

Nella stessa occasione è emerso che **il prezzo era sbagliato**: veniva da
`statistics_live`, cioè gli ordini aperti, mediando insieme buy e sell. Per Volt
Prime Neuroptics dava 22.58, mentre i compratori offrono ~15, i venditori
chiedono ~30 e gli scambi si chiudono a 27.55.

### 6.5 ~~Persistenza della wishlist~~ — FATTA

Sul server, senza utenti: il servizio è self-hosted e monoutente, quindi la lista
è un file JSON (`data/wishlist.json`, scritto su file temporaneo e spostato).
`localStorage` resta come specchio locale, così lo stepper è immediato e la lista
si legge anche a backend spento.

Una riga è identificata da **tipo + nome**, non dal solo nome: lo stesso pezzo
voluto per completare un set e voluto per i ducati sono due righe diverse, e la
wishlist le tiene in sezioni separate (`part`, `ducat`, `endo`).

### 6.8 ~~Catalogo reliquie fermo~~ — FATTO il 2026-08-08

`relics.json` era statico e nessuno lo aggiornava: 689 reliquie contro le 773
pubblicate dalle drop table, e mancavano **esattamente quelle in rotazione**.
Nessun errore, nessun log — la lista aveva solo un buco.

`RelicCatalogueRefresher` lo riscarica all'avvio e ogni giorno alle 04:20, prima
del warmer dei prezzi (`@Order(0)` contro `@Order(1)`), altrimenti i pezzi nuovi
resterebbero senza prezzo fino al giro successivo. La scrittura passa da file
temporaneo e `ATOMIC_MOVE`, e una risposta senza array `relics` non sovrascrive
niente: il catalogo è l'unica fonte di cosa esiste, e mezzo catalogo è peggio di
uno vecchio.

Il percorso è la property `relics.catalogue.path`, condivisa da chi legge e da
chi scrive, così i due non possono divergere.

### 6.6 Cose che il frontend nuovo rende non più necessarie

- ~~**`relic-finder.html`**~~ — **rimosso**. Era il vecchio frontend statico;
  `apps/web` lo sostituisce.
- **CORS** non serve: in sviluppo il proxy di Vite parla con la 8080, in
  produzione Spring Boot serve i file statici della stessa origine.

---

## 7. ~~Pannello dettaglio a due modi~~ — FATTO

### ~~Stato attuale: il contenuto di una reliquia non si vede da nessuna parte~~ — RISOLTO

Era una **regressione**, non una funzionalità mai esistita. Lo scaffold
iniziale aveva un pannello che elencava tutti i drop della reliquia con le tab
di raffinazione; riscrivendo la tabella a granularità item (§1) l'ho sostituito
con i luoghi di drop, e i sei premi sono spariti dall'interfaccia.

Oggi quindi si può solo **cercare un pezzo Prime e vedere in quali reliquie
sta**. Il percorso inverso — parto da una reliquia, voglio sapere cosa contiene
— non esiste più, ed è la domanda più frequente di chi apre una reliquia nel
gioco. Va rimesso, ed è il motivo per cui questo §7 conta più di §4 e §5.

Nota: i dati ci sono già tutti in memoria. `RelicGroup.states[refinement]`
contiene i sei premi, e `groupRelics()` in `api/normalize.ts` li raggruppa già.
Non serve nessuna chiamata nuova per la metà "reliquia" — è solo lavoro di UI.

### Come deve comportarsi

Il pannello deve dipendere da **cosa** è stato cliccato nella riga.

**Click sull'item** → dove si ottiene quell'item:

- ~~l'elenco delle reliquie che lo contengono~~ — fatto, calcolato in memoria
  invece che con `/api/search`: il dataset è già caricato, quindi una richiesta
  sarebbe più lenta e potrebbe dissentire dalla tabella, che applica la
  correzione delle rarità in ingresso
- ~~il **set** e gli altri pezzi~~ — fatto, derivato in `lib/sets.ts`. Da
  spostare lato server insieme ai ducati (§6.3), così la regola sta in un posto
  solo

**Click sulla reliquia** → il contenuto completo:

- ~~tutti e sei i drop, non solo quello della riga~~ — fatto
- ~~**il pezzo della riga cliccata evidenziato** fra gli altri~~ — fatto

### Cosa serve

| Dato | Stato |
|---|---|
| Reliquie che contengono un item | **c'e gia** — `GET /api/search/{itemName}` |
| Luoghi di drop di una reliquia | **c'e gia** — `GET /api/relics/drop-info/{name}` |
| Set di appartenenza | **manca**, ma e derivabile dal nome |

Il set si ricava dal nome dell'item: si taglia dopo `Prime`
(`Volt Prime Neuroptics Blueprint` → `Volt Prime`). Funziona per warframe e armi;
va verificato sui casi strani — `Forma Blueprint` non ha set, Kavat, Kubrow e
Archwing seguono altre convenzioni. Meglio derivarlo **lato server** insieme ai
ducati (§6.3), cosi la regola sta in un posto solo.

### Come distinguere il click

La riga e gia una coppia reliquia × item, quindi il punto cliccato basta a
decidere: cella `Relic` → modo reliquia, cella `Item` → modo item. Da non
risolvere con due pannelli affiancati: il target ne ha uno solo, e la wishlist
(§3) si contende gia quello spazio.

---

## Ordine consigliato

1. Rifare la tabella a granularità item (§1) — sblocca tutto.
2. Filtri (§2), che senza la tabella nuova non hanno su cosa agire.
3. Wishlist client-side con `localStorage` (§3), accettando prezzi per reliquia
   finché non arriva quello per item.
4. `Tabs` in topbar e vista Prime Items (§4), quando ducati e prezzi ci sono.
5. Rifiniture grafiche (§5).

I punti 1–3 si possono fare **senza toccare il backend**, accettando che la
colonna PRICE mostri il prezzo della reliquia e non dell'item, con una nota
visibile. I punti 4 e oltre no.

Sul backend, l'ordine è diverso: prima §6.1 (riparare `isVaulted` e `drop-info`,
che sono bug su codice già scritto), poi §6.2 (prezzo per item + batch + cache,
che sblocca metà del design), poi §6.3. §6.4 per ultimo, perché tira dentro la
decisione sul database.
