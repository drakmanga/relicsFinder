package relics.reliceApi.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URI;
import java.time.Instant;
import java.util.Map;

/**
 * The fissure list read from Digital Extreme's own worldstate, and rewritten
 * into the shape warframestat serves, so {@link FissureService} parses one
 * shape whichever host answered.
 *
 * <p>The fallback rather than the first choice: the raw worldstate names a
 * node by its internal id ({@code SolNode401}) and a tier by a code
 * ({@code VoidT3}), so it needs WFCD's node table beside it to say
 * "Hepit (Void) - Capture". warframestat does that translation itself; this
 * class repeats it only for when warframestat is down.
 */
@Component
public class DeWorldstateFissureSource implements FissureSource {

    /** The game's relic tiers by worldstate code; VoidT6 is an Omnia fissure. */
    private static final Map<String, String> TIERS = Map.of(
            "VoidT1", "Lith",
            "VoidT2", "Meso",
            "VoidT3", "Neo",
            "VoidT4", "Axi",
            "VoidT5", "Requiem",
            "VoidT6", "Omnia");

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private final URI worldstateUrl;
    private final URI nodesUrl;

    /**
     * WFCD's node table, fetched once: it changes with game updates, not by
     * the minute, and a restart picks a new one up. Guarded by {@code this}.
     */
    private JsonNode nodes;

    public DeWorldstateFissureSource(
            @Value("${relics.fissures.fallback.worldstate-url}") String worldstateUrl,
            @Value("${relics.fissures.fallback.nodes-url}") String nodesUrl) {
        this.worldstateUrl = URI.create(worldstateUrl);
        this.nodesUrl = URI.create(nodesUrl);
    }

    @Override
    public String fetch() throws IOException, InterruptedException {
        JsonNode table = nodes();
        return toFissureArray(MAPPER.readTree(UpstreamText.get(worldstateUrl)), table).toString();
    }

    private synchronized JsonNode nodes() throws IOException, InterruptedException {
        if (nodes == null) nodes = MAPPER.readTree(UpstreamText.get(nodesUrl));
        return nodes;
    }

    /**
     * The worldstate's star-chart fissures and Void Storms as warframestat's
     * array. A node the table does not know keeps its id and gets no mission
     * type, so it is listed but never ranked, rather than ranked on a guess.
     */
    static ArrayNode toFissureArray(JsonNode worldstate, JsonNode nodeTable) {
        ArrayNode out = MAPPER.createArrayNode();
        for (JsonNode mission : worldstate.path("ActiveMissions")) {
            add(out, mission, mission.path("Modifier").asText(""), nodeTable, false);
        }
        for (JsonNode storm : worldstate.path("VoidStorms")) {
            add(out, storm, storm.path("ActiveMissionTier").asText(""), nodeTable, true);
        }
        return out;
    }

    private static void add(ArrayNode out, JsonNode raw, String tierCode, JsonNode nodeTable, boolean storm) {
        String nodeId = raw.path("Node").asText("");
        JsonNode node = nodeTable.path(nodeId);

        ObjectNode fissure = out.addObject();
        fissure.put("id", raw.path("_id").path("$oid").asText(nodeId));
        fissure.put("node", node.path("value").asText(nodeId));
        fissure.put("missionType", node.path("type").asText(""));
        fissure.put("tier", TIERS.getOrDefault(tierCode, ""));
        fissure.put("isHard", raw.path("Hard").asBoolean(false));
        fissure.put("isStorm", storm);
        fissure.put("expiry", Instant.ofEpochMilli(
                raw.path("Expiry").path("$date").path("$numberLong").asLong(0)).toString());
    }
}
