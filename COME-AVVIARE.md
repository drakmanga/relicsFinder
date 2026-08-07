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

## Stato attuale

`apps/web` è uno **scaffold**, non la schermata finale: ricerca, tabella
raggruppata per reliquia, pannello dettaglio con le tab di raffinazione. Filtri,
wishlist e vista Prime Items non ci sono ancora — vedi `BACKLOG.md`, che elenca
anche le modifiche necessarie al backend.
