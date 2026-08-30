package relics.reliceApi.service;

import org.junit.jupiter.api.Test;
import relics.reliceApi.model.ItemPrice;
import relics.reliceApi.model.Relic;
import relics.reliceApi.model.Rewards;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

/**
 * What a price move does to the order, rather than to its own price.
 *
 * <p>The rule being defended: a part that can push a relic past a neighbour at
 * the head of the ranking is worth re-reading sooner than the drift on its own
 * price says, and a part that cannot is not. Everything the head does not reach
 * keeps the interval it has today, which is why most of these tests assert the
 * DEFAULT as hard as they assert the exception.
 */
class RankSensitivityTest {

    /** A drop worth `chance` percent of the relic's rolls. */
    private static Rewards drop(String itemName, String chance) {
        return new Rewards(itemName + "-id", itemName, "Common", chance);
    }

    private static Relic relic(String name, Rewards... rewards) {
        return new Relic("Lith", name, "Intact", List.of(rewards));
    }

    private static ItemPrice price(String itemName, Double platinum) {
        return new ItemPrice(itemName, platinum, platinum, 10, null, null,
                itemName.toLowerCase().replace(' ', '_'), null, null, null, 1);
    }

    /**
     * A ranking of `count` relics, each holding one drop at 100% and each worth
     * a platinum less than the one above it — so every gap is exactly 1p and
     * nothing is packed.
     */
    private static List<Relic> ladder(int count) {
        List<Relic> relics = new ArrayList<>();
        for (int i = 0; i < count; i++) relics.add(relic("L" + i, drop("part" + i, "100")));
        return relics;
    }

    private static List<ItemPrice> ladderPrices(int count) {
        List<ItemPrice> prices = new ArrayList<>();
        for (int i = 0; i < count; i++) prices.add(price("part" + i, 100.0 - i));
        return prices;
    }

    @Test
    void aPartThatCannotReachTheHeadKeepsTheDefault() {
        RankSensitivity sensitivity = new RankSensitivity();
        sensitivity.measure(ladder(80), ladderPrices(80));

        // part60 sits at rank 61, past RANKED_HEAD, and its price is 40p: a 1p
        // gap is a 2,5% move, which would have been sensitive had the head
        // reached it.
        assertThat(sensitivity.targetFor("part60")).isEqualTo(RelicMarketService.TARGET_DRIFT);
        assertThat(sensitivity.sensitiveCount()).isGreaterThan(0);
    }

    @Test
    void theHeadIsFiftyRelicsDeep() {
        RankSensitivity sensitivity = new RankSensitivity();
        sensitivity.measure(ladder(80), ladderPrices(80));

        // Written as 49 and 50 rather than as RANKED_HEAD either side of the
        // boundary: the depth of the head is a decision about which order a
        // reader acts on, and a test that reads the constant only proves the
        // code agrees with itself.
        assertThat(sensitivity.targetFor("part49")).isLessThan(RelicMarketService.TARGET_DRIFT);
        assertThat(sensitivity.targetFor("part50")).isEqualTo(RelicMarketService.TARGET_DRIFT);
    }

    @Test
    void aPartInsideTwoRelicsPackedTogetherIsReadSooner() {
        // Two relics a hundredth of a platinum apart at the top of the list.
        List<Relic> relics = List.of(
                relic("A", drop("packed", "100")),
                relic("B", drop("other", "100")),
                relic("C", drop("far", "100")));
        List<ItemPrice> prices = List.of(
                price("packed", 10.00), price("other", 9.99), price("far", 1.0));

        RankSensitivity sensitivity = new RankSensitivity();
        sensitivity.measure(relics, prices);

        // 0.01p of gap on a 10p part: a move of one tenth of a percent, which
        // the floor takes to one percent.
        assertThat(sensitivity.targetFor("packed")).isEqualTo(RankSensitivity.SENSITIVE_FLOOR);
        assertThat(sensitivity.targetFor("far")).isEqualTo(RelicMarketService.TARGET_DRIFT);
    }

    @Test
    void theTargetIsTheMoveThatWouldChangeTheOrder() {
        // 20p and 18p, one drop each at 100%: the leader has to fall 2p in 20 —
        // ten percent — to be passed, which is above the default and therefore
        // not worth a rule of its own. The one behind has to rise 2p in 18,
        // 11,1%, and is not either.
        List<Relic> relics = List.of(relic("A", drop("high", "100")), relic("B", drop("low", "100")));
        RankSensitivity sensitivity = new RankSensitivity();
        sensitivity.measure(relics, List.of(price("high", 20.0), price("low", 18.0)));

        assertThat(sensitivity.sensitiveCount()).isZero();

        // Move them to 20p and 19.4p and the leader needs 3%, which is.
        sensitivity.measure(relics, List.of(price("high", 20.0), price("low", 19.4)));
        assertThat(sensitivity.targetFor("high")).isCloseTo(0.03, within(0.0001));
    }

    @Test
    void aRareDropMovesItsRelicLessThanACommonOneAtTheSamePrice() {
        // Same relic, same two prices, and only the chances differ. Relic A is
        // worth 25,33% x 20 + 2% x 20 = 5,466p and relic B 5,4p, so the gap is
        // 0,066p. The common carries 5,066p of A and needs to move 1,3% to
        // close it; the rare carries 0,4p and needs 16,5% — twenty-five times
        // as far, which is the ratio of the two chances and lands it outside
        // the rule entirely.
        List<Relic> relics = List.of(
                relic("A", drop("common", "25.33"), drop("rare", "2")),
                relic("B", drop("filler", "100")));
        List<ItemPrice> prices = List.of(
                price("common", 20.0), price("rare", 20.0), price("filler", 5.4));

        RankSensitivity sensitivity = new RankSensitivity();
        sensitivity.measure(relics, prices);

        assertThat(sensitivity.targetFor("common")).isLessThan(RelicMarketService.TARGET_DRIFT);
        assertThat(sensitivity.targetFor("rare")).isEqualTo(RelicMarketService.TARGET_DRIFT);
    }

    @Test
    void anUnpricedCatalogueNamesNothing() {
        // A cold start: no price, no ranking, and therefore no reallocation.
        // Every slug reads exactly as it reads today.
        RankSensitivity sensitivity = new RankSensitivity();
        sensitivity.measure(ladder(60), List.of());

        assertThat(sensitivity.sensitiveCount()).isZero();
        assertThat(sensitivity.targetFor("part0")).isEqualTo(RelicMarketService.TARGET_DRIFT);
    }

    @Test
    void aChanceTheDropTablesCannotSpellCountsAsNothing() {
        List<Relic> relics = List.of(
                relic("A", drop("unreadable", "N/A")),
                relic("B", drop("filler", "100")));

        RankSensitivity sensitivity = new RankSensitivity();
        sensitivity.measure(relics, List.of(price("unreadable", 10.0), price("filler", 5.0)));

        assertThat(sensitivity.targetFor("unreadable")).isEqualTo(RelicMarketService.TARGET_DRIFT);
    }
}
