package relics.reliceApi.service;

import org.junit.jupiter.api.Test;

import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicLong;

import static org.assertj.core.api.Assertions.assertThat;

class ColdStartOrderTest {

    @Test
    void holdsTheSweepUntilTheEndoPassSignals() throws Exception {
        ColdStartOrder order = new ColdStartOrder();

        AtomicBoolean started = new AtomicBoolean();
        Thread sweep = new Thread(() -> {
            try {
                order.awaitEndo();
                started.set(true);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        });
        sweep.setDaemon(true);
        sweep.start();

        Thread.sleep(150);
        assertThat(started).isFalse();

        order.endoReady();
        sweep.join(5_000);
        assertThat(started).isTrue();
    }

    @Test
    void releasesEveryWaitingWarmerAtOnce() throws Exception {
        // Six threads wait on this, not one, and a latch that only freed the
        // first would leave five parked until the timeout.
        ColdStartOrder order = new ColdStartOrder();

        AtomicLong released = new AtomicLong();
        for (int i = 0; i < 6; i++) {
            Thread warmer = new Thread(() -> {
                try {
                    order.awaitEndo();
                    released.incrementAndGet();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            });
            warmer.setDaemon(true);
            warmer.start();
        }

        Thread.sleep(100);
        assertThat(released).hasValue(0);

        order.endoReady();
        Thread.sleep(500);
        assertThat(released).hasValue(6);
    }

    @Test
    void staysOpenOnceSignalled() throws Exception {
        // Later passes signal again on every run. The gate must not close
        // behind them, or a warmer restarted afterwards would wait for nothing.
        ColdStartOrder order = new ColdStartOrder();

        order.endoReady();
        order.endoReady();
        order.endoReady();

        long start = System.nanoTime();
        order.awaitEndo();
        long elapsedMs = (System.nanoTime() - start) / 1_000_000L;

        assertThat(elapsedMs).isLessThan(100);
    }
}
