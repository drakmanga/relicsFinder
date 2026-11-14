package relics.reliceApi.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

/**
 * The fissure list from api.warframestat.us, the same community provider the
 * drop tables already come from (see {@link DropTableService}).
 */
@Component
public class WarframestatFissureSource implements FissureSource {

    /**
     * Short, because the answer is only worth anything while it is current:
     * a viewer waiting twenty seconds for a fissure list would rather be told
     * it is unavailable.
     */
    private static final Duration TIMEOUT = Duration.ofSeconds(10);

    private final URI url;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(TIMEOUT)
            .followRedirects(HttpClient.Redirect.NORMAL)
            .build();

    public WarframestatFissureSource(@Value("${relics.fissures.url}") String url) {
        this.url = URI.create(url);
    }

    @Override
    public String fetch() throws IOException, InterruptedException {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(url)
                .timeout(TIMEOUT)
                .header("Accept", "application/json")
                .header("User-Agent", ApiIdentity.USER_AGENT)
                .GET()
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() != 200) {
            throw new IOException("HTTP " + response.statusCode() + " from " + url);
        }
        return response.body();
    }
}
