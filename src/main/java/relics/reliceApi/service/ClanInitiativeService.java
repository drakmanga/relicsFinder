package relics.reliceApi.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import relics.reliceApi.Expection.ClanInitiativeUnavailableException;
import relics.reliceApi.model.ClanInitiativeTier;
import relics.reliceApi.model.ClanInitiativeWeek;

import java.net.URI;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.function.LongSupplier;

/**
 * What the Clan Weekly Initiative pays this week and the next, read from the
 * game's own worldstate.
 *
 * <p>Straight from Digital Extreme rather than from warframestat: the
 * worldstate's {@code WeeklyVaultBonusRewards} lists next week as well as this
 * one, and warframestat passes on only the current week, under a key spelled
 * {@code rewwards} that would break the day somebody corrects it.
 *
 * <p>Cached, because the answer changes once a week and a room full of open
 * tabs should cost one request, not one each.
 */
@Service
public class ClanInitiativeService {

    /**
     * The Monday the worldstate's {@code WeekCount} counts from: week 667
     * starts on 2026-11-23, which puts week 0 on 2014-02-10. Checked against
     * warframestat's own {@code activation} for the same week.
     */
    static final long WEEK_ZERO = Instant.parse("2014-02-10T00:00:00Z").toEpochMilli();
    static final long WEEK_MS = Duration.ofDays(7).toMillis();

    /** The reward the page cares about, by its internal name's last segment. */
    static final String KUVA = "Kuva";

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private final Callable<String> worldstate;
    private final LongSupplier clock;
    private final long ttlMs;

    /** Guarded by {@code this}. */
    private List<ClanInitiativeWeek> cached;
    private long cachedAt;

    @Autowired
    public ClanInitiativeService(
            @Value("${relics.clan-initiative.worldstate-url}") String url,
            @Value("${relics.clan-initiative.cache:PT30M}") Duration ttl) {
        this(() -> UpstreamText.get(URI.create(url)), System::currentTimeMillis, ttl);
    }

    /** For the tests, which hand in the worldstate text and the time. */
    ClanInitiativeService(Callable<String> worldstate, LongSupplier clock, Duration ttl) {
        this.worldstate = worldstate;
        this.clock = clock;
        this.ttlMs = ttl.toMillis();
    }

    /**
     * The weeks the worldstate announces, earliest first.
     *
     * @throws ClanInitiativeUnavailableException when the worldstate cannot be
     *                                            read and nothing is cached
     *                                            younger than the TTL
     */
    public synchronized List<ClanInitiativeWeek> weeks() {
        long now = clock.getAsLong();
        if (cached != null && now - cachedAt < ttlMs) return cached;

        try {
            cached = parse(MAPPER.readTree(worldstate.call()));
            cachedAt = now;
            return cached;
        } catch (Exception e) {
            System.err.println("clan-initiative: worldstate unreadable — " + e.getMessage());
            throw new ClanInitiativeUnavailableException(
                    "The game's worldstate could not be read, so this week's clan initiative is unknown.", e);
        }
    }

    static List<ClanInitiativeWeek> parse(JsonNode worldstate) {
        List<ClanInitiativeWeek> weeks = new ArrayList<>();
        for (JsonNode week : worldstate.path("WeeklyVaultBonusRewards")) {
            List<ClanInitiativeTier> tiers = new ArrayList<>();
            for (JsonNode reward : week.path("Rewards")) {
                String name = lastSegment(reward.path("Reward").asText(""));
                int count = reward.path("ItemCount").asInt(0);
                tiers.add(new ClanInitiativeTier(
                        reward.path("PointThreshold").asInt(0), name, count, KUVA.equals(name) ? count : 0));
            }
            tiers.sort(Comparator.comparingInt(ClanInitiativeTier::points));

            int kuva = tiers.stream().mapToInt(ClanInitiativeTier::kuva).sum();
            long start = WEEK_ZERO + week.path("WeekCount").asLong(0) * WEEK_MS;
            weeks.add(new ClanInitiativeWeek(start, lastSegment(week.path("BonusRegion").asText("")),
                    List.copyOf(tiers), kuva));
        }
        weeks.sort(Comparator.comparingLong(ClanInitiativeWeek::week));
        return List.copyOf(weeks);
    }

    /** "/Lotus/StoreItems/Types/Items/MiscItems/Kuva" → "Kuva". */
    private static String lastSegment(String path) {
        return path.substring(path.lastIndexOf('/') + 1);
    }
}
