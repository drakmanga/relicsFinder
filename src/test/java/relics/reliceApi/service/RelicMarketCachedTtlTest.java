package relics.reliceApi.service;

import org.junit.jupiter.api.Test;
import relics.reliceApi.service.RelicMarketService.Cached;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * How long an answer is kept, which is what turned 36.648 requests a day into
 * 3.732.
 *
 * <p>The rule has to be read off the answer itself: {@code volume} arrives in
 * the same response as the price, so an item that stops trading slows itself
 * down and one that starts trading speeds itself up, with no list to maintain
 * when a Prime is released.
 */
class RelicMarketCachedTtlTest {

    private static Cached with(Integer volume, boolean failed) {
        return new Cached(volume == null ? null : 10.0, 10.0, volume, null,
                List.of(), Instant.now(), failed);
    }

    private static Cached aged(Integer volume, Duration age) {
        return new Cached(10.0, 10.0, volume, null, List.of(), Instant.now().minus(age), false);
    }

    @Test
    void readsATradedItemFourTimesADay() {
        assertThat(with(300, false).ttl()).isEqualTo(Duration.ofHours(6));
        assertThat(with(20, false).ttl()).isEqualTo(Duration.ofHours(6));
    }

    @Test
    void readsAQuietItemOnceADay() {
        // Nineteen trades in two days is not a price that moves between reads.
        assertThat(with(19, false).ttl()).isEqualTo(Duration.ofHours(24));
        assertThat(with(0, false).ttl()).isEqualTo(Duration.ofHours(24));
    }

    @Test
    void readsAnItemNobodySellsOnceADayToo() {
        // Deliberately not a week or a month, though it would cost less: the
        // parts of a Prime go from no trades to hundreds on the night it is
        // unvaulted, which is exactly when the price is worth having.
        assertThat(with(null, false).ttl()).isEqualTo(Duration.ofHours(24));
    }

    @Test
    void asksAgainAlmostAtOnceWhenTheCallFailed() {
        // A failure taught us nothing about the item, so it must not be held
        // for a day the way a real "nothing sold" is.
        assertThat(with(null, true).ttl()).isEqualTo(Duration.ofMinutes(1));
        assertThat(with(300, true).ttl()).isEqualTo(Duration.ofMinutes(1));
    }

    @Test
    void countsAFailedCallAsNothingAtAll() {
        // The record of a failure holds no price, no volume and no history, so
        // everywhere a miss is looked for it has to read as one. Otherwise a
        // market that was down during the first fill leaves 1.527 entries the
        // warm-up no longer considers missing, and recovery falls to the sweep
        // alone — one name every five seconds, two hours for the catalogue.
        assertThat(RelicMarketService.isMissing(null)).isTrue();
        assertThat(RelicMarketService.isMissing(with(null, true))).isTrue();
        assertThat(RelicMarketService.isMissing(with(300, true))).isTrue();
    }

    @Test
    void countsAnItemNobodySellsAsAnAnswer() {
        // The opposite case, and the reason the two cannot be told apart by the
        // price alone: both carry a null price, and only one is worth asking
        // about again straight away.
        assertThat(RelicMarketService.isMissing(with(null, false))).isFalse();
        assertThat(RelicMarketService.isMissing(with(300, false))).isFalse();
    }

    @Test
    void goesStaleExactlyAtItsOwnDeadline() {
        assertThat(aged(300, Duration.ofHours(5)).isFresh()).isTrue();
        assertThat(aged(300, Duration.ofHours(7)).isFresh()).isFalse();

        // The same age, a different answer: the quiet one is still good.
        assertThat(aged(1, Duration.ofHours(7)).isFresh()).isTrue();
        assertThat(aged(1, Duration.ofHours(25)).isFresh()).isFalse();
    }
}
