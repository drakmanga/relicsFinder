package relics.reliceApi.service;

import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.ApplicationArguments;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import relics.reliceApi.model.Relic;
import relics.reliceApi.model.Rewards;

import java.util.LinkedHashSet;
import java.util.Set;

/**
 * Fills the price cache with every Prime part in the drop tables.
 *
 * <p>There are about 550 distinct parts and the market allows roughly three
 * requests a second, so a full pass takes around three minutes. Doing it here,
 * once, in the background, is the difference between a table that shows prices
 * immediately and one where every user pays fifteen seconds per screenful.
 *
 * <p>Startup is not blocked: the queue is filled and the warmer drains it on its
 * own thread while the API is already serving.
 */
@Component
public class PriceWarmupRunner implements ApplicationRunner {

    private final RelicLoadService relicLoadService;
    private final RelicMarketService marketService;

    public PriceWarmupRunner(RelicLoadService relicLoadService, RelicMarketService marketService) {
        this.relicLoadService = relicLoadService;
        this.marketService = marketService;
    }

    @Override
    public void run(ApplicationArguments args) {
        warm();
    }

    /**
     * Re-queues everything periodically.
     *
     * <p>Entries still inside their TTL are skipped by the warmer, so this costs
     * nothing until prices actually go stale, and then refreshes them in the
     * background rather than on a user's request.
     */
    @Scheduled(initialDelay = 30 * 60 * 1000, fixedDelay = 30 * 60 * 1000)
    public void warm() {
        try {
            Set<String> itemNames = new LinkedHashSet<>();

            for (Relic relic : relicLoadService.loadRelicsWithCheckData()) {
                // One refinement is enough: the four states share an item list.
                if (!"Intact".equalsIgnoreCase(relic.getState())) continue;
                if (relic.getRewards() == null) continue;

                for (Rewards reward : relic.getRewards()) {
                    if (reward.getItemName() != null) itemNames.add(reward.getItemName());
                }
            }

            marketService.enqueueAll(itemNames);
            System.out.println("price-warmup: " + itemNames.size() + " item in coda");

        } catch (Exception e) {
            System.err.println("price-warmup fallito: " + e.getMessage());
        }
    }
}
