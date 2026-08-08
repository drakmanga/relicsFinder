package relics.reliceApi.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import relics.reliceApi.model.EndoOffer;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.*;
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

    private static final String ORDERS = "https://api.warframe.market/v2/orders/item/";

    /** Open orders churn constantly, unlike the closed-trade prices elsewhere. */
    private static final Duration TTL = Duration.ofMinutes(5);
    private static final Duration TIMEOUT = Duration.ofSeconds(15);
    private static final long SPACING_MS = 320;

    /**
     * The ten sculptures whose Endo values are verified.
     *
     * <p>Endo = (B + 50C + 100A) × (1 + M(C + A) / S), checked against the
     * published filled values for all ten.
     *
     * <p>Ayatan Chattraka is tradeable but absent from the reference tables, so
     * its base and multiplier are unknown and it is left out rather than
     * guessed. Loose Cyan and Amber stars are likewise excluded: 50 and 100 are
     * their contribution inside a socket, not a confirmed dissolve value.
     */
    private static final List<Sculpture> SCULPTURES = List.of(
            new Sculpture("Ayatan Anasa Sculpture", "ayatan_anasa_sculpture", 2000, 2, 2, 0.5),
            new Sculpture("Ayatan Kitha Sculpture", "ayatan_kitha_sculpture", 450, 4, 1, 3.0),
            new Sculpture("Ayatan Orta Sculpture", "ayatan_orta_sculpture", 650, 3, 1, 2.0),
            new Sculpture("Ayatan Hemakara Sculpture", "ayatan_hemakara_sculpture", 450, 2, 1, 3.0),
            new Sculpture("Ayatan Zambuka Sculpture", "ayatan_zambuka_sculpture", 450, 2, 1, 3.0),
            new Sculpture("Ayatan Vaya Sculpture", "ayatan_vaya_sculpture", 400, 2, 1, 2.0),
            new Sculpture("Ayatan Piv Sculpture", "ayatan_piv_sculpture", 375, 2, 1, 2.0),
            new Sculpture("Ayatan Valana Sculpture", "ayatan_valana_sculpture", 325, 2, 1, 2.0),
            new Sculpture("Ayatan Sah Sculpture", "ayatan_sah_sculpture", 300, 2, 1, 2.0),
            new Sculpture("Ayatan Ayr Sculpture", "ayatan_ayr_sculpture", 325, 3, 0, 2.0)
    );

    private record Sculpture(String name, String slug, int base, int cyanSockets,
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

    /** Every buyable offer, best Endo per platinum first. */
    public List<EndoOffer> offers() {
        if (Duration.between(fetchedAt, Instant.now()).compareTo(TTL) < 0) return cached;

        lock.lock();
        try {
            if (Duration.between(fetchedAt, Instant.now()).compareTo(TTL) < 0) return cached;

            List<EndoOffer> offers = new ArrayList<>();
            for (Sculpture sculpture : SCULPTURES) {
                offers.addAll(fetch(sculpture));
                Thread.sleep(SPACING_MS);
            }

            offers.sort(Comparator.comparingDouble(EndoOffer::getRatio).reversed());
            cached = List.copyOf(offers);
            fetchedAt = Instant.now();
            return cached;

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return cached;
        } catch (Exception e) {
            System.err.println("endo: aggiornamento fallito — " + e.getMessage());
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
