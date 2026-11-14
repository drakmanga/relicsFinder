package relics.reliceApi.model;

import java.util.List;
import java.util.Map;

/**
 * The open fissures plus the table their minutes were read from.
 *
 * <p>The table travels with the list because the browser needs it whole, not
 * only the rows it happens to see: "is this fissure fast enough" is measured
 * against the fastest mission type there is, which may have no fissure open at
 * the moment, and the mission-type filter offers every rated type rather than
 * the handful currently up.
 *
 * @param missionMinutes estimated minutes per relic by mission type, as
 *                       configured
 */
public record FissureFeed(List<Fissure> fissures, Map<String, Integer> missionMinutes) {}
