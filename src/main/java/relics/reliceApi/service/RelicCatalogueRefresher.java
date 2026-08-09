package relics.reliceApi.service;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Keeps the relic catalogue level with the game.
 *
 * <p>The catalogue is a file, and a file goes stale silently. It had drifted to
 * 689 relics against the 773 the drop tables listed, and what was missing was
 * precisely the relics in the current vault rotation — so every relic a player
 * could actually farm was absent, and the ones present were labelled correctly
 * only by accident. Nothing surfaced that; the list simply had a hole in it.
 *
 * <p>Digital Extremes publishes new relics with a build, so once a day is far
 * more often than the data changes and still bounded enough that a stale
 * catalogue is measured in hours rather than months.
 */
@Component
// Before the price warmer, which reads the catalogue to decide what to price:
// warming the old list would leave the new relics' parts unpriced until the
// next half-hourly pass.
@Order(0)
public class RelicCatalogueRefresher implements ApplicationRunner {

    private final RelicUpdateService updateService;

    public RelicCatalogueRefresher(RelicUpdateService updateService) {
        this.updateService = updateService;
    }

    @Override
    public void run(ApplicationArguments args) {
        refresh();
    }

    /** 04:20 local, when nobody is looking at the numbers it changes. */
    @Scheduled(cron = "0 20 4 * * *")
    public void refresh() {
        try {
            int relics = updateService.downloadAndUpdateRelics();
            System.out.println("relics: catalogue refreshed — " + relics + " entries");

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();

        } catch (Exception e) {
            // The existing file is still there and still readable, so a failed
            // refresh degrades to yesterday's data rather than to no data.
            System.err.println("relics: catalogue refresh failed — " + e.getMessage());
        }
    }
}
