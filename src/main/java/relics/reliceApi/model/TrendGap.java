package relics.reliceApi.model;

import com.fasterxml.jackson.annotation.JsonValue;

/**
 * Why a price carries no ninety-day trend.
 *
 * <p>A null {@code trend} used to be one fact with four different meanings
 * behind it, and the screen showing it had to pick one — which it did by
 * saying nothing, or by saying "steady" about a movement nobody had measured.
 * Two of the four are decided here and cannot be worked out from anywhere
 * else: a market that answered "no listings" and a market that did not answer
 * look identical once the response is thrown away, and the {@code failed} flag
 * that separates them never left the service.
 *
 * <p>The fifth cause is not in this enum on purpose. An item the price cache
 * has not reached yet has no entry at all, so it carries no gap either, and a
 * caller reading a null trend beside a null gap is reading "not asked yet" —
 * the one state that resolves itself in a few seconds, and the one state a
 * label would be wrong about a moment later.
 *
 * <p>Serialised as the hyphenated form rather than as {@code NO_ANSWER}: the
 * wire already spells {@code category} that way, and the frontend narrows both
 * against a union of string literals.
 */
public enum TrendGap {

    /** The market did not answer. Says nothing about the item. */
    NO_ANSWER("no-answer"),

    /** The market answered: nobody has ever listed this. */
    NO_LISTINGS("no-listings"),

    /**
     * Listed and traded, but on fewer than {@code MIN_TREND_DAYS} of the last
     * ninety days — too thin a market to have a curve.
     */
    TOO_FEW_SALES("too-few-sales");

    private final String wire;

    TrendGap(String wire) {
        this.wire = wire;
    }

    @JsonValue
    public String wire() {
        return wire;
    }
}
