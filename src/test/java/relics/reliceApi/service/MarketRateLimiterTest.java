package relics.reliceApi.service;

import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.CountDownLatch;

import static org.assertj.core.api.Assertions.assertThat;

class MarketRateLimiterTest {


    /** The clock the limiter itself uses, so bounds and measurements agree. */
    private static long millis() {
        return System.nanoTime() / 1_000_000L;
    }

    /** Slack for the flooring in that conversion. */
    private static final long CLOCK_SLACK_MS = 2;

    /** The published ceiling this has to stay under. */
    private static final double MAX_PER_SECOND = 3.0;

    @Test
    void spacesRequestsFromOneCaller() throws Exception {
        MarketRateLimiter limiter = new MarketRateLimiter();

        long start = millis();
        for (int i = 0; i < 4; i++) limiter.awaitSlot();
        long elapsed = millis() - start;

        // Four slots means three gaps; the first is handed out immediately.
        assertThat(elapsed)
                .isGreaterThanOrEqualTo(3 * MarketRateLimiter.SPACING_MS - CLOCK_SLACK_MS);
    }

    @Test
    void staysUnderTheCeilingAcrossConcurrentCallers() throws Exception {
        MarketRateLimiter limiter = new MarketRateLimiter();

        int threads = 6;
        int perThread = 4;
        int total = threads * perThread;

        List<Long> starts = new ArrayList<>();
        CountDownLatch ready = new CountDownLatch(threads);
        CountDownLatch done = new CountDownLatch(threads);

        for (int t = 0; t < threads; t++) {
            new Thread(() -> {
                try {
                    ready.countDown();
                    ready.await();
                    for (int i = 0; i < perThread; i++) {
                        limiter.awaitSlot();
                        synchronized (starts) {
                            starts.add(millis());
                        }
                    }
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            }).start();
        }

        done.await();

        long span = starts.stream().max(Long::compare).orElseThrow()
                - starts.stream().min(Long::compare).orElseThrow();

        assertThat(starts).hasSize(total);

        // The point of booking slots rather than sleeping after each call: six
        // threads asking at once still start their requests one spacing apart,
        // so the rate does not multiply by the number of workers.
        double perSecond = (total - 1) * 1000.0 / span;
        assertThat(perSecond).isLessThanOrEqualTo(MAX_PER_SECOND);
    }

    @Test
    void oneBudgetIsSharedBetweenTheServicesThatCallTheSameHost() throws Exception {
        // The regression this guards: RelicMarketService, EndoService and
        // SetListingService each held a private counter, so each stayed under
        // the ceiling alone while their sum went over it. Two callers on one
        // limiter must be spaced against each other, not only against
        // themselves.
        MarketRateLimiter shared = new MarketRateLimiter();

        long start = millis();

        Thread other = new Thread(() -> {
            try {
                for (int i = 0; i < 3; i++) shared.awaitSlot();
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        });
        other.start();
        for (int i = 0; i < 3; i++) shared.awaitSlot();
        other.join();

        long elapsed = millis() - start;

        // Six slots between the two of them, not three each in parallel.
        assertThat(elapsed)
                .isGreaterThanOrEqualTo(5 * MarketRateLimiter.SPACING_MS - CLOCK_SLACK_MS);
    }



    @Test
    void neverGrantsTwoSlotsCloserThanTheSpacing() throws Exception {
        // The property the ceiling actually rests on.
        MarketRateLimiter limiter = new MarketRateLimiter();

        List<Long> grants = Collections.synchronizedList(new ArrayList<>());
        List<Thread> threads = new ArrayList<>();

        for (int t = 0; t < 4; t++) {
            Thread thread = new Thread(() -> {
                try {
                    for (int i = 0; i < 3; i++) {
                        limiter.awaitSlot();
                        grants.add(millis());
                    }
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            });
            thread.start();
            threads.add(thread);
        }
        for (Thread thread : threads) thread.join(30_000);

        List<Long> sorted = new ArrayList<>(grants);
        Collections.sort(sorted);
        assertThat(sorted).hasSize(12);

        for (int i = 1; i < sorted.size(); i++) {
            long gap = sorted.get(i) - sorted.get(i - 1);
            // Sleep overshoots and never undershoots, so the floor is the
            // spacing less the clock's own granularity.
            assertThat(gap).isGreaterThanOrEqualTo(MarketRateLimiter.SPACING_MS - 15);
        }
    }

}
