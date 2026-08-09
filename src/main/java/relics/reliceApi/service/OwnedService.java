package relics.reliceApi.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.*;
import java.util.*;
import java.util.concurrent.locks.ReentrantLock;

/**
 * The parts the player already has, kept on disk.
 *
 * <p>A set of names and nothing more. Quantity would be a lie: a set needs one
 * of each component, so a second Volt Prime Chassis is a thing to sell, not a
 * thing that changes what is missing — and that question is the wishlist's,
 * under the "ducat" kind.
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

    private final Path file;
    private final ObjectMapper mapper = new ObjectMapper();
    private final ReentrantLock lock = new ReentrantLock();

    /** Cached in memory; the file is the durable copy, not the hot path. */
    private volatile List<String> owned = new ArrayList<>();

    public OwnedService(@Value("${relics.owned.path:data/owned.json}") String path) {
        this.file = Paths.get(path);
        load();
    }

    public List<String> all() {
        return List.copyOf(owned);
    }

    /**
     * Replaces the whole list.
     *
     * <p>Whole-list writes rather than per-item toggles: the client holds the
     * authoritative copy while the user is ticking boxes, and a partial update
     * protocol would need conflict rules for a tool that cannot have conflicts.
     */
    public List<String> replace(List<String> next) {
        lock.lock();
        try {
            // A LinkedHashSet rather than a plain copy: the same name arriving
            // twice would make a set read as 7 of 6 pieces complete.
            Set<String> cleaned = new LinkedHashSet<>();

            for (String name : next == null ? List.<String>of() : next) {
                if (name == null || name.isBlank()) continue;
                cleaned.add(name.trim());
            }

            owned = new ArrayList<>(cleaned);
            save();
            return List.copyOf(owned);
        } finally {
            lock.unlock();
        }
    }

    private void load() {
        try {
            if (!Files.exists(file)) return;
            owned = mapper.readValue(Files.readString(file), new TypeReference<List<String>>() {});
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
