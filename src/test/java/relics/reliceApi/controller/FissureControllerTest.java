package relics.reliceApi.controller;

import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;
import relics.reliceApi.Expection.FissureUnavailableException;
import relics.reliceApi.model.FissureFeed;
import relics.reliceApi.service.FissureService;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/** What the endpoint answers, with no Spring context: it is one call and one catch. */
class FissureControllerTest {

    private final FissureService service = mock(FissureService.class);
    private final FissureController controller = new FissureController(service);

    @Test
    void answersWithTheFeed() {
        FissureFeed feed = new FissureFeed(List.of(), Map.of("Capture", 1));
        when(service.current()).thenReturn(feed);

        ResponseEntity<?> response = controller.current();

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).isEqualTo(feed);
    }

    @Test
    void anUnavailableUpstreamIsA503ThatSaysSo() {
        when(service.current()).thenThrow(
                new FissureUnavailableException("fissure data unavailable: HTTP 502", null));

        ResponseEntity<?> response = controller.current();

        assertThat(response.getStatusCode().value()).isEqualTo(503);
        assertThat(response.getBody().toString()).contains("fissure data unavailable");
    }
}
