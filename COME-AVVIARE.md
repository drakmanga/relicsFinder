# Come avviare tutto in locale

Backend e frontend stanno nello **stesso repository**. Servono comunque due
processi, perché in sviluppo girano su due porte.

```
relicsFinder/
  pom.xml  src/main/java/     backend Spring Boot
  package.json                workspace npm
  packages/ui/                design system (libreria React)
  apps/web/                   frontend
  design-system/              specifica del design
```

Requisiti: **Java 24+** e **Maven**, **Node 20+**. Al posto di `mvn` di sistema
si può usare `./mvnw` incluso nel repo.

## Prima volta

```sh
npm install        # installa tutto il workspace
npm run build:ui   # compila la libreria: senza, la pagina esce senza stili
```

## Ogni volta — due terminali

**Terminale 1 — backend, porta 8080**

```sh
mvn spring-boot:run
```

Pronto quando compare `Started ReliceApiApplication`. Verifica:

```sh
curl http://localhost:8080/api/relics | head -c 200
```

**Terminale 2 — frontend, porta 5173**

```sh
npm run dev
```

Poi apri **http://localhost:5173**.

## Perché due porte

Vite serve la pagina sulla 5173 e inoltra tutto ciò che inizia per `/api` alla
8080. Il browser quindi vede una sola origine e il CORS non entra in gioco — il
backend non ne ha configurato uno. La regola sta in `apps/web/vite.config.ts`.

Backend su un'altra porta:

```sh
RELICS_API_URL=http://localhost:9090 npm run dev
```

## Produzione — un solo processo

Si compila il frontend dentro le risorse statiche di Spring Boot, che poi serve
pagina e API insieme sulla 8080:

```sh
RELICS_STATIC_DIR=src/main/resources/static npm run build --workspace=@relic-finder/web
mvn spring-boot:run
```

Senza `RELICS_STATIC_DIR` la build finisce in `apps/web/dist/`.

## Se qualcosa non parte

| Sintomo | Causa |
|---|---|
| Pagina bianca, console piena di 500 su `/api/...` | Backend spento. Terminale 1. |
| `Port 8080 was already in use` | `ss -ltnp \| grep 8080` e chiudi il processo |
| `release version 24 not supported` | Java troppo vecchio: serve 24+ |
| Pagina senza stili, testo illeggibile | Libreria non compilata: `npm run build:ui` |
| Modifico `packages/ui` e non cambia niente | Nessun watch: ricompila con `npm run build:ui` |

## I dati si aggiornano da soli

Il catalogo delle reliquie (`src/main/resources/relics.json`) viene riscaricato
dalle drop table **all'avvio e ogni giorno alle 04:20**. Se il download fallisce
resta il file precedente, quindi al massimo si lavora su dati di ieri. Per
forzarlo subito:

```sh
curl -X POST http://localhost:8080/api/relics/update
```

Il percorso del file è la property `relics.catalogue.path`. Il default punta
dentro `src/main/resources/`, che esiste solo eseguendo da sorgente: se impacchetti
in un jar, passa un percorso vero — `--relics.catalogue.path=data/relics.json`.

Prezzi e drop table hanno cache proprie (30 minuti i primi, 6 ore le seconde) e
non richiedono niente.

## Stato attuale

Cinque viste: **Relics** (una riga per reliquia, con stato vault, valore atteso e
miglior drop), **Prime Items**, **Wishlist** (divisa per tipo: pezzi, ducati, Ayatan),
**Ducanetor** (ducati per platino) ed **Endo** (Ayatan per endo/platino).
Ricerca, filtri e wishlist lato server ci sono. Per cosa resta, la roadmap nel
README e le issue aperte.
