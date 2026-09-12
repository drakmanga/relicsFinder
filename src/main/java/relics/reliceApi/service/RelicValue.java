package relics.reliceApi.service;

import relics.reliceApi.model.Rewards;

import java.util.Comparator;
import java.util.List;
import java.util.Map;

/**
 * What one run of a relic pays, alone and in a squad.
 *
 * <p>The two formulas the Tier List is built on, and nothing else: no median,
 * no letter and no opinion about which relics are in the population. They are
 * here rather than inside {@link TierListService} because they answer a
 * question about a list of rewards — the ranking is what asks it 772 times.
 *
 * <p>Their twins are {@code expectedValue} and {@code squadValue} in
 * {@code apps/web/src/lib/rows.ts}, which the Relics view computes per
 * refinement as the slider moves. That view ranks nothing, so it is not the
 * duplication brief-020 set out to remove — but it is a duplication, and the
 * two sides must agree: a change to either formula belongs in both files, and
 * the cases pinned in {@code RelicValueTest} are the ones {@code rows.test.ts}
 * pins on the other side.
 */
final class RelicValue {

    private RelicValue() {}

    /**
     * What one run of the relic pays on average, in platinum.
     *
     * <p>The sum of each drop's price weighted by its chance. This is the number
     * the decision to open a relic actually turns on, and it is close to
     * unrelated to the most valuable drop: across the whole catalogue the top
     * twenty by best drop and the top twenty by expected value share a single
     * relic. A 60p rare at 2% contributes 1.2p; a 20p common at 25.33%
     * contributes 5.
     *
     * <p>Unpriced drops count as zero, which understates rather than invents.
     *
     * @param prices platinum by item name. An absent entry is an unpriced drop.
     */
    static double expected(List<Rewards> rewards, Map<String, Double> prices) {
        if (rewards == null) return 0;

        double total = 0;
        for (Rewards reward : rewards) {
            total += chanceOf(reward) / 100 * priceOf(reward, prices);
        }
        return total;
    }

    /**
     * Expected value when {@code players} people crack the same relic together.
     *
     * <p>Everyone opens their own copy, all {@code players} rewards are
     * revealed, and each player picks one of them — so the payout is the best of
     * {@code players} independent rolls, not the average of them. Per player,
     * and not per squad: that is what makes this comparable to the solo column
     * at all. That is why radshare squads exist, and it is the single biggest
     * lever on what a relic is worth: nothing else in this tool changes a number
     * by a factor of three.
     *
     * <p>P(best is reward i) = T(i)^n − T(i+1)^n, where T(i) is the chance of
     * landing reward i or anything better once the rewards are sorted by value.
     * Exact, and six terms long.
     */
    static double squad(List<Rewards> rewards, Map<String, Double> prices, int players) {
        if (rewards == null || players < 1) return 0;

        List<double[]> sorted = rewards.stream()
                .map(reward -> new double[]{priceOf(reward, prices), chanceOf(reward) / 100})
                .sorted(Comparator.comparingDouble((double[] pair) -> pair[0]).reversed())
                .toList();

        double total = 0;
        // Chance of landing this reward or a better one.
        double tailAbove = 1;

        for (double[] pair : sorted) {
            double tailBelow = Math.max(0, tailAbove - pair[1]);
            total += pair[0] * (Math.pow(tailAbove, players) - Math.pow(tailBelow, players));
            tailAbove = tailBelow;
        }

        return total;
    }

    private static double priceOf(Rewards reward, Map<String, Double> prices) {
        if (reward.getItemName() == null) return 0;
        Double price = prices.get(reward.getItemName());
        return price == null ? 0 : price;
    }

    /**
     * The drop chance as a number.
     *
     * <p>{@code chance} is a String in the drop tables and reaches this
     * application untouched. Warframe's tables write it as a bare number
     * ("25.33"), but a percent sign or a comma decimal separator would both fail
     * to parse, so both are handled — and an unparseable value becomes 0 rather
     * than an exception, because one malformed drop must not take the whole
     * ranking down with it.
     *
     * <p>The same rule as {@code parseChance} in
     * {@code apps/web/src/api/normalize.ts}: the browser has been reading these
     * strings this way since before the ranking moved here, and a relic whose
     * chances parsed differently on the two sides would be ranked differently by
     * the API and by the screen.
     */
    static double chanceOf(Rewards reward) {
        String raw = reward.getChance();
        if (raw == null) return 0;

        try {
            return Double.parseDouble(raw.replace("%", "").replace(',', '.').trim());
        } catch (NumberFormatException e) {
            return 0;
        }
    }
}
