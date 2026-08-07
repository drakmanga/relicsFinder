package relics.reliceApi.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PreDestroy;
import org.springframework.stereotype.Service;
import relics.reliceApi.model.ItemPrice;
import relics.reliceApi.model.PricePoint;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.*;

/**
 * Prices from warframe.market.
 *
 * <p>Reads {@code statistics_closed} — trades that actually completed — rather
 * than {@code statistics_live}, which is the order book. The order book splits
 * into buy and sell, and averaging the two together yields a number nobody
 * trades at: for Volt Prime Neuroptics buyers offer about 15 and sellers ask
 * about 30, while closed trades sit near 27.
 *
 * <p>Lookups are served from an in-memory cache that a background warmer keeps
 * filled. The API allows roughly three requests a second, so a screen asking
 * for forty prices on demand would take fifteen seconds; the warmer pays that
 * cost once, in the background, for every user at once.
 */
@Service
public class RelicMarketService {

    private static final String API = "https://api.warframe.market/v1/items/";

    /** Prices move over days, not minutes; the warmer re-reads on this cycle. */
    private static final Duration TTL = Duration.ofMinutes(30);

    /** An unlisted item stays unlisted; retrying it constantly wastes the budget. */
    private static final Duration MISS_TTL = Duration.ofHours(6);

    private static final Duration TIMEOUT = Duration.ofSeconds(15);

    /**
     * One request every 320ms — about three a second, the documented ceiling.
     *
     * <p>Serialised rather than parallel-with-a-cap: a single queue makes the
     * rate exact instead of approximate, and nothing here is latency-sensitive
     * because callers read the cache.
     */
    private static final long SPACING_MS = 320;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(TIMEOUT)
            .followRedirects(HttpClient.Redirect.NORMAL)
            .build();

    private final ObjectMapper mapper = new ObjectMapper();
    private final DucatService ducatService;

    private final Map<String, Cached> cache = new ConcurrentHashMap<>();

    /** Items waiting to be fetched. */
    private final LinkedBlockingDeque<String> queue = new LinkedBlockingDeque<>();
    private final Set<String> queued = ConcurrentHashMap.newKeySet();

    private final ExecutorService warmer = Executors.newSingleThreadExecutor(runnable -> {
        Thread thread = new Thread(runnable, "market-warmer");
        thread.setDaemon(true);
        return thread;
    });

    private volatile boolean running = true;

    public RelicMarketService(DucatService ducatService) {
        this.ducatService = ducatService;
        warmer.submit(this::warmLoop);
    }

    @PreDestroy
    void shutdown() {
        running = false;
        warmer.shutdownNow();
    }

    /** What one lookup produced. A null price is a real answer: nothing sold. */
    private record Cached(Double avg, Double median, Integer volume, Double trend,
                          List<PricePoint> history, Instant at) {
        boolean isFresh() {
            Duration ttl = avg == null ? MISS_TTL : TTL;
            return Duration.between(at, Instant.now()).compareTo(ttl) < 0;
        }
    }

    /* ------------------------------------------------------------------ */
    /* Reads — never block on the network                                  */
    /* ------------------------------------------------------------------ */

    /**
     * Price and metadata for one part.
     *
     * <p>Returns immediately. A cache miss queues the item and answers with
     * nulls, so a screen paints at once and fills in as prices arrive rather
     * than holding the response for fifteen seconds.
     */
    public ItemPrice getItemPrice(String itemName) {
        String slug = itemSlug(itemName);
        Cached cached = cache.get(slug);

        if (cached == null || !cached.isFresh()) enqueue(slug);

        DucatService.ItemMeta meta = ducatService.lookup(itemName);

        // Field order matches ItemPrice: name, price, median, volume, trend,
        // slug, ducats, set.
        return new ItemPrice(
                itemName,
                cached == null ? null : cached.avg(),
                cached == null ? null : cached.median(),
                cached == null ? null : cached.volume(),
                cached == null ? null : cached.trend(),
                slug,
                meta.ducats(),
                meta.setName());
    }

