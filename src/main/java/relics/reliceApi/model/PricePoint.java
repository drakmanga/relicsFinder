package relics.reliceApi.model;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

/** One day of completed trades for an item. */
@Getter
@Setter
@AllArgsConstructor
public class PricePoint {

    /** ISO date, e.g. "2026-08-06". */
    private String date;

    private double avgPrice;
    private double median;
    private double minPrice;
    private double maxPrice;

    /** Number of trades that day — a price backed by three sales is not a price. */
    private int volume;
}
