package relics.reliceApi.service;

import org.junit.jupiter.api.Test;
import relics.reliceApi.model.PricePoint;
import relics.reliceApi.model.TrendGap;
import relics.reliceApi.service.RelicMarketService.Cached;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Why a price carries no ninety-day trend.
 *
 * <p>Four causes end in the same null, and the screen showing it has to tell
 * them apart: an item nobody has ever listed, a market that did not answer, a
 * market too thin to have a curve, and an item the cache has not reached. The
 * first two are indistinguishable outside this service — both are a cache entry
 * with no price and no history — so getting the order of the branches wrong
 * would report a minute of bad network as a part that does not sell.
 */
class RelicMarketTrendGapTest {

    private static PricePoint day(String date, double price) {
        return new PricePoint(date, price, price, price, price, 3);
    }

    /** {@code days} days that traded, all at the same price. */
    private static List<PricePoint> history(int days, double price) {
        List<PricePoint> out = new ArrayList<>();
        for (int i = 1; i <= days; i++) out.add(day(String.format("2026-06-%02d", i), price));
        return out;
    }

    private static Cached answered(Double avg, Double trend, List<PricePoint> history) {
        return new Cached(avg, avg, 12, trend, history, Instant.now(), false);
    }

    @Test
    void anItemTheCacheHasNotReachedHasNoGapEither() {
        // The one state that resolves itself: the caller reads a null trend
        // beside a null gap and draws the skeleton it draws for a price.
        assertThat(RelicMarketService.trendGap(null)).isNull();
    }

    @Test
    void aFailedCallIsNotAMarketWithoutListings() {
        Cached failed = new Cached(null, null, null, null, List.of(), Instant.now(), true);
        Cached noListings = new Cached(null, null, null, null, List.of(), Instant.now(), false);

        // Identical in every field but the flag, which is the whole point of
        // the flag and the reason this branch is asked about first.
        assertThat(RelicMarketService.trendGap(failed)).isEqualTo(TrendGap.NO_ANSWER);
        assertThat(RelicMarketService.trendGap(noListings)).isEqualTo(TrendGap.NO_LISTINGS);
    }

    @Test
    void aPricedItemWithNoTrendIsAThinMarket() {
        assertThat(RelicMarketService.trendGap(answered(9.0, null, history(4, 9.0))))
                .isEqualTo(TrendGap.TOO_FEW_SALES);
    }

    @Test
    void aTrendThatExistsNeedsNoExplanation() {
        assertThat(RelicMarketService.trendGap(answered(9.0, 12.5, history(30, 8.0)))).isNull();
    }

    @Test
    void theFloorIsSevenDaysThatTraded() {
        // The distinguishing pair, written as 6 and 7 rather than as
        // MIN_TREND_DAYS either side of the boundary. Reading the constant here
        // would make this test agree with whatever the constant says, and the
        // floor is a decision about which half of the catalogue gets a number:
        // it is pinned, not echoed.
        assertThat(RelicMarketService.trend(12.0, history(6, 10.0))).isNull();
        assertThat(RelicMarketService.trend(12.0, history(7, 10.0))).isEqualTo(20.0);
    }

    @Test
    void ninetyDaysAveragingNothingIsNotADivisionByZero() {
        assertThat(RelicMarketService.trend(12.0, history(30, 0.0))).isNull();
    }
}
