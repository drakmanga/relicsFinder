package relics.reliceApi.Expection;

public class RelicNotFoundException extends RuntimeException {
    public RelicNotFoundException(String message) {
        super(message);
    }
}
