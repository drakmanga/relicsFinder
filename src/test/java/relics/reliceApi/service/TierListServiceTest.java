package relics.reliceApi.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import relics.reliceApi.model.TierBand;
import relics.reliceApi.model.TierListQuery;
import relics.reliceApi.model.TierListResponse;
import relics.reliceApi.model.TierListRow;

import java.nio.file.Path;
import java.time.Instant;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.data.Offset.offset;
import static relics.reliceApi.service.TierListFixture.byName;
import static relics.reliceApi.service.TierListFixture.names;
import static relics.reliceApi.service.TierListFixture.sortedBy;
import static relics.reliceApi.service.TierListFixture.vault;

/**
 * The ranking itself: two columns, two medians, one row per relic.
 *
 * <p>These are the cases {@code apps/web/src/lib/tierList.test.ts} covered while
 * the arithmetic lived in the browser. They are here now because the arithmetic
 * is, and the endpoint and the screen read the same answer.
 */
class TierListServiceTest {

    @TempDir
    Path temp;

    private TierListFixture fixture() {
        return new TierListFixture(temp);
    }

    @Test
    void readsIntactForSoloAndRadiantForTheRadshare() {
        TierListResponse ranking = fixture()
                .relic("Axi", "A1", "Intact", "Rich", "10")
                .relic("Axi", "A1", "Radiant", "Rich", "50")
                .price("Rich", 100.0)
                .rank();

        TierListRow row = ranking.rows().getFirst();

        // Solo reads the Intact chance: 10% of 100.
        assertThat(row.soloValue()).isCloseTo(10, offset(1e-9));
        // The radshare reads the Radiant one, and pays the best of four rolls:
        // 1 - 0.5^4 = 93.75% of 100.
        assertThat(row.radshareValue()).isCloseTo(93.75, offset(1e-6));
    }

    @Test
    void givesOneRelicTwoDifferentLetters() {
        // Three relics, so the median is one of them rather than the mean of
        // the only two there are. The rare is where a radshare's extra rolls
        // land, which is why the one relic that holds it is an S in one column
        // and not in the other.
        TierListResponse ranking = fixture()
                .relic("Axi", "A1", "Intact", "Rich", "2", "Cheap", "98")
                .relic("Axi", "A1", "Radiant", "Rich", "10", "Cheap", "90")
                .relic("Axi", "A2", "Intact", "Cheap", "100")
                .relic("Axi", "A2", "Radiant", "Cheap", "100")
                .relic("Axi", "A3", "Intact", "Cheap", "100")
                .relic("Axi", "A3", "Radiant", "Cheap", "100")
                .price("Rich", 200.0)
                .price("Cheap", 1.0)
                .rank();

        Map<String, TierListRow> rows = byName(ranking);

        // Solo: 2% of 200 plus 98% of 1, against a median of 1.
        assertThat(rows.get("Axi A1").soloValue()).isCloseTo(4.98, offset(1e-9));
        assertThat(rows.get("Axi A1").soloBand()).isEqualTo(TierBand.S);
        assertThat(rows.get("Axi A2").soloBand()).isEqualTo(TierBand.C);
    }

    @Test
    void ranksEachColumnAgainstItsOwnMedian() {
        TierListResponse ranking = fixture()
                .bothStates("Axi", "A1", "Cheap", "Cheap", "Cheap", "Cheap", "Cheap", "Rich")
                .bothStates("Axi", "A2", "Cheap", "Cheap", "Cheap", "Cheap", "Cheap", "Cheap")
                .price("Cheap", 5.0)
                .price("Rich", 60.0)
                .rank();

        // Best-of-four pays about three times what one roll does, so a single
        // median would put the whole radshare column in S and the whole solo
        // column in F.
        assertThat(ranking.radshareMedian()).isGreaterThan(ranking.soloMedian());
        assertThat(ranking.rows()).allSatisfy(row ->
                assertThat(row.radshareValue()).isGreaterThan(row.soloValue()));
    }

