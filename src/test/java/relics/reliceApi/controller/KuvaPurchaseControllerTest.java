package relics.reliceApi.controller;

import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;
import relics.reliceApi.Expection.InvalidKuvaPurchasesException;
import relics.reliceApi.model.KuvaPurchases;
import relics.reliceApi.service.KuvaPurchaseService;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class KuvaPurchaseControllerTest {

    private static final long MONDAY = 1_795_478_400_000L - 86_400_000L;

    private final KuvaPurchaseService service = mock(KuvaPurchaseService.class);
    private final KuvaPurchaseController controller = new KuvaPurchaseController(service);

    @Test
    void answersWithWhatWasStored() {
        KuvaPurchases stored = new KuvaPurchases(MONDAY, Map.of("teshin", 2));
        when(service.replace(stored)).thenReturn(stored);

        ResponseEntity<?> response = controller.replace(stored);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).isEqualTo(stored);
    }

    @Test
    void anOutOfShapeWeekIsA400CarryingTheReason() {
        KuvaPurchases bad = new KuvaPurchases(MONDAY, Map.of("teshin", -1));
        when(service.replace(bad)).thenThrow(new InvalidKuvaPurchasesException("Count -1 for \"teshin\""));

        ResponseEntity<?> response = controller.replace(bad);

        assertThat(response.getStatusCode().value()).isEqualTo(400);
        assertThat(response.getBody().toString()).contains("teshin");
    }
}
