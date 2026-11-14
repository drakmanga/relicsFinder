package relics.reliceApi.Expection;

/**
 * An owned-relic entry the catalogue cannot account for: a relic that does not
 * exist, or a refinement that is not one of the four.
 *
 * <p>The message names the entry and says what is wrong with it, because it is
 * shown to the person who typed it.
 */
public class InvalidOwnedRelicException extends RuntimeException {
    public InvalidOwnedRelicException(String message) {
        super(message);
    }
}
