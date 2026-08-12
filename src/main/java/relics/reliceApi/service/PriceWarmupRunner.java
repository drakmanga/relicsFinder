package relics.reliceApi.service;

import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.ApplicationArguments;
import org.springframework.core.annotation.Order;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import relics.reliceApi.model.Relic;
import relics.reliceApi.model.Rewards;

import java.util.LinkedHashSet;
import java.util.Set;

/**
 * Fills the price cache with everything the interface prices: every Prime part
 * in the drop tables, and every relic that holds them.
 *
 * <p>About 600 parts, 160 assembled sets and 690 relics, against a market that
 * allows roughly three requests a second — so a full pass takes around eight
 * minutes. Doing it here,
 * once, in the background, is the difference between a table that shows prices
 * immediately and one where every user pays fifteen seconds per screenful.
 *
 * <p>Startup is not blocked: the queue is filled and the warmers drain it on
 * their own threads while the API is already serving.
 */
@Component
// After the catalogue refresh, so the warm list is the current one.
@Order(1)
public class PriceWarmupRunner implements ApplicationRunner {

    private final RelicLoadService relicLoadService;
    private final RelicMarketService marketService;
    /** Only for the set a part belongs to — the assembled set is priced too. */
    private final DucatService ducatService;

    public PriceWarmupRunner(
            RelicLoadService relicLoadService,
            RelicMarketService marketService,
            DucatService ducatService) {
        this.relicLoadService = relicLoadService;
        this.marketService = marketService;
        this.ducatService = ducatService;
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
            Set<String> relicNames = new LinkedHashSet<>();

            for (Relic relic : relicLoadService.loadRelicsWithCheckData()) {
                // One refinement is enough: the four states share an item list,
                // and a relic is one listing whatever state it is in.
                if (!"Intact".equalsIgnoreCase(relic.getState())) continue;

                if (relic.getTier() != null && relic.getRelicName() != null) {
                    relicNames.add(relic.getTier() + " " + relic.getRelicName());
                }

                if (relic.getRewards() == null) continue;

                for (Rewards reward : relic.getRewards()) {
                    if (reward.getItemName() == null) continue;

                    itemNames.add(reward.getItemName());

                    // The assembled set is its own listing — "Volt Prime Set" —
                    // and the Sets view quotes it beside the cost of the pieces
                    // still missing. Warmed here rather than on demand: it is
                    // one more name per set, and asked for cold it would queue
                    // behind the six hundred parts and arrive minutes later.
                    String setName = ducatService.lookup(reward.getItemName()).setName();
                    if (setName != null && !setName.isBlank()) itemNames.add(setName + " Set");
                }
            }

            // Parts first: they price the columns the table leads with, and the
            // relic's own price sits at the end of the row.
            marketService.enqueueAll(itemNames);
            marketService.enqueueAllRelics(relicNames);

            System.out.println("price-warmup: " + itemNames.size() + " items and "
                    + relicNames.size() + " relics queued");

        } catch (Exception e) {
            System.err.println("price-warmup failed: " + e.getMessage());
        }
    }
}
