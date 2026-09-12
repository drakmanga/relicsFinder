package relics.reliceApi.model;

import com.fasterxml.jackson.annotation.JsonValue;

import java.util.Locale;

/**
 * A screen whose numbers can be made newer on demand.
 *
 * <p>Three of them, and only three: these are the views that exist to answer
 * one question with a number — ducats per platinum, Endo per platinum, where a
 * relic ranks — where the number not moving is the whole failure. The other
 * four list the catalogue, which a reload has never been expected to change.
 *
 * <p>Two of the three read the same source, and that is deliberate rather than
 * an oversight: what the caller names is the screen it is looking at, and which
 * source that screen rests on is this application's business. The cooldown is
 * held on the source, so refreshing Ducanetor and then the Tier List inside the
 * window is one re-read and one refusal — see {@code SnapshotRefresher}.
 */
public enum RefreshView {

    DUCATS("ducats"),
    ENDO("endo"),
    TIERS("tiers");

    private final String wire;

    RefreshView(String wire) {
        this.wire = wire;
    }

    /** The spelling a caller writes and reads; the constant name is Java's business. */
    @JsonValue
    public String wire() {
        return wire;
    }

    /**
     * @throws IllegalArgumentException naming what this accepts, so a caller
     *                                  that misspelled a view learns which
     *                                  three words exist rather than being
     *                                  handed a default it never asked for
     */
    public static RefreshView parse(String value) {
        String wanted = value == null ? "" : value.trim().toLowerCase(Locale.ROOT);

        for (RefreshView view : values()) {
            if (view.wire.equals(wanted)) return view;
        }

        throw new IllegalArgumentException(
                "Unknown view \"" + value + "\": expected ducats, endo or tiers");
    }
}
