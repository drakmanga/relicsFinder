package relics.reliceApi.model;

import java.util.Map;

/**
 * How many of each capped Kuva offer the player has bought in one week.
 *
 * <p>The week travels with the counts because it is the whole reset: the
 * client reads counts stamped with an earlier week as empty, so Monday clears
 * the list with nothing having to run on the server at midnight.
 *
 * @param week   the Monday 00:00 UTC the week started on, in epoch milliseconds
 * @param counts  purchases per offer, keyed by the offer's id in the Kuva
 *                catalogue ("teshin", "acrithis-husk")
 * @param rewards Kuva collected from each weekly reward, keyed by the
 *                reward's id ("icebind", "sortie"). An amount rather than a
 *                count, because the Icebind and the clan initiative pay a
 *                different sum each week and only the player knows which.
 */
public record KuvaPurchases(long week, Map<String, Integer> counts, Map<String, Integer> rewards) {

    /** A file written before rewards were tracked has no `rewards` field: none collected. */
    public KuvaPurchases {
        if (rewards == null) rewards = Map.of();
    }

    public KuvaPurchases(long week, Map<String, Integer> counts) {
        this(week, counts, Map.of());
    }

    public static KuvaPurchases none() {
        return new KuvaPurchases(0, Map.of(), Map.of());
    }
}