    public List<ItemPrice> getItemPrices(List<String> itemNames) {
        List<ItemPrice> out = new ArrayList<>(itemNames.size());
        for (String name : itemNames) {
            if (name != null && !name.isBlank()) out.add(getItemPrice(name.trim()));
        }
        return out;
    }

    /** Ninety days of completed trades. Empty until the item has been fetched. */
    public List<PricePoint> getHistory(String itemName) {
        String slug = itemSlug(itemName);
        Cached cached = cache.get(slug);

        if (cached == null || !cached.isFresh()) {
            enqueueFirst(slug);
            // A chart has someone looking at it, so a short wait beats an empty
            // panel; the cached copy is returned immediately if there is one.
            if (cached == null) cached = awaitBriefly(slug);
        }
        return cached == null ? List.of() : cached.history();
    }

    /**
     * Average price of a whole relic.
     *
     * @return the average, or -1 when unavailable — the contract the original
     *         controller was written against.
     */
    public double getAveragePrice(String relicName) {
        String slug = relicSlug(relicName);
        Cached cached = cache.get(slug);

        if (cached == null || !cached.isFresh()) {
            enqueueFirst(slug);
            if (cached == null) cached = awaitBriefly(slug);
        }
        return cached == null || cached.avg() == null ? -1 : cached.avg();
    }

    /** How much of the catalogue is priced. Drives the "warming" hint in the UI. */
    public Map<String, Object> cacheStatus() {
        long fresh = cache.values().stream().filter(Cached::isFresh).count();
        return Map.of(
                "cached", cache.size(),
                "fresh", fresh,
                "queued", queue.size());
    }

    /* ------------------------------------------------------------------ */
    /* Warmer                                                              */
    /* ------------------------------------------------------------------ */

    /** Queues a slug at the back — background refresh. */
    private void enqueue(String slug) {
        if (queued.add(slug)) queue.addLast(slug);
    }

    /** Queues a slug at the front — someone is waiting on this one. */
    private void enqueueFirst(String slug) {
        queue.remove(slug);
        queued.add(slug);
        queue.addFirst(slug);
    }

    /** Warms a whole catalogue, e.g. every Prime part in the drop tables. */
    public void enqueueAll(Collection<String> itemNames) {
        for (String name : itemNames) {
            if (name == null || name.isBlank()) continue;
            String slug = itemSlug(name.trim());
            Cached cached = cache.get(slug);
            if (cached == null || !cached.isFresh()) enqueue(slug);
        }
    }

    private void warmLoop() {
        while (running) {
            try {
                String slug = queue.poll(1, TimeUnit.SECONDS);
                if (slug == null) continue;

                queued.remove(slug);

                Cached existing = cache.get(slug);
                if (existing != null && existing.isFresh()) continue;

                cache.put(slug, fetch(slug));
                Thread.sleep(SPACING_MS);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return;
            } catch (Exception e) {
                System.err.println("market-warmer: " + e.getMessage());
            }
        }
    }

    /** Gives the warmer a moment when a caller is genuinely waiting. */
    private Cached awaitBriefly(String slug) {
        for (int i = 0; i < 40; i++) {
            Cached cached = cache.get(slug);
            if (cached != null) return cached;
            try {
                Thread.sleep(100);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return null;
            }
        }
        return cache.get(slug);
    }

    private Cached fetch(String slug) {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(API + slug + "/statistics"))
                    .timeout(TIMEOUT)
                    .header("accept", "application/json")
                    .header("platform", "pc")
                    .GET()
                    .build();

            HttpResponse<String> response =
                    httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            // 404 means the item is not traded — an answer, not a fault.
            if (response.statusCode() != 200) {
                if (response.statusCode() != 404) {
                    System.err.println("market: HTTP " + response.statusCode() + " per " + slug);
                }
                return new Cached(null, null, null, null, List.of(), Instant.now());
            }

