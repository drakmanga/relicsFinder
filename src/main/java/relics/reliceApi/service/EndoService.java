package relics.reliceApi.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import org.springframework.stereotype.Service;
import relics.reliceApi.model.EndoOffer;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.locks.ReentrantLock;

/**
 * Ayatan sculptures ranked by Endo per platinum.
 *
 * <p>Built on the orders endpoint rather than on trade statistics, unlike every
 * other price in this application. A sculpture's Endo depends on how many stars
 * are socketed — an empty Anasa is 2000, a full one 3450 — and statistics
 * average across fill levels, describing a product that does not exist. Each
 * order carries its own {@code cyanStars} and {@code amberStars}, which is the
 * only place that distinction survives.
 */
@Service
public class EndoService {

    /** Inside {@link #TTL}, so a caller never arrives to find it expired. */
    private static final Duration WARM_INTERVAL = Duration.ofMinutes(4);

    private final MarketRateLimiter rateLimiter;
    private final ColdStartOrder coldStartOrder;


    private final ScheduledExecutorService warmer =
            Executors.newSingleThreadScheduledExecutor(runnable -> {
                Thread thread = new Thread(runnable, "endo-warmer");
                thread.setDaemon(true);
                return thread;
            });

    public EndoService(MarketRateLimiter rateLimiter, ColdStartOrder coldStartOrder) {
        this.rateLimiter = rateLimiter;
        this.coldStartOrder = coldStartOrder;
    }

    private static final String ORDERS = "https://api.warframe.market/v2/orders/item/";

    /** Open orders churn constantly, unlike the closed-trade prices elsewhere. */
    private static final Duration TTL = Duration.ofMinutes(5);
    private static final Duration TIMEOUT = Duration.ofSeconds(15);

    /**
     * Every sculpture, with its verified Endo values.
     *
     * <p>Endo = (B + 50C + 100A) × (1 + M(C + A) / S), checked against the
     * published filled value of each one.
     *
     * <p>Chattraka is the same shape as Hemakara and Zambuka — base 450, two
     * cyan and one amber, 2600 filled — which pins its multiplier at 3.0 by the
     * same arithmetic that fixes theirs.
     *
     * <p>Loose Cyan and Amber stars are not here and are not meant to be. They
     * are bought to fill a sculpture, not to be dissolved, so ranking them by
     * Endo per platinum would answer a question nobody asks.
     */
    // Package-private, not private: the formula below is checked against the
    // filled value the game publishes for each sculpture, and that check is a
    // test rather than a comment.
    static final List<Sculpture> SCULPTURES = List.of(
            new Sculpture("Ayatan Anasa Sculpture", "ayatan_anasa_sculpture", 2000, 2, 2, 0.5),
            new Sculpture("Ayatan Kitha Sculpture", "ayatan_kitha_sculpture", 450, 4, 1, 3.0),
            new Sculpture("Ayatan Orta Sculpture", "ayatan_orta_sculpture", 650, 3, 1, 2.0),
            new Sculpture("Ayatan Chattraka Sculpture", "ayatan_chattraka_sculpture", 450, 2, 1, 3.0),
            new Sculpture("Ayatan Hemakara Sculpture", "ayatan_hemakara_sculpture", 450, 2, 1, 3.0),
            new Sculpture("Ayatan Zambuka Sculpture", "ayatan_zambuka_sculpture", 450, 2, 1, 3.0),
            new Sculpture("Ayatan Vaya Sculpture", "ayatan_vaya_sculpture", 400, 2, 1, 2.0),
            new Sculpture("Ayatan Piv Sculpture", "ayatan_piv_sculpture", 375, 2, 1, 2.0),
            new Sculpture("Ayatan Valana Sculpture", "ayatan_valana_sculpture", 325, 2, 1, 2.0),
            new Sculpture("Ayatan Sah Sculpture", "ayatan_sah_sculpture", 300, 2, 1, 2.0),
            new Sculpture("Ayatan Ayr Sculpture", "ayatan_ayr_sculpture", 325, 3, 0, 2.0)
    );

    record Sculpture(String name, String slug, int base, int cyanSockets,
                     int amberSockets, double multiplier) {
        int sockets() {
            return cyanSockets + amberSockets;
        }

        int endoFor(int cyan, int amber) {
            // Stars beyond the sockets cannot exist, but a bad order should not
            // inflate the result if the API ever reports one.
            int c = Math.min(cyan, cyanSockets);
            int a = Math.min(amber, amberSockets);
            double raw = (base + 50.0 * c + 100.0 * a) * (1 + multiplier * (c + a) / sockets());
            return (int) Math.round(raw);
        }
    }

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(TIMEOUT)
            .followRedirects(HttpClient.Redirect.NORMAL)
            .build();

    private final ObjectMapper mapper = new ObjectMapper();
    private final ReentrantLock lock = new ReentrantLock();

    private volatile List<EndoOffer> cached = List.of();
    private volatile Instant fetchedAt = Instant.EPOCH;

