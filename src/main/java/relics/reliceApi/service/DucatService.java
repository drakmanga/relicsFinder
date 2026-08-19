package relics.reliceApi.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.locks.ReentrantLock;

/**
 * Ducat value and set membership for Prime parts.
 *
 * <p>Both are static facts about an item — a Neuroptics is worth 65 ducats
 * whatever the market is doing — so they come from the item database rather
 * than warframe.market.
 *
 * <p>Deriving the set here rather than in the browser keeps one rule in one
 * place: the drop tables write "Volt Prime Neuroptics Blueprint" while the item
 * database splits that into the set "Volt Prime" and the component
 * "Neuroptics", and only the database knows which of the two a name like
 * "Forma Blueprint" is.
 */
@Service
public class DucatService {

    private static final String BASE =
            "https://raw.githubusercontent.com/WFCD/warframe-items/master/data/json/";

    /**
     * The categories that contain Prime gear, and what this application calls
     * each one.
     *
     * <p>Not {@code All.json}: that is 55 MB, against roughly 12 MB for these
     * ten, and the rest of it is quests, mods and resources that carry no ducat
     * value.
     *
     * <p>The file is the authority on what kind of thing an item is, not the
     * {@code category} field inside it: a sentinel weapon is filed under
     * "Primary" in its own records, which would put Wolf's Beacon in the same
     * bucket as a Braton.
     *
     * <p>Arch-Melee holds no Prime gear today. It is fetched anyway so that the
     * day one arrives it is named rather than uncategorised — and the filter
     * over these is built from what the data actually contains, so an empty
     * category never becomes a control that empties the screen.
     */
    private static final Map<String, String> CATEGORIES = Map.ofEntries(
            Map.entry("Warframes", "warframe"),
            Map.entry("Primary", "primary"),
            Map.entry("Secondary", "secondary"),
            Map.entry("Melee", "melee"),
            Map.entry("Sentinels", "sentinel"),
            Map.entry("SentinelWeapons", "sentinel-weapon"),
            Map.entry("Archwing", "archwing"),
            Map.entry("Arch-Gun", "arch-gun"),
            Map.entry("Arch-Melee", "arch-melee"),
            Map.entry("Pets", "pet")
    );

    /** The item database only moves when a new Prime is released. */
    private static final Duration TTL = Duration.ofHours(24);

    private static final Duration TIMEOUT = Duration.ofSeconds(30);

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(TIMEOUT)
            .followRedirects(HttpClient.Redirect.NORMAL)
            .build();

    private final ObjectMapper mapper = new ObjectMapper();
    private final ReentrantLock refreshLock = new ReentrantLock();

    private volatile Snapshot snapshot;

    /** Ducat value, set and kind of gear of one part. */
    public record ItemMeta(Integer ducats, String setName, String category) {}

    private record Snapshot(Map<String, ItemMeta> byName, Instant fetchedAt) {
        boolean isFresh() {
            return Duration.between(fetchedAt, Instant.now()).compareTo(TTL) < 0;
        }
    }

    /** Never null; a part the database does not know returns empty fields. */
    public ItemMeta lookup(String itemName) {
        Map<String, ItemMeta> map = current().byName();
        String key = normalize(itemName);

        // Exact first: "Volt Prime Blueprint" is a component literally called
        // "Blueprint", and stripping the suffix would turn it into the set.
        ItemMeta exact = map.get(key);
        if (exact != null) return exact;

        // The drop tables append "Blueprint" to most part names; the item
        // database does not.
        if (key.endsWith(" blueprint")) {
            ItemMeta stripped = map.get(key.substring(0, key.length() - " blueprint".length()));
            if (stripped != null) return stripped;
        }

        return new ItemMeta(null, null, null);
    }

    private static String normalize(String value) {
        return value == null ? "" : value.trim().replaceAll("\\s+", " ").toLowerCase(Locale.ROOT);
    }

    private Snapshot current() {
        Snapshot cached = snapshot;
        if (cached != null && cached.isFresh()) return cached;

        refreshLock.lock();
        try {
            cached = snapshot;
            if (cached != null && cached.isFresh()) return cached;

            Snapshot fetched = fetch();
            snapshot = fetched;
            return fetched;
        } catch (Exception e) {
            System.err.println("DucatService: refresh failed — " + e.getMessage());
            // Stale beats empty: without this every part would suddenly report
            // no ducats and no set.
            return cached != null ? cached : new Snapshot(Map.of(), Instant.now());
        } finally {
            refreshLock.unlock();
        }
    }

    private Snapshot fetch() throws Exception {
        Map<String, ItemMeta> byName = new HashMap<>();

        for (Map.Entry<String, String> category : CATEGORIES.entrySet()) {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(BASE + category.getKey() + ".json"))
                    .timeout(TIMEOUT)
                    .header("Accept", "application/json")
                    .header("User-Agent", ApiIdentity.USER_AGENT)
                    .GET()
                    .build();

            HttpResponse<String> response =
                    httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            // One missing category should not cost the other seven.
            if (response.statusCode() != 200) {
                System.err.println(
                        "DucatService: " + category.getKey() + " → HTTP " + response.statusCode());
                continue;
            }

            index(mapper.readTree(response.body()), category.getValue(), byName);
        }

        return new Snapshot(Map.copyOf(byName), Instant.now());
    }

    static void index(JsonNode items, String category, Map<String, ItemMeta> byName) {
        for (JsonNode item : items) {
            String setName = item.path("name").asText("");
            if (setName.isEmpty()) continue;

            for (JsonNode component : item.path("components")) {
                String componentName = component.path("name").asText("");
                if (componentName.isEmpty()) continue;

                // Shared crafting materials — Orokin Cell and friends — appear
                // under every item and belong to none of them.
                if (!component.hasNonNull("ducats")) continue;

                byName.put(
                        normalize(setName + " " + componentName),
                        new ItemMeta(component.get("ducats").asInt(), setName, category));
            }
        }
    }
}
