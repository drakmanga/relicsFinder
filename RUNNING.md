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

`docker-compose.yaml` builds what a server would run, not what a developer edits: the
backend as a jar on a bare JRE, and the frontend as static files served by nginx.

```sh
docker compose up -d
```

- The backend answers on `8080`, with `./data` mounted so the wishlist survives the
  container.
- nginx serves the page on **80** and proxies `/api` to the backend, which is how the
  browser sees a single origin — the same reason Vite proxies it in development.
- `depends_on` orders the starts, it does not wait for Spring Boot to answer, so the page
  can show 500s on `/api/...` for the first minute.

Access the application at **http://localhost**.

```sh
docker compose down
```

Nothing is mounted except `./data`, so a change to the sources needs
`docker compose up -d --build` to reach the containers. That is what makes it a production
build and not a second way to develop: for that, the two terminals above.

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

Two steps, and the first one is the one people forget.

```sh
# 1. Bump the version where it is declared, and commit it.
#    <revision> in pom.xml is the only place Relic Finder says which version it
#    is: the jar takes it from there, installer\windows\build.ps1 reads it from
#    there, and the running application reports it through /api/app/update.
$EDITOR pom.xml          # <revision>0.4.0-SNAPSHOT</revision>
git commit -am "Release 0.4.0"

# 2. Tag the same three numbers and push the tag.
git tag v0.4.0
git push origin main v0.4.0
```

`.github/workflows/release.yml` runs on `windows-latest`, refuses a tag whose
three numbers are not the three in the pom, builds the installer, smoke tests it
twice and **publishes** the release.

`.github/workflows/images.yml` runs on the same tag, on Linux, and publishes the
two container images: `relicsfinder-backend` and `relicsfinder-frontend` under
`ghcr.io/<owner>`, tagged with the three numbers and with `latest`. It builds
them, runs them together through the shipped compose file, asks for the API and
the page, and pushes only then — a tag that cannot start is a tag that would
break every Docker install that reaches it. Its own workflow, because a jpackage
failure on a Windows runner has nothing to say about a Linux image and should
not take it down.

Everyone on Windows gets that release without being asked to do anything: their
copy sees it, downloads the setup, checks it against the sha256 GitHub publishes
beside the asset, and runs it. Every Docker install is two commands away from it,
or one click if it was given the socket. Which means a release is now something people
actually end up on, and a broken one reaches them just as reliably — the smoke
tests are the gate that stops it, and they are the reason the workflow may
publish without a human looking.

Published rather than drafted, and that is deliberate: `/releases/latest` does
not return a draft, so every installed copy's update check would go on reporting
the release before it for as long as the draft sat there. Publishing straight out
is safe because the release is only created on a tag and only after both smoke
tests have passed — a build that cannot start never reaches the step that
publishes it. If you want to look before anybody else does, tag from a branch and
do not push it to `main`.

The version has to be three numbers — that is all Windows records, and jpackage
refuses anything else; the `-SNAPSHOT` suffix in the pom is dropped by everything
that needs the bare three. To get an installer without cutting a release, run the
workflow by hand from the Actions tab; it uploads the same file as an artifact.

### Building one by hand

Needs a Windows machine with **JDK 25** (jpackage ships with it), **Node 20+**
and **Inno Setup 6.3 or later**. It cannot be built from Linux: jpackage bundles
a runtime for the machine it runs on, and Inno Setup is a Windows program.

```powershell
powershell -ExecutionPolicy Bypass -File installer\windows\build.ps1
```

`-Version` is optional and defaults to the `<revision>` in `pom.xml` with the
`-SNAPSHOT` dropped. Pass it only to build an installer stamped with something
the repository does not declare.

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
types, lint, tests and the debt baselines; the backend; and axe plus the reflow
walk over all seven views against a real preview build. Locally:

