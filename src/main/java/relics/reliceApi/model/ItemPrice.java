package relics.reliceApi.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

/**
 * Market price of a single Prime part.
 *
 * <p>{@code averagePrice} is null when the item has no listings — Forma
 * Blueprint, for instance, is never traded. Null is not zero: zero would claim
 * the item is free.
 */
@Getter
@Setter
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.ALWAYS)
public class ItemPrice {

    private String itemName;

    /** Platinum, averaged over the last 48 hours. Null when unlisted. */
    private Double averagePrice;

    /** The warframe.market slug the price was read from, for debugging. */
    private String slug;
}
