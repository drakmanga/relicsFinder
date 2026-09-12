package relics.reliceApi.service;

import org.junit.jupiter.api.Test;
import relics.reliceApi.model.Rewards;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.data.Offset.offset;

/**
 * What a relic pays, alone and in a squad.
 *
 * <p>The same cases {@code rows.test.ts} pins on the browser's copy of these
 * two formulas. They are pinned twice on purpose: the Relics view still
 * computes them per refinement as its slider moves, and the two sides have to
 * answer the same number for the same relic.
 */
class RelicValueTest {

    private static Rewards reward(String itemName, String chance) {
        return new Rewards("id-" + itemName, itemName, "Common", chance);
    }

    private static final Map<String, Double> PRICES = Map.of("Cheap", 10.0, "Rich", 100.0);

    @Test
    void weighsEachDropByItsChance() {
        // 25% of 10 plus 2% of 100 is 2.5 + 2.
        double value = RelicValue.expected(
                List.of(reward("Cheap", "25"), reward("Rich", "2")), PRICES);

        assertThat(value).isCloseTo(4.5, offset(1e-9));
    }

    @Test
    void countsADropNobodyIsSellingAsZero() {
        // Understates the relic rather than inventing a price for the drop.
        double value = RelicValue.expected(
                List.of(reward("Cheap", "25"), reward("Unlisted", "75")), PRICES);

        assertThat(value).isCloseTo(2.5, offset(1e-9));
    }

    @Test
    void paysASquadTheBestOfNRollsRatherThanTheAverageOfOne() {
        List<Rewards> rewards = List.of(reward("Rich", "10"), reward("Cheap", "90"));

        double solo = RelicValue.expected(rewards, PRICES);
        double four = RelicValue.squad(rewards, PRICES, 4);

        // Solo: 0.1*100 + 0.9*10 = 19. In a squad of four the 10% reward is
        // revealed at least once with probability 1 - 0.9^4 = 34.39%, so the
        // payout is 0.3439*100 + 0.6561*10 = 40.951.
        assertThat(solo).isCloseTo(19, offset(1e-9));
        assertThat(four).isCloseTo(40.951, offset(1e-6));
    }

    @Test
    void isTheSoloValueForASquadOfOne() {
        List<Rewards> rewards = List.of(reward("Rich", "10"), reward("Cheap", "90"));

        assertThat(RelicValue.squad(rewards, PRICES, 1))
                .isCloseTo(RelicValue.expected(rewards, PRICES), offset(1e-9));
    }

    @Test
    void hasNoAnswerForASquadOfNobody() {
        assertThat(RelicValue.squad(List.of(reward("Rich", "10")), PRICES, 0)).isZero();
    }

    @Test
    void readsTheChanceTheDropTablesSendAndTheTwoTheyMightSend() {
        assertThat(RelicValue.chanceOf(reward("x", "25.33"))).isEqualTo(25.33);
        assertThat(RelicValue.chanceOf(reward("x", "25,33"))).isEqualTo(25.33);
        assertThat(RelicValue.chanceOf(reward("x", "25.33%"))).isEqualTo(25.33);
    }

    @Test
    void treatsAChanceItCannotReadAsNoChanceRatherThanFailing() {
        // One malformed drop must not take the whole ranking down with it.
        assertThat(RelicValue.chanceOf(reward("x", "unknown"))).isZero();
        assertThat(RelicValue.chanceOf(reward("x", null))).isZero();
    }
}
