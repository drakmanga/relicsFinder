package relics.reliceApi.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import relics.reliceApi.model.Relic;
import java.io.File;
import java.io.IOException;
import java.util.List;

@Service
public class RelicLoadService {

    private static final String LOCAL_FILE_PATH = "src/main/resources/relics.json";

    private final ObjectMapper objectMapper = new ObjectMapper();


    private JsonNode loadRelicsFromFile() throws IOException {
        File file = new File(LOCAL_FILE_PATH);
        if (!file.exists()) {
            throw new IOException("Relics file not found: " + LOCAL_FILE_PATH);
        }
        return objectMapper.readTree(file);
    }

    public List<Relic> loadRelicsWithCheckData() throws IOException {
        JsonNode rootNode = loadRelicsFromFile();
        JsonNode relicsArray = rootNode.get("relics");
        if (relicsArray == null || !relicsArray.isArray()) {
            throw new IOException("Invalid relics data format.");
        }
        return objectMapper.readerFor(new TypeReference<List<Relic>>() {}).readValue(relicsArray);
    }
}