    /**
     * When the list {@link #offers()} returns was read, or empty before the
     * first read.
     *
     * <p>Kept apart from the offers themselves so that reporting it does not
     * change the shape of {@code /offers}, which five callers already parse as
     * a bare array.
     */
    public Optional<Instant> fetchedAt() {
        Instant at = fetchedAt;
        return at.equals(Instant.EPOCH) ? Optional.empty() : Optional.of(at);
    }

    /**
     * Starts the rolling refresh.
     *
     * <p>Eleven sculptures at one request per slot is about four seconds, and
     * until this existed those four seconds were spent with the Endo screen
     * open and empty, because the only thing that ever refreshed the list was
     * somebody asking for it. Running it just inside the window instead means
     * the answer is already on hand when the question arrives. The work did not
     * get faster — the rate limit fixes that — it stopped being in the way.
     *
     * <p>The first pass runs at once rather than after a delay, so the gap
     * where the screen still has to wait is the app's first few seconds rather
     * than its first few minutes.
     */
    @PostConstruct
    void startWarming() {
        warmer.scheduleWithFixedDelay(() -> {
            try {
                refresh(Duration.ZERO);
            } catch (RuntimeException e) {
                // A failed pass is the next pass's problem: the thread has to
                // survive it or the list stops refreshing for good.
                System.err.println("endo: warming pass failed — " + e.getMessage());
            } finally {
                // Signalled whatever happened, including a pass that came back
                // with nothing: the price sweep is waiting on this, and a
                // market that is down must delay the catalogue by one pass, not
                // by the whole session.
                coldStartOrder.endoReady();
            }
        }, 0, WARM_INTERVAL.toSeconds(), TimeUnit.SECONDS);
    }

    @PreDestroy
    void stopWarming() {
        warmer.shutdownNow();
    }

    /**
     * Every buyable offer, best Endo per platinum first.
     *
     * <p>Served from the list the warmer keeps: passes run every four minutes
     * and the TTL is five, so in the ordinary case this returns without a
     * request. The fetch is still here for the case the warmer has not managed
     * one yet — the first seconds of a session, or a market that was down.
     */
    public List<EndoOffer> offers() {
        return refresh(TTL);
    }

    /**
     * @param maxAge how old the list may be and still count as an answer.
     *               {@link Duration#ZERO} forces the work, which is what a
     *               warming pass wants: reusing {@link #TTL} here made every
     *               second pass a no-op — the pass fell four minutes inside a
     *               five-minute window and returned the list it was supposed
     *               to be replacing — so the refresh ran every eight minutes
     *               and left three of them stale, which is precisely the wait
     *               the warming exists to remove.
     */
    private List<EndoOffer> refresh(Duration maxAge) {
        if (Duration.between(fetchedAt, Instant.now()).compareTo(maxAge) < 0) return cached;

        lock.lock();
        try {
            if (Duration.between(fetchedAt, Instant.now()).compareTo(maxAge) < 0) return cached;


            List<EndoOffer> offers = new ArrayList<>();
            for (Sculpture sculpture : SCULPTURES) {
                // Booked before the request, not slept off after it. Sleeping
                // afterwards added the round trip to the spacing — about 530ms
                // between calls at this endpoint's ~180ms latency, where the
                // limit only asks for 350 — and, being private to this service,
                // it let the rolling warmer and this loop each stay under the
                // ceiling while their sum went over it.
                rateLimiter.awaitSlot();
                offers.addAll(fetch(sculpture));
            }

            offers.sort(Comparator.comparingDouble(EndoOffer::getRatio).reversed());
            cached = List.copyOf(offers);
            fetchedAt = Instant.now();
            return cached;

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return cached;
        } catch (Exception e) {
            System.err.println("endo: refresh failed — " + e.getMessage());
            return cached;
        } finally {
            lock.unlock();
        }
    }

    private List<EndoOffer> fetch(Sculpture sculpture) {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(ORDERS + sculpture.slug()))
                    .timeout(TIMEOUT)
                    .header("accept", "application/json")
                    .header("User-Agent", ApiIdentity.USER_AGENT)
                    .GET()
                    .build();

            HttpResponse<String> response =
                    httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) return List.of();

            List<EndoOffer> out = new ArrayList<>();

            for (JsonNode order : mapper.readTree(response.body()).path("data")) {
                if (!"sell".equals(order.path("type").asText())) continue;
                if (!order.path("visible").asBoolean(false)) continue;

                // Only sellers who are in the game right now: an order from
                // someone offline cannot be bought, and leaving them in fills
                // the ranking with offers that have sat there for months.
                if (!"ingame".equals(order.path("user").path("status").asText())) continue;

                int platinum = order.path("platinum").asInt(0);
                if (platinum <= 0) continue;

                int cyan = order.path("cyanStars").asInt(0);
                int amber = order.path("amberStars").asInt(0);
                int endo = sculpture.endoFor(cyan, amber);

                out.add(new EndoOffer(
                        sculpture.name(),
                        sculpture.slug(),
                        platinum,
                        cyan,
                        amber,
                        endo,
                        Math.round((double) endo / platinum * 10) / 10.0,
                        order.path("user").path("ingameName").asText(""),
                        order.path("quantity").asInt(1)));
            }
            return out;

        } catch (Exception e) {
            System.err.println("endo: " + sculpture.slug() + " — " + e.getMessage());
            return List.of();
        }
    }
}
