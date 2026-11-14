package relics.reliceApi.service;

import java.io.IOException;

/**
 * Where the raw fissure list comes from.
 *
 * <p>An interface for one reason: {@link FissureService}'s promise is about how
 * many upstream calls a burst of viewers costs, and a test can only count calls
 * it can intercept.
 */
public interface FissureSource {

    /** The worldstate's fissure array, as JSON text. */
    String fetch() throws IOException, InterruptedException;
}
