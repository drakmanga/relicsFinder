package relics.reliceApi.Expection;

/**
 * The worldstate could not be read, so nothing can be said about which
 * fissures are open.
 *
 * <p>A type of its own rather than an empty list: "no fissures" is a claim
 * about the game, and a provider being down is not evidence for it.
 */
public class FissureUnavailableException extends RuntimeException {
    public FissureUnavailableException(String message, Throwable cause) {
        super(message, cause);
    }
}
