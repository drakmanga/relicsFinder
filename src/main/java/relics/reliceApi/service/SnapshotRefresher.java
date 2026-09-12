package relics.reliceApi.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import relics.reliceApi.model.RefreshOutcome;
import relics.reliceApi.model.RefreshView;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;

/**
 * Makes the numbers on one of the three ranked views newer, on demand.
 *
 * <p>Every one of them answers a question with a figure, and until this existed
 * pressing F5 could not move any of those figures. The browser cache was never
 * the reason: the client holds its cache in memory with no persister, so a
 * reload genuinely refetches everything and gets the same answer back, because
 * the server answers out of a snapshot of its own. This is the door onto that
 * snapshot.
 *
 * <p>What it deliberately does NOT re-read is the roughly 1.500 prices behind
 * the tables. Those are eight minutes of a market that allows three requests a
 * second, so a forced sweep on every reload is precisely the abuse the shared
 * address makes everyone's problem; and it would buy nothing, because the
 * rolling refresh already re-reads each price on the interval it earned and
 * {@code /api/market/status} already wakes an open tab when one of them moves.
 * What a reload genuinely could not get before is an item that did not exist
 * last time anybody looked, and that comes from the catalogue below.
 */
@Service
public class SnapshotRefresher {

    private final RefreshCooldown cooldown;
    private final Duration catalogueCooldown;
    private final Duration ordersCooldown;

    private final RelicUpdateService relicUpdateService;
    private final DucatService ducatService;
    /** Only to queue what the catalogue just gained; see {@link #rereadCatalogue}. */
    private final PriceWarmupRunner priceWarmupRunner;
    private final EndoService endoService;

    public SnapshotRefresher(
            RefreshCooldown cooldown,
            RelicUpdateService relicUpdateService,
            DucatService ducatService,
            PriceWarmupRunner priceWarmupRunner,
            EndoService endoService,
            @Value("${relics.refresh.catalogue-cooldown}") Duration catalogueCooldown,
            @Value("${relics.refresh.orders-cooldown}") Duration ordersCooldown) {
        this.cooldown = cooldown;
        this.relicUpdateService = relicUpdateService;
        this.ducatService = ducatService;
        this.priceWarmupRunner = priceWarmupRunner;
        this.endoService = endoService;
        this.catalogueCooldown = catalogueCooldown;
        this.ordersCooldown = ordersCooldown;
    }

    /**
     * Re-reads what this view shows, if the cooldown allows it.
     *
     * <p>The refusal is answered first and costs nothing: no host is contacted,
     * so a held-down F5 is a map lookup per reload rather than a queue of
     * re-reads the page then waits through.
     */
    public RefreshOutcome refresh(RefreshView view) {
        RefreshSource source = sourceOf(view);

        Optional<Instant> refused = cooldown.claim(source, cooldownFor(source));
        if (refused.isPresent()) {
            return outcome(view, RefreshOutcome.Status.ALREADY_CURRENT, refused.get());
        }

        boolean read = reread(source);
        return outcome(
                view,
                read ? RefreshOutcome.Status.REFRESHED : RefreshOutcome.Status.SOURCE_UNAVAILABLE,
                cooldown.nextAllowedAt(source));
    }

    private static RefreshSource sourceOf(RefreshView view) {
        return switch (view) {
            // Both rank things the catalogue says exist: Ducanetor ranks every
            // Prime part by its ducat value, the Tier List ranks every relic
            // that holds one. Neither of them can show a Prime released this
            // morning until the catalogue has been told about it.
            case DUCATS, TIERS -> RefreshSource.CATALOGUE;
            case ENDO -> RefreshSource.ORDERS;
        };
    }

    private Duration cooldownFor(RefreshSource source) {
        return switch (source) {
            case CATALOGUE -> catalogueCooldown;
            case ORDERS -> ordersCooldown;
        };
    }

    /** @return whether anything came back; false leaves the previous snapshot standing. */
    private boolean reread(RefreshSource source) {
        return switch (source) {
            case CATALOGUE -> rereadCatalogue();
            case ORDERS -> endoService.refreshNow();
        };
    }

    /**
     * The drop tables, then the item database, then whatever the two added.
     *
     * <p>Two hosts, and each is asked whatever the other did: an outage at
     * drops.warframestat.us must not cost the item database its re-read, since
     * that is the half a new Prime's ducat value and set membership come from.
     * Only both of them failing is a failure, because only then is the snapshot
     * exactly what it was before.
     *
     * <p>The warm-up pass runs last and reads the file the first step just
     * wrote. It is what turns a name the catalogue gained into a price: a part
     * nobody has ever fetched is the one state the warmer always queues, so a
     * new Prime's components go to the head of the queue and arrive in seconds
     * rather than at the next ten-minute pass. A name whose last call FAILED
     * counts as missing too, so the same pass retries every price a market
     * outage left empty — which is the other way the numbers on these views can
     * be old for a reason a reload could not fix.
     */
    private boolean rereadCatalogue() {
        boolean dropTables = read("drop tables", relicUpdateService::downloadAndUpdateRelics);
        boolean itemDatabase = read("item database", ducatService::refreshNow);

        if (!dropTables && !itemDatabase) return false;

        priceWarmupRunner.warm();
        return true;
    }

    /** @return whether the step came back. A step that failed costs the others nothing. */
    private static boolean read(String what, Step step) {
        try {
            step.run();
            return true;

        } catch (InterruptedException e) {
            // The flag is restored rather than the exception rethrown: the
            // caller is answering an HTTP request and has an answer to give.
            Thread.currentThread().interrupt();
            System.err.println("refresh: " + what + " interrupted");
            return false;

        } catch (Exception e) {
            System.err.println("refresh: " + what + " failed — " + e.getMessage());
            return false;
        }
    }

    /** One step of a re-read. Both of the two throw, and neither throws the same thing. */
    @FunctionalInterface
    private interface Step {
        void run() throws Exception;
    }

    private static RefreshOutcome outcome(RefreshView view, RefreshOutcome.Status status,
                                          Instant nextRefreshAt) {
        return new RefreshOutcome(view, status, nextRefreshAt.toString());
    }
}
