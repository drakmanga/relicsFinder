package relics.reliceApi.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import relics.reliceApi.Expection.InvalidKuvaPurchasesException;
import relics.reliceApi.model.KuvaPurchases;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class KuvaPurchaseServiceTest {

    /** Monday 2026-11-23 00:00 UTC, a weekly reset. */
    private static final long MONDAY = Instant.parse("2026-11-23T00:00:00Z").toEpochMilli();

    @TempDir
    Path dir;

    private KuvaPurchaseService service() {
        return new KuvaPurchaseService(dir.resolve("kuva-purchases.json").toString());
    }

    @Test
    void startsEmptyWithNoFile() {
        assertThat(service().get()).isEqualTo(KuvaPurchases.none());
    }

    @Test
    void storesAWeekAndFindsItAfterARestart() {
        service().replace(new KuvaPurchases(MONDAY, Map.of("teshin", 5, "palladino", 1)));

        assertThat(service().get()).isEqualTo(new KuvaPurchases(MONDAY, Map.of("teshin", 5, "palladino", 1)));
    }

    @Test
    void aNewWeekReplacesTheOldOneWhole() {
        KuvaPurchaseService service = service();
        service.replace(new KuvaPurchases(MONDAY, Map.of("teshin", 5)));

        long nextMonday = MONDAY + KuvaPurchaseService.WEEK_MS;
        service.replace(new KuvaPurchases(nextMonday, Map.of("palladino", 1)));

        assertThat(service().get()).isEqualTo(new KuvaPurchases(nextMonday, Map.of("palladino", 1)));
    }

    @Test
    void dropsOffersBoughtNoneOf() {
        KuvaPurchases stored = service().replace(new KuvaPurchases(MONDAY, Map.of("teshin", 0, "yonta", 1)));

        assertThat(stored.counts()).containsExactly(Map.entry("yonta", 1));
    }

    @Test
    void refusesAWeekThatIsNotAMondayReset() {
        long tuesday = MONDAY + 86_400_000L;

        assertThatThrownBy(() -> service().replace(new KuvaPurchases(tuesday, Map.of())))
                .isInstanceOf(InvalidKuvaPurchasesException.class)
                .hasMessageContaining(String.valueOf(tuesday));
        assertThatThrownBy(() -> service().replace(new KuvaPurchases(MONDAY + 1, Map.of())))
                .isInstanceOf(InvalidKuvaPurchasesException.class);
    }

    @Test
    void refusesAnIdThatIsNotACatalogueId() {
        assertThatThrownBy(() -> service().replace(new KuvaPurchases(MONDAY, Map.of("Teshin Kuva!", 1))))
                .isInstanceOf(InvalidKuvaPurchasesException.class)
                .hasMessageContaining("Teshin Kuva!");
    }

    @Test
    void refusesACountOutOfRange() {
        assertThatThrownBy(() -> service().replace(new KuvaPurchases(MONDAY, Map.of("teshin", -1))))
                .isInstanceOf(InvalidKuvaPurchasesException.class);
        assertThatThrownBy(() -> service().replace(
                new KuvaPurchases(MONDAY, Map.of("teshin", KuvaPurchaseService.MAX_COUNT + 1))))
                .isInstanceOf(InvalidKuvaPurchasesException.class)
                .hasMessageContaining("teshin");
    }

    @Test
    void refusesTooManyOffers() {
        Map<String, Integer> many = new HashMap<>();
        for (int i = 0; i <= KuvaPurchaseService.MAX_OFFERS; i++) many.put("offer-" + i, 1);

        assertThatThrownBy(() -> service().replace(new KuvaPurchases(MONDAY, many)))
                .isInstanceOf(InvalidKuvaPurchasesException.class);
    }

    @Test
    void aRefusedWriteLeavesTheStoredWeekAlone() {
        KuvaPurchaseService service = service();
        service.replace(new KuvaPurchases(MONDAY, Map.of("teshin", 5)));

        assertThatThrownBy(() -> service.replace(new KuvaPurchases(MONDAY, Map.of("teshin", -3))))
                .isInstanceOf(InvalidKuvaPurchasesException.class);

        assertThat(service().get()).isEqualTo(new KuvaPurchases(MONDAY, Map.of("teshin", 5)));
    }

    @Test
    void storesRewardAmountsBesideThePurchases() {
        service().replace(new KuvaPurchases(MONDAY, Map.of("teshin", 1), Map.of("icebind", 45_750, "sortie", 0)));

        assertThat(service().get())
                .isEqualTo(new KuvaPurchases(MONDAY, Map.of("teshin", 1), Map.of("icebind", 45_750)));
    }

    @Test
    void refusesARewardAmountOutOfRange() {
        assertThatThrownBy(() -> service().replace(new KuvaPurchases(MONDAY, Map.of(),
                Map.of("icebind", KuvaPurchaseService.MAX_REWARD_KUVA + 1))))
                .isInstanceOf(InvalidKuvaPurchasesException.class)
                .hasMessageContaining("icebind");
    }

    @Test
    void readsAFileWrittenBeforeRewardsWereTracked() throws Exception {
        Files.writeString(dir.resolve("kuva-purchases.json"),
                "{\"week\":" + MONDAY + ",\"counts\":{\"teshin\":3}}");

        assertThat(service().get()).isEqualTo(new KuvaPurchases(MONDAY, Map.of("teshin", 3), Map.of()));
    }

    @Test
    void aCorruptFileStartsEmptyRatherThanFailing() throws Exception {
        Files.writeString(dir.resolve("kuva-purchases.json"), "{not json");

        assertThat(service().get()).isEqualTo(KuvaPurchases.none());
    }
}
