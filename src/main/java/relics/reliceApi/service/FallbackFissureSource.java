package relics.reliceApi.service;

import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

import java.io.IOException;

/**
 * warframestat first, the game's own worldstate when warframestat fails.
 *
 * <p>warframestat is a community host behind Cloudflare, and when its origin
 * is down the whole Relic Crack tab is down with it (a 521 for every call in
 * November 2026). The worldstate it translates is still served by the game, so
 * the tab only goes dark when both are.
 *
 * <p>Primary so {@link FissureService} gets this rather than either source on
 * its own; its cache sits on top, so an outage costs one failed call per TTL
 * on top of the fallback's, not one per viewer.
 */
@Primary
@Component
public class FallbackFissureSource implements FissureSource {

    private final WarframestatFissureSource primary;
    private final DeWorldstateFissureSource fallback;

    public FallbackFissureSource(WarframestatFissureSource primary, DeWorldstateFissureSource fallback) {
        this.primary = primary;
        this.fallback = fallback;
    }

    @Override
    public String fetch() throws IOException, InterruptedException {
        try {
            return primary.fetch();
        } catch (IOException first) {
            try {
                return fallback.fetch();
            } catch (IOException second) {
                // Both causes, since the one worth reading is usually the first.
                second.addSuppressed(first);
                throw new IOException(first.getMessage() + "; fallback: " + second.getMessage(), second);
            }
        }
    }
}
