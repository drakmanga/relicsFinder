package relics.reliceApi.controller;

import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;
import relics.reliceApi.model.RefreshOutcome;
import relics.reliceApi.model.RefreshView;
import relics.reliceApi.service.SnapshotRefresher;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * What the endpoint accepts and what it refuses.
 *
 * <p>No Spring context: the controller parses one word and makes one call, so
 * standing up the application to watch it do that would be testing the
 * framework.
 */
class RefreshControllerTest {

    private final SnapshotRefresher refresher = mock(SnapshotRefresher.class);
    private final RefreshController controller = new RefreshController(refresher);

    @Test
    void answersWithTheOutcomeTheRefresherProduced() {
        RefreshOutcome outcome = new RefreshOutcome(
                RefreshView.ENDO, RefreshOutcome.Status.REFRESHED, "2026-09-12T10:01:00Z");
        when(refresher.refresh(RefreshView.ENDO)).thenReturn(outcome);

        ResponseEntity<?> response = controller.refresh("endo");

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).isEqualTo(outcome);
    }

    @Test
    void acceptsTheViewNameHoweverItIsCased() {
        when(refresher.refresh(RefreshView.TIERS)).thenReturn(new RefreshOutcome(
                RefreshView.TIERS, RefreshOutcome.Status.ALREADY_CURRENT, "2026-09-12T10:15:00Z"));

        assertThat(controller.refresh(" Tiers ").getStatusCode().value()).isEqualTo(200);
    }

    /**
     * A misspelled view refreshes nothing rather than the default one: an
     * answer that looks like it worked is how a typo survives.
     */
    @Test
    void refusesAViewItDoesNotHave() {
        ResponseEntity<?> response = controller.refresh("relics");

        assertThat(response.getStatusCode().value()).isEqualTo(400);
        assertThat(response.getBody().toString()).contains("ducats, endo or tiers");
        verifyNoInteractions(refresher);
    }
}
