package relics.reliceApi.Expection;

/**
 * The worldstate could not be read, so nothing can be said about what this
 * week's Clan Weekly Initiative pays.
 *
 * <p>A type of its own rather than an empty list, for the reason
 * {@link FissureUnavailableException} gives: "no Kuva this week" is a claim
 * about the game, and a host being down is not evidence for it.
 */
public class ClanInitiativeUnavailableException extends RuntimeException {
    public ClanInitiativeUnavailableException(String message, Throwable cause) {
        super(message, cause);
    }
}
