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
 

## 🛠️ How to Build and Run This Spring Boot Project

This guide explains how to package the project as a .jar file and run it.

```bash
# 1. Navigate to the root of the project
cd /path/to/your/project

# 2. Build the .jar file
# If you use Maven:
./mvnw clean package
# Or, if Maven is installed globally:
mvn clean package

# To skip running tests:
mvn clean package -DskipTests

# If you use Gradle:
./gradlew bootJar
# Or:
gradle bootJar

# To skip tests with Gradle:
./gradlew bootJar -x test

# 3. Locate the generated .jar file
# For Maven: check the target/ directory
# For Gradle: check the build/libs/ directory

# Example:
ls target/
# Expected output: your-project-0.0.1-SNAPSHOT.jar

# 4. Run the .jar file
java -jar target/your-project-0.0.1-SNAPSHOT.jar

# (Optional) If you want to use an external configuration file:
java -jar target/your-project.jar --spring.config.location=file:/path/to/application.properties
```

✅ Your Spring Boot application is now up and running!

