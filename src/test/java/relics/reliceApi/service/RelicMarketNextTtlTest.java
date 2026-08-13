package relics.reliceApi.service;

import org.junit.jupiter.api.Test;
import relics.reliceApi.service.RelicMarketService.Cached;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The interval an item earns from what its price actually did.
 *
 * <p>Every read is also a measurement: the new price against the one it
 * replaces. The interval moves until the drift it produces sits at 5%, so an
 * item that holds still is asked about less and less and one in a storm is asked
 * about more — and calms down on its own afterwards, with no list to maintain.
 *
 * <p>This replaced a rule keyed to trade volume, which measured the wrong thing.
 * Across ninety days of history for the whole catalogue the daily move in
 * platinum is flat whether an item sells three times a day or three hundred; the
 * percentages only differ because the same platinum is 14% of a 7p part and 2%
 * of a 23p one.
 */
class RelicMarketNextTtlTest {

    private static final Instant NOW = Instant.parse("2026-08-13T20:00:00Z");

    /** A reading of {@code price}, taken {@code ago} before NOW, on interval {@code ttl}. */
    private static Cached reading(double price, Duration ago, Duration ttl) {
        return new Cached(price, price, 50, null, List.of(), NOW.minus(ago), false, ttl);
    }

    private static Cached fresh(double price) {
        return new Cached(price, price, 50, null, List.of(), NOW, false, null);
    }

    @Test
    void leavesTheIntervalAloneWhenTheDriftIsAlreadyOnTarget() {
        // Six hours ago, and the price moved by exactly the 5% being aimed for:
        // the interval that produced it is the interval to keep.
        Duration next = RelicMarketService.nextTtl(
                reading(100, Duration.ofHours(6), Duration.ofHours(6)), fresh(105));

        assertThat(next).isBetween(Duration.ofHours(6).minusMinutes(5), Duration.ofHours(6).plusMinutes(5));
    }

    @Test
    void asksSoonerWhenThePriceRanAway() {
        // 20% in six hours is four times the target. Drift goes as the square
        // root of time, so the interval wants to be sixteen times shorter — the
        // step ceiling holds it to half, and the next reading takes it further.
        Duration next = RelicMarketService.nextTtl(
                reading(100, Duration.ofHours(6), Duration.ofHours(6)), fresh(120));

        assertThat(next).isEqualTo(Duration.ofHours(3));
    }

    @Test
    void asksLaterWhenNothingHappened() {
        Duration next = RelicMarketService.nextTtl(
                reading(100, Duration.ofHours(6), Duration.ofHours(6)), fresh(100));

        assertThat(next).isEqualTo(Duration.ofHours(9));
    }

    @Test
    void climbsOneStepAtATimeRatherThanEchoingOneQuietRead() {
        // A single still reading on an item that usually moves is not proof it
        // has settled. Half a per cent over six hours asks for a hundred times
        // the interval; it gets one and a half.
        Duration next = RelicMarketService.nextTtl(
                reading(100, Duration.ofHours(6), Duration.ofHours(6)), fresh(100.5));

        assertThat(next).isEqualTo(Duration.ofHours(9));
    }

    @Test
    void movesTheIntervalByTheSquareOfTheMiss() {
        // 6,25% against a target of 5% is a ratio of 0,8, and drift goes as the
        // square root of time — so the interval wants 0,8² = 0,64 of six hours,
        // which is 3h50m. A law that scaled linearly would answer 4h48m, and
        // both sit inside the step limits, which is what makes this the reading
        // that tells the two apart.
        Duration next = RelicMarketService.nextTtl(
                reading(100, Duration.ofHours(6), Duration.ofHours(6)), fresh(106.25));

        assertThat(next).isBetween(Duration.ofHours(3).plusMinutes(45),
                                   Duration.ofHours(3).plusMinutes(55));
    }

    @Test
    void refusesToMeasureAcrossNoTimeAtAll() {
        // Two readings on the same instant divide by zero twice over, and the
        // second one produces NaN rather than infinity — which survives every
        // comparison below it and lands as an interval of zero seconds, leaving
        // the item permanently stale and re-read every five seconds for ever.
        Cached previous = reading(100, Duration.ZERO, Duration.ofHours(7));

        assertThat(RelicMarketService.nextTtl(previous, fresh(100))).isEqualTo(Duration.ofHours(7));
        assertThat(RelicMarketService.nextTtl(previous, fresh(150))).isEqualTo(Duration.ofHours(7));
    }

    @Test
    void neverGoesBelowWhatTheSweepCanHonour() {
        // One read every five seconds is a lap of 2,1 hours for the catalogue.
        // Below three hours the interval is a promise the warmer cannot keep.
        Duration next = RelicMarketService.nextTtl(
                reading(100, Duration.ofHours(3), Duration.ofHours(3)), fresh(300));

        assertThat(next).isEqualTo(Duration.ofHours(3));
    }

    @Test
    void neverGoesAboveADay() {
        Duration next = RelicMarketService.nextTtl(
                reading(100, Duration.ofHours(20), Duration.ofHours(20)), fresh(100));

        assertThat(next).isEqualTo(Duration.ofHours(24));
    }

    @Test
    void readsTheIntervalThatWasWaitedRatherThanTheOneIntended() {
        // The sweep runs late when the queue is long. Judging the drift against
        // the interval that was asked for instead of the one that happened would
        // read a late reading as a volatile item and shorten it further, which
        // is how a queue that is behind digs itself in deeper.
        Cached late = reading(100, Duration.ofHours(12), Duration.ofHours(6));

        // 5% over twelve hours is half the drift per hour that the six-hour
        // interval was aiming at, so the interval should grow, not shrink.
        assertThat(RelicMarketService.nextTtl(late, fresh(105)))
                .isGreaterThan(Duration.ofHours(6));
    }

    @Test
    void saysNothingWhenThereIsNothingToMeasure() {
        // No previous reading, a first fetch, an item nobody sells, and a failed
        // call: all fall back to the guess from volume rather than inventing an
        // interval from one point.
        assertThat(RelicMarketService.nextTtl(null, fresh(100))).isNull();
        assertThat(RelicMarketService.nextTtl(reading(100, Duration.ofHours(6), null), fresh(100)))
                .isNotNull();

        Cached noPrice = new Cached(null, null, null, null, List.of(), NOW.minus(Duration.ofHours(6)), false);
        assertThat(RelicMarketService.nextTtl(noPrice, fresh(100))).isNull();

        Cached failed = new Cached(null, null, null, null, List.of(), NOW, true);
        assertThat(RelicMarketService.nextTtl(reading(100, Duration.ofHours(6), null), failed)).isNull();
    }

    @Test
    void keepsTheEarnedIntervalAheadOfTheGuessFromVolume() {
        // The guess is only ever a seed. Once an interval has been earned it is
        // the one that counts, however the item happens to be trading.
        Cached earned = reading(100, Duration.ZERO, Duration.ofHours(11));

        assertThat(earned.ttl()).isEqualTo(Duration.ofHours(11));
        assertThat(earned.withTtl(null).ttl()).isEqualTo(Duration.ofHours(6));
    }

    @Test
    void stillDropsEverythingForAFailedCall() {
        // A failure taught us nothing about the item, so it must not sit behind
        // an interval earned when the market was answering.
        Cached failed = new Cached(null, null, 300, null, List.of(), NOW, true, Duration.ofHours(20));

        assertThat(failed.ttl()).isEqualTo(Duration.ofMinutes(1));
    }
}
