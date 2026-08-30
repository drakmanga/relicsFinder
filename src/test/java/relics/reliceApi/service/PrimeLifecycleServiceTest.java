package relics.reliceApi.service;

import org.junit.jupiter.api.Test;
import relics.reliceApi.model.PrimePhase;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The rule that turns two dates and a drop table into a phase.
 *
 * <p>Pure and static on purpose: the interesting decisions here are about
 * boundaries and about which source wins, and neither needs a catalogue, an
 * item database or a clock standing behind it.
 */
class PrimeLifecycleServiceTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 8, 30);

    private static PrimePhase phase(String vaultDate, boolean dropping) {
        return PrimeLifecycleService.phaseOf(vaultDate, dropping, TODAY);
    }

    /**
     * The drop tables beat the vault date, and this is the load-bearing case.
     *
     * <p>Six sets were in the tables on 2026-08-30 carrying a vault date from
     * years earlier — Prime Resurgence returns a set for a month at a time and
     * the item database records only the first time it was vaulted. Reading the
     * date first would label a set that can be farmed today as one whose supply
     * has dried up, which is the opposite trade.
     */
    @Test
    void aSetInTheDropTablesIsDroppingWhateverItsVaultDateSays() {
        assertThat(phase("2017-05-30", true)).isEqualTo(PrimePhase.DROPPING);
    }

    @Test
    void aSetInTheDropTablesWithNoVaultDateIsAlsoDropping() {
        assertThat(phase(null, true)).isEqualTo(PrimePhase.DROPPING);
    }

    @Test
    void aSetVaultedWithinTwoYearsIsRecentlyVaulted() {
        assertThat(phase("2025-01-15", false)).isEqualTo(PrimePhase.RECENTLY_VAULTED);
    }

    @Test
    void aSetVaultedLongerAgoThanThatIsLongVaulted() {
        assertThat(phase("2020-03-01", false)).isEqualTo(PrimePhase.LONG_VAULTED);
    }

    /**
     * The boundary itself, from both sides of one day.
     *
     * <p>Two years is a measured choice rather than a round number — see
     * {@code RECENTLY_VAULTED} — so the day it falls on is worth pinning. A set
     * vaulted exactly two years ago is no longer recent: the window is the time
     * since, and at exactly two years that time has run out.
     */
    @Test
    void theBoundaryIsTwoYearsAndTheDayItLandsOnIsAlreadyPast() {
        assertThat(phase("2024-08-31", false)).isEqualTo(PrimePhase.RECENTLY_VAULTED);
        assertThat(phase("2024-08-30", false)).isEqualTo(PrimePhase.LONG_VAULTED);
    }

    /**
     * No date and not dropping is an answer, not the confident default.
     *
     * <p>Kavasa Prime is in the relic catalogue and not in the item database, so
     * nothing here knows when it stopped dropping. Falling through to
     * long-vaulted would put the most settled of the three claims on the one set
     * nothing is known about.
     */
    @Test
    void aSetWithNoVaultDateAndNoDropsIsUnknownRatherThanLongVaulted() {
        assertThat(phase(null, false)).isEqualTo(PrimePhase.UNKNOWN);
    }

    /** A date the database writes in some other shape is unknown, not a crash. */
    @Test
    void anUnreadableVaultDateIsUnknown() {
        assertThat(phase("May 2017", false)).isEqualTo(PrimePhase.UNKNOWN);
    }
}
