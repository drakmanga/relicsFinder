package relics.reliceApi.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import relics.reliceApi.Expection.FissureUnavailableException;
import relics.reliceApi.model.Fissure;
import relics.reliceApi.model.FissureFeed;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.*;

/**
 * The Void Fissures open right now, read through a short cache.
 *
 * <p>The cache is the point of this class rather than an optimisation of it.
 * Every viewer of the Relic Crack tab asks for the list, and without one a
 * dozen open tabs would be a dozen calls to a community-run API every refresh.
 * With it a burst of viewers costs one call per TTL, and the browser never
 * talks to warframestat at all.
 *
 * <p>Expired fissures are dropped on every read, not only on fetch: a cached
 * list is up to one TTL old, and a fissure that closed inside that window
 * would otherwise be recommended for a minute after it stopped existing.
 *
 * <p>A failed fetch is remembered for one TTL too, and answered with
 * {@link FissureUnavailableException} rather than an empty list. "No fissures"
 * would be a claim about the game; an unreachable provider is not evidence
 * for it. Remembering the failure keeps an outage from turning every request
 * into a ten-second wait on the same dead host.
 */
@Service
public class FissureService {

    private final FissureSource source;
    private final Duration ttl;
    private final Map<String, Integer> minutesByMission;
    private final Clock clock;
    private final ObjectMapper mapper = new ObjectMapper();

    /** Last answer, success or failure, and when it was taken. Guarded by {@code this}. */
    private List<Fissure> cached;
    private FissureUnavailableException failure;
    private Instant fetchedAt;

    @Autowired
    public FissureService(
            FissureSource source,
            @Value("${relics.fissures.ttl}") Duration ttl,
            @Value("#{${relics.fissures.minutes}}") Map<String, Integer> minutesByMission) {
        this(source, ttl, minutesByMission, Clock.systemUTC());
    }

    /** For the tests, which step time rather than sleep through a TTL. */
    FissureService(FissureSource source, Duration ttl, Map<String, Integer> minutesByMission, Clock clock) {
        this.source = source;
        this.ttl = ttl;
        // Case-insensitive because the table is typed by hand in a properties
        // file and the worldstate's casing is not a contract.
        TreeMap<String, Integer> minutes = new TreeMap<>(String.CASE_INSENSITIVE_ORDER);
        minutes.putAll(minutesByMission);
        this.minutesByMission = Collections.unmodifiableMap(minutes);
        this.clock = clock;
    }

    /** The open fissures and the minutes table, or a typed failure. */
    public FissureFeed current() {
        Instant now = clock.instant();
        List<Fissure> all = snapshot(now);

        List<Fissure> open = all.stream()
                .filter(fissure -> isOpen(fissure, now))
                .toList();

        return new FissureFeed(open, minutesByMission);
    }

    /**
     * The cached list, refreshed when older than the TTL.
     *
     * <p>Synchronised as a whole: the second of two simultaneous callers waits
     * for the first fetch and reads its result, which is what "a burst costs
     * one upstream call" means.
     */
    private synchronized List<Fissure> snapshot(Instant now) {
        boolean fresh = fetchedAt != null && Duration.between(fetchedAt, now).compareTo(ttl) < 0;

        if (!fresh) {
            fetchedAt = now;
            try {
                cached = parse(source.fetch());
                failure = null;
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                remember(e);
            } catch (Exception e) {
                remember(e);
            }
        }

        if (failure != null) throw failure;
        return cached;
    }

    private void remember(Exception cause) {
        cached = null;
        failure = new FissureUnavailableException(
                "fissure data unavailable: " + cause.getMessage(), cause);
    }

    private List<Fissure> parse(String json) throws Exception {
        JsonNode root = mapper.readTree(json);
        if (!root.isArray()) throw new IllegalStateException("expected a JSON array of fissures");

        List<Fissure> parsed = new ArrayList<>();
        for (JsonNode node : root) {
            String missionType = node.path("missionType").asText("");
            parsed.add(new Fissure(
                    node.path("id").asText(""),
                    node.path("node").asText(""),
                    missionType,
                    node.path("tier").asText(""),
                    node.path("isHard").asBoolean(false),
                    node.path("isStorm").asBoolean(false),
                    node.path("expiry").asText(""),
                    minutesByMission.get(missionType)));
        }
        return parsed;
    }

    /**
     * Whether the fissure is still up.
     *
     * <p>An expiry that does not parse counts as closed: recommending a node
     * nobody can say is still open is worse than leaving one out.
     */
    private static boolean isOpen(Fissure fissure, Instant now) {
        try {
            return Instant.parse(fissure.expiry()).isAfter(now);
        } catch (DateTimeParseException e) {
            return false;
        }
    }
}
