package relics.reliceApi.service;

import org.springframework.stereotype.Component;

/**
 * The one throttle in front of api.warframe.market.
 *
 * <p>Three services call that host — {@link RelicMarketService},
 * {@link EndoService} and {@link SetListingService} — and warframe.market sees
 * one address, not three beans. Each of them holding a private counter meant
 * each stayed under the published ceiling of three requests a second on its own
 * while their sum did not: the rolling warmer runs continuously, so any Endo or
 * set-listing refresh overlapped it by default rather than by coincidence.
 * Sharing this component makes the limit mean what the published rules mean.
 *
 * <p>Slots are handed out in advance rather than measured after the fact: every
 * caller books the next one and sleeps until it arrives, so the interval holds
 * even when a fetch takes ten times longer than the spacing, and a caller whose
 * request outlasted its own slot proceeds without waiting again. Sleeping for
 * the spacing <em>after</em> each call would instead add the network time to
 * it — at the ~180ms this host answers in, that is 530ms between requests where
 * booking gives 350ms.
 *
 * <p>Every caller is equal here, deliberately. An earlier version ranked them,
 * so that work somebody was waiting on could push the background sweep aside;
 * it needed a quiet window, a booking horizon and a starvation floor, three
 * settings that only behaved when read together, and all of it existed to
 * protect one window — the seconds after a cold start, when the Endo list and
 * the price sweep both want the budget at once. {@link ColdStartOrder} settles
 * that by ordering the two instead, which is a fact about startup rather than a
 * rule inside the throttle, and leaves this class one thing to be right about.
 */
@Component
public class MarketRateLimiter {

    /**
     * One request every 350ms — about 2,86 a second, under the documented
     * ceiling of three.
     *
     * <p>320ms was the previous value and read as "about three a second", but
     * it works out to 3,125 a second: over the limit on every call rather than
     * under it, which is the side of the line that gets a client blocked. The
     * spacing has to divide 1000 by more than three, so 334 is the floor and
     * this leaves a margin for the clock granularity underneath it — and for
     * the browser tab the same address may have open on warframe.market, which
     * spends the same budget.
     */
    static final long SPACING_MS = 350;

    private final Object rateLock = new Object();

    /**
     * When the next unbooked request may start, on the monotonic clock.
     *
     * <p>Milliseconds from {@link System#nanoTime}, not {@link
     * System#currentTimeMillis}: the wall clock is not monotonic, and an NTP
     * correction stepping it backwards — after a resume, or on the first sync
     * of a session — left this value that far in the future and stalled every
     * request for the size of the step. Twelve seconds, in a five-second test
     * step.
     */
    private long nextSlotAt = 0;

    private static long now() {
        return System.nanoTime() / 1_000_000L;
    }

    /**
     * Waits for the caller's turn to call the market.
     *
     * <p>Called immediately before the request goes out, never after it
     * returns.
     */
    public void awaitSlot() throws InterruptedException {
        long wait;

        synchronized (rateLock) {
            long now = now();
            long slot = Math.max(now, nextSlotAt);
            nextSlotAt = slot + SPACING_MS;
            wait = slot - now;
        }

        if (wait > 0) Thread.sleep(wait);
    }
}
