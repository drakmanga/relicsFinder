package relics.reliceApi.service;

import org.junit.jupiter.api.Test;
import relics.reliceApi.model.RefreshOutcome;
import relics.reliceApi.model.RefreshView;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * Which source a view is refreshed from, and what the guard lets through.
 *
 * <p>No Spring context and no network: every collaborator here is a door onto
 * another host, and what this class decides is which of those doors to open and
 * when — never what is behind them.
 */
class SnapshotRefresherTest {

    private static final Duration CATALOGUE_WINDOW = Duration.ofMinutes(15);
    private static final Duration ORDERS_WINDOW = Duration.ofMinutes(1);

    private final RelicUpdateService relics = mock(RelicUpdateService.class);
    private final DucatService ducats = mock(DucatService.class);
    private final PriceWarmupRunner warmup = mock(PriceWarmupRunner.class);
    private final EndoService endo = mock(EndoService.class);

    private SnapshotRefresher refresher() {
        return new SnapshotRefresher(new RefreshCooldown(), relics, ducats, warmup, endo,
                CATALOGUE_WINDOW, ORDERS_WINDOW);
    }

    @Test
    void ducanetorRereadsTheCatalogueAndQueuesWhateverItGained() throws Exception {
        RefreshOutcome outcome = refresher().refresh(RefreshView.DUCATS);

        assertThat(outcome.status()).isEqualTo(RefreshOutcome.Status.REFRESHED);
        verify(relics).downloadAndUpdateRelics();
        verify(ducats).refreshNow();
        verify(warmup).warm();
        verifyNoInteractions(endo);
    }

    @Test
    void theTierListReadsTheSameSourceDucanetorDoes() throws Exception {
        refresher().refresh(RefreshView.TIERS);

        verify(relics).downloadAndUpdateRelics();
        verify(ducats).refreshNow();
    }

    @Test
    void endoRereadsTheOrdersAndNothingElse() throws Exception {
        when(endo.refreshNow()).thenReturn(true);

        RefreshOutcome outcome = refresher().refresh(RefreshView.ENDO);

        assertThat(outcome.status()).isEqualTo(RefreshOutcome.Status.REFRESHED);
        verify(endo).refreshNow();
        verifyNoInteractions(relics, ducats, warmup);
    }

    /**
     * The two views on one source share its window, which is the reason the
     * cooldown is held on the source rather than on the view.
     */
    @Test
    void refreshingTheTierListInsideDucanetorsWindowIsRefused() throws Exception {
        SnapshotRefresher refresher = refresher();
        refresher.refresh(RefreshView.DUCATS);

        RefreshOutcome outcome = refresher.refresh(RefreshView.TIERS);

        assertThat(outcome.status()).isEqualTo(RefreshOutcome.Status.ALREADY_CURRENT);
    }

    /** A refusal must reach no host at all, or the guard would only be a delay. */
    @Test
    void arefusalAsksNobodyAnything() throws Exception {
        SnapshotRefresher refresher = refresher();
        refresher.refresh(RefreshView.ENDO);
        when(endo.refreshNow()).thenReturn(true);

        refresher.refresh(RefreshView.ENDO);

        // Once for the claim that was granted, and not again for the refusal.
        verify(endo).refreshNow();
    }

    @Test
    void arefusalSaysWhenToComeBack() {
        SnapshotRefresher refresher = refresher();
        refresher.refresh(RefreshView.ENDO);

        RefreshOutcome outcome = refresher.refresh(RefreshView.ENDO);

        assertThat(outcome.nextRefreshAt()).isNotNull();
        assertThat(outcome.view()).isEqualTo(RefreshView.ENDO);
    }

    /**
     * The item database is asked whatever the drop tables did. It is the half a
     * new Prime's ducat value comes from, and the two are different hosts.
     */
    @Test
    void theItemDatabaseIsStillReadWhenTheDropTablesAreDown() throws Exception {
        when(relics.downloadAndUpdateRelics()).thenThrow(new java.io.IOException("HTTP 503"));

        RefreshOutcome outcome = refresher().refresh(RefreshView.DUCATS);

        assertThat(outcome.status()).isEqualTo(RefreshOutcome.Status.REFRESHED);
        verify(ducats).refreshNow();
        verify(warmup).warm();
    }

    @Test
    void bothSourcesDownIsAnUnavailableSourceAndNoWarmUp() throws Exception {
        when(relics.downloadAndUpdateRelics()).thenThrow(new java.io.IOException("HTTP 503"));
        org.mockito.Mockito.doThrow(new IllegalStateException("no route to host"))
                .when(ducats).refreshNow();

        RefreshOutcome outcome = refresher().refresh(RefreshView.DUCATS);

        assertThat(outcome.status()).isEqualTo(RefreshOutcome.Status.SOURCE_UNAVAILABLE);
        verify(warmup, never()).warm();
    }

    /** A market that did not answer leaves the old list standing, and says so. */
    @Test
    void ordersThatDidNotComeBackAreAnUnavailableSource() {
        when(endo.refreshNow()).thenReturn(false);

        RefreshOutcome outcome = refresher().refresh(RefreshView.ENDO);

        assertThat(outcome.status()).isEqualTo(RefreshOutcome.Status.SOURCE_UNAVAILABLE);
    }

    /**
     * The slot is spent before the work, so a host that is down cannot be asked
     * again on the next reload.
     */
    @Test
    void afailedReadStillSpendsTheWindow() {
        SnapshotRefresher refresher = refresher();
        when(endo.refreshNow()).thenReturn(false);
        refresher.refresh(RefreshView.ENDO);

        assertThat(refresher.refresh(RefreshView.ENDO).status())
                .isEqualTo(RefreshOutcome.Status.ALREADY_CURRENT);
    }
}
