package relics.reliceApi.model;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * One Prime set's place in the price cycle, and the dates it was read from.
 *
 * <p>A property of a SET rather than of a relic, which is why nothing here
 * reaches the Tier List: only 110 of 767 relics hold contents from a single
 * phase, with a median of two distinct phases per relic, so a phase badge on a
 * relic would be false for seven relics out of eight.
 *
 * <p>The dates ride along with the phase because the screen that shows one shows
 * the other: "vaulted since 2018" is what makes the badge a fact rather than an
 * assertion, and a second request for one date per set would be a round trip to
 * fill a line of text.
 */
@JsonInclude(JsonInclude.Include.ALWAYS)
public record PrimeLifecycle(
        String setName,
        PrimePhase phase,

        /** {@code yyyy-MM-dd}, from the item database. Null for a set it does not carry. */
        String releaseDate,

        /**
         * When the set last left the drop tables, {@code yyyy-MM-dd}.
         *
         * <p>Null both for a set that has never been vaulted and for one the item
         * database does not carry — {@link PrimePhase} is what separates those
         * two, and it is the field to read rather than this one.
         */
        String vaultDate) {}
