package relics.reliceApi.service;

/**
 * What a forced re-read actually goes and reads.
 *
 * <p>Two of them behind three views, which is why this exists as its own
 * vocabulary: the cooldown is held here rather than on the view, so a user who
 * refreshes Ducanetor and then the Tier List has asked the same host the same
 * question twice and gets told so.
 */
public enum RefreshSource {

    /**
     * What Prime gear exists at all: the drop tables and the WFCD item
     * database. This is the half a newly released Prime arrives through, and
     * neither of its two hosts spends the warframe.market budget.
     */
    CATALOGUE,

    /** The open Ayatan sell orders the Endo ranking is built from. */
    ORDERS
}
