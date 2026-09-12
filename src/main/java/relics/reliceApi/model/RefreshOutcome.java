package relics.reliceApi.model;

import com.fasterxml.jackson.annotation.JsonValue;

/**
 * What came of asking for newer numbers.
 *
 * <p>One shape for all three answers rather than a success body and an error
 * body. "The source did not answer" is a fact about the snapshot, which is what
 * this endpoint reports on — the request itself did exactly what was asked —
 * and splitting it off into an HTTP failure would make the screen parse two
 * shapes to render one sentence.
 *
 * @param nextRefreshAt when this view may be re-read again, as an ISO instant.
 *                      Present on every outcome including the refused one,
 *                      because it is the one thing a screen that has just been
 *                      told "no" needs in order to say why.
 */
public record RefreshOutcome(RefreshView view, RefreshOutcome.Status status, String nextRefreshAt) {

    public enum Status {

        /** The source was read and what it returned is now the snapshot. */
        REFRESHED("refreshed"),

        /**
         * Inside the cooldown, so nothing was asked of anybody.
         *
         * <p>Not an error and not a failure: the snapshot on screen is the one
         * a re-read would have produced, so the honest answer is that there was
         * nothing to fetch.
         */
        ALREADY_CURRENT("already-current"),

        /** The source was asked and did not answer; the previous snapshot stands. */
        SOURCE_UNAVAILABLE("source-unavailable");

        private final String wire;

        Status(String wire) {
            this.wire = wire;
        }

        @JsonValue
        public String wire() {
            return wire;
        }
    }
}
