package relics.reliceApi.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import relics.reliceApi.Expection.InvalidOwnedRelicException;
import relics.reliceApi.model.OwnedRelic;
import relics.reliceApi.model.Relic;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.*;
import java.util.*;
import java.util.concurrent.locks.ReentrantLock;
import java.util.function.Supplier;

/**
 * The relics the player is holding, kept on disk.
 *
 * <p>Entered by hand: Warframe has no public inventory API. Same storage and
 * the same whole-list writes as {@link OwnedService} and
 * {@link WishlistService}, for their reasons — single-tenant, self-hosted, and
 * a client that holds the authoritative copy while it is being edited.
 *
 * <p>Unlike those two, what arrives is checked against the relic catalogue
 * before it is stored. A part name comes from a row the app drew, but a relic
 * here is typed, and a typo stored silently would be a relic that never
 * ranks, with nothing on screen to say why. One bad entry refuses the whole
 * list, so the save is all or nothing and the message can name the culprit.
 */
@Service
public class OwnedRelicService {

    /** The four states a relic can be refined to, as the catalogue spells them in lower case. */
    static final Set<String> REFINEMENTS = Set.of("intact", "exceptional", "flawless", "radiant");

    private final Path file;
    private final Supplier<Map<String, String>> catalogue;
    private final ObjectMapper mapper = new ObjectMapper();
    private final ReentrantLock lock = new ReentrantLock();

    /** Cached in memory; the file is the durable copy, not the hot path. */
    private volatile List<OwnedRelic> owned = new ArrayList<>();

    @Autowired
    public OwnedRelicService(
            @Value("${relics.owned-relics.path:data/owned-relics.json}") String path,
            RelicLoadService relicLoadService) {
        this(path, () -> namesOf(relicLoadService));
    }

    /**
     * For the tests, which hand in a catalogue rather than a file of 3000 relics.
     *
     * @param catalogue every relic's full name, keyed by its lower-case form
     */
    OwnedRelicService(String path, Supplier<Map<String, String>> catalogue) {
        this.file = Paths.get(path);
        this.catalogue = catalogue;
        load();
    }

    public List<OwnedRelic> all() {
        return List.copyOf(owned);
    }

    /**
     * Replaces the whole list, or refuses it whole.
     *
     * @throws InvalidOwnedRelicException naming the first entry the catalogue
     *                                    does not know, or whose refinement is
     *                                    not one of the four
     */
    public List<OwnedRelic> replace(List<OwnedRelic> next) {
        List<OwnedRelic> checked = validate(next == null ? List.of() : next, catalogue.get());

        lock.lock();
        try {
            owned = coalesce(checked);
            save();
            return List.copyOf(owned);
        } finally {
            lock.unlock();
        }
    }

    /**
     * Each entry with its name in the catalogue's spelling and its refinement
     * in lower case.
     *
     * <p>Canonicalised rather than only checked, so "neo n16" typed in a hurry
     * and "Neo N16" picked from the list are one entry and not two.
     */
    static List<OwnedRelic> validate(List<OwnedRelic> entries, Map<String, String> catalogue) {
        List<OwnedRelic> checked = new ArrayList<>();

        for (OwnedRelic entry : entries) {
            if (entry == null) continue;

            String typed = entry.relicName() == null ? "" : entry.relicName().trim().replaceAll("\\s+", " ");
            String name = catalogue.get(typed.toLowerCase(Locale.ROOT));
            if (name == null) {
                throw new InvalidOwnedRelicException("Unknown relic \"" + typed
                        + "\": it is not in the relic catalogue. Use the full name, tier included, e.g. \"Neo N16\".");
            }

            String refinement = entry.refinement() == null ? "" : entry.refinement().trim().toLowerCase(Locale.ROOT);
            if (!REFINEMENTS.contains(refinement)) {
                throw new InvalidOwnedRelicException("Unknown refinement \"" + entry.refinement() + "\" for "
                        + name + ": use intact, exceptional, flawless or radiant.");
            }

            checked.add(new OwnedRelic(name, refinement, entry.quantity()));
        }
        return checked;
    }

    /**
     * One entry per relic and refinement, with nothing held reading as no
     * entry at all.
     *
     * <p>Two entries for the same key are added rather than one dropped: both
     * are copies somebody said they hold, and keeping one would lose the other
     * without anything on screen saying which.
     */
    static List<OwnedRelic> coalesce(List<OwnedRelic> entries) {
        Map<String, OwnedRelic> byKey = new LinkedHashMap<>();

        for (OwnedRelic entry : entries) {
            if (entry == null || entry.relicName() == null || entry.refinement() == null) continue;
            if (entry.quantity() <= 0) continue;

            byKey.merge(entry.relicName() + "|" + entry.refinement(), entry,
                    (seen, more) -> new OwnedRelic(seen.relicName(), seen.refinement(),
                            seen.quantity() + more.quantity()));
        }
        return new ArrayList<>(byKey.values());
    }

    private static Map<String, String> namesOf(RelicLoadService relicLoadService) {
        try {
            Map<String, String> names = new HashMap<>();
            for (Relic relic : relicLoadService.loadRelicsWithCheckData()) {
                String full = relic.getTier() + " " + relic.getRelicName();
                names.put(full.toLowerCase(Locale.ROOT), full);
            }
            return names;
        } catch (IOException e) {
            // Without the catalogue nothing can be checked, and storing
            // unchecked names is the thing this service exists to avoid.
            throw new UncheckedIOException("relic catalogue unreadable, cannot check owned relics", e);
        }
    }

    /**
     * Reads the file without checking it against the catalogue.
     *
     * <p>What is on disk was checked when it was written, and a relic the
     * catalogue later stops listing is still a relic in the player's inventory.
     */
    private void load() {
        try {
            if (!Files.exists(file)) return;
            owned = coalesce(mapper.readValue(Files.readString(file), new TypeReference<List<OwnedRelic>>() {}));
        } catch (Exception e) {
            // A corrupt file must not stop the application from starting.
            System.err.println("owned-relics: unreadable file, starting empty — " + e.getMessage());
            owned = new ArrayList<>();
        }
    }

    private void save() {
        try {
            Path parent = file.toAbsolutePath().getParent();
            if (parent != null) Files.createDirectories(parent);

            // Write beside the target and move into place, so an interrupted
            // write cannot leave a half-written list behind.
            Path temp = Files.createTempFile(parent, "owned-relics", ".tmp");
            Files.writeString(temp, mapper.writerWithDefaultPrettyPrinter().writeValueAsString(owned));
            Files.move(temp, file, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);

        } catch (IOException e) {
            System.err.println("owned-relics: save failed — " + e.getMessage());
        }
    }
}
