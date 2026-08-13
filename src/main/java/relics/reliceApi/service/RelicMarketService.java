package relics.reliceApi.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import org.springframework.stereotype.Service;
import relics.reliceApi.model.ItemPrice;
import relics.reliceApi.model.PricePoint;
import relics.reliceApi.model.RelicPrice;

import java.io.ByteArrayInputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Function;
import java.util.zip.GZIPInputStream;

/**
 * Prices from warframe.market.
 *
 * <p>Reads {@code statistics_closed} — trades that actually completed — rather
 * than {@code statistics_live}, which is the order book. The order book splits
 * into buy and sell, and averaging the two together yields a number nobody
 * trades at: for Volt Prime Neuroptics buyers offer about 15 and sellers ask
 * about 30, while closed trades sit near 27.
 *
 * <p>Lookups are served from an in-memory cache that a background warmer keeps
 * filled. The API allows roughly three requests a second, so a screen asking
 * for forty prices on demand would take fifteen seconds; the warmer pays that
 * cost once, in the background, for every user at once.
 */
@Service
public class RelicMarketService {

    private static final String API = "https://api.warframe.market/v1/items/";

    /**
     * How long an answer is worth keeping, for an item that trades.
     *
     * <p>Six hours rather than the thirty minutes this used to be, because
     * thirty minutes was faster than the source can move. The price shown is the
     * mean of {@code statistics_closed.48hours}, whose buckets are hourly — 31
     * and 44 of them on two sampled items, since hours with no sale are omitted.
     * One new hour therefore shifts the mean by about one fortieth, and reading
     * twice an hour re-fetched a number that had not changed.
     */
    private static final Duration ACTIVE_TTL = Duration.ofHours(6);

    /**
     * The same, for everything else — including items nobody is selling.
     *
     * <p>A day is the ceiling for the whole catalogue, deliberately: earlier
     * drafts of this gave quiet items a week or a month, which saved a few
     * hundred requests a day and in exchange would have shown a fortnight-old
     * price for the parts of a Prime the moment it was unvaulted, which is
     * exactly when the price matters.
     */
    private static final Duration IDLE_TTL = Duration.ofHours(24);

    /**
     * How long a failed call is held before asking again.
     *
     * <p>Short because a failure taught us nothing about the item; long enough
     * that a market which is down does not turn into a spin.
     */
    private static final Duration RETRY_TTL = Duration.ofMinutes(1);

    /** Trades in the last 48 hours above which an item counts as moving. */
    private static final int ACTIVE_VOLUME = 20;

    /**
     * How far the price may drift between two reads before the interval is
     * judged too long.
     *
     * <p>This, and not an interval, is the thing being chosen. Every read is
     * also a measurement — the new price against the one it replaces — and the
     * interval is moved until the drift it produces sits at this figure. An item
     * whose price holds still is asked about less and less; one in a storm is
     * asked about more, and calms down on its own when the storm passes.
     *
     * <p>Five per cent, measured against ninety days of history for all 1.528
     * items: the steady state is 4.947 reads a day, 28,6% of what one read every
     * five seconds allows, against 3.754 for the fixed pair of TTLs it replaces.
     *
     * <p>Volume drove this before, and volume is the wrong signal. Across the
     * catalogue the daily move in platinum is flat — half a platinum to one,
     * whether an item sells three times a day or three hundred — and the
     * percentages only look different because a platinum is 14% of a 7p part and
     * 2% of a 23p one. The traded items were being re-read four times a day for
     * the numbers that move least.
     */
    private static final double TARGET_DRIFT = 0.05;

    /**
     * The shortest interval that can be honoured, and the longest allowed.
     *
     * <p>The floor is not a preference. The sweep asks about one name every five
     * seconds, so a full lap of 1.528 items takes 2,1 hours: below that the TTL
     * is a promise the warmer cannot keep, and the queue would simply fall
     * behind and serve everything round-robin anyway. The ceiling is the same
     * day it has always been, for the same reason — a Prime is unvaulted
     * overnight, and that is when a stale price is worth least.
     */
    private static final Duration MIN_TTL = Duration.ofHours(3);
    private static final Duration MAX_TTL = Duration.ofHours(24);

