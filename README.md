# 🔍 Warframe Relic Finder

> _Finding Prime parts has never been this simple, Tenno._

A complete tool for relics, Prime parts and market prices in Warframe. Forget endless wiki
searches: everything you need in one place.

![Java](https://img.shields.io/badge/Java-ED8B00?style=flat&logo=openjdk&logoColor=white)
![Spring Boot](https://img.shields.io/badge/Spring_Boot-6DB33F?style=flat&logo=spring-boot&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)
![Warframe](https://img.shields.io/badge/Warframe-0080FF?style=flat&logo=warframe&logoColor=white)

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

## 📋 Requirements

- Java 25 or later
- Node 20+ and npm (for the frontend)
- Maven 3.8+ (or the bundled wrapper)
- An internet connection, for the Warframe Market API

Or, in place of the first three, **Docker** with Compose v2 — see
[option 4](#option-4-docker-compose--backend-and-frontend-together).

## 🚀 Install and run

### Option 1: straight from Maven

```bash
# Clone the repository
git clone https://github.com/drakmanga/relicsFinder.git
cd relicsFinder

chmod +x mvnw

# Start the backend
./mvnw spring-boot:run
```

### Option 2: build a JAR and run it

```bash
# Build
./mvnw clean package

# Or skip the tests for a faster build
./mvnw clean package -DskipTests

# Find the JAR
ls target/
# Output: relicsFinder-0.0.1-SNAPSHOT.jar

# Run it
java -jar target/relicsFinder-0.0.1-SNAPSHOT.jar
```

### Option 3: with your own configuration

```bash
java -jar target/relicsFinder.jar --spring.config.location=file:/path/to/application.properties
```

✅ The API is served on `http://localhost:8080`. The frontend is a second process — see
**[RUNNING.md](RUNNING.md)**.

### Option 4: Docker Compose — backend and frontend together

The only option that starts both halves at once, and the only one that needs neither Java
nor Node installed:

```bash
docker compose up -d
```

The repository is mounted into both containers, so they build from the sources you have
checked out. The first start is the slow one: the frontend container runs `npm install` and
builds the design system before Vite comes up, and the backend downloads its Maven
dependencies.

```bash
docker compose logs -f    # follow both services
docker compose down       # stop them
```

Open **http://localhost:5173** — the API is on `8080`, but the page reaches it through
Vite's proxy, so there is nothing to configure.

Two things worth knowing:

- `depends_on` orders the starts, it does not wait for the backend to answer. For the first
  minute the page can show 500s on `/api/...`; reload once Spring Boot has logged
  `Started ReliceApiApplication`.
- The containers run as root and write into the mounted repository (`target/`, `data/`,
  the refreshed catalogue). Those files come back owned by root on the host, which a later
  `./mvnw` or `npm` run outside Docker will trip over. `sudo chown -R "$USER" .` clears it.
- The catalogue refresh on startup works exactly as it does outside Docker, and the
  services restart unless stopped, so every restart runs it again. The daily 04:20 pass,
  though, is 04:20 **in the container**, which is UTC: add `TZ=Europe/Rome` to the
  backend's `environment` to move it back to your own clock.

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
│   │   ├── resources/         # config and Postman collection
│   │   └── webapp/            # static files
│   └── test/                  # unit and integration tests
├── apps/web/                  # the interface (React + Vite)
├── packages/ui/               # Orokin design system (React library)
├── design-system/             # the design specification
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
relics.catalogue.path=src/main/resources/relics.json
```

### API keys

Public endpoints are used throughout, but a key raises the rate limits:

```properties
warframe.market.api.key=your_api_key
```

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