    @Test
    void listsARelicOnceHoweverManyStatesItArrivesIn() {
        TierListResponse ranking = fixture()
                .relic("Axi", "A1", "Intact", "Cheap", "100")
                .relic("Axi", "A1", "Exceptional", "Cheap", "100")
                .relic("Axi", "A1", "Flawless", "Cheap", "100")
                .relic("Axi", "A1", "Radiant", "Cheap", "100")
                .price("Cheap", 5.0)
                .rank();

        assertThat(names(ranking)).containsExactly("Axi A1");
        assertThat(ranking.population()).isEqualTo(1);
    }

    @Test
    void ignoresARelicTheCatalogueOnlyCarriesInAStateNeitherColumnReads() {
        TierListResponse ranking = fixture()
                .relic("Axi", "A1", "Intact", "Cheap", "100")
                .relic("Axi", "A2", "Flawless", "Cheap", "100")
                .price("Cheap", 5.0)
                .rank();

        assertThat(names(ranking)).containsExactly("Axi A1");
    }

    @Test
    void countsADropNobodyIsSellingAsZeroRatherThanDroppingTheRelic() {
        TierListResponse ranking = fixture()
                .bothStates("Axi", "A1", "Unlisted", "Unlisted", "Unlisted", "Unlisted",
                        "Unlisted", "Unlisted")
                .bothStates("Axi", "A2", "Cheap", "Cheap", "Cheap", "Cheap", "Cheap", "Cheap")
                .price("Cheap", 5.0)
                .rank();

        Map<String, TierListRow> rows = byName(ranking);

        assertThat(rows).containsKey("Axi A1");
        assertThat(rows.get("Axi A1").soloValue()).isZero();
    }

    @Test
    void hasNoLettersAtAllBeforeThePricesLand() {
        TierListResponse ranking = fixture()
                .bothStates("Axi", "A1", "Unpriced", "Unpriced", "Unpriced", "Unpriced",
                        "Unpriced", "Unpriced")
                .rank();

        // Every expected value is zero, so the median is zero, and a median of
        // zero would hand every relic an S. Nothing is banded instead.
        assertThat(ranking.soloMedian()).isZero();
        assertThat(ranking.rows()).allSatisfy(row -> {
            assertThat(row.soloBand()).isNull();
            assertThat(row.radshareBand()).isNull();
        });
    }

    @Test
    void lettersNothingWhenTheFilterEmptiesThePopulation() {
        TierListResponse ranking = fixture()
                .relic("Axi", "A1", "Intact", "Cheap", "100")
                .price("Cheap", 5.0)
                .rank(vault(TierListQuery.Vault.FARMABLE));

        assertThat(ranking.rows()).isEmpty();
        assertThat(ranking.population()).isZero();
        assertThat(ranking.soloMedian()).isNull();
        assertThat(ranking.radshareMedian()).isNull();
    }

    @Test
    void reMediansOverTheRelicsTheVaultFilterLeft() {
        TierListFixture fixture = fixture()
                .bothStates("Axi", "A1", "Rich", "Rich", "Rich", "Rich", "Rich", "Rich")
                .bothStates("Axi", "A2", "Cheap", "Cheap", "Cheap", "Cheap", "Cheap", "Cheap")
                .bothStates("Axi", "A3", "Mid", "Mid", "Mid", "Mid", "Mid", "Mid")
                .price("Rich", 100.0)
                .price("Mid", 10.0)
                .price("Cheap", 1.0)
                .droppable("Axi A2");

        TierListResponse all = fixture.rank();
        TierListResponse farmable = fixture.rank(vault(TierListQuery.Vault.FARMABLE));
        TierListResponse vaulted = fixture.rank(vault(TierListQuery.Vault.VAULTED));

        assertThat(names(farmable)).containsExactly("Axi A2");
        assertThat(names(vaulted)).containsExactlyInAnyOrder("Axi A1", "Axi A3");

        // The cheap relic is an F against the whole catalogue and a C against
        // itself — which is the reason the filter moves the medians at all: a
        // ranking of what is droppable would otherwise answer "none of them".
        assertThat(byName(all).get("Axi A2").soloBand()).isEqualTo(TierBand.F);
        assertThat(byName(farmable).get("Axi A2").soloBand()).isEqualTo(TierBand.C);
        assertThat(farmable.soloMedian()).isNotEqualTo(all.soloMedian());
        assertThat(farmable.vault()).isEqualTo("farmable");
    }

