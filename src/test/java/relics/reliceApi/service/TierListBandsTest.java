package relics.reliceApi.service;

import org.junit.jupiter.api.Test;
import relics.reliceApi.model.TierBand;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The median and the bands around it.
 *
 * <p>Both were the browser's until brief-020 moved the ranking here, and both
 * are checked against numbers computed by hand rather than by reading the
 * implementation back: a band boundary that moves is a relic changing letter on
 * somebody's screen.
 */
class TierListBandsTest {

    @Test
    void takesTheMiddleOfAnOddPopulation() {
        assertThat(TierListService.medianOf(List.of(1.0, 5.0, 3.0))).isEqualTo(3.0);
    }

    @Test
    void takesTheMeanOfTheTwoMiddlesOfAnEvenOne() {
        assertThat(TierListService.medianOf(List.of(1.0, 2.0, 3.0, 4.0))).isEqualTo(2.5);
    }

    @Test
    void sortsNumericallyRatherThanTheWayStringsSort() {
        // 10 sorts before 9 as text, which would answer 10 instead of 9.
        assertThat(TierListService.medianOf(List.of(9.0, 10.0, 8.0))).isEqualTo(9.0);
    }

    @Test
    void leavesTheCallersListAlone() {
        List<Double> values = new ArrayList<>(List.of(3.0, 1.0, 2.0));
        TierListService.medianOf(values);
        assertThat(values).containsExactly(3.0, 1.0, 2.0);
    }

    @Test
    void hasNoAnswerForAnEmptyPopulation() {
        // Null and not zero: zero is a claim about the relics, and every band
        // computed from it would hand out an S.
        assertThat(TierListService.medianOf(List.of())).isNull();
    }

    @Test
    void putsEachBoundaryInTheBandAboveIt() {
        assertThat(TierListService.bandFor(20, 10.0)).isEqualTo(TierBand.S);
        assertThat(TierListService.bandFor(15, 10.0)).isEqualTo(TierBand.A);
        assertThat(TierListService.bandFor(12, 10.0)).isEqualTo(TierBand.B);
        assertThat(TierListService.bandFor(8, 10.0)).isEqualTo(TierBand.C);
        assertThat(TierListService.bandFor(6, 10.0)).isEqualTo(TierBand.D);
        assertThat(TierListService.bandFor(5.99, 10.0)).isEqualTo(TierBand.F);
    }

    @Test
    void dropsABandTheMomentAValueFallsUnderABoundary() {
        assertThat(TierListService.bandFor(19.999, 10.0)).isEqualTo(TierBand.A);
        assertThat(TierListService.bandFor(14.999, 10.0)).isEqualTo(TierBand.B);
        assertThat(TierListService.bandFor(11.999, 10.0)).isEqualTo(TierBand.C);
        assertThat(TierListService.bandFor(7.999, 10.0)).isEqualTo(TierBand.D);
    }

    @Test
    void scalesWithTheMedianRatherThanWithAFixedPlatinumFigure() {
        // The same 20p is an S in a cheap population and an F in an expensive
        // one. That is the whole reason the bands are multiples.
        assertThat(TierListService.bandFor(20, 10.0)).isEqualTo(TierBand.S);
        assertThat(TierListService.bandFor(20, 40.0)).isEqualTo(TierBand.F);
    }

    @Test
    void putsTheMedianRelicItselfInC() {
        assertThat(TierListService.bandFor(10, 10.0)).isEqualTo(TierBand.C);
    }

    @Test
    void refusesToLetterAnythingWithoutAMedian() {
        assertThat(TierListService.bandFor(10, null)).isNull();
        // A population whose middle relic is worth nothing gives every multiple
        // the same boundary — zero — so every relic would clear the S.
        assertThat(TierListService.bandFor(10, 0.0)).isNull();
        assertThat(TierListService.bandFor(0, 0.0)).isNull();
    }

    @Test
    void hasSixLettersAndNoE() {
        assertThat(TierBand.values()).containsExactly(
                TierBand.S, TierBand.A, TierBand.B, TierBand.C, TierBand.D, TierBand.F);
    }

    @Test
    void sortsRelicNamesTheWayAReaderCountsThem() {
        // Plain string order puts A10 between A1 and A2.
        assertThat(TierListService.compareNaturally("Axi A2", "Axi A10")).isNegative();
        assertThat(TierListService.compareNaturally("Axi A10", "Axi A9")).isPositive();
        assertThat(TierListService.compareNaturally("Lith G1", "Lith G1")).isZero();
        assertThat(TierListService.compareNaturally("Axi A1", "Lith A1")).isNegative();
    }
}
