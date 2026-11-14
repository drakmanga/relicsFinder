package relics.reliceApi.service;

import org.junit.jupiter.api.Test;
import relics.reliceApi.Expection.FissureUnavailableException;
import relics.reliceApi.model.Fissure;
import relics.reliceApi.model.FissureFeed;

import java.io.IOException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class FissureServiceTest {

    private static final Duration TTL = Duration.ofSeconds(60);
    private static final Instant NOW = Instant.parse("2026-11-14T12:00:00Z");
    private static final Map<String, Integer> MINUTES = Map.of("Capture", 1, "Survival", 5);

    /** Two open fissures and one that closed a minute ago, in the worldstate's own shape. */
    private static final String PAYLOAD = """
            [
              {"id":"a","node":"Hepit (Void)","missionType":"Capture","tier":"Lith",
               "isHard":false,"isStorm":false,"expiry":"2026-11-14T12:30:00.000Z"},
              {"id":"b","node":"Mot (Void)","missionType":"Survival","tier":"Axi",
               "isHard":true,"isStorm":false,"expiry":"2026-11-14T13:00:00.000Z"},
              {"id":"c","node":"Old (Void)","missionType":"Capture","tier":"Neo",
               "isHard":false,"isStorm":false,"expiry":"2026-11-14T11:59:00.000Z"},
              {"id":"d","node":"Ganalen's Grave (Veil)","missionType":"Skirmish","tier":"Meso",
               "isHard":false,"isStorm":true,"expiry":"2026-11-14T12:40:00.000Z"}
            ]
            """;

    private static final class SteppingClock extends Clock {
        private Instant now;

        SteppingClock(Instant now) {
            this.now = now;
        }

        void advance(Duration by) {
            now = now.plus(by);
        }

        @Override
        public Instant instant() {
            return now;
        }

        @Override
        public ZoneOffset getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }
    }

    /** Counts calls, and answers with whatever it is told to. */
    private static final class CountingSource implements FissureSource {
        final AtomicInteger calls = new AtomicInteger();
        String body = PAYLOAD;
        IOException failure;

        @Override
        public String fetch() throws IOException {
            calls.incrementAndGet();
            if (failure != null) throw failure;
            return body;
        }
    }

    private final CountingSource source = new CountingSource();
    private final SteppingClock clock = new SteppingClock(NOW);
    private final FissureService service = new FissureService(source, TTL, MINUTES, clock);

    @Test
    void normalisesEveryFieldTheScreenReads() {
        Fissure capture = service.current().fissures().getFirst();

        assertThat(capture).isEqualTo(new Fissure(
                "a", "Hepit (Void)", "Capture", "Lith", false, false, "2026-11-14T12:30:00.000Z", 1));
    }

    @Test
    void carriesTheSteelPathAndVoidStormFlags() {
        FissureFeed feed = service.current();

        assertThat(feed.fissures()).filteredOn(Fissure::steelPath).extracting(Fissure::id).containsExactly("b");
        assertThat(feed.fissures()).filteredOn(Fissure::voidStorm).extracting(Fissure::id).containsExactly("d");
    }

    @Test
    void dropsAFissureThatHasAlreadyExpired() {
        assertThat(service.current().fissures()).extracting(Fissure::id).containsExactly("a", "b", "d");
    }

    /** The cached list is up to a TTL old; a fissure closing inside it must not linger. */
    @Test
    void dropsAFissureThatExpiresWhileTheListIsCached() {
        FissureService longCache = new FissureService(source, Duration.ofHours(1), MINUTES, clock);
        assertThat(longCache.current().fissures()).extracting(Fissure::id).contains("a");

        clock.advance(Duration.ofMinutes(31));

        assertThat(longCache.current().fissures()).extracting(Fissure::id).doesNotContain("a");
        assertThat(source.calls).hasValue(1);
    }

    @Test
    void aMissionTypeTheTableDoesNotRateHasNoMinutes() {
        Fissure storm = service.current().fissures().stream()
                .filter(fissure -> fissure.id().equals("d"))
                .findFirst()
                .orElseThrow();

        assertThat(storm.minutes()).isNull();
    }

    @Test
    void readsTheTableWhateverTheCasing() {
        FissureService lowerCase = new FissureService(source, TTL, Map.of("capture", 1), clock);

        assertThat(lowerCase.current().fissures().getFirst().minutes()).isEqualTo(1);
    }

    @Test
    void handsTheWholeMinutesTableToTheBrowser() {
        assertThat(service.current().missionMinutes()).containsEntry("Capture", 1).containsEntry("Survival", 5);
    }

    @Test
    void twoCallsInsideTheTtlCostOneUpstreamRequest() {
        service.current();
        clock.advance(TTL.minusSeconds(1));
        service.current();

        assertThat(source.calls).hasValue(1);
    }

    @Test
    void aCallPastTheTtlFetchesAgain() {
        service.current();
        clock.advance(TTL);
        service.current();

        assertThat(source.calls).hasValue(2);
    }

    /** Down is not empty: an empty list would read as "no fissures open". */
    @Test
    void anUnreachableUpstreamIsATypedErrorNotAnEmptyList() {
        source.failure = new IOException("HTTP 502");

        assertThatThrownBy(service::current)
                .isInstanceOf(FissureUnavailableException.class)
                .hasMessageContaining("fissure data unavailable")
                .hasMessageContaining("HTTP 502");
    }

    @Test
    void aFailureIsRememberedForOneTtlRatherThanRetriedOnEveryRequest() {
        source.failure = new IOException("timeout");

        assertThatThrownBy(service::current).isInstanceOf(FissureUnavailableException.class);
        assertThatThrownBy(service::current).isInstanceOf(FissureUnavailableException.class);

        assertThat(source.calls).hasValue(1);
    }

    @Test
    void recoversOnceTheUpstreamAnswersAgain() {
        source.failure = new IOException("timeout");
        assertThatThrownBy(service::current).isInstanceOf(FissureUnavailableException.class);

        source.failure = null;
        clock.advance(TTL);

        assertThat(service.current().fissures()).hasSize(3);
    }

    @Test
    void aPayloadThatIsNotAListIsAnErrorToo() {
        source.body = "{\"error\":\"rate limited\"}";

        assertThatThrownBy(service::current).isInstanceOf(FissureUnavailableException.class);
    }
}