    @Test
    void carriesTheRelicsOwnListingThroughAndSaysNothingWhereThereIsNone() {
        TierListResponse ranking = fixture()
                .bothStates("Axi", "A1", "Cheap", "Cheap", "Cheap", "Cheap", "Cheap", "Cheap")
                .bothStates("Axi", "A2", "Cheap", "Cheap", "Cheap", "Cheap", "Cheap", "Cheap")
                .price("Cheap", 5.0)
                .relicPrice("Axi A1", 12.5)
                .rank();

        Map<String, TierListRow> rows = byName(ranking);

        assertThat(rows.get("Axi A1").relicPrice()).isEqualTo(12.5);
        // Null, not zero: nobody has listed it, which is not the same as it
        // being free.
        assertThat(rows.get("Axi A2").relicPrice()).isNull();
    }

    @Test
    void doesNotLetTheRelicsOwnPriceMoveALetter() {
        TierListFixture priced = fixture()
                .bothStates("Axi", "A1", "Cheap", "Cheap", "Cheap", "Cheap", "Cheap", "Cheap")
                .bothStates("Axi", "A2", "Cheap", "Cheap", "Cheap", "Cheap", "Cheap", "Cheap")
                .price("Cheap", 5.0)
                .relicPrice("Axi A1", 900.0);

        TierListResponse ranking = priced.rank();

        assertThat(byName(ranking).get("Axi A1").soloBand())
                .isEqualTo(byName(ranking).get("Axi A2").soloBand());
    }

    @Test
    void opensOnTheRankingRatherThanOnAnAlphabet() {
        TierListResponse ranking = fixture()
                .bothStates("Axi", "A1", "Cheap", "Cheap", "Cheap", "Cheap", "Cheap", "Cheap")
                .bothStates("Axi", "A2", "Rich", "Rich", "Rich", "Rich", "Rich", "Rich")
                .price("Cheap", 1.0)
                .price("Rich", 100.0)
                .rank();

        // A bare GET is the question "which relic is worth opening", so the
        // answer starts with the one that is.
        assertThat(names(ranking)).containsExactly("Axi A2", "Axi A1");
        assertThat(ranking.sort()).isEqualTo("solo");
        assertThat(ranking.direction()).isEqualTo("desc");
    }

    @Test
    void answersTheNameColumnInTheOrderAReaderCountsIn() {
        TierListResponse ranking = fixture()
                .relic("Axi", "A10", "Intact", "Cheap", "100")
                .relic("Axi", "A2", "Intact", "Cheap", "100")
                .relic("Axi", "A1", "Intact", "Cheap", "100")
                .price("Cheap", 5.0)
                .rank(sortedBy(TierListQuery.Sort.RELIC, TierListQuery.Direction.ASC));

        assertThat(names(ranking)).containsExactly("Axi A1", "Axi A2", "Axi A10");
    }

    @Test
    void sinksARelicNobodyHasListedBelowEveryRelicThatHasAPrice() {
        TierListFixture fixture = fixture()
                .relic("Axi", "A1", "Intact", "Cheap", "100")
                .relic("Axi", "A2", "Intact", "Cheap", "100")
                .price("Cheap", 5.0)
                .relicPrice("Axi A2", 20.0);

        // Unknown, not worthless — so it is last whichever way the column points.
        assertThat(names(fixture.rank(sortedBy(TierListQuery.Sort.PRICE,
                TierListQuery.Direction.DESC)))).containsExactly("Axi A2", "Axi A1");
        assertThat(names(fixture.rank(sortedBy(TierListQuery.Sort.PRICE,
                TierListQuery.Direction.ASC)))).containsExactly("Axi A2", "Axi A1");
    }

