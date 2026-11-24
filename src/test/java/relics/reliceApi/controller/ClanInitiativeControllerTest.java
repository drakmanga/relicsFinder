package relics.reliceApi.controller;

import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;
import relics.reliceApi.Expection.ClanInitiativeUnavailableException;
import relics.reliceApi.model.ClanInitiativeWeek;
import relics.reliceApi.service.ClanInitiativeService;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ClanInitiativeControllerTest {

    private final ClanInitiativeService service = mock(ClanInitiativeService.class);
    private final ClanInitiativeController controller = new ClanInitiativeController(service);

    @Test
    void answersWithTheWeeks() {
        List<ClanInitiativeWeek> weeks = List.of(new ClanInitiativeWeek(1L, "Pluto", List.of(), 0));
        when(service.weeks()).thenReturn(weeks);

        ResponseEntity<?> response = controller.weeks();

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).isEqualTo(weeks);
    }

    @Test
    void anUnreadableWorldstateIsA503CarryingTheReason() {
        when(service.weeks()).thenThrow(new ClanInitiativeUnavailableException("worldstate could not be read", null));

        ResponseEntity<?> response = controller.weeks();

        assertThat(response.getStatusCode().value()).isEqualTo(503);
        assertThat(response.getBody().toString()).contains("worldstate");
    }
}
