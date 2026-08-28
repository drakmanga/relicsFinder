package relics.reliceApi.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import relics.reliceApi.model.OwnedEntry;

import java.io.IOException;
import java.nio.file.*;
import java.util.*;
import java.util.concurrent.locks.ReentrantLock;

/**
 * The parts the player already has, kept on disk.
 *
 * <p>A name and a count. The count is not a tally of spares — a duplicate found
 * in the wild is a thing to sell, which is the wishlist's "ducat" kind — it is
 * how many copies the set is built from: Kestrel Prime needs two Blades, and
 * 28 sets hold a piece like it. A list of names could not say "one Blade of
 * two", so those sets reported themselves finished with a piece still missing.
 *
 * <p>Deliberately separate from the wishlist rather than another kind on it.
 * The wishlist says "I want this" and this says "I have this"; a part can be
 * neither, and reading one as the negation of the other would tell anyone who
 * has never opened the wishlist that they own the entire game.
 *
 * <p>Same storage as the wishlist and for the same reason: the service is
 * self-hosted and single-tenant, so a JSON file is the whole persistence layer
 * and the list survives a change of browser, which localStorage could not.
 */
@Service
public class OwnedService {

    /**
     * What a stored name means when it carries no count.
     *
     * <p>One copy, which is what a name in the list has always stood for. The
     * file that exists today is a list of bare strings, and reading one as zero
     * would empty a collection somebody spent months ticking — the one failure
     * this migration must not have.
     */
    private static final int COPIES_WHEN_UNSAID = 1;

    private final Path file;
    private final ObjectMapper mapper = new ObjectMapper();
    private final ReentrantLock lock = new ReentrantLock();

    /** Cached in memory; the file is the durable copy, not the hot path. */
    private volatile List<OwnedEntry> owned = new ArrayList<>();

    public OwnedService(@Value("${relics.owned.path:data/owned.json}") String path) {
        this.file = Paths.get(path);
        load();
    }

    public List<OwnedEntry> all() {
        return List.copyOf(owned);
    }

    /**
     * Replaces the whole list.
     *
     * <p>Whole-list writes rather than per-item toggles: the client holds the
     * authoritative copy while the user is ticking boxes, and a partial update
     * protocol would need conflict rules for a tool that cannot have conflicts.
     */
    public List<OwnedEntry> replace(List<OwnedEntry> next) {
        lock.lock();
        try {
            owned = clean(next);
            save();
            return List.copyOf(owned);
        } finally {
            lock.unlock();
        }
    }

    /**
     * One entry per name, with nothing held reading as no entry at all.
     *
     * <p>Applied to what arrives from the browser and to what is read off disk:
     * the same name twice would make a set read as 7 of 6 pieces complete, and
     * a stored 0 would be a row saying "none of these", which is what an absent
     * name already says.
     */
    private static List<OwnedEntry> clean(List<OwnedEntry> next) {
        Map<String, OwnedEntry> cleaned = new LinkedHashMap<>();

        for (OwnedEntry entry : next == null ? List.<OwnedEntry>of() : next) {
            if (entry == null || entry.getItemName() == null || entry.getItemName().isBlank()) continue;
            if (entry.getQuantity() <= 0) continue;

            String name = entry.getItemName().trim();
            cleaned.put(name, new OwnedEntry(name, entry.getQuantity()));
        }

        return new ArrayList<>(cleaned.values());
    }

    /**
     * Reads the file, in either shape it can have.
     *
     * <p>A bare string is the shape written before pieces carried counts, and
     * it means one copy. The file is not rewritten on the way in: it is
     * rewritten the first time the client saves, so a migration nobody asked
     * for cannot happen at boot.
     */
    private void load() {
        try {
            if (!Files.exists(file)) return;

            JsonNode root = mapper.readTree(Files.readString(file));
            if (!root.isArray()) return;

            List<OwnedEntry> parsed = new ArrayList<>();

            for (JsonNode node : root) {
                if (node.isTextual()) {
                    String name = node.asText("").trim();
                    if (!name.isEmpty()) parsed.add(new OwnedEntry(name, COPIES_WHEN_UNSAID));
                    continue;
                }

                String name = node.path("itemName").asText("").trim();
                if (name.isEmpty()) continue;

                int quantity = node.path("quantity").asInt(COPIES_WHEN_UNSAID);
                parsed.add(new OwnedEntry(name, Math.max(quantity, COPIES_WHEN_UNSAID)));
            }

            owned = clean(parsed);

        } catch (Exception e) {
            // A corrupt file must not stop the application from starting.
            System.err.println("owned: unreadable file, starting empty — " + e.getMessage());
            owned = new ArrayList<>();
        }
    }

    private void save() {
        try {
            Path parent = file.toAbsolutePath().getParent();
            if (parent != null) Files.createDirectories(parent);

            // Write beside the target and move into place, so an interrupted
            // write cannot leave a half-written list behind.
            Path temp = Files.createTempFile(parent, "owned", ".tmp");
            Files.writeString(temp, mapper.writerWithDefaultPrettyPrinter().writeValueAsString(owned));
            Files.move(temp, file, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);

        } catch (IOException e) {
            System.err.println("owned: save failed — " + e.getMessage());
        }
    }
}