    @Test
    void breaksATieOnTheNameBecauseMostOfTheCatalogueIsATie() {
        TierListResponse ranking = fixture()
                .relic("Axi", "A10", "Intact", "Cheap", "100")
                .relic("Axi", "A2", "Intact", "Cheap", "100")
                .relic("Axi", "A1", "Intact", "Cheap", "100")
                .price("Cheap", 5.0)
                .rank();

        assertThat(names(ranking)).containsExactly("Axi A1", "Axi A2", "Axi A10");
    }

    @Test
    void cutsTheResponseWithALimitAndNotThePopulation() {
        TierListFixture fixture = fixture()
                .bothStates("Axi", "A1", "Cheap", "Cheap", "Cheap", "Cheap", "Cheap", "Cheap")
                .bothStates("Axi", "A2", "Mid", "Mid", "Mid", "Mid", "Mid", "Mid")
                .bothStates("Axi", "A3", "Rich", "Rich", "Rich", "Rich", "Rich", "Rich")
                .price("Cheap", 1.0)
                .price("Mid", 10.0)
                .price("Rich", 100.0);

        TierListResponse whole = fixture.rank();
        TierListResponse top = fixture.rank(new TierListQuery(
                TierListQuery.Vault.ALL, TierListQuery.Sort.SOLO,
                TierListQuery.Direction.DESC, 1));

        assertThat(names(top)).containsExactly("Axi A3");
        // The medians and therefore the letters are the whole population's, so
        // the top twenty are ranked against the catalogue rather than against
        // each other.
        assertThat(top.population()).isEqualTo(3);
        assertThat(top.soloMedian()).isEqualTo(whole.soloMedian());
        assertThat(byName(top).get("Axi A3").soloBand())
                .isEqualTo(byName(whole).get("Axi A3").soloBand());
    }

    @Test
    void asksForMoreRowsThanThereAreAndGetsWhatThereIs() {
        TierListResponse ranking = fixture()
                .relic("Axi", "A1", "Intact", "Cheap", "100")
                .price("Cheap", 5.0)
                .rank(new TierListQuery(TierListQuery.Vault.ALL, TierListQuery.Sort.SOLO,
                        TierListQuery.Direction.DESC, 20));

        assertThat(ranking.rows()).hasSize(1);
    }

    @Test
    void saysWhenItWasReadAndWhenItCanDiffer() {
        Instant read = Instant.parse("2026-09-12T10:00:00Z");
        Instant due = Instant.parse("2026-09-12T11:00:00Z");

        TierListResponse ranking = fixture()
                .relic("Axi", "A1", "Intact", "Cheap", "100", "Unlisted", "0")
                .price("Cheap", 5.0)
                .relicPrice("Axi A1", 9.0)
                .readAt(read, due)
                .rank();

        assertThat(ranking.asOf()).isEqualTo(read.toString());
        assertThat(ranking.nextUpdateAt()).isEqualTo(due.toString());
        // One of the two parts has a price, and the relic's own listing is
        // there: a caller can tell a ranking built on gaps from a warm one.
        assertThat(ranking.prices().parts()).isEqualTo(2);
        assertThat(ranking.prices().partsPriced()).isEqualTo(1);
        assertThat(ranking.prices().relics()).isEqualTo(1);
        assertThat(ranking.prices().relicsPriced()).isEqualTo(1);
    }

    @Test
    void saysWhatTheRadshareColumnMeansRatherThanLettingACallerChangeIt() {
        TierListResponse ranking = fixture()
                .relic("Axi", "A1", "Intact", "Cheap", "100")
                .price("Cheap", 5.0)
                .rank();

        assertThat(ranking.players()).isEqualTo(4);
        assertThat(ranking.version()).isEqualTo(TierListResponse.VERSION);
    }
}