    /**
     * How far one reading may move the interval.
     *
     * <p>A single quiet read on an item that usually moves is not proof it has
     * settled, and one jump is not proof of a storm. Damping the step makes the
     * interval the average of several readings rather than an echo of the last
     * one.
     */
    private static final double MAX_STEP_UP = 1.5;
    private static final double MAX_STEP_DOWN = 0.5;

    private static final Duration TIMEOUT = Duration.ofSeconds(15);

    /**
     * One request every 320ms — about three a second, the documented ceiling.
     *
     * <p>Enforced on the start of each call rather than by sleeping after it,
     * so the rate stays exact while several fetches are in flight. See
     * {@link #WARMERS}.
     */
    private static final long SPACING_MS = 320;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(TIMEOUT)
            .followRedirects(HttpClient.Redirect.NORMAL)
            .build();

    private final ObjectMapper mapper = new ObjectMapper();
    private final DucatService ducatService;
    /** Only for how the market spells an assembled set. */
    private final SetListingService setListingService;
    private final PriceCacheStore store;

    private final Map<String, Cached> cache = new ConcurrentHashMap<>();

    /**
     * Items waiting to be fetched, soonest first.
     *
     * <p>Holds what has no price at all: a cold start, a Prime released this
     * morning, a row someone is looking at. Merely stale entries are not put
     * here — {@link #sweep()} walks those one at a time, so a day's worth of
     * expiries cannot arrive as one wall of requests.
     */
    private final LinkedBlockingDeque<String> queue = new LinkedBlockingDeque<>();
    private final Set<String> queued = ConcurrentHashMap.newKeySet();

    /**
     * How many fetches are in flight at once.
     *
     * <p>One was not enough, and not because of the rate limit. A single worker
     * spends the whole round trip waiting — the ceiling it hit was the latency
     * of warframe.market, about five seconds a call, so the queue drained at
     * ten an hour's worth of items rather than the three a second we are
     * allowed. A catalogue of six hundred parts and as many relics took over an
     * hour to price, which is to say the newest column on the table stayed
     * empty for anyone who did not leave the app open.
     *
     * <p>The rate limit is still exact: workers take numbered slots from
     * {@link #awaitSlot}, so requests start {@value #SPACING_MS}ms apart no
     * matter how many threads are asking. Six is enough to keep a slot always
     * ready at that latency, and small enough that a slow market does not turn
     * into a pile of sockets.
     */
    private static final int WARMERS = 6;

    private final ExecutorService warmer = Executors.newFixedThreadPool(WARMERS, runnable -> {
        Thread thread = new Thread(runnable, "market-warmer");
        thread.setDaemon(true);
        return thread;
    });

    /** Guards the next free request slot, so the spacing is global. */
    private final Object rateLock = new Object();
    private long nextSlotAt = 0;

    private volatile boolean running = true;

    /* --- The rolling refresh, and the cache's copy on disk ------------------ */

    /**
     * How often one expired entry is picked up for re-reading.
     *
     * <p>The catalogue needs about 3.700 reads a day to stay inside its TTLs,
     * which is 2,6 a minute; one every five seconds leaves better than four
     * times that in reserve while keeping the traffic flat. Flat matters
     * because the alternative is what this replaced — every entry fetched in
     * the same eight minutes expires in the same eight minutes, and the day is
     * then a sawtooth of idle hours and stampedes.
     */
    private static final Duration SWEEP_INTERVAL = Duration.ofSeconds(5);

    /** How often the cache is written out, at most, when something changed. */
    private static final Duration FLUSH_INTERVAL = Duration.ofSeconds(60);

    /**
     * Every name worth keeping fresh, walked in order and without end.
     *
     * <p>A cursor over a list rather than a scan for the oldest entry: the
     * cursor only ever moves forward, so every name is reached before any name
     * is reached twice, and nothing can be starved by a neighbour that keeps
     * expiring sooner.
     */
    private volatile List<String> sweepList = List.of();
    private final AtomicInteger sweepCursor = new AtomicInteger();

