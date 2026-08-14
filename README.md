# 🔍 Warframe Relic Finder

> _Finding Prime parts has never been this simple, Tenno._

A complete tool for relics, Prime parts and market prices in Warframe. Forget endless wiki
searches: everything you need in one place.

![Java](https://img.shields.io/badge/Java-ED8B00?style=flat&logo=openjdk&logoColor=white)
![Spring Boot](https://img.shields.io/badge/Spring_Boot-6DB33F?style=flat&logo=spring-boot&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)
![Warframe](https://img.shields.io/badge/Warframe-0080FF?style=flat&logo=warframe&logoColor=white)

### ⬇️ On Windows, [download the installer](https://github.com/drakmanga/relicsFinder/releases/latest) and double click it

Nothing else has to be installed first. Everything below is for reading about it, or for
running it another way.

## ✨ Features

### 🎯 What it does today

Six views, each answering one question:

- **Relics** — _which relic should I open?_ One row per relic, with **expected value**
  (every drop weighted by its chance), the best drop, what the relic itself sells for, and
  whether it is still farmable or vaulted.
- **Prime Items** — _where do I get this piece?_ One row per part, with its set, the relics
  that drop it, its price and its ducat value.
- **Sets** — _I want Volt Prime, what is left?_ One row per set, with how many pieces you
  already have, what the missing ones cost, and for each of them whether it is cheaper to
  **buy it or farm it**.
- **Wishlist** — stored on the server, split by what each line is for: pieces you are
  collecting, sealed relics you mean to buy, pieces to dissolve for ducats, Ayatan
  sculptures.
- **Ducanetor** — _what do I buy for Baro?_ Parts ranked by **ducats per platinum** spent.
- **Endo** — _which Ayatan should I buy?_ Offers ranked by **Endo per platinum**, computed
  from the stars actually socketed in that specific sculpture.

Plus: ninety-day price charts, drop chances and expected value for a **squad of 1 to 4**
(radshare), refinement return measured in **platinum per void trace**, filters by tier /
rarity / refinement / vault state / maximum price, and the whole view in the URL — a screen
is shared with a link.

### 🚀 Coming soon

- **🧾 Inventory tracking** — know whether you already own a relic
- **🔔 Notifications** — alert when a price drops below a threshold

## 🎮 Why use it?

If you play Warframe you know the routine:

- hunting for which relic holds one specific part
- checking prices across several sites
- remembering where each relic drops
- working out whether to buy or to farm

**Relic Finder answers all four in one interface.**

## 🛠️ Stack

- **Backend**: Spring Boot (Java 25)
- **Frontend**: React + TypeScript + Vite (`apps/web`)
- **Design system**: an in-house React library, Orokin theme (`packages/ui`, spec in
  `design-system/`)
- **Data**: warframe.market (prices and orders), drops.warframestat.us (drop tables), WFCD
  (ducat values)
- **Build**: Maven + npm workspaces

The relic catalogue refreshes itself on startup and daily at 04:20. To run it locally see
**[RUNNING.md](RUNNING.md)**; for what is left to do, the [roadmap](#-roadmap)
below and the [open issues](https://github.com/drakmanga/relicsFinder/issues).

## 🚀 Get it running

### On Windows: double click, and that is all

Download **`RelicFinder-x.y.z-setup.exe`** from the
[latest release](https://github.com/drakmanga/relicsFinder/releases/latest) and run it.

Nothing has to be on the machine first — no Java, no Node, no Docker. The installer carries
its own Java 25, and if the machine already has one it offers to use that instead and skip
the copy. It installs into your own user folder, so Windows does not even ask for
administrator rights.

Then **Relic Finder** is in the Start menu, like any other program:

| What you do           | What happens                                                            |
| --------------------- | ----------------------------------------------------------------------- |
| Open it from Start    | An icon appears by the clock and the page opens in your browser         |
| Close the browser tab | It keeps running — click the icon by the clock to open the page again   |
| Click the icon twice  | Nothing new starts: the same copy just shows you the page again         |
| Right click that icon | Open, the data folder, the log, and **Quit** — which is how you stop it |

Your wishlist, the parts you own and the cached prices are kept in
`%LOCALAPPDATA%\RelicFinder\data`. Uninstalling asks before deleting them.

Two things Windows will do that are not faults:

- **"Windows protected your PC"** on first run. The installer is not signed with a
  certificate, which costs money per year, so SmartScreen warns about it. _More info_ →
  _Run anyway_.
- **`Failed to find JVM`**, if the Java that was on the machine at install time has since
  been uninstalled. Run the installer again and choose the included runtime.

### Anywhere else: Docker

Two containers, nothing else needed:

```bash
docker compose up -d
```

Open **http://localhost** — nginx serves the page on port 80 and passes `/api` to the
backend, which is why there is a single address and nothing to configure. The backend is
also reachable on `8080` if you want to call the API directly.

```bash
docker compose logs -f    # follow both services
docker compose down       # stop them
```

The first build is the slow one: the images compile the frontend and the jar from the
sources in this repository. Afterwards only `./data` is shared with the host, and it is
where the wishlist and the catalogue live.

Two things worth knowing:

- `depends_on` orders the starts, it does not wait for the backend to answer. For the first
  minute the page can show 500s on `/api/...`; reload once Spring Boot has logged
  `Started ReliceApiApplication`.
- The catalogue refreshes on startup exactly as it does outside Docker, and the services
  restart unless stopped, so every restart runs it again. The daily 04:20 pass, though, is
  04:20 **in the container**, which is UTC: add `TZ=Europe/Rome` to the backend's
  `environment` to move it back to your own clock.

### From the sources

For working on it. Needs **Java 25+**, **Node 20+** and Maven — the bundled `./mvnw` counts
— and an internet connection for the Warframe Market API.

```bash
git clone https://github.com/drakmanga/relicsFinder.git
cd relicsFinder
chmod +x mvnw

./mvnw spring-boot:run      # backend on 8080
npm install && npm run dev  # frontend on 5173, in a second terminal
```

Then open **http://localhost:5173**. In development the two halves are two processes on two
ports, and Vite forwards `/api` to the backend; **[RUNNING.md](RUNNING.md)** explains why,
and how to build the single-process version the installer ships.

To run the jar on its own instead:

```bash
./mvnw clean package -DskipTests
java -jar target/relicsApi-0.0.1-SNAPSHOT.jar

# with configuration of your own
java -jar target/relicsApi-0.0.1-SNAPSHOT.jar \
  --spring.config.location=file:/path/to/application.properties
```

The catalogue defaults to a path inside `src/main/resources/`, which only exists when
running from a checkout. Running the jar somewhere else, pass a real one:
`--relics.catalogue.path=data/relics.json`.

## 🎯 How to use it

### 1. Search by Prime part

```
Search: "Volt Prime"
Result: every relic holding one of its pieces, and which piece it holds
```

### 2. Search by relic

```
Search: "Lith V9"
Result: all six drops, with rarity, chance, price and ducat value
```

### 3. Decide

Every row prices both routes: what a piece sells for, and what farming it would take —
the relic with the best odds, the runs that needs on average, and what those runs cost
once everything else the relic drops is subtracted.

## 🧪 Testing with Postman

A Postman collection is included.

1. Open Postman
2. Click **Import**
3. Pick `src/main/resources/warframeRelic.postman_collection.json`
4. Try every endpoint

### Main endpoints

```
GET  /api/relics                             every relic, four states each
GET  /api/relics/relic/{Lith V9}             one relic (full name, tier included)
GET  /api/relics/drop-info/{Lith V9}         missions that drop it
GET  /api/relics/unvaulted                   what is in rotation right now
POST /api/relics/update                      re-read the catalogue from the drop tables
GET  /api/market/item/{Volt Prime Chassis}   price of one part
POST /api/market/items                       prices in bulk (array of names in the body)
POST /api/market/relics                      prices of whole relics, in bulk
GET  /api/market/status                      how much of the price cache is warm
GET  /api/endo/offers                        Ayatan ranked by Endo per platinum
GET  /api/wishlist                           the stored wishlist
PUT  /api/wishlist                           replaces it
GET  /api/owned                              the parts you already have
PUT  /api/owned                              replaces them
```

Endpoints addressed by name want the **full** name: `/api/relics/relic/Lith%20V9` answers
200, `/api/relics/relic/V9` answers 404.

## 📁 Project layout

```
relicsFinder/
├── src/
│   ├── main/
│   │   ├── java/              # Spring Boot backend
│   │   │   └── .../desktop/   # tray icon and paths, for the Windows build only
│   │   └── resources/         # the catalogue, config and Postman collection
│   └── test/                  # unit tests
├── apps/web/                  # the interface (React + Vite)
├── packages/ui/               # Orokin design system (React library)
├── design-system/             # the design specification
├── installer/windows/         # jpackage and Inno Setup, for the .exe
├── data/                      # wishlist and owned parts, written at runtime
├── pom.xml                    # Maven dependencies
└── README.md                  # this file
```

## 💡 Worked examples

### You want to build Volt Prime

1. Open **Sets** and search "Volt Prime"
2. Tick the pieces you already have
3. The panel lists what is left, and for each piece whether to buy or farm it
4. Follow a relic through to see where it drops

### You have a Radiant Meso V5

1. Search "Meso V5" in **Relics**
2. Read all six rewards, with the chance each carries at Radiant
3. **What it pays** gives the payout for a squad of 1 to 4 — a radshare is a best-of-four,
   not an average
4. **Refining** says whether spending the traces was worth it at all

## 🔧 Configuration

### Storage

The wishlist and the list of owned parts are plain JSON files under `data/`. No database
and no accounts: the service is self-hosted and single-tenant, so whoever runs it owns the
only list.

```properties
relics.wishlist.path=data/wishlist.json
relics.owned.path=data/owned.json
relics.price-cache.path=data/price-cache.json
relics.catalogue.path=src/main/resources/relics.json
```

The paths are relative to the working directory, which is fine for a checkout and wrong for
an installed program: the Windows build points all four at
`%LOCALAPPDATA%\RelicFinder\data` instead, since the folder it was installed into is not
writable.

### API keys

None. Every warframe.market endpoint used here is public and unauthenticated, and there is
nothing to configure.

## 🤝 Contributing

The project is open source and contributions are welcome.

### How

1. Fork the repository
2. Branch for your feature (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Ideas

- Translations of the interface
- Inventory tracking
- Better farm estimates: time per run, not only the number of runs
- Performance work

## 🐛 Bugs and feature requests

Found a bug, or have an idea?
[Open an issue](https://github.com/drakmanga/relicsFinder/issues) and let's talk about it.

## 📊 Roadmap

- [x] Search by relic and by Prime part
- [x] Warframe Market prices
- [x] Farm locations
- [x] Ninety-day price history
- [x] Wishlist (server-side, no account)
- [x] Dark interface (Orokin design system)
- [x] Expected value, radshare and refinement return
- [x] Ducats per platinum (Ducanetor) and Endo per platinum (Ayatan)
- [x] Set completion: what a set is missing, and whether to buy or farm it
- [ ] Personal inventory
- [ ] Price alerts
- [ ] Mobile companion app

## 🎖️ Credits

- Data from the [Warframe Market API](https://warframe.market/)
- Game information from [Warframe](https://www.warframe.com/)
- Built by the Tenno community, for the Tenno community

## 📄 License

MIT. See `LICENSE` for details.

## 🙏 Thanks

- Digital Extremes, for Warframe
- The Warframe Market community
- Every Tenno who contributes drop data

---

**Built with ❤️ by [drakmanga](https://github.com/drakmanga) and
[Outbox](https://github.com/Sblash)**

_"Dream... not of what you are... but of what you want to be."_ — Warframe

🔴 **Note**: this project is not affiliated with Digital Extremes or Warframe Market. All
trademarks and intellectual property belong to their respective owners.
