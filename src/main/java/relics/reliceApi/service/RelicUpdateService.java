package relics.reliceApi.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import java.io.File;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

@Service
public class RelicUpdateService {
    private static final String JSON_URL = "https://drops.warframestat.us/data/relics.json";
    private static final String LOCAL_FILE_PATH = "src/main/resources/relics.json";

    private final ObjectMapper objectMapper = new ObjectMapper();

    public void downloadAndUpdateRelics() throws IOException, InterruptedException {
        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(JSON_URL))
                .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
                        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0 Safari/537.36")
                .GET()
                .build();

        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() != 200) {
            throw new IOException("Errore HTTP: " + response.statusCode() + "\nRisposta: " + response.body());
        }

        objectMapper.writeValue(new File(LOCAL_FILE_PATH), objectMapper.readTree(response.body()));
    }

    private JsonNode loadRelicsFromFile() throws IOException {
        File file = new File(LOCAL_FILE_PATH);
        if (!file.exists()) {
            throw new IOException("Relics file not found: " + LOCAL_FILE_PATH);
        }
        return objectMapper.readTree(file);
    }

    public JsonNode loadRelicsWithCheckData() throws IOException {
        JsonNode rootNode = loadRelicsFromFile();
        assert rootNode != null;
        JsonNode relicsArray = rootNode.get("relics");
        if (relicsArray == null || !relicsArray.isArray()) {
            throw new IOException("Invalid relics data format.");
        }
        return relicsArray;
    }
}
