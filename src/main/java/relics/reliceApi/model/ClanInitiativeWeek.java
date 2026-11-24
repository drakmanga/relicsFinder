package relics.reliceApi.model;

import java.util.List;

/**
 * One week of the Clan Weekly Initiative, as the game's worldstate announces
 * it — usually this week and the next.
 *
 * @param week   the Monday 00:00 UTC it starts on, in epoch milliseconds
 * @param region the region whose missions earn bonus points ("Pluto")
 * @param tiers  the thresholds, lowest first
 * @param kuva   the Kuva every tier together pays: 0 in a week with none
 */
public record ClanInitiativeWeek(long week, String region, List<ClanInitiativeTier> tiers, int kuva) {}
