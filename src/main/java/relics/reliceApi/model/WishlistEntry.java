package relics.reliceApi.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** One line of the wishlist. */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class WishlistEntry {

    /** Name of the thing wanted. */
    private String itemName;

    /**
     * What the line is for: "part", "ducat" or "endo".
     *
     * <p>Part of the identity, not decoration. The same Prime part can be
     * wanted twice for different reasons — one to complete a set, one to
     * dissolve at Baro — and those are two lines, not a conflict.
     */
    private String kind;

    /** Where the user found it, kept as context rather than as a key. */
    private String tier;
    private String relicFullName;
    private String refinement;

    private int quantity;
}
