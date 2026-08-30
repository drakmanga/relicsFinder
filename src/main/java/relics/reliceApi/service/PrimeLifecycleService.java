package relics.reliceApi.service;

import org.springframework.stereotype.Service;
import relics.reliceApi.model.PrimeLifecycle;
import relics.reliceApi.model.PrimePhase;
import relics.reliceApi.model.Relic;
import relics.reliceApi.model.Rewards;

import java.io.IOException;
import java.time.LocalDate;
import java.time.Period;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Where each Prime set sits in the cycle its price follows.
 *
 * <p>See {@link PrimePhase} for what the three phases are, what they were
 * measured to be worth, and why there are three rather than the six a clan guide
 * draws.
 *
 * <p>Two sources, and which one answers which question is the whole design.
 * WHETHER a set is dropping comes from the drop tables, never from the item
 * database: that database's {@code vaulted} flag is true for exactly the sets
 * that carry a vault date, so it means "has been vaulted at some point" and is
 * wrong about six sets in the tables today — Scindo, Venka, Nyx, Cernos, Hikou
 * and Valkyr Prime were all obtainable on 2026-08-30 with the flag set. HOW LONG
 * AGO it stopped comes from the item database, because the drop tables are a
 * snapshot of now and remember nothing.
 *
 * <p>Nothing is cached here. The two sources cache themselves — the drop tables
 * behind a snapshot with its own TTL, the item database behind a 24-hour one —
 * and what this adds on top is a walk over a catalogue already in memory, once
 * per page load rather than per row.
 */
@Service
public class PrimeLifecycleService {

    /**
     * How long after leaving the drop tables a set still counts as recently
     * vaulted.
     *
     * <p>Two years, chosen against the catalogue rather than inherited. On
     * 2026-08-30 it names 20 sets of which 85% actually rose over the previous
     * ninety days, median +9,4%, against a 57% coin flip among the sets vaulted
     * for longer. Tightening it to eighteen months buys 93% over 15 sets and to
     * one year 100% over 9, which is a badge almost nobody ever sees; loosening
     * it to three years drops the claim to 70%.
     */
    static final Period RECENTLY_VAULTED = Period.ofYears(2);

    private final DucatService ducatService;
    private final DropTableService dropTableService;
    private final RelicLoadService relicLoadService;

    public PrimeLifecycleService(
            DucatService ducatService,
            DropTableService dropTableService,
            RelicLoadService relicLoadService) {
        this.ducatService = ducatService;
        this.dropTableService = dropTableService;
        this.relicLoadService = relicLoadService;
    }

    /** One row per Prime set the item database knows, sorted by name. */
    public List<PrimeLifecycle> lifecycles() throws IOException {
        Set<String> dropping = droppingSetNames();
        LocalDate today = LocalDate.now();

        List<PrimeLifecycle> rows = new ArrayList<>();
        for (String setName : ducatService.primeSetNames()) {
            DucatService.SetDates dates = ducatService.datesFor(setName);

            rows.add(new PrimeLifecycle(
                    setName,
                    phaseOf(dates == null ? null : dates.vaultDate(), dropping.contains(setName), today),
                    dates == null ? null : dates.releaseDate(),
                    dates == null ? null : dates.vaultDate()));
        }

        rows.sort(Comparator.comparing(PrimeLifecycle::setName));
        return rows;
    }

    /**
     * The rule, and the order of it is the meaning.
     *
     * <p>Dropping wins over every date, because a set in the tables today is
     * being farmed today whatever the database remembers about the last time it
     * was vaulted — that is exactly the six sets the flag gets wrong.
     *
     * <p>Past that, an unreadable or absent vault date is {@link
     * PrimePhase#UNKNOWN} rather than the long-vaulted default. Defaulting would
     * put the most confident of the three labels on the one set nothing here
     * knows anything about.
     */
    static PrimePhase phaseOf(String vaultDate, boolean dropping, LocalDate today) {
        if (dropping) return PrimePhase.DROPPING;
        if (vaultDate == null) return PrimePhase.UNKNOWN;

        LocalDate vaulted;
        try {
            vaulted = LocalDate.parse(vaultDate);
        } catch (DateTimeParseException e) {
            return PrimePhase.UNKNOWN;
        }

        return vaulted.isAfter(today.minus(RECENTLY_VAULTED))
                ? PrimePhase.RECENTLY_VAULTED
                : PrimePhase.LONG_VAULTED;
    }

    /**
     * Every set with a part in a relic that is currently in the drop tables.
     *
     * <p>The part-to-set step goes through the item database rather than through
     * the name, so the one rule that turns "Volt Prime Neuroptics Blueprint" into
     * "Volt Prime" stays in the one place that already owns it.
     */
    private Set<String> droppingSetNames() throws IOException {
        Set<String> sets = new HashSet<>();

        for (Relic relic : relicLoadService.loadRelicsWithCheckData()) {
            // Through isVaulted rather than against the name set directly: the
            // spelling the drop tables use is that service's business, and the
            // method that reconciles it is the one it exposes.
            if (dropTableService.isVaulted(relic.getTier() + " " + relic.getRelicName())) continue;

            for (Rewards reward : relic.getRewards()) {
                String setName = ducatService.lookup(reward.getItemName()).setName();
                if (setName != null) sets.add(setName);
            }
        }

        return sets;
    }
}