    private final AtomicBoolean dirty = new AtomicBoolean();

    private final ScheduledExecutorService housekeeping =
            Executors.newSingleThreadScheduledExecutor(runnable -> {
                Thread thread = new Thread(runnable, "market-housekeeping");
                thread.setDaemon(true);
                return thread;
            });

    public RelicMarketService(DucatService ducatService, SetListingService setListingService,
                              PriceCacheStore store) {
        this.ducatService = ducatService;
        this.setListingService = setListingService;
        this.store = store;
    }

    /**
     * Reads back the prices the last run had already paid for, and starts work.
     *
     * <p>Eight minutes of requests survive a restart, so the tables have numbers
     * in them before the first screen is drawn. Whatever the file does not carry
     * is simply missing, and missing is the one state that always gets queued.
     *
     * <p>The threads start here rather than in the constructor so that
     * constructing this service touches neither the network nor a clock — which
     * is what lets the queue and the sweep be tested at all.
     */
    @PostConstruct
    void start() {
        Map<String, Cached> saved = store.load();
        cache.putAll(saved);
        if (!saved.isEmpty()) System.out.println("price-cache: " + saved.size() + " entries restored");

        for (int i = 0; i < WARMERS; i++) warmer.submit(this::warmLoop);

        housekeeping.scheduleWithFixedDelay(this::sweep,
                SWEEP_INTERVAL.toMillis(), SWEEP_INTERVAL.toMillis(), TimeUnit.MILLISECONDS);
        housekeeping.scheduleWithFixedDelay(this::flush,
                FLUSH_INTERVAL.toMillis(), FLUSH_INTERVAL.toMillis(), TimeUnit.MILLISECONDS);
    }

    /**
     * Replaces the list the rolling refresh walks.
     *
     * <p>Called by the warm-up runner with the current catalogue, so a Prime
     * released today joins the rotation without a restart. The cursor is left
     * where it is: it wraps on the new size, and a name it steps over early is
     * reached on the next lap rather than lost.
     */
    void setSweepList(List<String> slugs) {
        sweepList = List.copyOf(slugs);
    }

    /**
     * Queues the next expired entry, and only that one.
     *
     * <p>Walks forward from the cursor until it finds one, so a lap costs a few
     * map lookups when everything is fresh and never more than one request when
     * it is not.
     */
    void sweep() {
        List<String> names = sweepList;
        if (names.isEmpty()) return;

        for (int step = 0; step < names.size(); step++) {
            String slug = names.get(Math.floorMod(sweepCursor.getAndIncrement(), names.size()));
            Cached cached = cache.get(slug);

            if (cached == null || !cached.isFresh()) {
                enqueue(slug);
                return;
            }
        }
    }

    /** Writes the cache out if anything changed since the last time. */
    private void flush() {
        if (dirty.compareAndSet(true, false)) store.save(Map.copyOf(cache));
    }

    /**
     * Waits for this worker's turn to call the market.
     *
     * <p>Slots are handed out in advance rather than measured after the fact:
     * every caller books the next one and sleeps until it arrives, so the
     * interval holds even when a fetch takes ten times longer than the spacing.
     */
    private void awaitSlot() throws InterruptedException {
        long wait;

        synchronized (rateLock) {
            long now = System.currentTimeMillis();
            long slot = Math.max(now, nextSlotAt);
            nextSlotAt = slot + SPACING_MS;
            wait = slot - now;
        }

        if (wait > 0) Thread.sleep(wait);
    }

    @PreDestroy
    void shutdown() {
        running = false;
        warmer.shutdownNow();
        housekeeping.shutdownNow();
        // Written unconditionally: the sixty-second flush may be up to sixty
        // seconds behind, and this is the one moment it cannot catch up later.
        store.save(Map.copyOf(cache));
    }

