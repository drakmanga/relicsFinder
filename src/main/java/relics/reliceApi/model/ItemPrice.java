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

    /**
     * Platinum, from trades actually completed in the last 48 hours.
     *
     * <p>Not from open orders: those split into buy and sell, and averaging the
     * two together produces a number nobody trades at — for Volt Prime
     * Neuroptics, buyers offer around 15 and sellers ask around 30, while the
     * trades that close land near 27.
     *
     * <p>Null when nothing sold recently.
     */
    private Double averagePrice;

    /** Median of the same trades. More honest than the mean on a thin market. */
    private Double median;

    /** Trades in the window. A price backed by two sales is barely a price. */
    private Integer volume;

    /** Percent change against the 90-day average. Null without enough history. */
    private Double trend;

    /** The warframe.market slug the price was read from, for debugging. */
    private String slug;

    /**
     * Ducat value. Static — it does not move with the market — and null for
     * anything the item database does not list, Forma included.
     */
    private Integer ducats;

    /** The Prime set the part belongs to, e.g. "Volt Prime". Null when it has none. */
    private String setName;
}
