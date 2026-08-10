# Running it locally

Backend and frontend live in the **same repository**. They are still two
processes, because in development they run on two ports.

```
relicsFinder/
  pom.xml  src/main/java/     Spring Boot backend
  package.json                npm workspace
  packages/ui/                design system (React library)
  apps/web/                   frontend
  design-system/              the design specification
```

Requirements: **Java 24+** and **Maven**, **Node 20+**. The bundled `./mvnw`
works in place of a system `mvn`.

## First time

```sh
npm install        # installs the whole workspace, and builds the library
```

`npm install` builds `packages/ui` for you through its `prepare` script. The
library has to exist before anything else: `apps/web` imports it by name, and
its entry point is `dist/index.js`, which is not committed. Build it by hand
with `npm run build:ui` after changing it.

## Every time — two terminals

**Terminal 1 — backend, port 8080**

```sh
mvn spring-boot:run
```

Ready when `Started ReliceApiApplication` appears. Check it:

```sh
curl http://localhost:8080/api/relics | head -c 200
```

**Terminal 2 — frontend, port 5173**

```sh
npm run dev
```

Then open **http://localhost:5173**.

## Why two ports

Vite serves the page on 5173 and forwards anything starting with `/api` to 8080.
The browser therefore sees a single origin and CORS never comes into it — the
backend has none configured. The rule lives in `apps/web/vite.config.ts`.

Backend on a different port:

```sh
RELICS_API_URL=http://localhost:9090 npm run dev
```

## Production — one process

Build the frontend into Spring Boot's static resources, and it serves the page
and the API together on 8080:

```sh
RELICS_STATIC_DIR=src/main/resources/static npm run build --workspace=@relic-finder/web
mvn spring-boot:run
```

Without `RELICS_STATIC_DIR` the build lands in `apps/web/dist/`.

## When something will not start

| Symptom | Cause |
|---|---|
| Blank page, console full of 500s on `/api/...` | Backend is down. Terminal 1. |
| `Port 8080 was already in use` | `ss -ltnp \| grep 8080`, then close the process |
| `release version 24 not supported` | Java too old: 24+ is required |
| Page with no styles, text unreadable | Library not built: `npm run build:ui` |
| Changes in `packages/ui` do nothing | No watcher: rebuild with `npm run build:ui` |
| `Failed to resolve entry for package "relic-finder-ui"` | Library never built, so `packages/ui/dist/` is missing. `npm install` (which runs `prepare`) or `npm run build:ui` |

## The data refreshes itself

The relic catalogue (`src/main/resources/relics.json`) is re-read from the drop
tables **on startup and daily at 04:20**. If the download fails the previous
file stays, so the worst case is yesterday's data. To force it now:

```sh
curl -X POST http://localhost:8080/api/relics/update
```

The path is the `relics.catalogue.path` property. The default points inside
`src/main/resources/`, which only exists when running from source: if you package
a jar, pass a real path — `--relics.catalogue.path=data/relics.json`.

Prices and drop tables have caches of their own — thirty minutes and six hours —
and need nothing from you.

## Where the state lives

The wishlist and the list of parts you own are JSON files under `data/`, written
by the backend. No database and no accounts: the service is single-tenant, so
whoever runs it owns the only list. The directory is git-ignored.

```
data/wishlist.json    lines you are collecting, farming for ducats, or want as Ayatan
data/owned.json       parts already in your inventory, ticked in the Sets view
```

## Where the project is

Six views: **Relics** (one row per relic, with vault state, expected value and
best drop), **Prime Items**, **Sets** (what a set is missing and whether to buy
or farm it), **Wishlist** (split by kind: parts, ducats, Ayatan), **Ducanetor**
(ducats per platinum) and **Endo** (Ayatan by Endo per platinum). Search,
filters, the wishlist and the owned list are all in place. For what is left, see
the roadmap in the README and the open issues.