    /**
     * What one lookup produced. A null price is a real answer: nothing sold.
     *
     * <p>{@code failed} separates that answer from the absence of one. Until it
     * existed, a timeout and a 404 produced the same record, so a moment of bad
     * network was written down as "this item has no market" and displayed as
     * such for as long as the entry stayed fresh.
     */
    record Cached(Double avg, Double median, Integer volume, Double trend,
                  List<PricePoint> history, Instant at, boolean failed, Duration earnedTtl) {

        /** An answer that has not been compared with anything yet. */
        Cached(Double avg, Double median, Integer volume, Double trend,
               List<PricePoint> history, Instant at, boolean failed) {
            this(avg, median, volume, trend, history, at, failed, null);
        }

        Cached withTtl(Duration ttl) {
            return new Cached(avg, median, volume, trend, history, at, failed, ttl);
        }

        /**
         * How long this answer stays good.
         *
         * <p>Earned by the item where there is a pair of readings to earn it
         * from — see {@link #nextTtl}. Until then it is guessed from
         * {@code volume}, which arrives in the same response as the price: a
         * guess is needed only once, and being wrong costs one interval.
         */
        Duration ttl() {
            if (failed) return RETRY_TTL;
            if (earnedTtl != null) return earnedTtl;
            return volume != null && volume >= ACTIVE_VOLUME ? ACTIVE_TTL : IDLE_TTL;
        }

        boolean isFresh() {
            return Duration.between(at, Instant.now()).compareTo(ttl()) < 0;
        }
    }

    /**
     * The interval this pair of readings earns.
     *
     * <p>A price that wanders moves like the square root of time, so an interval
     * that produced a drift of {@code d} would have produced {@link
     * #TARGET_DRIFT} over {@code elapsed * (TARGET_DRIFT / d)^2}. That is the
     * whole rule. It reads the interval that was really waited rather than the
     * one that was intended, so a sweep running late corrects itself instead of
     * compounding.
     *
     * <p>Returns null when there is nothing to measure — the first reading of an
     * item, a failed call, an item nobody sells — and the guess from volume
     * stands for one more interval.
     *
     * @param previous the reading being replaced
     * @param fresh    the reading replacing it
     */
    static Duration nextTtl(Cached previous, Cached fresh) {
        if (fresh == null || fresh.failed() || fresh.avg() == null) return null;
        if (previous == null || previous.avg() == null || previous.avg() <= 0) return null;

        double elapsed = Duration.between(previous.at(), fresh.at()).toSeconds();
        if (elapsed <= 0) return previous.earnedTtl();

        double drift = Math.abs(fresh.avg() - previous.avg()) / previous.avg();
        double current = previous.ttl().toSeconds();

        // A price that did not move divides by zero on purpose. The infinity
        // that comes back is the honest answer — nothing happened, so no
        // interval is long enough — and the step ceiling below turns it into the
        // longest step allowed. A guard here would compute the same number by a
        // longer route, which is how it was written first and why the mutation
        // check could not tell the two apart.
        double wanted = elapsed * Math.pow(TARGET_DRIFT / drift, 2);

        double damped = Math.max(current * MAX_STEP_DOWN, Math.min(current * MAX_STEP_UP, wanted));
        double bounded = Math.max(MIN_TTL.toSeconds(), Math.min(MAX_TTL.toSeconds(), damped));

        return Duration.ofSeconds(Math.round(bounded));
    }

    /**
     * Whether there is anything worth showing for this entry.
     *
     * <p>A failed call counts as nothing, exactly like an entry that was never
     * fetched: it holds no price, no volume and no history. Without this rule
     * the record of the failure would stand in for the item everywhere a miss
     * is looked for — a market that was down during the first fill would leave
     * 1.527 entries that the warm-up no longer considers missing, and recovery
     * would fall to the sweep alone, at one name every five seconds.
     */
    static boolean isMissing(Cached cached) {
        return cached == null || cached.failed();
    }

    /* ------------------------------------------------------------------ */
    /* Reads — never block on the network                                  */
    /* ------------------------------------------------------------------ */

