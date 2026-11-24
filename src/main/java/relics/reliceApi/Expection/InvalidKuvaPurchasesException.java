package relics.reliceApi.Expection;

/**
 * A Kuva purchase list the server will not store: a week that does not start
 * on a Monday at midnight UTC, an offer id that is not one, or a count out of
 * range.
 *
 * <p>The message names the value and what is wrong with it, because a client
 * that sent it has a bug to find, and the status line alone would not say
 * where.
 */
public class InvalidKuvaPurchasesException extends RuntimeException {
    public InvalidKuvaPurchasesException(String message) {
        super(message);
    }
}
