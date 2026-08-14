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

Requirements: **Java 25+** and **Maven**, **Node 20+**. The bundled `./mvnw`
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

## Docker Compose — both services in containers

If you prefer to run everything in Docker, you can use the provided `docker-compose.yaml`:

```sh
docker-compose up -d
```

This will:

- Start the backend (Spring Boot) on port `8080`.
- Start the frontend (Vite) on port `5173`, after the backend container has been created —
  `depends_on` orders the starts, it does not wait for Spring Boot to answer, so the page
  can show 500s on `/api/...` for the first minute.

Access the application at **http://localhost:5173**.

To stop the services:

```sh
docker-compose down
```

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

## The Windows installer

What a player downloads is a single `.exe` that installs the application, a
Java 25 runtime and a Start menu entry, and leaves behind something that starts
from an icon: no console, no port to remember, an icon by the clock and the
page in the default browser.

### Cutting a release

Tag it. `.github/workflows/release.yml` runs on `windows-latest`, builds the
installer, smoke tests it twice and attaches it to a **draft** release, which is
yours to review and publish.

```sh
git tag v0.1.0
git push origin v0.1.0
```

The version has to be three numbers — that is all Windows records, and jpackage
refuses anything else. To get an installer without cutting a release, run the
workflow by hand from the Actions tab; it uploads the same file as an artifact.

### Building one by hand

Needs a Windows machine with **JDK 25** (jpackage ships with it), **Node 20+**
and **Inno Setup 6.3 or later**. It cannot be built from Linux: jpackage bundles
a runtime for the machine it runs on, and Inno Setup is a Windows program.

```powershell
powershell -ExecutionPolicy Bypass -File installer\windows\build.ps1 -Version 0.1.0
```

Everything lands in `build\windows\`; the installer itself in
`build\windows\installer\`. `-SkipBuild` reuses the frontend and the jar already
in `target\`, which is what you want when iterating on the installer rather than
on the application.

### How the pieces fit

| File                                 | What it is                                                               |
| ------------------------------------ | ------------------------------------------------------------------------ |
| `installer/windows/build.ps1`        | frontend into the jar, jar into an application image, image into the exe |
| `installer/windows/relic-finder.iss` | the wizard: Java detection, shortcuts, uninstaller                       |
| `src/main/java/.../desktop/`         | what the application does differently when it was double-clicked         |

Nothing in `desktop/` is active unless the launcher sets `relics.desktop`, which
only the packaged build does. Running from source, from the jar or in Docker
behaves exactly as it did before it existed.

### The two ways it finds a Java

The installer carries a Java 25 runtime, and also looks for one already
installed — `JAVA_HOME` first, then the registry keys of every vendor that
publishes them. When it finds one, it offers to use it and leaves the bundled
copy uninstalled, which saves about 90 MB on disk. The download is the same size
either way.

The mechanism is one line. The jpackage launcher reads
`app\RelicFinder.cfg` at every start and takes its runtime from the folder
`app.runtime` names, falling back to `runtime\` beside itself; jpackage never
writes that key, so adding it is what redirects the launcher. If the user later
uninstalls that Java, the launcher says `Failed to find JVM` — running the
installer again and choosing the included runtime fixes it.

### Where the state goes

`%LOCALAPPDATA%\RelicFinder`, not the installation folder, which is not
writable:

```
data\      wishlist.json, owned.json, relics.json, price-cache.json
logs\      relic-finder.log, and the previous run as .log.1
port       the port it bound, so a second launch opens a browser instead of failing
.lock      held while it runs, which is how the second launch knows
```

The catalogue is seeded from the copy inside the jar on first run, so a first
launch with no connection still shows relics rather than an empty table.

The server binds `127.0.0.1` and nothing else, which is why Windows Firewall
never asks about it. The port is 8080 when it is free and any free port
otherwise.

## The gates

Everything runs on every push through `.github/workflows/ci.yml`, in three jobs:
types, lint, tests and the debt baselines; the backend; and axe over all six
views against a real preview build. Locally:

```sh
npm run verify:all     # typecheck, lint, debt baselines, unit tests, render checks
npm run format:check   # prettier
npm run test:mutants   # proves the frontend unit tests can fail
./mvnw verify          # backend: 90 tests
npm run test:mutants:java   # proves the backend tests can fail
npm run axe            # accessibility, needs the two servers below
npm run lighthouse     # performance, same
```

`npm run lint:debt` counts inline styles and px font sizes against a baseline
frozen in `scripts/lint-debt.mjs`. It never fails on the debt already there,
only on growth. When a count drops, lower the baseline in that file — the number
may go down, never up.

## When something will not start

| Symptom                                                 | Cause                                                                                                              |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Blank page, console full of 500s on `/api/...`          | Backend is down. Terminal 1.                                                                                       |
| `Port 8080 was already in use`                          | `ss -ltnp \| grep 8080`, then close the process                                                                    |
| `release version 25 not supported`                      | Java too old: 25+ is required                                                                                      |
| Page with no styles, text unreadable                    | Library not built: `npm run build:ui`                                                                              |
| Changes in `packages/ui` do nothing                     | No watcher: rebuild with `npm run build:ui`                                                                        |
| `Failed to resolve entry for package "relic-finder-ui"` | Library never built, so `packages/ui/dist/` is missing. `npm install` (which runs `prepare`) or `npm run build:ui` |

The installed Windows copy, which has no console to print any of this to:

| Symptom                                     | Cause                                                                                                          |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `Failed to find JVM in ...`                 | The Java chosen at install time is gone. Reinstall and pick the included runtime                               |
| Nothing happens at all on the second click  | It is already running: one copy only, and the click opened the browser at the page it was already serving      |
| Blank page or an error in the browser       | `%LOCALAPPDATA%\RelicFinder\logs\relic-finder.log` — every stack trace goes there, since there is nowhere else |
| The page is served but the tables are empty | First launch with no connection and no seeded catalogue. Reconnect and use the tray icon to open it again      |

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
data/wishlist.json    lines you are collecting, buying as sealed relics, farming for
                      ducats, or want as Ayatan
data/owned.json       parts already in your inventory, ticked in the Sets view
```

## Where the project is

Six views: **Relics** (one row per relic, with vault state, expected value and
best drop), **Prime Items**, **Sets** (what a set is missing and whether to buy
or farm it), **Wishlist** (split by kind: parts, relics, ducats, Ayatan), **Ducanetor**
(ducats per platinum) and **Endo** (Ayatan by Endo per platinum). Search,
filters, the wishlist and the owned list are all in place. For what is left, see
the roadmap in the README and the open issues.
