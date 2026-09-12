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
 * Ducat value, set membership and release dates for Prime gear.
 *
 * <p>All of them are static facts about an item — a Neuroptics is worth 65
 * ducats whatever the market is doing — so they come from the item database
 * rather than warframe.market.
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

    /**
     * Ducat value, set, kind of gear and how many copies the set needs of one
     * part.
     *
     * <p>{@code copiesPerSet} is null when the database says nothing, which is
     * every part it does not list and every one whose entry carries no
     * {@code itemCount}. The reader of the field decides what silence means —
     * one copy, which is what a set asked for before this was carried — rather
     * than this record inventing a number the source never gave.
     */
    public record ItemMeta(Integer ducats, String setName, String category, Integer copiesPerSet) {}

    private record Snapshot(
            Map<String, ItemMeta> byName,
            Map<String, SetDates> datesBySet,
            Instant fetchedAt) {
        boolean isFresh() {
            return Duration.between(fetchedAt, Instant.now()).compareTo(TTL) < 0;
        }
    }

    /**
     * When a Prime set entered the game and when it left the drop tables.
     *
     * <p>Dates as the database writes them, {@code yyyy-MM-dd}, and never parsed
     * here: this is the file reader, and what a date MEANS is
     * {@link PrimeLifecycleService}'s question rather than this one's.
     *
     * <p>{@code vaultDate} is null for a set that has never been vaulted, which
     * is 29 of the 159 the relic catalogue holds. It is also the field that must
     * not be read as "vaulted today": the database's own {@code vaulted} flag is
     * true for exactly the sets that carry a date here, so it says the set has
     * been vaulted at some point and nothing about whether it is obtainable now.
     * Six sets are in the drop tables today with a vault date on them.
     */
    public record SetDates(String setName, String releaseDate, String vaultDate) {}

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

        return new ItemMeta(null, null, null, null);
    }

    /**
     * Release and vault dates for one set, by its display name.
     *
     * <p>Null for a set the database does not carry — Kavasa Prime is the one in
     * the relic catalogue — rather than a record of nulls, so a caller cannot
     * mistake "never vaulted" for "never heard of".
     */
    public SetDates datesFor(String setName) {
        return current().datesBySet().get(normalize(setName));
    }

    /**
     * Every Prime set the item database knows, by display name.
     *
     * <p>Read off the parts index rather than off the dates index, because the
     * ducat value is what makes a set Prime: all 159 sets with a ducat-bearing
     * component are Prime and none of the other 700-odd dated items is. Gating
     * on the name would need the word rule that lives in the browser, and gating
     * on the database's {@code isPrime} flag misses one.
     */
    public Set<String> primeSetNames() {
        Set<String> names = new HashSet<>();
        for (ItemMeta meta : current().byName().values()) {
            if (meta.setName() != null) names.add(meta.setName());
        }
        return names;
    }

    private static String normalize(String value) {
        return value == null ? "" : value.trim().replaceAll("\\s+", " ").toLowerCase(Locale.ROOT);
    }

    /**
     * Re-reads the item database now, whatever the TTL says.
     *
     * <p>The door a reload and the refresh control both come through: the
     * 24-hour hold is right for a file that only moves when Digital Extremes
     * ships a build, and wrong for the morning after they have, which is the
     * one morning somebody goes looking for a part that is not there.
     *
     * <p>Synchronous rather than an invalidation, and that is the reason it is
     * a method rather than a null assignment: dropping the snapshot would hand
     * the ten fetches to whichever request happened to arrive next, and the
     * screen that asked for the refresh would be told it was finished before
     * anything had been read.
     *
     * <p>The lock is the one {@link #current()} takes, so a refresh and an
     * expiring TTL cannot fetch over each other. A failed fetch leaves the
     * previous snapshot in place and throws, because the caller is a user
     * waiting for an answer rather than a background pass: stale beats empty
     * either way, but only one of the two is owed the news.
     */
    public void refreshNow() throws Exception {
        refreshLock.lock();
        try {
            snapshot = fetch();
        } finally {
            refreshLock.unlock();
        }
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
            return cached != null ? cached : new Snapshot(Map.of(), Map.of(), Instant.now());
        } finally {
            refreshLock.unlock();
        }
    }

    private Snapshot fetch() throws Exception {
        Map<String, ItemMeta> byName = new HashMap<>();
        Map<String, SetDates> datesBySet = new HashMap<>();

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

            JsonNode items = mapper.readTree(response.body());
            index(items, category.getValue(), byName);
            indexDates(items, datesBySet);
        }

        return new Snapshot(Map.copyOf(byName), Map.copyOf(datesBySet), Instant.now());
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

                // How many of this component the set is built from. Kestrel
                // Prime is one Blueprint, one Grip and two Blades: four parts
                // to build out of three names, and without this the set reads
                // as finished with one Blade in the foundry. Read per
                // component rather than compared against a number: every
                // itemCount in the data today is 2, and nothing here should
                // stop being true the day one is 3.
                JsonNode copies = component.path("itemCount");

                byName.put(
                        normalize(setName + " " + componentName),
                        new ItemMeta(
                                component.get("ducats").asInt(),
                                setName,
                                category,
                                copies.isInt() ? copies.asInt() : null));
            }
        }
    }

    /**
     * The dates, read off the item rather than off its components.
     *
     * <p>Separate from {@link #index} because it answers about a different
     * thing: that one walks the components and produces a row per part, this one
     * produces a row per set. Walking both in one loop would put two keys, two
     * maps and two guards in one body for no gain — the file is read once and
     * both passes are over a node already in memory.
     *
     * <p>The gate is {@code releaseDate} rather than the database's
     * {@code isPrime}: 801 of its 873 items carry a date and one Prime-named
     * melee weapon carries no flag, so the flag would silently drop a set the
     * relic catalogue does hold.
     */
    static void indexDates(JsonNode items, Map<String, SetDates> datesBySet) {
        for (JsonNode item : items) {
            String setName = item.path("name").asText("");
            if (setName.isEmpty()) continue;

            String releaseDate = item.path("releaseDate").asText("");
            if (releaseDate.isEmpty()) continue;

            String vaultDate = item.path("vaultDate").asText("");

            datesBySet.put(
                    normalize(setName),
                    new SetDates(setName, releaseDate, vaultDate.isEmpty() ? null : vaultDate));
        }
    }
}
