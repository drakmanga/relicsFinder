package relics.reliceApi.model;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

/**
 * A single sell order for an Ayatan sculpture, with the Endo it would yield.
 *
 * <p>The row is an order rather than an item on purpose: the same sculpture is
 * worth 2000 Endo empty and 3450 full, so a per-item average would describe
 * something nobody is selling.
 */
@Getter
@Setter
@AllArgsConstructor
public class EndoOffer {

    private String itemName;
    private String slug;

    private int platinum;
    private int cyanStars;
    private int amberStars;

    /** Endo this exact sculpture yields when dissolved at Maroo's. */
    private int endo;

    /** Endo per platinum — what the view ranks on. */
    private double ratio;

    private String seller;
    private int quantity;
}
