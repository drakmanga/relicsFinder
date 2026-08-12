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
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.locks.ReentrantLock;

/**
 * How warframe.market spells an assembled Prime set.
 *
 * <p>Nearly always "&lt;set&gt; Set": Volt Prime is sold as {@code volt_prime_set}.
 * The exception is the gear whose set is named after something longer than the
 * name the drop tables imply — Kavasa Prime is listed as
 * {@code kavasa_prime_kubrow_collar_set}, because the item is a Kubrow collar
 * and the parts are only ever called "Kavasa Prime Buckle" and friends.
 *
 * <p>Exactly one of the catalogue's 160 sets needs this today, which is an
 * argument for a hard-coded exception and against a service — until the next
 * companion is released and the exception is wrong in a way nobody notices,
 * because the symptom is a price that quietly reads as unlisted. The market's
 * own item list is the authority, so it is what gets asked.
 */
@Service
public class SetListingService {

    private static final String ITEMS = "https://api.warframe.market/v2/items";

    /** The list only moves when an item is added to the game. */
    private static final Duration TTL = Duration.ofHours(24);

    private static final Duration TIMEOUT = Duration.ofSeconds(30);

    private static final String SUFFIX = " set";

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(TIMEOUT)
            .followRedirects(HttpClient.Redirect.NORMAL)
            .build();

    private final ObjectMapper mapper = new ObjectMapper();
    private final ReentrantLock refreshLock = new ReentrantLock();

    private volatile Snapshot snapshot;

    private record Snapshot(Map<String, String> byName, Instant fetchedAt) {
        boolean isFresh() {
            return Duration.between(fetchedAt, Instant.now()).compareTo(TTL) < 0;
        }
    }

    /**
     * The market slug for a set, or null when the market does not list one.
     *
     * <p>Takes the name as this application spells it — "Kavasa Prime Set" —
     * and answers with the slug of the item the market actually sells.
     */
    public String slugFor(String setItemName) {
        if (setItemName == null) return null;

        String key = normalize(setItemName);
        if (!key.endsWith(SUFFIX)) return null;

        Map<String, String> byName = current().byName();

        // The plain spelling first: 159 of 160 sets are named exactly this, and
        // a prefix search would be a slower way to find the same answer.
        String exact = byName.get(key);
        if (exact != null) return exact;

        // Otherwise the one listing that starts with the set's name — "Kavasa
        // Prime" against "Kavasa Prime Kubrow Collar Set". Only when it is the
        // one: two matches mean the guess would be a coin toss, and a wrong
        // slug prices a set from another item entirely.
        String prefix = key.substring(0, key.length() - SUFFIX.length()) + " ";
        String found = null;

        for (Map.Entry<String, String> entry : byName.entrySet()) {
            if (!entry.getKey().startsWith(prefix)) continue;
            if (found != null) return null;
            found = entry.getValue();
        }

        return found;
    }

    private static String normalize(String value) {
        return value.trim().replaceAll("\\s+", " ").toLowerCase(Locale.ROOT);
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
            System.err.println("SetListingService: refresh failed — " + e.getMessage());
            // Stale beats empty: with no map every set falls back to the plain
            // spelling, which is right for all but the odd one out.
            return cached != null ? cached : new Snapshot(Map.of(), Instant.now());
        } finally {
            refreshLock.unlock();
        }
    }

    private Snapshot fetch() throws Exception {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(ITEMS))
                .timeout(TIMEOUT)
                .header("Accept", "application/json")
                .GET()
                .build();

        HttpResponse<String> response =
                httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() != 200) {
            throw new IllegalStateException("warframe.market items → HTTP " + response.statusCode());
        }

        return new Snapshot(Map.copyOf(index(mapper.readTree(response.body()))), Instant.now());
    }

    /** Reads the item list into the set listings alone. Package-private for the test. */
    static Map<String, String> index(JsonNode body) {
        Map<String, String> byName = new HashMap<>();

        // v2 answers under "data"; the older shape used "payload".
        JsonNode items = body.has("data") ? body.get("data") : body.path("payload");

        for (JsonNode item : items) {
            String name = item.path("i18n").path("en").path("name").asText("");
            String slug = item.path("slug").asText("");

            if (name.isEmpty() || slug.isEmpty()) continue;

            String key = normalize(name);
            if (key.endsWith(SUFFIX)) byName.put(key, slug);
        }

        return byName;
    }
}
