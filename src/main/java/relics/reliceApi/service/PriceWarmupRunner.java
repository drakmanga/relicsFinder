package relics.reliceApi.service;

import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.ApplicationArguments;
import org.springframework.core.annotation.Order;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import relics.reliceApi.model.Relic;
import relics.reliceApi.model.Rewards;
import relics.reliceApi.model.WishlistEntry;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/**
 * Fills the price cache with everything the interface prices: every Prime part
 * in the drop tables, and every relic that holds them.
 *
 * <p>About 600 parts, 160 assembled sets and 770 relics, against a market that
 * allows roughly three requests a second — so filling an empty cache takes
 * around eight minutes. Doing it here, in the background, is the difference
 * between a table that shows prices immediately and one where every user pays
 * fifteen seconds per screenful.
 *
 * <p>That cost is now paid once rather than at every start: the cache is on
 * disk, so what this actually queues on a normal run is the handful of names
 * the last run had never seen.
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
    /** Only for what to price first. */
    private final WishlistService wishlistService;

    public PriceWarmupRunner(
            RelicLoadService relicLoadService,
            RelicMarketService marketService,
            DucatService ducatService,
            WishlistService wishlistService) {
        this.relicLoadService = relicLoadService;
        this.marketService = marketService;
        this.ducatService = ducatService;
        this.wishlistService = wishlistService;
    }

    @Override
    public void run(ApplicationArguments args) {
        warm();
        prioritiseWishlist();
    }

    /**
     * Puts the wishlist at the front of the queue on a cold start.
     *
     * <p>A dozen names, four seconds of queue, and the only place in the
     * application where someone has said in so many words which items they care
     * about. Everything else the warmer fills in is a guess about what will be
     * looked at; this is not.
     */
    private void prioritiseWishlist() {
        try {
            Set<String> items = new LinkedHashSet<>();
            Set<String> relics = new LinkedHashSet<>();

            for (WishlistEntry entry : wishlistService.all()) {
                String name = entry.getItemName();
                String kind = entry.getKind() == null ? "" : entry.getKind();

                if ("relic".equalsIgnoreCase(kind)) {
                    // A relic line carries the full name separately; the item
                    // name on it is the part the relic is wanted for.
                    String relic = entry.getRelicFullName();
                    if (relic != null && !relic.isBlank()) relics.add(relic);
                } else if ("set".equalsIgnoreCase(kind)) {
                    // The market lists an assembled set under its own name.
                    if (name != null && !name.isBlank()) items.add(name + " Set");
                } else if (name != null && !name.isBlank()) {
                    items.add(name);
                }
            }

            marketService.prioritise(items, relics);

        } catch (Exception e) {
            // A wishlist that cannot be read costs an ordering, not a price.
            System.err.println("price-warmup: wishlist priority skipped — " + e.getMessage());
        }
    }

    /**
     * Re-reads the catalogue and hands it to the market service.
     *
     * <p>Two jobs, and only the first costs anything: names with no price at all
     * are queued immediately — a cold start, or the parts of a Prime released
     * this morning — while the whole list becomes the beat the rolling refresh
     * walks, so entries that merely went stale are picked up one at a time
     * instead of arriving together.
     *
     * <p>Every ten minutes rather than every thirty: it is a file read and two
     * map lookups per name unless something is actually missing, and it is the
     * path by which a new Prime reaches the market at all.
     */
    @Scheduled(initialDelay = 10 * 60 * 1000, fixedDelay = 10 * 60 * 1000)
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
            List<String> slugs = new ArrayList<>(marketService.enqueueAll(itemNames));
            slugs.addAll(marketService.enqueueAllRelics(relicNames));
            marketService.setSweepList(slugs);

            System.out.println("price-warmup: " + itemNames.size() + " items and "
                    + relicNames.size() + " relics in rotation");

        } catch (Exception e) {
            System.err.println("price-warmup failed: " + e.getMessage());
        }
    }
}
