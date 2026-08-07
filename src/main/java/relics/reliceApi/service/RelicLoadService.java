package relics.reliceApi.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import relics.reliceApi.model.Relic;
import relics.reliceApi.model.Rewards;

import java.io.File;
import java.io.IOException;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class RelicLoadService {

    private static final String LOCAL_FILE_PATH = "src/main/resources/relics.json";

    /**
     * Drop chance to rarity, per refinement state.
     *
     * <p>The source data labels rarity wrongly and always has: every 25.33%
     * drop is tagged "Uncommon" when it is Common, and the string "Common"
     * appears nowhere in the file — 2067 Uncommon@25.33, 1378 Uncommon@11 and
     * 689 Rare@2 across the Intact relics alone.
     *
     * <p>The chances themselves are fixed by the game and correct, so they are
     * the reliable signal. The table has to be keyed by state and cannot be
     * replaced by ranking: at Flawless 20% is Common, at Radiant 20% is
     * Uncommon, and at Radiant the three Commons (16.67%) sit *below* the two
     * Uncommons (20%), so the order inverts.
     */
    private static final Map<String, Map<Double, String>> RARITY_BY_CHANCE = Map.of(
            "intact", Map.of(25.33, "Common", 11.0, "Uncommon", 2.0, "Rare"),
            "exceptional", Map.of(23.33, "Common", 13.0, "Uncommon", 4.0, "Rare"),
            "flawless", Map.of(20.0, "Common", 17.0, "Uncommon", 6.0, "Rare"),
            "radiant", Map.of(16.67, "Common", 20.0, "Uncommon", 10.0, "Rare")
    );

    /** Chances are published to two decimals; this only absorbs float noise. */
    private static final double CHANCE_TOLERANCE = 0.05;

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

        List<Relic> relics = objectMapper
                .readerFor(new TypeReference<List<Relic>>() {})
                .readValue(relicsArray);

        relics.forEach(RelicLoadService::correctRarities);
        return relics;
    }

    /**
     * Rewrites each reward's rarity from its drop chance.
     *
     * <p>Every consumer reads through this method, so correcting here means no
     * client has to carry a copy of the table.
     */
    private static void correctRarities(Relic relic) {
        Map<Double, String> table = RARITY_BY_CHANCE.get(
                relic.getState() == null ? "" : relic.getState().toLowerCase(Locale.ROOT));

        if (table == null || relic.getRewards() == null) return;

        for (Rewards reward : relic.getRewards()) {
            String corrected = rarityFor(table, reward.getChance());
            // An unrecognised chance means the game changed the drop tables;
            // the declared label is then a better guess than a wrong one.
            if (corrected != null) reward.setRarity(corrected);
        }
    }

    private static String rarityFor(Map<Double, String> table, String chance) {
        double value;
        try {
            value = Double.parseDouble(chance.trim());
        } catch (NumberFormatException | NullPointerException e) {
            return null;
        }

        for (Map.Entry<Double, String> entry : table.entrySet()) {
            if (Math.abs(value - entry.getKey()) < CHANCE_TOLERANCE) return entry.getValue();
        }
        return null;
    }
}
