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
}
