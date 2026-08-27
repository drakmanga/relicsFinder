package relics.reliceApi.model;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
public class RelicPrice {
    String relicName;
    /**
     * Platinum, or null when the market has no listing for this relic — which
     * is a fact about the relic, not a failure, and has to survive the batch
     * response as itself rather than as a stand-in number.
     */
    Double averagePrice;
    /**
     * Trades actually completed on this relic in the last ninety days.
     *
     * <p>Ninety days and not the 48-hour window {@code ItemPrice.volume}
     * carries: relics trade far more thinly than parts — a median of 6 trades
     * in ninety days against 42 — so over two days most of the catalogue reads
     * as zero and a price of 190p cannot be told apart from one lucky sale.
     *
     * <p>Null when there is no answer yet, for the same reason
     * {@code averagePrice} is: zero is a claim about the market, and this is a
     * lookup table the caller joins on.
     */
    Integer tradeCount90d;
}
