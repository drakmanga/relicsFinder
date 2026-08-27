package relics.reliceApi.service;

import org.junit.jupiter.api.Test;
import relics.reliceApi.model.PricePoint;
import relics.reliceApi.service.RelicMarketService.Cached;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * How many trades a relic's price is actually backed by.
 *
 * <p>This is the number a "worth selling instead of opening" badge is allowed
 * to appear on, and it has to be the ninety-day one. Relic prices are far
 * thinner than part prices — a median of 6 completed trades in ninety days
 * against 42, with 67% of relics under ten — so a relic listed at 190p is
 * usually one lucky sale rather than a market.
 *
 * <p>The reading it must not be is {@code Cached.volume}, the 48-hour window
 * sitting in the same entry. That one is roughly an order of magnitude smaller,
 * so a threshold read off it would quietly become a threshold of a hundred-odd
 * trades and the badge would never appear at all.
 */
class RelicMarketTradeCountTest {

    private static PricePoint day(String date, int volume) {
        return new PricePoint(date, 20.0, 20.0, 15.0, 25.0, volume);
    }

    /** An answered lookup: a price, a 48-hour {@code volume}, and its history. */
    private static Cached answered(Integer volume, List<PricePoint> history) {
        return new Cached(20.0, 20.0, volume, null, history, Instant.now(), false);
    }

    @Test
    void addsUpEveryDayThatTraded() {
        Cached cached = answered(4, List.of(
                day("2026-06-01", 3),
                day("2026-06-02", 0),
                day("2026-06-03", 7),
                day("2026-06-04", 2)));

        assertThat(RelicMarketService.tradeCount90d(cached)).isEqualTo(12);
    }

    @Test
    void countsTheNinetyDaysRatherThanTheLastFortyEightHours() {
        // The distinguishing case: both numbers are present and they disagree.
        // Reading the cheap one turns "at least ten trades in ninety days" into
        // a bar nothing in the catalogue clears.
        Cached cached = answered(2, List.of(
                day("2026-06-01", 40),
                day("2026-06-02", 35),
                day("2026-06-03", 2)));

        assertThat(cached.volume()).isEqualTo(2);
        assertThat(RelicMarketService.tradeCount90d(cached)).isEqualTo(77);
    }

    @Test
    void saysNothingRatherThanZeroWhenNothingHasBeenAsked() {
        // Three ways to have no history, and all three are "we do not know" —
        // never "nobody traded it". Zero here would let the badge decide a relic
        // is untraded on the strength of the warmer not having reached it yet.
        assertThat(RelicMarketService.tradeCount90d(null)).isNull();
        assertThat(RelicMarketService.tradeCount90d(answered(null, List.of()))).isNull();

        Cached failed = new Cached(null, null, null, null, List.of(), Instant.now(), true);
        assertThat(RelicMarketService.tradeCount90d(failed)).isNull();
    }

    @Test
    void answersZeroWhenTheMarketDidReportNinetyQuietDays() {
        // The other side of the same distinction: a history of days that all
        // traded nothing is an answer, and it is the answer that keeps the badge
        // off the relic.
        Cached cached = answered(0, List.of(day("2026-06-01", 0), day("2026-06-02", 0)));

        assertThat(RelicMarketService.tradeCount90d(cached)).isZero();
    }
}
