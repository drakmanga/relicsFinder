package relics.reliceApi.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import relics.reliceApi.model.DropInfoRelic;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.locks.ReentrantLock;

/**
 * Where relics drop, and which ones are currently obtainable.
 *
 * Both answers come from one file: the community mirror of the official drop
 * tables, the same source {@link RelicUpdateService} already uses for relic
 * contents.
 *
 * <p>This replaces two scrapers that pointed at warframe.fandom.com. They could
 * not work: Fandom sits behind Cloudflare and answers a browser challenge to
 * server-side clients, and the per-relic wiki page contains only the wikitext
 * {@code {{RelicPage}}} — the drop table is rendered by a template, so there was
 * never any data in the HTML to scrape.
 *
 * <p>A relic counts as unvaulted exactly when it appears somewhere in the drop
 * tables. That is also why a vaulted relic legitimately has an empty drop list
 * rather than an error.
 */
@Service
public class DropTableService {

    private static final String MISSION_REWARDS_URL =
            "https://drops.warframestat.us/data/missionRewards.json";

    /** Relic entries are named "Lith V9 Relic" in the drop tables. */
    private static final String RELIC_SUFFIX = " Relic";

    /**
     * The drop tables change only when Digital Extremes publishes a new build,
     * so an hourly refresh is already generous. The previous implementation
     * re-scraped a web page on every single request.
     */
    private static final Duration TTL = Duration.ofHours(6);

    private static final Duration TIMEOUT = Duration.ofSeconds(20);

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(TIMEOUT)
            .followRedirects(HttpClient.Redirect.NORMAL)
            .build();

    private final ObjectMapper mapper = new ObjectMapper();

    /** Guards the refresh so a burst of requests triggers one download, not many. */
    private final ReentrantLock refreshLock = new ReentrantLock();

    private volatile Snapshot snapshot;

    /**
     * An immutable view of the drop tables. Swapped in wholesale, so readers
     * never observe a half-built index.
     */
    private record Snapshot(
            Map<String, List<DropInfoRelic>> dropsByRelic,
            Set<String> unvaultedRelics,
            Instant fetchedAt
    ) {
        boolean isFresh() {
            return Duration.between(fetchedAt, Instant.now()).compareTo(TTL) < 0;
        }
    }

    /** Drop sites for a relic. Empty when the relic is vaulted — not an error. */
    public List<DropInfoRelic> getRelicDropInfo(String relicName) {
        String key = normalize(relicName);
        return current().dropsByRelic().getOrDefault(key, List.of());
    }

    /** True when the relic is not currently obtainable from any mission. */
    public boolean isVaulted(String relicName) {
        return !current().unvaultedRelics().contains(normalize(relicName));
    }

    /** Every currently obtainable relic, as "Lith V9". */
    public Set<String> unvaultedRelicNames() {
        return current().unvaultedRelics();
    }

    /**
     * Accepts "Lith V9", "lith_v9" and "Lith V9 Relic" alike, so callers do not
     * have to know which spelling the drop tables use.
     */
    private String normalize(String relicName) {
        if (relicName == null) return "";
        String cleaned = relicName.replace('_', ' ').trim().replaceAll("\\s+", " ");
        if (cleaned.toLowerCase(Locale.ROOT).endsWith(RELIC_SUFFIX.toLowerCase(Locale.ROOT))) {
            cleaned = cleaned.substring(0, cleaned.length() - RELIC_SUFFIX.length()).trim();
        }
        return cleaned.toLowerCase(Locale.ROOT);
    }

    private Snapshot current() {
        Snapshot cached = snapshot;
        if (cached != null && cached.isFresh()) return cached;

        refreshLock.lock();
        try {
            // Another thread may have refreshed while this one waited.
            cached = snapshot;
            if (cached != null && cached.isFresh()) return cached;

            Snapshot fetched = fetch();
            snapshot = fetched;
            return fetched;
        } catch (Exception e) {
            System.err.println("DropTableService: refresh failed — " + e.getMessage());
            // Stale data beats no data: a failed refresh must not turn every
            // relic into "vaulted with no drop sites".
            if (cached != null) return cached;
            return new Snapshot(Map.of(), Set.of(), Instant.now());
        } finally {
            refreshLock.unlock();
        }
    }

    private Snapshot fetch() throws Exception {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(MISSION_REWARDS_URL))
                .timeout(TIMEOUT)
                .header("Accept", "application/json")
                .header("User-Agent", ApiIdentity.USER_AGENT)
                .GET()
                .build();

        HttpResponse<String> response =
                httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() != 200) {
            throw new IllegalStateException("HTTP " + response.statusCode() + " da " + MISSION_REWARDS_URL);
        }

        return index(mapper.readTree(response.body()).path("missionRewards"));
    }

    /**
     * Walks planet → node → rotation → reward and keeps only the relics.
     *
     * <p>Missions without rotations carry {@code rewards} as an array rather
     * than an object keyed by "A"/"B"/"C"; both shapes appear in the same file.
     */
    private Snapshot index(JsonNode missionRewards) {
        Map<String, List<DropInfoRelic>> drops = new HashMap<>();
        Set<String> unvaulted = new HashSet<>();

        missionRewards.fields().forEachRemaining(planetEntry -> {
            String planet = planetEntry.getKey();

            planetEntry.getValue().fields().forEachRemaining(nodeEntry -> {
                String node = nodeEntry.getKey();
                JsonNode info = nodeEntry.getValue();
                String gameMode = info.path("gameMode").asText("");
                JsonNode rewards = info.path("rewards");

                if (rewards.isArray()) {
                    collect(rewards, "", gameMode, node, planet, drops, unvaulted);
                } else if (rewards.isObject()) {
                    rewards.fields().forEachRemaining(rotationEntry ->
                            collect(rotationEntry.getValue(), rotationEntry.getKey(),
                                    gameMode, node, planet, drops, unvaulted));
                }
            });
        });

        drops.values().forEach(list ->
                list.sort(Comparator.comparingDouble(
                        (DropInfoRelic d) -> parseChance(d.getChance())).reversed()));

        return new Snapshot(Map.copyOf(drops), Set.copyOf(unvaulted), Instant.now());
    }

    private void collect(JsonNode rewardList, String rotation, String gameMode, String node,
                         String planet, Map<String, List<DropInfoRelic>> drops,
                         Set<String> unvaulted) {

        for (JsonNode reward : rewardList) {
            String itemName = reward.path("itemName").asText("");
            if (!itemName.endsWith(RELIC_SUFFIX)) continue;

            String relicName = itemName.substring(0, itemName.length() - RELIC_SUFFIX.length()).trim();
            String key = relicName.toLowerCase(Locale.ROOT);

            unvaulted.add(key);
            drops.computeIfAbsent(key, k -> new ArrayList<>())
                    .add(new DropInfoRelic(
                            gameMode,
                            node + " (" + planet + ")",
                            rotation,
                            trimNumber(reward.path("chance").asDouble(0))));
        }
    }

    private static double parseChance(String chance) {
        try {
            return Double.parseDouble(chance);
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    /** "11.0" reads worse than "11" for a drop chance nobody rounds. */
    private static String trimNumber(double value) {
        return value == Math.floor(value)
                ? String.valueOf((long) value)
                : String.valueOf(value);
    }
}
