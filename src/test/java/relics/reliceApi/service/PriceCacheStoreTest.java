package relics.reliceApi.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import relics.reliceApi.model.PricePoint;
import relics.reliceApi.service.RelicMarketService.Cached;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The cache's copy on disk, which exists so that eight minutes of requests are
 * paid once rather than at every restart.
 *
 * <p>Its contract is narrow and worth holding exactly: whatever survives a
 * round trip must be what went in, and nothing about a bad file may reach the
 * caller as anything other than an empty map.
 */
class PriceCacheStoreTest {

    @TempDir
    Path temp;

    private PriceCacheStore store() {
        return new PriceCacheStore(temp.resolve("price-cache.json").toString());
    }

    private static Cached priced(double avg, int volume, PricePoint... history) {
        return new Cached(avg, avg + 1, volume, -3.5, List.of(history),
                Instant.ofEpochMilli(1_760_000_000_000L), false);
    }

    @Test
    void carriesEveryFieldThroughARoundTrip() {
        PriceCacheStore store = store();
        Cached original = priced(28.5, 47,
                new PricePoint("2026-08-10", 27.0, 26.5, 20.0, 33.0, 41),
                new PricePoint("2026-08-11", 28.5, 29.0, 22.0, 35.0, 47));

        store.save(Map.of("volt_prime_neuroptics_blueprint", original));
        Cached restored = store.load().get("volt_prime_neuroptics_blueprint");

        assertThat(restored).isNotNull();
        assertThat(restored.avg()).isEqualTo(28.5);
        assertThat(restored.median()).isEqualTo(29.5);
        assertThat(restored.volume()).isEqualTo(47);
        assertThat(restored.trend()).isEqualTo(-3.5);
        assertThat(restored.at()).isEqualTo(Instant.ofEpochMilli(1_760_000_000_000L));
        assertThat(restored.history()).hasSize(2);

        PricePoint last = restored.history().get(1);
        assertThat(last.getDate()).isEqualTo("2026-08-11");
        assertThat(last.getAvgPrice()).isEqualTo(28.5);
        assertThat(last.getMedian()).isEqualTo(29.0);
        assertThat(last.getMinPrice()).isEqualTo(22.0);
        assertThat(last.getMaxPrice()).isEqualTo(35.0);
        assertThat(last.getVolume()).isEqualTo(47);
    }

    @Test
    void keepsAnItemNobodySells() {
        // A null price is an answer — "nothing sold" — and losing it on restart
        // would send the warmer back to ask a question already answered.
        PriceCacheStore store = store();
        store.save(Map.of("forma_blueprint",
                new Cached(null, null, null, null, List.of(), Instant.now(), false)));

        assertThat(store.load()).containsKey("forma_blueprint");
        assertThat(store.load().get("forma_blueprint").avg()).isNull();
    }

    @Test
    void refusesToWriteDownACallThatFailed() {
        // A failure says nothing about the item. Carried across a restart it
        // would hide a real price behind a retry that never had to happen.
        PriceCacheStore store = store();
        store.save(Map.of(
                "rhino_prime_blueprint", priced(20.0, 300),
                "ash_prime_systems", new Cached(null, null, null, null, List.of(), Instant.now(), true)));

        assertThat(store.load()).containsOnlyKeys("rhino_prime_blueprint");
    }

    @Test
    void readsBackNothingBeforeAnythingWasWritten() {
        assertThat(store().load()).isEmpty();
    }

    @Test
    void survivesAFileThatIsNotJson() throws Exception {
        Path file = temp.resolve("price-cache.json");
        Files.writeString(file, "{ this is not json");

        // An unreadable cache is a slow first run, never a failure to start.
        assertThat(new PriceCacheStore(file.toString()).load()).isEmpty();
    }

    @Test
    void skipsAnEntryWithNoTimestampRatherThanGuessingOne() throws Exception {
        // Without `at` there is no way to tell whether the price is a minute or
        // a year old, and a guess would be indistinguishable from a fresh read.
        Path file = temp.resolve("price-cache.json");
        Files.writeString(file, """
                {"volt_prime":{"avg":10.0,"history":[]},
                 "rhino_prime":{"avg":20.0,"at":1760000000000,"history":[]}}""");

        assertThat(new PriceCacheStore(file.toString()).load()).containsOnlyKeys("rhino_prime");
    }

    @Test
    void writesTheSeriesAsArraysToKeepTheFileSmall() throws Exception {
        // The series is the bulk of the file — 1.527 listings of up to ninety
        // days — and repeating six field names on each point costs four times
        // the size for a file no human edits.
        Path file = temp.resolve("price-cache.json");
        new PriceCacheStore(file.toString()).save(Map.of("volt_prime",
                priced(1.0, 1, new PricePoint("2026-08-11", 2.0, 3.0, 4.0, 5.0, 6))));

        assertThat(new ObjectMapper().readTree(file.toFile())
                .path("volt_prime").path("history").get(0).isArray()).isTrue();
    }

    @Test
    void replacesTheFileRatherThanAppendingToIt() {
        PriceCacheStore store = store();
        store.save(Map.of("first", priced(1.0, 1)));
        store.save(Map.of("second", priced(2.0, 2)));

        assertThat(store.load()).containsOnlyKeys("second");
    }
}