    /**
     * Price and metadata for one part.
     *
     * <p>Returns immediately. A cache miss queues the item and answers with
     * nulls, so a screen paints at once and fills in as prices arrive rather
     * than holding the response for fifteen seconds.
     *
     * <p>Only a miss is queued. An entry past its TTL still has a price worth
     * showing, and this method is called once per row of a table asking for the
     * whole catalogue — queueing those would put a day's expiries into the
     * queue the moment anyone opened a screen, which is the stampede
     * {@link #sweep()} exists to prevent.
     */
    public ItemPrice getItemPrice(String itemName) {
        String slug = slugFor(itemName);
        Cached cached = cache.get(slug);

        if (isMissing(cached)) enqueue(slug);

        DucatService.ItemMeta meta = ducatService.lookup(itemName);

        // Field order matches ItemPrice: name, price, median, volume, trend,
        // slug, ducats, set, category.
        return new ItemPrice(
                itemName,
                cached == null ? null : cached.avg(),
                cached == null ? null : cached.median(),
                cached == null ? null : cached.volume(),
                cached == null ? null : cached.trend(),
                slug,
                meta.ducats(),
                meta.setName(),
                meta.category());
    }

    public List<ItemPrice> getItemPrices(List<String> itemNames) {
        List<ItemPrice> out = new ArrayList<>(itemNames.size());
        for (String name : itemNames) {
            if (name != null && !name.isBlank()) out.add(getItemPrice(name.trim()));
        }
        return out;
    }

    /** Ninety days of completed trades. Empty until the item has been fetched. */
    public List<PricePoint> getHistory(String itemName) {
        String slug = itemSlug(itemName);
        Cached cached = cache.get(slug);

        if (cached == null || !cached.isFresh()) {
            enqueueFirst(slug);
            // A chart has someone looking at it, so a short wait beats an empty
            // panel; the cached copy is returned immediately if there is one.
            if (cached == null) cached = awaitBriefly(slug);
        }
        return cached == null ? List.of() : cached.history();
    }

    /**
     * The same series for a whole relic.
     *
     * <p>Separate from {@link #getHistory} because a relic and a part of the
     * same name are two different listings: only the slug differs, and reusing
     * the item one would chart the part called "Axi A1", which does not exist.
     */
    public List<PricePoint> getRelicHistory(String relicName) {
        String slug = relicSlug(relicName);
        Cached cached = cache.get(slug);

        if (cached == null || !cached.isFresh()) {
            enqueueFirst(slug);
            if (cached == null) cached = awaitBriefly(slug);
        }
        return cached == null ? List.of() : cached.history();
    }

    /**
     * Everything the market knows about a whole relic: price, median, trades
     * and the ninety-day trend.
     *
     * <p>{@link #getRelicPrices} answers the table, which needs one number per
     * row and cannot wait; this answers the panel someone has open, so it waits
     * briefly for a first fetch rather than showing dashes. Ducats and set are
     * null by nature — a relic cannot be dissolved and belongs to no set.
     */
    public ItemPrice getRelicPrice(String relicName) {
        String slug = relicSlug(relicName);
        Cached cached = cache.get(slug);

        if (cached == null || !cached.isFresh()) {
            enqueueFirst(slug);
            if (cached == null) cached = awaitBriefly(slug);
        }

        return new ItemPrice(
                relicName,
                cached == null ? null : cached.avg(),
                cached == null ? null : cached.median(),
                cached == null ? null : cached.volume(),
                cached == null ? null : cached.trend(),
                slug,
                // A relic has no ducat value, no set and no kind of gear: it is
                // the container, not the contents.
                null,
                null,
                null);
    }

    /**
     * Average price of a whole relic.
     *
     * @return the average, or -1 when unavailable — the contract the original
     *         controller was written against.
     */
    public double getAveragePrice(String relicName) {
        String slug = relicSlug(relicName);
        Cached cached = cache.get(slug);

        if (cached == null || !cached.isFresh()) {
            enqueueFirst(slug);
            if (cached == null) cached = awaitBriefly(slug);
        }
        return cached == null || cached.avg() == null ? -1 : cached.avg();
    }

