package relics.reliceApi.service;

import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;

class RefreshCooldownTest {

    private static final Duration WINDOW = Duration.ofMinutes(15);
    private static final Instant START = Instant.parse("2026-09-12T10:00:00Z");

    /** Time as a value the test moves, so a cooldown can be waited out in a millisecond. */
    private static final class SteppingClock extends Clock {
        private Instant now;

        SteppingClock(Instant now) {
            this.now = now;
        }

        void advance(Duration by) {
            now = now.plus(by);
        }

        @Override
        public Instant instant() {
            return now;
        }

        @Override
        public ZoneOffset getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(java.time.ZoneId zone) {
            return this;
        }
    }

    @Test
    void firstClaimIsGranted() {
        RefreshCooldown cooldown = new RefreshCooldown(new SteppingClock(START));

        assertThat(cooldown.claim(RefreshSource.CATALOGUE, WINDOW)).isEmpty();
    }

    @Test
    void secondClaimInsideTheWindowIsRefusedAndSaysWhenToComeBack() {
        SteppingClock clock = new SteppingClock(START);
        RefreshCooldown cooldown = new RefreshCooldown(clock);

        cooldown.claim(RefreshSource.CATALOGUE, WINDOW);
        clock.advance(Duration.ofMinutes(14));

        assertThat(cooldown.claim(RefreshSource.CATALOGUE, WINDOW))
                .contains(START.plus(WINDOW));
    }

    @Test
    void theWindowOpensAgainOnceItHasPassed() {
        SteppingClock clock = new SteppingClock(START);
        RefreshCooldown cooldown = new RefreshCooldown(clock);

        cooldown.claim(RefreshSource.CATALOGUE, WINDOW);
        clock.advance(WINDOW);

        assertThat(cooldown.claim(RefreshSource.CATALOGUE, WINDOW)).isEmpty();
    }

    /**
     * The refusal must not push the window out, or a page reloading on a timer
     * inside the cooldown would hold itself outside it forever.
     */
    @Test
    void arefusalDoesNotExtendTheWindow() {
        SteppingClock clock = new SteppingClock(START);
        RefreshCooldown cooldown = new RefreshCooldown(clock);

        cooldown.claim(RefreshSource.CATALOGUE, WINDOW);
        clock.advance(Duration.ofMinutes(14));
        cooldown.claim(RefreshSource.CATALOGUE, WINDOW);

        clock.advance(Duration.ofMinutes(1));
        assertThat(cooldown.claim(RefreshSource.CATALOGUE, WINDOW)).isEmpty();
    }

    /** Two sources, two windows: refreshing Endo must not lock the catalogue out. */
    @Test
    void sourcesAreCountedApart() {
        RefreshCooldown cooldown = new RefreshCooldown(new SteppingClock(START));

        cooldown.claim(RefreshSource.CATALOGUE, WINDOW);

        assertThat(cooldown.claim(RefreshSource.ORDERS, Duration.ofMinutes(1))).isEmpty();
    }

    @Test
    void aSourceNobodyHasClaimedCanBeClaimedNow() {
        RefreshCooldown cooldown = new RefreshCooldown(new SteppingClock(START));

        assertThat(cooldown.nextAllowedAt(RefreshSource.ORDERS)).isEqualTo(START);
    }

    @Test
    void aClaimedSourceReportsTheEndOfItsWindow() {
        RefreshCooldown cooldown = new RefreshCooldown(new SteppingClock(START));

        cooldown.claim(RefreshSource.ORDERS, Duration.ofMinutes(1));

        assertThat(cooldown.nextAllowedAt(RefreshSource.ORDERS))
                .isEqualTo(START.plusSeconds(60));
    }

    /** A window that has run out reads as "now" rather than as a moment in the past. */
    @Test
    void anExpiredWindowReportsNow() {
        SteppingClock clock = new SteppingClock(START);
        RefreshCooldown cooldown = new RefreshCooldown(clock);

        cooldown.claim(RefreshSource.ORDERS, Duration.ofMinutes(1));
        clock.advance(Duration.ofMinutes(5));

        assertThat(cooldown.nextAllowedAt(RefreshSource.ORDERS))
                .isEqualTo(START.plus(Duration.ofMinutes(5)));
    }
}
