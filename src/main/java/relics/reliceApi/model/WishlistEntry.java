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

    /** Identity of the line — one entry per part. */
    private String itemName;

    /** Where the user found it, kept as context rather than as a key. */
    private String tier;
    private String relicFullName;
    private String refinement;

    private int quantity;
}