    /**
     * Prices for many relics in one call.
     *
     * <p>The relics table lists the whole catalogue, and buying a relic is the
     * alternative to farming it — so the price belongs on every row, not on the
     * one that happens to be open. Asked for one at a time that is hundreds of
     * requests against a market that allows about three a second.
     *
     * <p>Unlike {@link #getAveragePrice}, a relic with no listings comes back
     * with a null price rather than -1: the response is a lookup table the
     * caller joins on, and a sentinel number in it would be indistinguishable
     * from a real one.
     */
    public List<RelicPrice> getRelicPrices(List<String> relicNames) {
        List<RelicPrice> out = new ArrayList<>(relicNames.size());

        for (String name : relicNames) {
            if (name == null || name.isBlank()) continue;

            String relicName = name.trim();
            String slug = relicSlug(relicName);
            Cached cached = cache.get(slug);

            // Queued, not waited on. One slow relic must not hold up the other
            // thirty on screen — the warmer fills it in and the next poll from
            // the client picks it up. Stale entries are left to the sweep, for
            // the reason given on getItemPrice.
            if (isMissing(cached)) enqueue(slug);

            out.add(new RelicPrice(relicName, cached == null ? null : cached.avg()));
        }

        return out;
    }

    /**
     * How much of the catalogue is priced. Drives the "warming" hint in the UI.
     *
     * <p>Failed calls are left out of both counts. They sit in the map like any
     * other entry, so counting them would let a market that answered nothing at
     * all report a catalogue fully priced, and the hint that exists to say
     * "still warming" would say the opposite.
     */
    public Map<String, Object> cacheStatus() {
        long priced = cache.values().stream().filter(cached -> !cached.failed()).count();
        long fresh = cache.values().stream()
                .filter(cached -> !cached.failed() && cached.isFresh())
                .count();

        return Map.of(
                "cached", priced,
                "fresh", fresh,
                "queued", queue.size());
    }

    /**
     * Moves the rows someone is actually looking at to the front of the queue.
     *
     * <p>The client asks for the whole catalogue in one request and always will
     * — sorting a table by price is only right when every row has one — but it
     * also knows which thirty rows are on screen, and that is the one signal
     * about what matters first that does not have to be guessed. Nothing is
     * returned: this changes the order of work, not the answer to a question,
     * and a call that fails costs the caller nothing.
     */
    public void prioritise(Collection<String> itemNames, Collection<String> relicNames) {
        prioritise(itemNames, this::slugFor);
        prioritise(relicNames, RelicMarketService::relicSlug);
    }

    private void prioritise(Collection<String> names, Function<String, String> toSlug) {
        if (names == null) return;

        for (String name : names) {
            if (name == null || name.isBlank()) continue;
            String slug = toSlug.apply(name.trim());
            Cached cached = cache.get(slug);
            if (cached == null || !cached.isFresh()) enqueueFirst(slug);
        }
    }

    /* ------------------------------------------------------------------ */
    /* Warmer                                                              */
    /* ------------------------------------------------------------------ */

    /** Queues a slug at the back — background refresh. */
    private void enqueue(String slug) {
        if (queued.add(slug)) queue.addLast(slug);
    }

    /** Queues a slug at the front — someone is waiting on this one. */
    private void enqueueFirst(String slug) {
        queue.remove(slug);
        queued.add(slug);
        queue.addFirst(slug);
    }

    /**
     * Warms a whole catalogue, e.g. every Prime part in the drop tables.
     *
     * @return the slugs behind those names, for the caller to hand back as the
     *         rolling refresh's beat — see {@link #setSweepList}.
     */
    public List<String> enqueueAll(Collection<String> itemNames) {
        return enqueueAllSlugs(itemNames, this::slugFor);
    }

    /**
     * Same, for whole relics.
     *
     * <p>Separate because a relic and a part reach the market through different
     * slugs. Without this the relics table showed no price at all until someone
     * opened it and then waited for the queue to reach the back — every restart
     * of the server, for every user.
     */
    public List<String> enqueueAllRelics(Collection<String> relicNames) {
        return enqueueAllSlugs(relicNames, RelicMarketService::relicSlug);
    }

