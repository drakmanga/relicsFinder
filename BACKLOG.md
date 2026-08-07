# Backlog — dallo scaffold alla schermata di Claude Design

Aperto il 2026-08-07 su revisione dell'utente.

**Stato**: fatti §1 e §2 (tabella a granularità item, barra filtri) e §6.1–§6.2
(riparazione dei tre endpoint rotti, prezzo per item con batch e cache).
Restano §4 navigazione e Prime Items, §5 rifiniture, §6.3–§6.5 e §7
(pannello a due modi). La lingua e stata portata in inglese. Riferimento visivo:
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

**Nota sui volumi**: 689 reliquie × ~6 drop ≈ 4000 righe possibili. Il target ne
mostra 23 perché filtrate. Serve decidere se la vista senza filtri mostra tutto
(e allora serve virtualizzazione) o se richiede almeno un filtro attivo.

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

## 4. Navigazione e vista Prime Items — assenti

Topbar: `RELICS` / `PRIME ITEMS` con sottolineatura sull'attivo. Nel template di
Claude Design sono bottoni custom `.rf-nav`; **è il caso d'uso di `Tabs`**, che
esiste già nel design system ed è stato ignorato. Da usare, o da capire perché
non convinceva.

Vista Prime Items — colonne `ITEM | SET | RARITY | RELICS | DUCATS | PRICE |
WISHLIST | MARKET`. Richiede due dati che il backend non ha (sotto).

## 5. Differenze grafiche minori rispetto al target

- Riga selezionata: fill viola + marcatore a sinistra. Nello scaffold c'è già
  via `TableRow selected`, ma va verificato dopo il rifacimento della tabella.
- Il glifo platinum compare **accanto a ogni prezzo** e nell'intestazione della
  colonna, non solo nel pannello.
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


### 6.7 Rarità sbagliate nella fonte dati

`relics.json` etichetta come `Uncommon` tutti i drop al 25.33%, che sono
`Common`. La stringa `Common` non compare **da nessuna parte** nel dataset:
sulle sole reliquie Intact ci sono 2067 `Uncommon@25.33`, 1378 `Uncommon@11` e
689 `Rare@2`.

Il frontend lo aggira derivando la rarità dalla percentuale
(`apps/web/src/api/normalize.ts`), che è deterministica per stato di
raffinazione. Attenzione a chi ci mette mano: **non si può ordinare per
percentuale** per dedurre la rarità, perché a Radiant le tre Common stanno al
16.67% e le due Uncommon al 20%, quindi l'ordine si inverte.

Andrebbe corretto lato server, in `RelicLoadService`, così ogni client riceve il
dato giusto invece di replicare la tabella di conversione.

### 6.3 Ducati

Nessun endpoint, nessun campo. Il valore in ducati è un dato statico per item
(non varia col mercato) e sta nelle stesse fonti da cui arriva `relics.json`.
Può stare dentro la risposta di `/api/market/item/{itemName}` oppure su un
endpoint suo.

### 6.4 Storico prezzi e delta

Il delta `▲ +12%` del design richiede di sapere quanto costava prima. Oggi non
c'è persistenza di alcun tipo — l'app legge un JSON su disco.

Il minimo che serve: salvare `(itemName, prezzo, timestamp)` a ogni fetch e
esporre `GET /api/market/item/{itemName}/history?days=7`. Questo implica una
decisione che il progetto non ha ancora preso: **introdurre un database**. Con
H2 su file o SQLite si resta leggeri; con Postgres si complica il deploy.

Finché non c'è, il delta nel frontend va omesso, non finto.

### 6.5 Persistenza della wishlist

Solo se si vuole che sopravviva al cambio di browser. Richiede anche un concetto
di utente, che oggi non esiste. Fino ad allora `localStorage` va benissimo, ed è
quello che prevede il §3.

### 6.6 Cose che il frontend nuovo rende non più necessarie

- **`relic-finder.html`** alla radice è il vecchio frontend statico. Quando
  `apps/web` lo sostituisce, va rimosso — tenerlo significa due UI divergenti.
- **CORS** non serve: in sviluppo il proxy di Vite parla con la 8080, in
  produzione Spring Boot serve i file statici della stessa origine.

---

## 7. Pannello dettaglio a due modi — richiesto il 2026-08-07

Oggi il pannello mostra sempre la stessa cosa: i luoghi di drop della reliquia.
Deve invece dipendere da **cosa** è stato cliccato nella riga.

**Click sull'item** → dove si ottiene quell'item:

- l'elenco delle reliquie che lo contengono, con tier, refinement e percentuale
- il **set** a cui appartiene (`Volt Prime Neuroptics Blueprint` → `Volt Prime`)
  e, idealmente, gli altri pezzi del set

**Click sulla reliquia** → il contenuto completo:

- tutti e sei i drop, non solo quello della riga
- **il pezzo della riga cliccata evidenziato** fra gli altri

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
