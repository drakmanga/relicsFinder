package relics.reliceApi.model;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * One relic, ranked twice.
 *
 * <p>The two rankings are the point of the row. Solo Intact and radshare
 * Radiant share 4 of their top 20, the median relic moves 111 places between
 * them, and 59% of the catalogue lands in a different band depending on which
 * column is read — so a single blended letter would be wrong for one of the two
 * ways of playing every second relic.
 *
 * <p>{@code era} rather than "tier", which is what the catalogue calls it: this
 * response uses "tier" for the band letters, and a row carrying a {@code tier}
 * of "Lith" beside a {@code tier} of "S" is a row nobody can read. The screen
 * has called that column Era since before the ranking moved here.
 *
 * @param relic          {@code "Lith V9"} — one row per relic, not per relic
 *                       and refinement
 * @param era            {@code "Lith"}, {@code "Meso"}, {@code "Neo"},
 *                       {@code "Axi"}, {@code "Requiem"} or {@code "Vanguard"}
 * @param soloValue      expected platinum from one solo run of the Intact relic
 * @param radshareValue  expected platinum from one run of the Radiant relic in a
 *                       squad of {@code players} — see the response's field of
 *                       that name, and note that the hundred void traces a
 *                       Radiant costs are NOT subtracted
 * @param soloBand       where {@code soloValue} sits against the solo median, or
 *                       null when there is no median to rank it against
 * @param radshareBand   the same, against the radshare median. Two medians and
 *                       therefore two bands: the columns are different scales
 * @param relicPrice     what the relic itself sells for. Beside the letters,
 *                       never inside them, and null when nobody has listed it
 * @param trend          what ninety days did to {@code soloValue}, or why there
 *                       is no answer
 * @param trendPercent   the movement as a percentage, and null unless
 *                       {@code trend} is {@code moved}. Null is an absent
 *                       measurement rather than a market that held still, which
 *                       is what {@code steady} is for
 */
@JsonInclude(JsonInclude.Include.ALWAYS)
public record TierListRow(
        String relic,
        String era,
        double soloValue,
        double radshareValue,
        TierBand soloBand,
        TierBand radshareBand,
        Double relicPrice,
        TierTrend trend,
        Double trendPercent) {}
