package relics.reliceApi.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PreDestroy;
import org.springframework.stereotype.Service;
import relics.reliceApi.model.ItemPrice;
import relics.reliceApi.model.PricePoint;
import relics.reliceApi.model.RelicPrice;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.*;
import java.util.function.Function;

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
     * <p>Enforced on the start of each call rather than by sleeping after it,
     * so the rate stays exact while several fetches are in flight. See
     * {@link #WARMERS}.
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

    /**
     * How many fetches are in flight at once.
     *
     * <p>One was not enough, and not because of the rate limit. A single worker
     * spends the whole round trip waiting — the ceiling it hit was the latency
     * of warframe.market, about five seconds a call, so the queue drained at
     * ten an hour's worth of items rather than the three a second we are
     * allowed. A catalogue of six hundred parts and as many relics took over an
     * hour to price, which is to say the newest column on the table stayed
     * empty for anyone who did not leave the app open.
     *
     * <p>The rate limit is still exact: workers take numbered slots from
     * {@link #awaitSlot}, so requests start {@value #SPACING_MS}ms apart no
     * matter how many threads are asking. Six is enough to keep a slot always
     * ready at that latency, and small enough that a slow market does not turn
     * into a pile of sockets.
     */
    private static final int WARMERS = 6;

    private final ExecutorService warmer = Executors.newFixedThreadPool(WARMERS, runnable -> {
        Thread thread = new Thread(runnable, "market-warmer");
        thread.setDaemon(true);
        return thread;
    });

    /** Guards the next free request slot, so the spacing is global. */
    private final Object rateLock = new Object();
    private long nextSlotAt = 0;

    private volatile boolean running = true;

    public RelicMarketService(DucatService ducatService) {
        this.ducatService = ducatService;
        for (int i = 0; i < WARMERS; i++) warmer.submit(this::warmLoop);
    }

    /**
     * Waits for this worker's turn to call the market.
     *
     * <p>Slots are handed out in advance rather than measured after the fact:
     * every caller books the next one and sleeps until it arrives, so the
     * interval holds even when a fetch takes ten times longer than the spacing.
     */
    private void awaitSlot() throws InterruptedException {
        long wait;

        synchronized (rateLock) {
            long now = System.currentTimeMillis();
            long slot = Math.max(now, nextSlotAt);
            nextSlotAt = slot + SPACING_MS;
            wait = slot - now;
        }

        if (wait > 0) Thread.sleep(wait);
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

    /**
     * Prices for many relics in one call.
     *
     * <p>The relics table lists the whole catalogue, and buying a relic is the
     * alternative to farming it — so the price belongs on every row, not on the
     * one that happens to be open. Asked for one at a time that is hundreds of
     * requests against a market that allows about three a second.
     *
     * <p>Unlike {@link #getAveragePrice}, a relic with no listings comes back
     * with a null price rather than -1: the response is a lookup table the
     * caller joins on, and a sentinel number in it would be indistinguishable
     * from a real one.
     */
    public List<RelicPrice> getRelicPrices(List<String> relicNames) {
        List<RelicPrice> out = new ArrayList<>(relicNames.size());

        for (String name : relicNames) {
            if (name == null || name.isBlank()) continue;

            String relicName = name.trim();
            String slug = relicSlug(relicName);
            Cached cached = cache.get(slug);

            // Queued, not waited on. One slow relic must not hold up the other
            // thirty on screen — the warmer fills it in and the next poll from
            // the client picks it up.
            if (cached == null || !cached.isFresh()) enqueue(slug);

            out.add(new RelicPrice(relicName, cached == null ? null : cached.avg()));
        }

        return out;
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
        enqueueAllSlugs(itemNames, RelicMarketService::itemSlug);
    }

    /**
     * Same, for whole relics.
     *
     * <p>Separate because a relic and a part reach the market through different
     * slugs. Without this the relics table showed no price at all until someone
     * opened it and then waited for the queue to reach the back — every restart
     * of the server, for every user.
     */
    public void enqueueAllRelics(Collection<String> relicNames) {
        enqueueAllSlugs(relicNames, RelicMarketService::relicSlug);
    }

    private void enqueueAllSlugs(Collection<String> names, Function<String, String> toSlug) {
        for (String name : names) {
            if (name == null || name.isBlank()) continue;
            String slug = toSlug.apply(name.trim());
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

                // The slot is taken before the call, not after: the spacing has
                // to sit between the starts of two requests, and a worker that
                // slept afterwards would let five others fire at once.
                awaitSlot();
                cache.put(slug, fetch(slug));
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
                    System.err.println("market: HTTP " + response.statusCode() + " for " + slug);
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
            System.err.println("market: error on " + slug + " — " + e.getMessage());
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
     * "Volt Prime Neuroptics Blueprint" → "volt_prime_neuroptics_blueprint".
     *
     * <p>The name is kept whole. This used to strip a trailing "Blueprint" from
     * part names, on the belief that warframe.market did not carry it — and the
     * shortened slug did answer, but with a 301 to the full one, which the HTTP
     * client follows silently. That worked for as long as every part had a
     * redirect behind it. Warframes released since Hildryn have none, so
     * Revenant, Wisp, Caliban, Lavos and the rest came back 404 and were
     * displayed as parts nobody is selling, which is a different and much
     * quieter kind of wrong.
     */
    static String itemSlug(String itemName) {
        return baseSlug(itemName);
    }

    /**
     * A name as warframe.market spells it in a URL.
     *
     * <p>"&" becomes "and" rather than a separator: the market writes "Cobra &
     * Crane Prime Hilt" as {@code cobra_and_crane_prime_hilt}, and collapsing
     * the ampersand into an underscore produced a slug for a weapon that does
     * not exist. Every dual weapon in the game was priced at nothing because of
     * it.
     */
    private static String baseSlug(String value) {
        return value == null ? "" : value.trim()
                .toLowerCase(Locale.ROOT)
                .replace("&", " and ")
                .replaceAll("[^a-z0-9]+", "_")
                .replaceAll("^_+|_+$", "");
    }
}
