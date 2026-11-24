package relics.reliceApi.service;

import org.junit.jupiter.api.Test;
import relics.reliceApi.Expection.ClanInitiativeUnavailableException;
import relics.reliceApi.model.ClanInitiativeTier;
import relics.reliceApi.model.ClanInitiativeWeek;

import java.io.IOException;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ClanInitiativeServiceTest {

    /** Two weeks as the worldstate served them on 2026-11-24, trimmed to what is read. */
    private static final String WORLDSTATE = """
            {"WeeklyVaultBonusRewards": [
              {"WeekCount": 668, "BonusRegion": "/Lotus/Language/Locations/Ceres", "Rewards": [
                {"PointThreshold": 2000, "ItemCount": 21000, "Reward": "/Lotus/StoreItems/Types/Items/MiscItems/Kuva"},
                {"PointThreshold": 500, "ItemCount": 50, "Reward": "/Lotus/StoreItems/Types/Restoratives/SyndicateTeamEnergyTotem"},
                {"PointThreshold": 1000, "ItemCount": 7000, "Reward": "/Lotus/StoreItems/Types/Items/MiscItems/Kuva"},
                {"PointThreshold": 1500, "ItemCount": 2, "Reward": "/Lotus/StoreItems/Types/PickUps/Credits/50000Credits"}]},
              {"WeekCount": 667, "BonusRegion": "/Lotus/Language/Locations/Pluto", "Rewards": [
                {"PointThreshold": 500, "ItemCount": 50, "Reward": "/Lotus/StoreItems/Types/Restoratives/SyndicateTeamHealTotem"},
                {"PointThreshold": 2000, "ItemCount": 1, "Reward": "/Lotus/StoreItems/Types/Items/MiscItems/Forma"}]}
            ]}""";

    private static final long THIS_MONDAY = Instant.parse("2026-11-23T00:00:00Z").toEpochMilli();
    private static final long NEXT_MONDAY = Instant.parse("2026-11-30T00:00:00Z").toEpochMilli();

    private final AtomicLong now = new AtomicLong(THIS_MONDAY);

    private ClanInitiativeService service(java.util.concurrent.Callable<String> source) {
        return new ClanInitiativeService(source, now::get, Duration.ofMinutes(30));
    }

    @Test
    void readsEachWeekEarliestFirstWithItsMondayAndRegion() {
        List<ClanInitiativeWeek> weeks = service(() -> WORLDSTATE).weeks();

        assertThat(weeks).extracting(ClanInitiativeWeek::week).containsExactly(THIS_MONDAY, NEXT_MONDAY);
        assertThat(weeks).extracting(ClanInitiativeWeek::region).containsExactly("Pluto", "Ceres");
    }

    @Test
    void countsOnlyKuvaTowardsAWeeksKuva() {
        List<ClanInitiativeWeek> weeks = service(() -> WORLDSTATE).weeks();

        assertThat(weeks.get(0).kuva()).isZero();
        assertThat(weeks.get(1).kuva()).isEqualTo(28_000);
    }

    @Test
    void listsTheTiersLowestFirst() {
        ClanInitiativeWeek next = service(() -> WORLDSTATE).weeks().get(1);

        assertThat(next.tiers()).containsExactly(
                new ClanInitiativeTier(500, "SyndicateTeamEnergyTotem", 50, 0),
                new ClanInitiativeTier(1000, "Kuva", 7000, 7000),
                new ClanInitiativeTier(1500, "50000Credits", 2, 0),
                new ClanInitiativeTier(2000, "Kuva", 21000, 21000));
    }

    @Test
    void asksTheWorldstateOnceInsideTheCacheWindow() {
        AtomicInteger calls = new AtomicInteger();
        ClanInitiativeService service = service(() -> {
            calls.incrementAndGet();
            return WORLDSTATE;
        });

        service.weeks();
        now.addAndGet(Duration.ofMinutes(29).toMillis());
        service.weeks();
        assertThat(calls).hasValue(1);

        now.addAndGet(Duration.ofMinutes(2).toMillis());
        service.weeks();
        assertThat(calls).hasValue(2);
    }

    @Test
    void anUnreadableWorldstateIsAnErrorNotAnEmptyWeek() {
        ClanInitiativeService service = service(() -> {
            throw new IOException("HTTP 503");
        });

        assertThatThrownBy(service::weeks).isInstanceOf(ClanInitiativeUnavailableException.class);
    }

    @Test
    void aWorldstateWithoutTheInitiativeIsNoWeeksRatherThanAFailure() {
        assertThat(service(() -> "{}").weeks()).isEmpty();
    }
}
