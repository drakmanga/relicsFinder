# 🔍 Warframe Relic Finder

**Warframe Relic Finder** is a simple yet powerful tool designed to help Tenno quickly find the relics they need in Warframe.

Whether you're hunting for a specific Prime part (like **Volt Prime**) or looking up a relic by name, this tool makes it easy to:

- 🔎 Search for any Prime item or relic  
- 📦 View which relic drops the part you’re looking for  
- 💰 Check the average market price of each item  
- 🛒 Jump directly to purchase the item  
- 🌍 See where each relic can be farmed or dropped in the game

## 🔧 Upcoming Features

We're working on new features, including:

- 🧾 Check if a specific item or relic is already in your inventory  
 


## 🛠️ Come compilare ed eseguire questo progetto Spring Boot

Questa guida mostra i passaggi per compilare il progetto in un file .jar ed eseguirlo.

```bash
# 1. Vai nella cartella del progetto
cd /percorso/del/progetto

# 2. Costruisci il file .jar
# Se usi Maven:
./mvnw clean package
# Oppure, se Maven è installato nel sistema:
mvn clean package

# Se vuoi evitare l'esecuzione dei test:
mvn clean package -DskipTests

# Se usi Gradle:
./gradlew bootJar
# Oppure:
gradle bootJar

# Se vuoi evitare i test con Gradle:
./gradlew bootJar -x test

# 3. Trova il file .jar generato
# Maven: lo troverai in target/
# Gradle: lo troverai in build/libs/

# Esempio:
ls target/
# Output atteso: mio-progetto-0.0.1-SNAPSHOT.jar

# 4. Esegui il file .jar
java -jar target/mio-progetto-0.0.1-SNAPSHOT.jar

# (Opzionale) Se vuoi specificare un file di configurazione esterno:
java -jar target/mio-progetto.jar --spring.config.location=file:/percorso/config/
```

✅ Ora la tua applicazione Spring Boot è attiva e funzionante!
