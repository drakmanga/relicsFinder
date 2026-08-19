package relics.reliceApi.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Path;
import java.util.List;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The rolling refresh, whose whole job is that nothing is ever left behind.
 *
 * <p>It replaced a scheduled pass that re-queued the entire catalogue at once,
 * which meant the day was a sawtooth: every entry was fetched in the same eight
 * minutes, so every entry expired in the same eight minutes. The cursor here
 * only moves forward, which is what makes "every name is reached before any
 * name is reached twice" a property rather than a hope.
 *
 * <p>{@code start()} is deliberately not called: without it no warmer thread
 * runs, so the queue can be observed standing still.
 */
class RelicMarketSweepTest {

    @TempDir
    Path temp;

    private RelicMarketService service;

    @BeforeEach
    void setUp() {
        MarketRateLimiter rateLimiter = new MarketRateLimiter();
        ColdStartOrder coldStartOrder = new ColdStartOrder();
        // Nothing warms Endo here, so the sweep would sit on the gate for its
        // full timeout; opened up front because this test is about the queue.
        coldStartOrder.endoReady();
        service = new RelicMarketService(
                new DucatService(),
                new SetListingService(rateLimiter),
                new PriceCacheStore(temp.resolve("price-cache.json").toString()),
                rateLimiter,
                coldStartOrder);
    }

    private int queued() {
        return (int) service.cacheStatus().get("queued");
    }

    @Test
    void queuesOneNameAtATimeRatherThanTheWholeCatalogue() {
        service.setSweepList(List.of("lith_v9_relic", "meso_e1_relic", "axi_a1_relic"));

        service.sweep();
        assertThat(queued()).isEqualTo(1);

        service.sweep();
        assertThat(queued()).isEqualTo(2);
    }

    @Test
    void reachesEveryNameBeforeItReachesAnyNameTwice() {
        // The guarantee the whole design rests on. With the queue never drained
        // the count can only rise for as many distinct names as there are, and
        // one extra lap must add nothing.
        List<String> names = IntStream.range(0, 40).mapToObj(i -> "item_" + i).toList();
        service.setSweepList(names);

        for (int i = 0; i < names.size(); i++) service.sweep();
        assertThat(queued()).isEqualTo(40);

        for (int i = 0; i < names.size(); i++) service.sweep();
        assertThat(queued()).isEqualTo(40);
    }

    @Test
    void takesUpANewCatalogueWithoutARestart() {
        // A Prime released this morning joins the rotation the next time the
        // warm-up runner reads the catalogue.
        service.setSweepList(List.of("lith_v9_relic"));
        service.sweep();
        assertThat(queued()).isEqualTo(1);

        service.setSweepList(List.of("lith_v9_relic", "gauss_prime_chassis_blueprint"));
        for (int i = 0; i < 2; i++) service.sweep();

        assertThat(queued()).isEqualTo(2);
    }

    @Test
    void doesNothingBeforeTheCatalogueHasBeenHandedOver() {
        service.sweep();
        assertThat(queued()).isZero();
    }

    @Test
    void survivesACatalogueThatShrank() {
        // The cursor is left where it was on purpose, so it can be past the end
        // of the new list the first time it is used.
        service.setSweepList(IntStream.range(0, 30).mapToObj(i -> "item_" + i).toList());
        for (int i = 0; i < 30; i++) service.sweep();

        service.setSweepList(List.of("only_one"));
        service.sweep();

        assertThat(queued()).isEqualTo(31);
    }
}
