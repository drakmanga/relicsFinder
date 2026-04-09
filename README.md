# 🔍 Warframe Relic Finder

> *La ricerca delle reliquie Prime non è mai stata così semplice, Tenno!*

Un tool completo per trovare reliquie, parti Prime e prezzi di mercato in Warframe. Dimentica le ricerche infinite sul wiki: trova tutto ciò di cui hai bisogno in un unico posto.

![Java](https://img.shields.io/badge/Java-ED8B00?style=flat&logo=openjdk&logoColor=white)
![Spring Boot](https://img.shields.io/badge/Spring_Boot-6DB33F?style=flat&logo=spring-boot&logoColor=white)
![Warframe](https://img.shields.io/badge/Warframe-0080FF?style=flat&logo=warframe&logoColor=white)

## ✨ Caratteristiche

### 🎯 Cosa puoi fare ora

- **🔎 Ricerca intelligente** - Cerca per nome di reliquia (Lith V9) o direttamente per oggetto Prime (Volt Prime)
- **📦 Contenuto completo** - Visualizza tutte le parti contenute in ogni reliquia
- **💰 Prezzi di mercato** - Controlla il prezzo medio di ogni oggetto
- **🛒 Link diretti** - Accesso rapido al marketplace per l'acquisto
- **🌍 Farm locations** - Scopri dove droppano le reliquie che ti servono
- **📊 Probabilità drop** - Vedi le percentuali di drop (Common, Uncommon, Rare)

### 🚀 Coming Soon

- **🧾 Inventory tracking** - Verifica se possiedi già una reliquia o parte
- **📈 Price history** - Grafici dei prezzi nel tempo
- **🔔 Notifications** - Alert quando il prezzo scende sotto una soglia
- **💾 Wishlist** - Salva le parti che stai cercando

## 🎮 Perché usarlo?

Se giochi a Warframe, sai quanto può essere frustrante:
- Cercare quale reliquia contiene quella parte specifica
- Controllare i prezzi su siti diversi
- Ricordarsi dove farmare ogni reliquia
- Capire se conviene comprare o farmare

**Relic Finder risolve tutti questi problemi in un'unica interfaccia.**

## 🛠️ Stack Tecnologico

- **Backend**: Spring Boot (Java)
- **API**: Warframe Market API integration
- **Frontend**: HTML5 con interfaccia responsive
- **Build**: Maven

## 📋 Prerequisiti

- Java 17 o superiore
- Maven 3.8+ (o usa il wrapper incluso)
- Connessione internet per le API di Warframe Market

## 🚀 Installazione e Avvio

### Metodo 1: Run diretto con Maven

```bash
# Clona la repository
git clone https://github.com/drakmanga/relicsFinder.git
cd relicsFinder

chmod +x mvnw

# Avvia l'applicazione
./mvnw spring-boot:run
```

### Metodo 2: Build JAR ed esecuzione

```bash
# Build del progetto
./mvnw clean package

# Oppure salta i test per build più veloce
./mvnw clean package -DskipTests

# Trova il JAR generato
ls target/
# Output: relicsFinder-0.0.1-SNAPSHOT.jar

# Esegui l'applicazione
java -jar target/relicsFinder-0.0.1-SNAPSHOT.jar
```

### Metodo 3: Con configurazione personalizzata

```bash
# Con file di configurazione esterno
java -jar target/relicsFinder.jar --spring.config.location=file:/path/to/application.properties
```

✅ L'applicazione sarà disponibile su `http://localhost:8080`

## 🎯 Come si usa?

### 1. Ricerca per oggetto Prime
```
Cerca: "Volt Prime"
Risultato: Tutte le parti necessarie e le reliquie che le contengono
```

### 2. Ricerca per reliquia
```
Cerca: "Lith V9"
Risultato: Tutte le parti contenute nella reliquia con rarità e prezzi
```

### 3. Controlla prezzi
Ogni risultato mostra:
- Prezzo medio attuale
- Link diretto al Warframe Market
- Trend del prezzo (se disponibile)

## 🧪 Test con Postman

Vuoi testare le API direttamente? Abbiamo incluso una collection Postman!

**Passi:**
1. Apri Postman
2. Clicca su **Import**
3. Seleziona `src/main/resources/warframeRelic.postman_collection.json`
4. Testa tutti gli endpoint disponibili

### Endpoint principali

```
GET /api/relics/search?query=Volt+Prime
GET /api/relics/{relicName}
GET /api/prime-parts/{partName}/price
GET /api/relics/{relicName}/farm-locations
```

## 📁 Struttura del Progetto

```
relicsFinder/
├── src/
│   ├── main/
│   │   ├── java/              # Backend Spring Boot
│   │   ├── resources/         # Config e Postman collection
│   │   └── webapp/            # File statici
│   └── test/                  # Unit e integration tests
├── relic-finder.html          # Interfaccia utente
├── pom.xml                    # Dipendenze Maven
└── README.md                  # Questo file!
```

## 💡 Esempi di Utilizzo

### Scenario 1: Vuoi craftare Volt Prime
1. Cerca "Volt Prime"
2. Vedi che ti servono: Systems, Chassis, Neuroptics, Blueprint
3. Per ogni parte vedi quale reliquia contiene
4. Controlla il prezzo se preferisci comprarla
5. Segui i link per le farm locations

### Scenario 2: Hai una Meso V5 Radiant
1. Cerca "Meso V5"
2. Vedi tutte le 6 ricompense possibili
3. Controlli i prezzi per decidere quale parte sperare
4. La parte Rare vale 100p? Vale la pena runnare!

## 🔧 Configurazione

### Database (Opzionale)
Per funzionalità future come inventory tracking:

```properties
spring.datasource.url=jdbc:mysql://localhost:3306/warframe_db
spring.datasource.username=your_username
spring.datasource.password=your_password
```

### API Keys
Attualmente usa API pubbliche, ma per rate limits migliori:

```properties
warframe.market.api.key=your_api_key
```

## 🤝 Contribuire

Questo progetto è open source e i contributi sono benvenuti!

### Come contribuire
1. Fork della repository
2. Crea un branch per la tua feature (`git checkout -b feature/AmazingFeature`)
3. Commit delle modifiche (`git commit -m 'Add some AmazingFeature'`)
4. Push al branch (`git push origin feature/AmazingFeature`)
5. Apri una Pull Request

### Idee per contributi
- Aggiungere supporto per altre lingue
- Migliorare l'interfaccia utente
- Implementare il sistema di inventory
- Aggiungere grafici dei prezzi
- Ottimizzare le performance

## 🐛 Bug e Feature Request

Hai trovato un bug? Hai un'idea per una nuova feature?
[Apri una issue](https://github.com/drakmanga/relicsFinder/issues) e parliamone!

## 📊 Roadmap

- [x] Ricerca base per reliquie e parti Prime
- [x] Integrazione prezzi Warframe Market
- [x] Farm locations
- [ ] Sistema inventory personale
- [ ] Grafici storici dei prezzi
- [ ] Notifiche prezzi
- [ ] Wishlist con alert
- [ ] Modalità dark mode
- [ ] App mobile companion

## 🎖️ Crediti

- Dati forniti da [Warframe Market API](https://warframe.market/)
- Informazioni di gioco da [Warframe](https://www.warframe.com/)
- Creato dalla community Tenno, per la community Tenno

## 📄 Licenza

Distribuito sotto licenza MIT. Vedi `LICENSE` per maggiori informazioni.

## 🙏 Ringraziamenti

- Digital Extremes per Warframe
- La community di Warframe Market
- Tutti i Tenno che contribuiscono ai dati di farm

---

**Sviluppato con ❤️ da [drakmanga](https://github.com/drakmanga) e [Outbox](https://github.com/Sblash)**

*"Dream... not of what you are... but of what you want to be."* - Warframe

🔴 **Note**: Questo progetto non è affiliato con Digital Extremes o Warframe Market. Tutti i marchi e proprietà intellettuali appartengono ai rispettivi proprietari.
