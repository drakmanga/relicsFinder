package relics.reliceApi.model;

import com.fasterxml.jackson.annotation.JsonValue;

/**
 * Where a Prime set sits in the cycle its price follows.
 *
 * <p>Three phases and not six. The six-phase curve the clan guides draw — a
 * spike at release, a decline, a floor, a climb through the vault, a drop at
 * unvault — was measured against this project's own catalogue on 2026-08-30 and
 * it no longer separates: 115 of 160 sets sit in one flat phase, and its first
 * two hold nine sets between them. The mechanism is named by the guide's own
 * author in 2025 — Prime Resurgence returns a set roughly twice a year instead
 * of once every two or three, so nothing stays vaulted long enough to climb any
 * more, and crossplay merged the platforms into one market on top of that.
 *
 * <p>What still separates is not age but supply: whether the set is dropping
 * right now, and how recently it stopped. Measured over the 157 sets with a
 * price, against the ninety-day trend the price cache holds for each of them:
 *
 * <pre>
 *   dropping            35 sets   median 23,9p   median trend  -11,5%   83% fell
 *   recently vaulted    20 sets   median ~50p    median trend   +9,4%   85% rose
 *   long vaulted       102 sets   median 69,3p   median trend   +0,7%   87% within 10%
 * </pre>
 *
 * <p>The phase is deliberately NOT computed from that trend, nor from any trade
 * count. It is derived from the release date, the vault date and the drop tables
 * alone, so that it stays an independent claim the measured trend can agree or
 * disagree with — the percentages above are what that agreement is worth. A
 * phase read off the trend would be the trend under another name, and the screen
 * already carries the trend beside it.
 *
 * <p>Serialised hyphenated, like {@link TrendGap}, because the frontend narrows
 * both against a union of string literals.
 */
public enum PrimePhase {

    /**
     * In the drop tables today: the set can be farmed, so more of it reaches the
     * market every day and the price usually falls.
     */
    DROPPING("dropping"),

    /**
     * Out of the drop tables for less than {@link relics.reliceApi.service.PrimeLifecycleService#RECENTLY_VAULTED},
     * so what is in circulation is all there is and the price usually climbs.
     */
    RECENTLY_VAULTED("recently-vaulted"),

    /** Out of the drop tables for longer than that: supply and demand have settled. */
    LONG_VAULTED("long-vaulted"),

    /**
     * The set is not dropping and nothing here knows when it stopped.
     *
     * <p>An answer rather than a gap. Kavasa Prime is the one set in the relic
     * catalogue the item database does not carry, so it has no vault date to
     * measure from, and claiming either vaulted phase about it would be
     * inventing the date the claim rests on.
     */
    UNKNOWN("unknown");

    private final String wire;

    PrimePhase(String wire) {
        this.wire = wire;
    }

    @JsonValue
    public String wire() {
        return wire;
    }
}