            JsonNode closed = mapper.readTree(response.body())
                    .path("payload").path("statistics_closed");

            List<PricePoint> history = points(closed.path("90days"));
            Window recent = window(closed.path("48hours"));

            // Nothing sold in 48 hours: the last day that did sell is a better
            // answer than none at all.
            if (recent.avg() == null && !history.isEmpty()) {
                PricePoint last = history.get(history.size() - 1);
                recent = new Window(last.getAvgPrice(), last.getMedian(), last.getVolume());
            }

            return new Cached(recent.avg(), recent.median(), recent.volume(),
                    trend(recent.avg(), history), history, Instant.now());

        } catch (Exception e) {
            System.err.println("market: errore su " + slug + " — " + e.getMessage());
            return new Cached(null, null, null, null, List.of(), Instant.now());
        }
    }

    private record Window(Double avg, Double median, Integer volume) {}

    private Window window(JsonNode series) {
        double sum = 0, medianSum = 0;
        int count = 0, volume = 0;

        for (JsonNode entry : series) {
            if (!entry.hasNonNull("avg_price")) continue;
            double avg = entry.get("avg_price").asDouble();
            sum += avg;
            medianSum += entry.path("median").asDouble(avg);
            volume += entry.path("volume").asInt(0);
            count++;
        }

        if (count == 0) return new Window(null, null, null);
        return new Window(round(sum / count), round(medianSum / count), volume);
    }

    private List<PricePoint> points(JsonNode series) {
        List<PricePoint> out = new ArrayList<>();

        for (JsonNode entry : series) {
            if (!entry.hasNonNull("avg_price")) continue;
            String datetime = entry.path("datetime").asText("");
            double avg = entry.get("avg_price").asDouble();

            out.add(new PricePoint(
                    datetime.length() >= 10 ? datetime.substring(0, 10) : datetime,
                    round(avg),
                    round(entry.path("median").asDouble(avg)),
                    round(entry.path("min_price").asDouble(0)),
                    round(entry.path("max_price").asDouble(0)),
                    entry.path("volume").asInt(0)));
        }
        return out;
    }

    /** Current price against the 90-day average, as a percentage. */
    private Double trend(Double current, List<PricePoint> history) {
        if (current == null || history.size() < 7) return null;

        double sum = 0;
        for (PricePoint point : history) sum += point.getAvgPrice();
        double baseline = sum / history.size();
        if (baseline <= 0) return null;

        return round((current - baseline) / baseline * 100);
    }

    private static double round(double value) {
        return Math.round(value * 100) / 100.0;
    }

    /* ------------------------------------------------------------------ */
    /* Slugs                                                               */
    /* ------------------------------------------------------------------ */

    /** "Lith V9" → "lith_v9_relic". */
    static String relicSlug(String relicName) {
        return baseSlug(relicName) + "_relic";
    }

    /**
     * "Volt Prime Neuroptics Blueprint" → "volt_prime_neuroptics".
     *
     * <p>The drop tables append "Blueprint" to most part names while
     * warframe.market does not, so the suffix is dropped — but only when
     * something sits between "Prime" and it. "Volt Prime Blueprint" is a part in
     * its own right, the main blueprint, and "Forma Blueprint" is not a Prime
     * part at all; both must survive intact.
     */
    static String itemSlug(String itemName) {
        String cleaned = itemName == null ? "" : itemName.trim();
        String lower = cleaned.toLowerCase(Locale.ROOT);

        if (lower.endsWith(" blueprint")) {
            String withoutSuffix = cleaned.substring(0, cleaned.length() - " blueprint".length());
            String remainder = withoutSuffix.toLowerCase(Locale.ROOT).trim();

            if (remainder.contains("prime") && !remainder.endsWith("prime")) {
                cleaned = withoutSuffix;
            }
        }

        return baseSlug(cleaned);
    }

    private static String baseSlug(String value) {
        return value == null ? "" : value.trim()
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "_")
                .replaceAll("^_+|_+$", "");
    }
}
