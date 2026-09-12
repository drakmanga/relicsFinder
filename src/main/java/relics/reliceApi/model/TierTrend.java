package relics.reliceApi.model;

import com.fasterxml.jackson.annotation.JsonValue;

/**
 * What ninety days did to one relic's solo value — or why there is no answer.
 *
 * <p>The reason this is a word beside the percentage rather than a null
 * percentage on its own: a relic whose drops carry no measured trend is not
 * steady. It is the application comparing six prices against copies of
 * themselves and reporting the zero it just manufactured, and that is most of
 * the catalogue — parts trade thinly enough that a market with fewer than
 * {@code MIN_TREND_DAYS} trading days in ninety, which earns no trend at all,
 * is the common case rather than the exception. The column read "Steady" on all
 * 772 relics before the two were told apart.
 *
 * <p>Serialised hyphenated, like {@link TrendGap} and {@link PrimePhase}.
 */
public enum TierTrend {

    /**
     * Measured, and past the threshold worth reporting — see
     * {@code TierListService.TREND_ARROW_THRESHOLD}. This is the one state
     * where {@code trendPercent} carries a number.
     */
    MOVED("moved"),

    /** Measured, and under the threshold. The relic really is holding still. */
    STEADY("steady"),

    /** Nothing was measured on the other side of the comparison. */
    NO_BASELINE("no-baseline");

    private final String wire;

    TierTrend(String wire) {
        this.wire = wire;
    }

    @JsonValue
    public String wire() {
        return wire;
    }
}
