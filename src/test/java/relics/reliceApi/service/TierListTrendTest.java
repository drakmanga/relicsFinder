package relics.reliceApi.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import relics.reliceApi.model.TierListResponse;
import relics.reliceApi.model.TierListRow;
import relics.reliceApi.model.TierTrend;

import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.data.Offset.offset;

/**
 * What ninety days did to a relic, and the difference between a relic holding
 * still and a relic nobody measured.
 *
 * <p>The fault these exist for: the column read "Steady" on all 772 relics
 * while the prices behind them carried a movement. Two of the cases below put
 * each half of that back if the arithmetic loses it.
 */
class TierListTrendTest {

    @TempDir
    Path temp;

    private TierListFixture fixture() {
        return new TierListFixture(temp);
    }

    /** One relic whose single drop carries the price and trend given. */
    private TierListRow relicWith(Double price, Double trend) {
        TierListResponse ranking = fixture()
                .relic("Axi", "A1", "Intact", "Part", "100")
                .relic("Axi", "A1", "Radiant", "Part", "100")
                .price("Part", price, trend)
                .rank();

        return ranking.rows().getFirst();
    }

    @Test
    void reportsARiseThatClearsTheGate() {
        // A price standing 25% above its ninety-day average: the baseline is
        // 100/1.25 = 80, so the relic is up 25%.
        TierListRow row = relicWith(100.0, 25.0);

        assertThat(row.trend()).isEqualTo(TierTrend.MOVED);
        assertThat(row.trendPercent()).isCloseTo(25, offset(1e-9));
    }

    @Test
    void reportsAFallThatClearsTheGate() {
        TierListRow row = relicWith(100.0, -25.0);

        assertThat(row.trend()).isEqualTo(TierTrend.MOVED);
        assertThat(row.trendPercent()).isCloseTo(-25, offset(1e-9));
    }

    @Test
    void callsAMoveTooSmallToActOnSteadyRatherThanAMovement() {
        TierListRow row = relicWith(100.0, 3.0);

        // Measured, and under the threshold. It really is holding still.
        assertThat(row.trend()).isEqualTo(TierTrend.STEADY);
        assertThat(row.trendPercent()).isNull();
    }

    @Test
    void reportsAMovementSittingExactlyOnTheThresholdInBothDirections() {
        assertThat(relicWith(110.0, 10.0).trend()).isEqualTo(TierTrend.MOVED);
        assertThat(relicWith(90.0, -10.0).trend()).isEqualTo(TierTrend.MOVED);
        assertThat(TierListService.TREND_ARROW_THRESHOLD).isEqualTo(10);
    }

    @Test
    void doesNotCallARelicNobodyMeasuredSteady() {
        // No drop carries a trend, so the baseline is a copy of today and the
        // movement computes to exactly zero — out of prices nothing was ever
        // compared against. Zero clears no threshold, which is how this used to
        // read as Steady on the whole catalogue.
        TierListRow row = relicWith(100.0, null);

        assertThat(row.trend()).isEqualTo(TierTrend.NO_BASELINE);
        assertThat(row.trendPercent()).isNull();
    }

    @Test
    void comparesAsSoonAsOneDropWasMeasured() {
        TierListResponse ranking = fixture()
                .relic("Axi", "A1", "Intact", "Measured", "50", "Untrended", "50")
                .relic("Axi", "A1", "Radiant", "Measured", "50", "Untrended", "50")
                .price("Measured", 100.0, 100.0)
                .price("Untrended", 100.0)
                .rank();

        // Today: 50% of 100 twice = 100. Ninety days ago the measured part was
        // worth 50 and the untrended one is kept at its own price, so 75. Up a
        // third.
        TierListRow row = ranking.rows().getFirst();
        assertThat(row.trend()).isEqualTo(TierTrend.MOVED);
        assertThat(row.trendPercent()).isCloseTo(33.333333, offset(1e-5));
    }

    @Test
    void keepsADropWithNoTrendInTheComparisonInsteadOfDroppingIt() {
        TierListResponse withUntrended = fixture()
                .relic("Axi", "A1", "Intact", "Measured", "50", "Untrended", "50")
                .relic("Axi", "A1", "Radiant", "Measured", "50", "Untrended", "50")
                .price("Measured", 100.0, 100.0)
                .price("Untrended", 100.0)
                .rank();

        TierListResponse measuredOnly = fixture()
                .relic("Axi", "A2", "Intact", "Measured", "50")
                .relic("Axi", "A2", "Radiant", "Measured", "50")
                .price("Measured", 100.0, 100.0)
                .rank();

        // Dropping the untrended part would compare a one-drop relic against a
        // two-drop one and report the missing drop as a price movement: 100%
        // instead of the 33% the relic actually moved.
        assertThat(withUntrended.rows().getFirst().trendPercent()).isCloseTo(33.33, offset(0.01));
        assertThat(measuredOnly.rows().getFirst().trendPercent()).isCloseTo(100, offset(1e-9));
    }

    @Test
    void survivesAPriceStandingAtNothingAgainstItsAverage() {
        // A trend of exactly -100 would divide by zero on the way to the
        // baseline; the price is kept as its own baseline instead.
        TierListRow row = relicWith(100.0, -100.0);

        assertThat(row.trend()).isEqualTo(TierTrend.STEADY);
    }

    @Test
    void hasNothingToCompareARelicThatWasWorthNothingNinetyDaysAgo() {
        assertThat(TierListService.trendBetween(10, 0, true).state())
                .isEqualTo(TierTrend.NO_BASELINE);
    }
}
