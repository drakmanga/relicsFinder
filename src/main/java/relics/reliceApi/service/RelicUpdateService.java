package relics.reliceApi.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.Duration;

@Service
public class RelicUpdateService {
    private static final String JSON_URL = "https://drops.warframestat.us/data/relics.json";

    private static final Duration TIMEOUT = Duration.ofSeconds(30);

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final Path file;

    public RelicUpdateService(@Value("${relics.catalogue.path:src/main/resources/relics.json}") String path) {
        this.file = Paths.get(path);
    }

    /**
     * Replaces the catalogue with what the drop tables currently publish.
     *
     * <p>Returns how many relics the new file holds, which is the number worth
     * logging: the catalogue silently drifting behind the game is the failure
     * this guards against, and 773 against 689 says at a glance that it has.
     */
    public int downloadAndUpdateRelics() throws IOException, InterruptedException {
        HttpClient client = HttpClient.newBuilder().connectTimeout(TIMEOUT).build();
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(JSON_URL))
                .timeout(TIMEOUT)
                .header("User-Agent", ApiIdentity.USER_AGENT)
                .GET()
                .build();

        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() != 200) {
            throw new IOException("HTTP error: " + response.statusCode() + "\nBody: " + response.body());
        }

        JsonNode root = objectMapper.readTree(response.body());
        JsonNode relics = root.get("relics");
        if (relics == null || !relics.isArray() || relics.isEmpty()) {
            // A truncated or reshaped response must not overwrite a good file:
            // the catalogue is the app's only source of what exists.
            throw new IOException("Response carried no 'relics' array: catalogue left untouched");
        }

        Path parent = file.toAbsolutePath().getParent();
        if (parent != null) Files.createDirectories(parent);

        // Written beside the target and moved into place, so a download cut off
        // halfway cannot leave the application with half a catalogue.
        Path temp = Files.createTempFile(parent, "relics", ".tmp");
        objectMapper.writeValue(temp.toFile(), root);
        Files.move(temp, file, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);

        return relics.size();
    }
}
