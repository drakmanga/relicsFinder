package relics.reliceApi.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * One part the player has, and how many copies of it.
 *
 * <p>A count rather than a bare name because a Prime set is not one copy of
 * each piece: Kestrel Prime is one Blueprint, one Grip and two Blades, so a
 * name alone cannot say "one Blade of two" and the set read as finished with
 * half of it missing.
 *
 * <p>The count is what a set asks for and no more. A spare found in the wild is
 * a thing to sell rather than a thing a set needs, which is the wishlist's
 * "ducat" kind.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class OwnedEntry {

    private String itemName;

    private int quantity;
}
