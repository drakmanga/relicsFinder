package relics.reliceApi.controller;

import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;
import relics.reliceApi.Expection.InvalidOwnedRelicException;
import relics.reliceApi.model.OwnedRelic;
import relics.reliceApi.service.OwnedRelicService;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class OwnedRelicControllerTest {

    private final OwnedRelicService service = mock(OwnedRelicService.class);
    private final OwnedRelicController controller = new OwnedRelicController(service);

    @Test
    void answersWithWhatWasStored() {
        List<OwnedRelic> stored = List.of(new OwnedRelic("Neo N16", "radiant", 3));
        when(service.replace(stored)).thenReturn(stored);

        ResponseEntity<?> response = controller.replace(stored);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).isEqualTo(stored);
    }

    @Test
    void anUnknownRelicIsA400CarryingTheReason() {
        List<OwnedRelic> typo = List.of(new OwnedRelic("Neo Z99", "intact", 1));
        when(service.replace(typo)).thenThrow(new InvalidOwnedRelicException("Unknown relic \"Neo Z99\""));

        ResponseEntity<?> response = controller.replace(typo);

        assertThat(response.getStatusCode().value()).isEqualTo(400);
        assertThat(response.getBody().toString()).contains("Neo Z99");
    }
}