```sh
npm run verify:all     # typecheck, lint, debt baselines, unit tests, render checks
npm run format:check   # prettier
npm run test:mutants   # proves the frontend unit tests can fail
./mvnw verify          # the backend suite
npm run test:mutants:java   # proves the backend tests can fail
npm run axe            # accessibility, needs the two servers below
npm run reflow         # 360px, 200% zoom and touch targets, same
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

## The relic ranking, as data

The Tier List tab is also an endpoint, so a spreadsheet, a Discord bot or a
script that checks the top twenty before a farming session can read the ranking
without opening the page:

```sh
curl "http://localhost:8080/api/tiers?vault=farmable&limit=20"
```

It answers one row per relic — the relic, its era, what it pays opened alone
Intact and opened Radiant in a squad of four, a band letter for each of those
two columns, what the relic itself sells for, and what ninety days did to it —
plus the two medians the letters are bands around. The screen and this endpoint
are the same answer: the ranking is computed once, on the server, and the tab
reads it from here.

| Parameter | Values                                         | What it does                                                                                                                                                                                                                              |
| --------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `vault`   | `all` (default), `farmable`, `vaulted`         | Which relics are ranked. It moves both medians with it, so a letter means "against these relics" — `farmable` ranks the ~34 relics currently dropping against each other, where against the whole catalogue nearly all of them are D or F |
| `sort`    | `solo` (default), `radshare`, `price`, `relic` | The column the rows come back in                                                                                                                                                                                                          |
| `order`   | `asc`, `desc`                                  | Defaults to best-first on the three value columns and A-to-Z on `relic`                                                                                                                                                                   |
| `limit`   | any number from 1                              | How many rows to return. It cuts the response and never the population: the top twenty are still ranked against every relic `vault` left                                                                                                  |

A wrong spelling is answered with a 400 saying which parameter it was and what
it accepts, rather than with the default ranking.

**How often it is worth asking.** For any one relic, once an hour. Nothing here
asks the market about the same thing faster than that: the prices that decide
the top of the ranking are re-read at most once an hour, everything else in the
catalogue at most once every three hours, and the list of relics itself once a
day at 04:20. So a script watching one relic, or the top twenty, has nothing to
gain from asking more often.

The whole table is a different question, and the honest answer is that it moves
sooner: it rests on about six hundred part prices, and while each of them is
read at most hourly, at any given minute some of them are being read. A script
that pulls all 772 rows every minute will see changes — small ones, in the
middle of the table, on relics nothing was waiting for.

The response says which case you are in rather than making you guess. `asOf` is
when the newest price behind the ranking was read, and `nextUpdateAt` is the
first moment ANY of them is allowed to be read again — before it, nothing in the
ranking can have moved, and `Cache-Control` carries exactly that wait. It sits in
the past on an instance whose background reading has fallen behind, which is the
plain way of saying "at any moment now".

Asking anyway is cheap and nothing stops you. Every response carries an `ETag`,
so a script that sends it back — `curl -H "If-None-Match: <etag>"` — is answered
with an empty 304 and no body for as long as the ranking is byte for byte the
one it already has. That, rather than a schedule, is what makes a tight polling
loop cost the instance almost nothing.

**How much of it is real yet.** A freshly started instance has read only part of
the market, and a relic whose drops have no price yet counts as worth nothing,
which looks exactly like a relic nobody wants. `prices` in the response says how
many of the parts and relics behind the ranking actually carry a price, so a
script can wait rather than act on a ranking of gaps.

**The response is a contract.** `version` is `1`. Fields will be added without it
moving; a field that is removed, renamed or made to mean something else is what
moves it. It is also the only endpoint here that answers a request from another
origin, because the caller is a script on the same machine rather than a page
this application served.

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

Seven views: **Relics** (one row per relic, with vault state, expected value and
best drop), **Prime Items**, **Sets** (what a set is missing and whether to buy
or farm it), **Tier List** (every relic ranked twice, solo and in a radshare),
**Wishlist** (split by kind: parts, relics, ducats, Ayatan), **Ducanetor**
(ducats per platinum) and **Endo** (Ayatan by Endo per platinum). Search,
filters, the wishlist and the owned list are all in place. For what is left, see
the roadmap in the README and the open issues.
