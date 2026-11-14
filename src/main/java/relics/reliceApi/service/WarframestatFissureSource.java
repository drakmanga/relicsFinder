package relics.reliceApi.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URI;

/**
 * The fissure list from api.warframestat.us, the same community provider the
 * drop tables already come from (see {@link DropTableService}).
 */
@Component
public class WarframestatFissureSource implements FissureSource {

    private final URI url;

    public WarframestatFissureSource(@Value("${relics.fissures.url}") String url) {
        this.url = URI.create(url);
    }

    @Override
    public String fetch() throws IOException, InterruptedException {
        return UpstreamText.get(url);
    }
}
