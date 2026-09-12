package relics.reliceApi.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import relics.reliceApi.model.TierListResponse;
import relics.reliceApi.model.TierListRow;
import relics.reliceApi.model.TierTrend;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Path;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.data.Offset.offset;
import static relics.reliceApi.service.TierListFixture.byName;

/**
 * The ranking, over the two responses the browser actually receives.
 *
 * <p>{@code src/test/resources/tier-list-payload.json} is the capture the
 * browser's own tier-list tests are built on — six relics out of
 * {@code GET /api/relics} and the thirty-three parts they drop out of
 * {@code POST /api/market/items}, taken from a running backend with a warm cache
 * on 2026-08-28, nothing rounded or tidied. It is here, unchanged, because the
 * numbers asserted below are the numbers {@code tierListPayload.test.ts}
 * asserted while the arithmetic ran in the browser: this is what makes the port
 * a port rather than a rewrite that looks similar.
 *
 * <p>The six are chosen rather than sampled. Axi C10 and Lith L5 were climbing
 * on the day, Axi B9 and Neo A16 falling, and Axi A1 and Lith G1 had moved about
 * three percent — under the ten a movement needs, so they are the control that
 * says the gate is still shut where it should be.
 */
class TierListPayloadTest {

    @TempDir
    Path temp;

    private Map<String, TierListRow> rows() {
        JsonNode payload = payload();

        TierListResponse ranking = new TierListFixture(temp)
                .catalogue(payload.get("relics"))
                .listings(payload.get("itemPrices"))
                .rank();

        return byName(ranking);
    }

    private JsonNode payload() {
        try (InputStream stream = getClass().getResourceAsStream("/tier-list-payload.json")) {
            return new ObjectMapper().readTree(stream);
        } catch (IOException e) {
            throw new IllegalStateException("the captured payload is unreadable", e);
        }
    }

    @Test
    void reportsTheRelicsThatClimbed() {
        assertThat(rows().get("Axi C10").trendPercent()).isCloseTo(26.05, offset(0.05));
        assertThat(rows().get("Lith L5").trendPercent()).isCloseTo(22.18, offset(0.05));
    }

    @Test
    void reportsTheRelicsThatFell() {
        assertThat(rows().get("Axi B9").trendPercent()).isCloseTo(-41.51, offset(0.05));
        assertThat(rows().get("Neo A16").trendPercent()).isCloseTo(-34.97, offset(0.05));
    }

    @Test
    void callsTheRelicsThatBarelyMovedSteadyAndMeansIt() {
        // Axi A1 moved 3.04% and Lith G1 3.40% on the day this was captured. The
        // gate is what keeps them quiet, so a fix that made them report a
        // movement by lowering it would fail here rather than look like a
        // success.
        assertThat(rows().get("Axi A1").trend()).isEqualTo(TierTrend.STEADY);
        assertThat(rows().get("Lith G1").trend()).isEqualTo(TierTrend.STEADY);
        assertThat(rows().get("Axi A1").trendPercent()).isNull();
    }

    @Test
    void doesNotAnswerSteadyForTheWholePayload() {
        // The defect this capture exists for: every relic reading Steady while
        // the prices behind them carried a trend. Four of these six moved, so a
        // path that drops the trend anywhere between the wire and the row comes
        // back with nothing to say about any of them.
        assertThat(rows().values().stream()
                .filter(row -> row.trend() == TierTrend.MOVED)
                .count()).isEqualTo(4);
    }

    @Test
    void hasABaselineForEveryRelicInIt() {
        // "Nothing to compare" is the honest answer where no drop was measured,
        // and it must not be the answer here: every priced part in the capture
        // carries a trend, so a path that lost the trends would turn six real
        // comparisons into six shrugs — the same defect as Steady, differently
        // worded.
        assertThat(rows()).hasSize(6);
        assertThat(rows().values()).noneMatch(row -> row.trend() == TierTrend.NO_BASELINE);
    }

    @Test
    void wasGivenPricesThatCouldHaveSaidSomething() {
        // Guards the guard. If the captured payload ever lost its trends — a
        // regenerated fixture, a merge that flattened it — every assertion above
        // would still pass by agreeing that nothing moved.
        //
        // Every priced part rather than every part: the two Forma blueprints in
        // here have no price and no trend, because Forma is not sold. That is
        // the market's own shape and not a hole in the capture.
        long priced = 0;
        long withTrend = 0;

        for (JsonNode listing : payload().get("itemPrices")) {
            if (!listing.path("averagePrice").isNumber()) continue;
            priced++;
            if (listing.path("trend").isNumber()) withTrend++;
        }

        assertThat(priced).isEqualTo(31);
        assertThat(withTrend).isEqualTo(priced);
    }

    @Test
    void ranksTheCaptureTheWayTheScreenDoes() {
        // One value read off the capture by hand, so the two columns are pinned
        // and not only the trend: Axi A1 solo is the sum of each Intact drop's
        // chance times its price.
        assertThat(rows().get("Axi A1").soloValue()).isCloseTo(7.2624, offset(0.0005));
        assertThat(rows().get("Axi A1").radshareValue())
                .isGreaterThan(rows().get("Axi A1").soloValue());
    }
}
