package relics.reliceApi.service;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

/**
 * One GET for a fissure source, answered as text or as an {@link IOException}.
 *
 * <p>Shared by the two fissure sources so both go out identified and with the
 * same short timeout, and a non-200 reads the same whichever host sent it.
 */
final class UpstreamText {

    /**
     * Short, because the answer is only worth anything while it is current:
     * a viewer waiting twenty seconds for a fissure list would rather be told
     * it is unavailable.
     */
    private static final Duration TIMEOUT = Duration.ofSeconds(10);

    private static final HttpClient CLIENT = HttpClient.newBuilder()
            .connectTimeout(TIMEOUT)
            .followRedirects(HttpClient.Redirect.NORMAL)
            .build();

    private UpstreamText() {}

    static String get(URI url) throws IOException, InterruptedException {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(url)
                .timeout(TIMEOUT)
                .header("Accept", "application/json")
                .header("User-Agent", ApiIdentity.USER_AGENT)
                .GET()
                .build();

        HttpResponse<String> response = CLIENT.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() != 200) {
            throw new IOException("HTTP " + response.statusCode() + " from " + url);
        }
        return response.body();
    }
}
