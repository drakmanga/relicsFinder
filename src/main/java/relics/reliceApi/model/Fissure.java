package relics.reliceApi.model;

/**
 * One Void Fissure open right now.
 *
 * <p>Normalised from the worldstate rather than passed through: the browser
 * asks "which of my relics, where", and the upstream payload carries twice as
 * many fields as that question needs, under names ({@code isHard}) that say
 * nothing to a reader of this API.
 *
 * @param tier        relic tier the fissure accepts, as the game spells it:
 *                    Lith, Meso, Neo, Axi, Requiem or Omnia
 * @param missionType as the worldstate spells it — "Extermination", not
 *                    "Exterminate"
 * @param steelPath   the Steel Path version of the node
 * @param voidStorm   a Railjack Void Storm rather than a star-chart node
 * @param expiry      ISO-8601 instant the fissure closes
 * @param minutes     estimated minutes to crack one relic there, from
 *                    configuration; null for a mission type the table does not
 *                    rate, which the browser reads as "no estimate" rather
 *                    than as free
 */
public record Fissure(
        String id,
        String node,
        String missionType,
        String tier,
        boolean steelPath,
        boolean voidStorm,
        String expiry,
        Integer minutes
) {}