    /**
     * Queues what has no price at all, and returns the slugs it walked.
     *
     * <p>Only the misses: a name that already has a price, however old, is left
     * to {@link #sweep()}. That is what keeps a Prime released this morning
     * arriving within minutes while nothing else moves — a new name is a miss,
     * and a miss is the one state that is always queued at once.
     */
    private List<String> enqueueAllSlugs(Collection<String> names, Function<String, String> toSlug) {
        List<String> slugs = new ArrayList<>(names.size());

        for (String name : names) {
            if (name == null || name.isBlank()) continue;
            String slug = toSlug.apply(name.trim());
            slugs.add(slug);
            if (isMissing(cache.get(slug))) enqueue(slug);
        }

        return slugs;
    }

    private void warmLoop() {
        while (running) {
            try {
                String slug = queue.poll(1, TimeUnit.SECONDS);
                if (slug == null) continue;

                queued.remove(slug);

                Cached existing = cache.get(slug);
                if (existing != null && existing.isFresh()) continue;

                // The slot is taken before the call, not after: the spacing has
                // to sit between the starts of two requests, and a worker that
                // slept afterwards would let five others fire at once.
                awaitSlot();

                // The reading being replaced is the other half of the
                // measurement, so the interval is worked out before it is gone.
                Cached fresh = fetch(slug);
                cache.put(slug, fresh.withTtl(nextTtl(existing, fresh)));
                dirty.set(true);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return;
            } catch (Exception e) {
                System.err.println("market-warmer: " + e.getMessage());
            }
        }
    }

    /** Gives the warmer a moment when a caller is genuinely waiting. */
    private Cached awaitBriefly(String slug) {
        for (int i = 0; i < 40; i++) {
            Cached cached = cache.get(slug);
            if (cached != null) return cached;
            try {
                Thread.sleep(100);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return null;
            }
        }
        return cache.get(slug);
    }

    private Cached fetch(String slug) {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(API + slug + "/statistics"))
                    .timeout(TIMEOUT)
                    .header("accept", "application/json")
                    .header("platform", "pc")
                    // Asked for explicitly because HttpClient neither requests
                    // nor decodes compression on its own, and this response is
                    // ninety days of numbers: 99,5 KB becomes 13,6 KB.
                    .header("Accept-Encoding", "gzip")
                    .GET()
                    .build();

            HttpResponse<byte[]> response =
                    httpClient.send(request, HttpResponse.BodyHandlers.ofByteArray());

            // 404 means the item is not traded — an answer, not a fault.
            if (response.statusCode() == 404) return noListing();

            // Anything else is the market failing to answer, which says nothing
            // about the item: recorded as a failure so it is retried in a
            // minute rather than shown as a part nobody sells.
            if (response.statusCode() != 200) {
                System.err.println("market: HTTP " + response.statusCode() + " for " + slug);
                return unanswered();
            }

            JsonNode closed = decode(response)
                    .path("payload").path("statistics_closed");

            List<PricePoint> history = points(closed.path("90days"));
            Window recent = window(closed.path("48hours"));

            // Nothing sold in 48 hours: the last day that did sell is a better
            // answer than none at all.
            if (recent.avg() == null && !history.isEmpty()) {
                PricePoint last = history.get(history.size() - 1);
                recent = new Window(last.getAvgPrice(), last.getMedian(), last.getVolume());
            }

