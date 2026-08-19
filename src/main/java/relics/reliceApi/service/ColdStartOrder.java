package relics.reliceApi.service;

import org.springframework.stereotype.Component;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

/**
 * Holds the price sweep back until the Endo list has been filled once.
 *
 * <p>Both fill from the same three-requests-a-second budget, and left to start
 * together they share it in proportion to their threads: six warmers against
 * one Endo pass is one slot in seven, which turns eleven requests — four
 * seconds of work — into twenty-seven, and leaves the screen empty for the
 * whole of it.
 *
 * <p>Ordering them is enough to make that disappear, and it costs the sweep
 * four seconds out of the nine minutes it runs for. The alternative was to give
 * the limiter a notion of who is more deserving, which meant a pause, a booking
 * horizon and a starvation floor interacting with one another — machinery whose
 * only real job was this one window at startup. Sequence beats priority when
 * the contended period is short and its ends are known.
 *
 * <p>A gate rather than a direct call between the two services: the price sweep
 * has no business knowing that Ayatan sculptures exist.
 */
@Component
public class ColdStartOrder {

    /**
     * How long the sweep waits before starting anyway.
     *
     * <p>The Endo pass signalling is what opens the gate, and it signals even
     * when it fails — but a thread that dies in a way nobody anticipated must
     * not leave the catalogue permanently unpriced. Generous against the four
     * seconds the pass takes, because tripping this is a bug, not a slow day.
     */
    private static final long TIMEOUT_SECONDS = 120;

    private final CountDownLatch endoFilled = new CountDownLatch(1);

    /** Called by {@link EndoService} once its first pass has been through. */
    void endoReady() {
        endoFilled.countDown();
    }

    /**
     * Called by each price warmer before its first request.
     *
     * <p>Returns rather than throwing on timeout: the sweep starting late is
     * better than the sweep not starting.
     */
    void awaitEndo() throws InterruptedException {
        endoFilled.await(TIMEOUT_SECONDS, TimeUnit.SECONDS);
    }
}
