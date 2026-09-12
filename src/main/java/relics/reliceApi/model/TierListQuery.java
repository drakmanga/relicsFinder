package relics.reliceApi.model;

import java.util.Arrays;
import java.util.Locale;
import java.util.stream.Collectors;

/**
 * What a caller asked the Tier List for.
 *
 * <p>The three words and the number a request can carry, parsed once at the
 * edge so that nothing downstream ever sees a string it has to recognise. The
 * spellings are the wire contract — {@code ?vault=farmable&sort=solo} — and they
 * are the ones the browser already writes into a shared link, so the endpoint
 * and the tab's URL say the same words for the same thing.
 *
 * @param vault     which relics are ranked, and therefore what the medians are
 *                  of. Not optional in the sense that matters: a caller who
 *                  cannot set it gets a ranking of a catalogue they may not be
 *                  able to farm
 * @param sort      the column the rows come back in
 * @param direction which way that column runs
 * @param limit     how many rows to return, or null for all of them. It cuts
 *                  the response, never the population: the medians and the
 *                  letters are computed over every relic the vault filter left,
 *                  so asking for the top twenty ranks them against the same
 *                  catalogue asking for all of them does
 */
public record TierListQuery(Vault vault, Sort sort, Direction direction, Integer limit) {

    /** Which relics are in the running. The same three the tab offers. */
    public enum Vault {
        ALL,
        /** Currently in the drop tables. Spelled {@code farmable} on the wire. */
        FARMABLE,
        VAULTED
    }

    /** The four columns the tab can rank by. */
    public enum Sort {
        SOLO,
        RADSHARE,
        PRICE,
        RELIC;

        /**
         * Which way this column runs when the caller did not say.
         *
         * <p>Descending on the three value columns, because "the best relics"
         * is what every one of them is asked for — a {@code limit} of twenty on
         * an ascending value column would answer with the twenty worst relics
         * in the game. Ascending on the name, where the answer wanted is an
         * alphabet.
         */
        public Direction defaultDirection() {
            return this == RELIC ? Direction.ASC : Direction.DESC;
        }
    }

    public enum Direction { ASC, DESC }

    /**
     * The query a bare {@code GET} means: the whole catalogue, best solo relic
     * first, nothing cut off the end.
     */
    public static TierListQuery defaults() {
        return new TierListQuery(Vault.ALL, Sort.SOLO, Sort.SOLO.defaultDirection(), null);
    }

    /**
     * One word from the wire, as one of {@code type}'s constants.
     *
     * <p>A blank or absent parameter means the caller did not ask, and gets
     * {@code fallback}. Anything else that is not a constant is a mistake worth
     * reporting rather than absorbing: a script asking for
     * {@code ?vault=unvaulted} — a spelling this application does not use — has
     * a bug in it, and answering 200 with the whole catalogue would hide it
     * behind a ranking that looks plausible.
     *
     * @throws IllegalArgumentException naming the parameter and every spelling
     *                                  it accepts
     */
    public static <E extends Enum<E>> E parse(String raw, Class<E> type, String parameter,
                                              E fallback) {
        if (raw == null || raw.isBlank()) return fallback;

        try {
            return Enum.valueOf(type, raw.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException(
                    parameter + " must be one of " + spellings(type) + ", not \"" + raw + "\"");
        }
    }

    /** How the constants are spelled on the wire: lowercase, comma separated. */
    public static String spellings(Class<? extends Enum<?>> type) {
        return Arrays.stream(type.getEnumConstants())
                .map(constant -> constant.name().toLowerCase(Locale.ROOT))
                .collect(Collectors.joining(", "));
    }

    /** The wire spelling of one constant, for a response that echoes what it was asked. */
    public static String wire(Enum<?> constant) {
        return constant.name().toLowerCase(Locale.ROOT);
    }
}