            return new Cached(recent.avg(), recent.median(), recent.volume(),
                    trend(recent.avg(), history), history, Instant.now(), false);

        } catch (Exception e) {
            System.err.println("market: error on " + slug + " — " + e.getMessage());
            return unanswered();
        }
    }

    /** The market answered: this item has no listings. */
    private static Cached noListing() {
        return new Cached(null, null, null, null, List.of(), Instant.now(), false);
    }

    /** The market did not answer. Indistinguishable from the above until it was. */
    private static Cached unanswered() {
        return new Cached(null, null, null, null, List.of(), Instant.now(), true);
    }

    /**
     * The body, decompressed when the server chose to compress it.
     *
     * <p>The header is a request, not a guarantee: a proxy or a future change of
     * mind can answer in plain JSON, so the uncompressed path stays.
     */
    private JsonNode decode(HttpResponse<byte[]> response) throws Exception {
        boolean gzipped = response.headers()
                .firstValue("content-encoding")
                .orElse("")
                .toLowerCase(Locale.ROOT)
                .contains("gzip");

        if (!gzipped) return mapper.readTree(response.body());

        try (GZIPInputStream unzipped =
                     new GZIPInputStream(new ByteArrayInputStream(response.body()))) {
            return mapper.readTree(unzipped);
        }
    }

    private record Window(Double avg, Double median, Integer volume) {}

    private Window window(JsonNode series) {
        double sum = 0, medianSum = 0;
        int count = 0, volume = 0;

        for (JsonNode entry : series) {
            if (!entry.hasNonNull("avg_price")) continue;
            double avg = entry.get("avg_price").asDouble();
            sum += avg;
            medianSum += entry.path("median").asDouble(avg);
            volume += entry.path("volume").asInt(0);
            count++;
        }

        if (count == 0) return new Window(null, null, null);
        return new Window(round(sum / count), round(medianSum / count), volume);
    }

    private List<PricePoint> points(JsonNode series) {
        List<PricePoint> out = new ArrayList<>();

        for (JsonNode entry : series) {
            if (!entry.hasNonNull("avg_price")) continue;
            String datetime = entry.path("datetime").asText("");
            double avg = entry.get("avg_price").asDouble();

            out.add(new PricePoint(
                    datetime.length() >= 10 ? datetime.substring(0, 10) : datetime,
                    round(avg),
                    round(entry.path("median").asDouble(avg)),
                    round(entry.path("min_price").asDouble(0)),
                    round(entry.path("max_price").asDouble(0)),
                    entry.path("volume").asInt(0)));
        }
        return out;
    }

    /** Current price against the 90-day average, as a percentage. */
    private Double trend(Double current, List<PricePoint> history) {
        if (current == null || history.size() < 7) return null;

        double sum = 0;
        for (PricePoint point : history) sum += point.getAvgPrice();
        double baseline = sum / history.size();
        if (baseline <= 0) return null;

        return round((current - baseline) / baseline * 100);
    }

    private static double round(double value) {
        return Math.round(value * 100) / 100.0;
    }

    /* ------------------------------------------------------------------ */
    /* Slugs                                                               */
    /* ------------------------------------------------------------------ */

    /** "Lith V9" → "lith_v9_relic". */
    static String relicSlug(String relicName) {
        return baseSlug(relicName) + "_relic";
    }

    /**
     * "Volt Prime Neuroptics Blueprint" → "volt_prime_neuroptics_blueprint".
     *
     * <p>The name is kept whole. This used to strip a trailing "Blueprint" from
     * part names, on the belief that warframe.market did not carry it — and the
     * shortened slug did answer, but with a 301 to the full one, which the HTTP
     * client follows silently. That worked for as long as every part had a
     * redirect behind it. Warframes released since Hildryn have none, so
     * Revenant, Wisp, Caliban, Lavos and the rest came back 404 and were
     * displayed as parts nobody is selling, which is a different and much
     * quieter kind of wrong.
     */
    static String itemSlug(String itemName) {
        return baseSlug(itemName);
    }

    /**
     * The same, but asking the market how it spells an assembled set.
     *
     * <p>An instance method rather than a static one because the answer comes
     * from a service: see SetListingService for the one set in the catalogue
     * whose listing is not simply its name with "Set" on the end.
     */
    String slugFor(String itemName) {
        String listed = setListingService.slugFor(itemName);
        return listed != null ? listed : baseSlug(itemName);
    }

    /**
     * A name as warframe.market spells it in a URL.
     *
     * <p>"&" becomes "and" rather than a separator: the market writes "Cobra &
     * Crane Prime Hilt" as {@code cobra_and_crane_prime_hilt}, and collapsing
     * the ampersand into an underscore produced a slug for a weapon that does
     * not exist. Every dual weapon in the game was priced at nothing because of
     * it.
     */
    private static String baseSlug(String value) {
        return value == null ? "" : value.trim()
                .toLowerCase(Locale.ROOT)
                .replace("&", " and ")
                .replaceAll("[^a-z0-9]+", "_")
                .replaceAll("^_+|_+$", "");
    }
}
