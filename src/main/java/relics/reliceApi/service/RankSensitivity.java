package relics.reliceApi.service;

import org.springframework.stereotype.Component;
import relics.reliceApi.model.ItemPrice;
import relics.reliceApi.model.Relic;
import relics.reliceApi.model.Rewards;

import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * How far a part's price has to move before the Tier List's order changes.
 *
 * <p>{@link RelicMarketService#nextTtl} already reads each item on its own
 * interval, earned from the drift that item's own price showed between two
 * reads. That is the right rule for one price and the wrong one for a ranking:
 * two relics a fifth of a platinum apart swap places while every part inside
 * them stays well inside the 5% budget, and a 20% jump on a part nothing is
 * ranked near changes nothing anybody looks at. This is the other half of the
 * signal — what a move DOES.
 *
 * <p>The number produced is a drift target, in the same units as
 * {@link RelicMarketService#TARGET_DRIFT} and used in the same place: the
 * interval is the one that would let this price move by that much, so naming a
 * smaller target for a part that can reorder the head of the list is the whole
 * of the allocation. Nothing else in the read rule changes.
 *
 * <h2>Why only the head of the ranking</h2>
 *
 * <p>Because below it the order is noise, and the tab already says so. Measured
 * against the live catalogue on 2026-08-30: the distance to the nearest
 * neighbour in expected value, taken over all 772 relics, is a move of 0,067%
 * for the median part — 529 of 590 parts can flip some adjacent pair with a
 * move under half a percent. A signal that names nine parts in ten is not a
 * signal. The tier list's own bands are multiples of the median rather than
 * percentiles for exactly this reason, written down in `TIER_BANDS`: 327
 * relics sit between 4p and 6p, so the median relic moves 43 places on a 0,39p
 * change and the letters deliberately do not report it.
 *
 * <p>Over the top {@link #RANKED_HEAD} relics the same measurement separates:
 * a move of 0,39% at the tenth percentile, 1,94% at the median, 15,4% at the
 * ninetieth. That is a discriminator, and it is the part of the order a reader
 * acts on — the podium is drawn from the top three and the first screenful is
 * eighteen rows.
 */
@Component
public class RankSensitivity {

    /**
     * How many of the ranked relics are kept in order.
     *
     * <p>Fifty is about three screenfuls at the table's 48px rows, and it is
     * where the S and A bands live. Twenty was measured too: it names 32 parts
     * against 102, and buys a head three rows deeper than the podium. A hundred
     * reaches into the crowd — its tenth-percentile part needs a move of 0,14%,
     * which is the noise the bands refuse to report.
     */
    static final int RANKED_HEAD = 50;

    /**
     * The smallest target this will ask for, whatever the arithmetic says.
     *
     * <p>Two relics can sit at the same expected value to the cent, which makes
     * the move needed to swap them zero, and a zero target asks for an interval
     * of zero seconds. One percent is a real price move on a market whose
     * prices are quoted in whole platinum: below it the arithmetic is measuring
     * the rounding of the market's own numbers.
     */
    static final double SENSITIVE_FLOOR = 0.01;

    /**
     * Slug to drift target, for the parts a smaller target actually buys
     * something for.
     *
     * <p>Only those: a part that has to move more than {@link
     * RelicMarketService#TARGET_DRIFT} to change the head is already served by
     * the rule that exists, and writing it down with its own number would be
     * two rules where one does the work. Everything absent from this map reads
     * exactly as it reads today.
     *
     * <p>Replaced whole rather than updated in place, so a reader of
     * {@link #targetFor} never sees half of one measurement and half of the
     * next.
     */
    private volatile Map<String, Double> targets = Map.of();

    /** The drift this slug is allowed before it is re-read. */
    public double targetFor(String slug) {
        Double target = targets.get(slug);
        return target == null ? RelicMarketService.TARGET_DRIFT : target;
    }

    /** How many parts are being read faster than the default rule would. */
    public int sensitiveCount() {
        return targets.size();
    }

    /**
     * Re-reads the ranking and works out what each part can do to it.
     *
     * <p>Called on the warm-up runner's own beat, ten minutes apart, because it
     * is a fact about prices that were already fetched: no request goes out for
     * it and the answer only moves as fast as the cache underneath it.
     *
     * @param intactRelics the catalogue, one entry per relic — the Intact state
     *                     only, which is the state the solo column is ranked in
     * @param prices       what those relics' parts are worth right now
     */
    public void measure(Collection<Relic> intactRelics, Collection<ItemPrice> prices) {
        Map<String, ItemPrice> byName = new HashMap<>();
        for (ItemPrice price : prices) {
            if (price != null && price.getItemName() != null) byName.put(price.getItemName(), price);
        }

        List<Ranked> ranked = new ArrayList<>();
        for (Relic relic : intactRelics) {
            if (relic == null || relic.getRewards() == null) continue;
            ranked.add(new Ranked(relic, expectedValue(relic, byName)));
        }

        // Best first, which is the order the tab opens in.
        ranked.sort((a, b) -> Double.compare(b.value(), a.value()));

        targets = targetsFor(ranked, byName);
    }

    private Map<String, Double> targetsFor(List<Ranked> ranked, Map<String, ItemPrice> byName) {
        Map<String, Double> found = new HashMap<>();

        for (int i = 0; i < Math.min(RANKED_HEAD, ranked.size()); i++) {
            Ranked here = ranked.get(i);
            double gap = gapAround(ranked, i);

            for (Rewards reward : here.relic().getRewards()) {
                ItemPrice price = byName.get(reward == null ? null : reward.getItemName());
                double weight = chanceOf(reward);
                Double platinum = price == null ? null : price.getAveragePrice();
                if (platinum == null || platinum <= 0 || weight <= 0) continue;

                // What a move of this one price does to this one relic's value:
                // the part carries `weight` of it, so a relative move of x
                // shifts the relic by weight * platinum * x. Setting that equal
                // to the gap is the move that changes the order.
                double flip = gap / (weight * platinum);
                if (flip >= RelicMarketService.TARGET_DRIFT) continue;

                double target = Math.max(SENSITIVE_FLOOR, flip);
                found.merge(price.getSlug(), target, Math::min);
            }
        }

        return Map.copyOf(found);
    }

    /**
     * The move that would take this relic past a neighbour.
     *
     * <p>The nearer of the two neighbours, and both of them are read out of the
     * whole ranking rather than out of the head: the fiftieth relic has a
     * fifty-first under it, and measuring the head as if it ended in mid-air
     * would report the boundary relic as immovable.
     */
    private static double gapAround(List<Ranked> ranked, int i) {
        double above = i == 0 ? Double.MAX_VALUE : ranked.get(i - 1).value() - ranked.get(i).value();
        double below = i == ranked.size() - 1
                ? Double.MAX_VALUE
                : ranked.get(i).value() - ranked.get(i + 1).value();
        return Math.min(above, below);
    }

    /**
     * What one run of the relic pays, weighted by drop chance.
     *
     * <p>The same sum `expectedValue` computes in `lib/rows.ts`, and
     * deliberately a second implementation rather than a shared one: this one
     * decides how often a price is re-read and never reaches a screen, so the
     * two can disagree about a part with no price — here as there, an unpriced
     * drop counts as zero — without anything the reader sees being wrong.
     */
    private static double expectedValue(Relic relic, Map<String, ItemPrice> byName) {
        double sum = 0;
        for (Rewards reward : relic.getRewards()) {
            ItemPrice price = byName.get(reward == null ? null : reward.getItemName());
            Double platinum = price == null ? null : price.getAveragePrice();
            if (platinum == null) continue;
            sum += chanceOf(reward) * platinum;
        }
        return sum;
    }

    /** The drop chance as a fraction. Zero for anything unreadable. */
    private static double chanceOf(Rewards reward) {
        if (reward == null || reward.getChance() == null) return 0;
        try {
            return Double.parseDouble(reward.getChance().trim()) / 100;
        } catch (NumberFormatException e) {
            // The drop tables send this as a string and have sent "N/A" before.
            // A chance nobody can read is a drop that contributes nothing here,
            // which understates the relic rather than crashing the warmer.
            return 0;
        }
    }

    private record Ranked(Relic relic, double value) {}
}
