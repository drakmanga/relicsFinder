package relics.reliceApi.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import relics.reliceApi.model.ItemPrice;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Semaphore;

/**
 * Prices from warframe.market.
 *
 * <p>Two things this has to get right, because a results screen asks for dozens
 * of prices at once:
 *
 * <ul>
 *   <li><b>Cache.</b> A price is cached server-side for 15 minutes, so it is
 *       paid once for every user rather than once per browser. Without it each
 *       visitor re-fetches the same forty items.
 *   <li><b>Rate limiting.</b> warframe.market allows roughly three requests a
 *       second. A batch of forty issued in parallel gets throttled or banned, so
 *       concurrency is capped and misses are spaced out.
 * </ul>
 */
@Service
public class RelicMarketService {

    private static final String API = "https://api.warframe.market/v1/items/";

    /** Prices move, but not minute to minute. */
    private static final Duration TTL = Duration.ofMinutes(15);

    /** A failed lookup is remembered too, so an unlisted item is not retried in a loop. */
    private static final Duration MISS_TTL = Duration.ofMinutes(5);

    private static final Duration TIMEOUT = Duration.ofSeconds(10);

    /** Roughly the documented ceiling of three requests a second. */
    private static final int MAX_CONCURRENT = 3;
    private static final long SPACING_MS = 350;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(TIMEOUT)
            .followRedirects(HttpClient.Redirect.NORMAL)
            .build();

    private final ObjectMapper mapper = new ObjectMapper();
    private final Map<String, Cached> cache = new ConcurrentHashMap<>();
    private final DucatService ducatService;

    public RelicMarketService(DucatService ducatService) {
        this.ducatService = ducatService;
    }

    private final Semaphore slots = new Semaphore(MAX_CONCURRENT);

    private record Cached(Double price, Instant at) {
        boolean isFresh() {
            Duration ttl = price == null ? MISS_TTL : TTL;
            return Duration.between(at, Instant.now()).compareTo(ttl) < 0;
        }
    }

    /**
     * Average price of a whole relic. Kept for the existing
     * {@code /api/market/{relicName}} endpoint.
     *
     * @return the average, or -1 when unavailable — the contract the original
     *         controller was written against.
     */
    public double getAveragePrice(String relicName) {
        Double price = priceFor(relicSlug(relicName));
        return price == null ? -1 : price;
    }

    /**
     * Everything the UI needs about one Prime part: what it trades for, what it
     * is worth in ducats, and which set it completes.
     */
    public ItemPrice getItemPrice(String itemName) {
        String slug = itemSlug(itemName);
        DucatService.ItemMeta meta = ducatService.lookup(itemName);
        return new ItemPrice(itemName, priceFor(slug), slug, meta.ducats(), meta.setName());
    }

    /**
     * Prices for many items at once.
     *
     * <p>Cache hits are answered immediately; only the misses reach the network,
     * spaced out to stay inside the rate limit. Ordering of the response matches
     * the request.
     */
    public List<ItemPrice> getItemPrices(List<String> itemNames) {
        List<ItemPrice> out = new ArrayList<>(itemNames.size());

        for (String name : itemNames) {
            if (name == null || name.isBlank()) continue;
            out.add(getItemPrice(name.trim()));
        }

        return out;
    }

    private Double priceFor(String slug) {
        Cached cached = cache.get(slug);
        if (cached != null && cached.isFresh()) return cached.price();

        Double fetched = fetchAveragePrice(slug);
        cache.put(slug, new Cached(fetched, Instant.now()));
        return fetched;
    }

    private Double fetchAveragePrice(String slug) {
        try {
            slots.acquire();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return null;
        }

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

            // 404 means the item is not traded — a legitimate answer, not a fault.
            if (response.statusCode() == 404) return null;
            if (response.statusCode() != 200) {
                System.err.println("market: HTTP " + response.statusCode() + " per " + slug);
                return null;
            }

            JsonNode stats = mapper.readTree(response.body())
                    .path("payload").path("statistics_live").path("48hours");

            double sum = 0;
            int count = 0;
            for (JsonNode entry : stats) {
                if (entry.hasNonNull("avg_price")) {
                    sum += entry.get("avg_price").asDouble();
                    count++;
                }
            }

            if (count == 0) return null;
            return Math.round((sum / count) * 100) / 100.0;

        } catch (Exception e) {
            System.err.println("market: errore su " + slug + " — " + e.getMessage());
            return null;
        } finally {
            // Space the next request out before freeing the slot, so the pause
            // limits the request rate rather than just the parallelism.
            try {
                Thread.sleep(SPACING_MS);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
            slots.release();
        }
    }

    /** "Lith V9" → "lith_v9_relic". */
    static String relicSlug(String relicName) {
        return baseSlug(relicName) + "_relic";
    }

    /**
     * "Volt Prime Neuroptics Blueprint" → "volt_prime_neuroptics".
     *
     * <p>The drop tables append "Blueprint" to most part names while
     * warframe.market does not, so the suffix is dropped — but only when
     * something sits between "Prime" and it.
     *
     * <p>Two names must survive intact. "Volt Prime Blueprint" is a part in its
     * own right, the main blueprint; stripping the suffix would turn it into the
     * set and cost it its price. "Forma Blueprint" is not a Prime part at all.
     */
    static String itemSlug(String itemName) {
        String cleaned = itemName == null ? "" : itemName.trim();
        String lower = cleaned.toLowerCase(Locale.ROOT);

        if (lower.endsWith(" blueprint")) {
            String withoutSuffix = cleaned.substring(0, cleaned.length() - " blueprint".length());
            String remainder = withoutSuffix.toLowerCase(Locale.ROOT).trim();

            // Ends with "prime" → "Blueprint" was the component, not a suffix.
            if (remainder.contains(" prime ") || !remainder.endsWith("prime")) {
                if (remainder.contains("prime")) cleaned = withoutSuffix;
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
