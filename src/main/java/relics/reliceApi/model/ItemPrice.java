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

    /**
     * Why {@code trend} is null, when something here knows.
     *
     * <p>Null both when the trend is present and when this item has not been
     * fetched yet — see {@link TrendGap}, which carries why those two share an
     * absence.
     */
    private TrendGap trendGap;

    /** The warframe.market slug the price was read from, for debugging. */
    private String slug;

    /**
     * Ducat value. Static — it does not move with the market — and null for
     * anything the item database does not list, Forma included.
     */
    private Integer ducats;

    /** The Prime set the part belongs to, e.g. "Volt Prime". Null when it has none. */
    private String setName;

    /**
     * What kind of gear that set is: {@code warframe}, {@code primary},
     * {@code secondary}, {@code melee}, {@code sentinel},
     * {@code sentinel-weapon}, {@code archwing}, {@code arch-gun},
     * {@code arch-melee} or {@code pet}.
     *
     * <p>Null for anything the item database does not list. Sent with the price
     * because it is read at the same moment and by the same screen — the Sets
     * view filters on it — and a second endpoint for one word per part would be
     * a second round trip for every part on show.
     */
    private String category;

    /**
     * How many copies of this part its set is built from.
     *
     * <p>Almost always one, and two for 49 components across 28 sets: Kestrel
     * Prime is one Blueprint, one Grip and two Blades. Null when the item
     * database says nothing, which the client reads as one — the number every
     * set was assumed to need before this was carried.
     *
     * <p>Sent with the price for the same reason as the set and the category:
     * the screen that asks what a set still needs asks all four at once, and it
     * comes off the same node of the same file.
     */
    private Integer copiesPerSet;
}
