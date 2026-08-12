package relics.reliceApi.service;

import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import relics.reliceApi.model.PricePoint;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * The price cache, kept on disk between runs.
 *
 * <p>Filling the cache from warframe.market costs about eight minutes — 1.527
 * listings against a market that allows three requests a second — and until
 * this existed that price was paid again at every restart, with every table
 * showing dashes in the meantime.
 *
 * <p>The file is a memo of prices already seen, never the authority on what
 * exists: the catalogue is. A missing, stale or corrupt file therefore costs a
 * slow first run and nothing else, and an entry for an item the catalogue no
 * longer lists is dead weight rather than a ghost row — nothing reads this map
 * except by a name the catalogue supplied.
 */
@Service
public class PriceCacheStore {

    private final Path file;
    private final ObjectMapper mapper = new ObjectMapper();

    public PriceCacheStore(@Value("${relics.price-cache.path:data/price-cache.json}") String path) {
        this.file = Paths.get(path);
    }

    /** Never throws: an unreadable cache is a slow start, not a failure. */
    Map<String, RelicMarketService.Cached> load() {
        if (!Files.exists(file)) return Map.of();

        try {
            JsonNode root = mapper.readTree(file.toFile());
            Map<String, RelicMarketService.Cached> out = new HashMap<>();

            root.fields().forEachRemaining(entry -> {
                RelicMarketService.Cached cached = readEntry(entry.getValue());
                if (cached != null) out.put(entry.getKey(), cached);
            });

            return out;

        } catch (Exception e) {
            System.err.println("price-cache: unreadable, starting cold — " + e.getMessage());
            return Map.of();
        }
    }

    private RelicMarketService.Cached readEntry(JsonNode node) {
        if (!node.hasNonNull("at")) return null;

        List<PricePoint> history = new ArrayList<>();
        for (JsonNode point : node.path("history")) {
            // Six positions, in the order written by writeEntry.
            if (point.size() < 6) continue;
            history.add(new PricePoint(
                    point.get(0).asText(),
                    point.get(1).asDouble(),
                    point.get(2).asDouble(),
                    point.get(3).asDouble(),
                    point.get(4).asDouble(),
                    point.get(5).asInt()));
        }

        return new RelicMarketService.Cached(
                node.hasNonNull("avg") ? node.get("avg").asDouble() : null,
                node.hasNonNull("median") ? node.get("median").asDouble() : null,
                node.hasNonNull("volume") ? node.get("volume").asInt() : null,
                node.hasNonNull("trend") ? node.get("trend").asDouble() : null,
                List.copyOf(history),
                Instant.ofEpochMilli(node.get("at").asLong()),
                // A run that failed is not worth carrying across a restart: the
                // next sweep will ask again anyway, and reloading it would only
                // hide a real price behind a minute of retry.
                false);
    }

    /** Never throws: losing a save costs the next start its warm-up, nothing more. */
    void save(Map<String, RelicMarketService.Cached> cache) {
        try {
            Path parent = file.toAbsolutePath().getParent();
            if (parent != null) Files.createDirectories(parent);

            // Written beside the target and moved into place, like the wishlist:
            // an interrupted write cannot leave half a cache behind.
            Path temp = Files.createTempFile(parent, "price-cache", ".tmp");

            try (JsonGenerator json = mapper.getFactory().createGenerator(temp.toFile(), com.fasterxml.jackson.core.JsonEncoding.UTF8)) {
                json.writeStartObject();
                for (Map.Entry<String, RelicMarketService.Cached> entry : cache.entrySet()) {
                    // A failed call carries no information about the item.
                    if (entry.getValue().failed()) continue;
                    json.writeFieldName(entry.getKey());
                    writeEntry(json, entry.getValue());
                }
                json.writeEndObject();
            }

            Files.move(temp, file, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);

        } catch (IOException e) {
            System.err.println("price-cache: save failed — " + e.getMessage());
        }
    }

    /**
     * One entry, with its ninety-day series as arrays rather than objects.
     *
     * <p>The series is the bulk of the file: 1.527 listings of up to ninety days
     * each. Repeating six field names on every one of those points turns a 2,7 MB
     * file into a 10 MB one, for a file no human edits by hand.
     */
    private void writeEntry(JsonGenerator json, RelicMarketService.Cached cached) throws IOException {
        json.writeStartObject();

        writeNullableNumber(json, "avg", cached.avg());
        writeNullableNumber(json, "median", cached.median());
        if (cached.volume() == null) json.writeNullField("volume");
        else json.writeNumberField("volume", cached.volume());
        writeNullableNumber(json, "trend", cached.trend());

        // Epoch millis rather than an ISO string: no dependency on whether the
        // JavaTimeModule happens to be registered, and one less way to fail.
        json.writeNumberField("at", cached.at().toEpochMilli());

        json.writeArrayFieldStart("history");
        for (PricePoint point : cached.history()) {
            json.writeStartArray();
            json.writeString(point.getDate());
            json.writeNumber(point.getAvgPrice());
            json.writeNumber(point.getMedian());
            json.writeNumber(point.getMinPrice());
            json.writeNumber(point.getMaxPrice());
            json.writeNumber(point.getVolume());
            json.writeEndArray();
        }
        json.writeEndArray();

        json.writeEndObject();
    }

    private static void writeNullableNumber(JsonGenerator json, String name, Double value)
            throws IOException {
        if (value == null) json.writeNullField(name);
        else json.writeNumberField(name, value);
    }
}
