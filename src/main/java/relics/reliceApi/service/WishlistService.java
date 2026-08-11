package relics.reliceApi.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import relics.reliceApi.model.WishlistEntry;

import java.io.IOException;
import java.nio.file.*;
import java.util.*;
import java.util.concurrent.locks.ReentrantLock;

/**
 * The wishlist, kept on disk.
 *
 * <p>There is no concept of a user because the application does not need one:
 * it is self-hosted and single-tenant, so whoever opens it owns the only list.
 * That makes a JSON file the whole storage layer — no database, no accounts,
 * and the list survives a browser change, which localStorage could not do.
 */
@Service
public class WishlistService {

    private final Path file;
    private final ObjectMapper mapper = new ObjectMapper();
    private final ReentrantLock lock = new ReentrantLock();

    /** Cached in memory; the file is the durable copy, not the hot path. */
    private volatile List<WishlistEntry> entries = new ArrayList<>();

    public WishlistService(@Value("${relics.wishlist.path:data/wishlist.json}") String path) {
        this.file = Paths.get(path);
        load();
    }

    public List<WishlistEntry> all() {
        return List.copyOf(entries);
    }

    /**
     * Replaces the whole list.
     *
     * <p>Whole-list writes rather than per-item operations: the client already
     * holds the authoritative list while the user is editing it, and a partial
     * update protocol would need conflict rules for a single-user tool that can
     * never have a conflict.
     */
    public List<WishlistEntry> replace(List<WishlistEntry> next) {
        lock.lock();
        try {
            List<WishlistEntry> cleaned = new ArrayList<>();
            Set<String> seen = new HashSet<>();

            for (WishlistEntry entry : next == null ? List.<WishlistEntry>of() : next) {
                if (entry == null || entry.getItemName() == null || entry.getItemName().isBlank()) continue;
                if (entry.getQuantity() <= 0) continue;
                if (entry.getKind() == null || entry.getKind().isBlank()) entry.setKind("part");
                // Identity is kind plus name: the same part wanted for a set and
                // for ducats is two lines. A true duplicate would double a total
                // silently.
                if (!seen.add(identityOf(entry))) continue;
                cleaned.add(entry);
            }

            entries = cleaned;
            save();
            return List.copyOf(entries);
        } finally {
            lock.unlock();
        }
    }

    /**
     * What makes two lines the same line.
     *
     * <p>Kind plus name, except for a relic, where the refinement joins the key:
     * a relic is bought sealed and then refined with void traces, so Axi A20
     * Intact and Axi A20 Exceptional are two plans and two quantities. For every
     * other kind the refinement is a note about where the part was found, and
     * keying on it would split one part into four lines.
     *
     * <p>The client applies the same rule in {@code lib/wishlist.ts}. The two
     * have to agree: if this one is coarser, a reload silently merges lines the
     * user kept apart and adds their quantities together.
     */
    static String identityOf(WishlistEntry entry) {
        String kind = entry.getKind();
        if (!"relic".equals(kind)) return kind + "|" + entry.getItemName();

        String refinement = entry.getRefinement();
        return kind + "|" + entry.getItemName() + "|" + (refinement == null ? "intact" : refinement);
    }

    private void load() {
        try {
            if (!Files.exists(file)) return;
            entries = mapper.readValue(Files.readString(file), new TypeReference<List<WishlistEntry>>() {});
        } catch (Exception e) {
            // A corrupt file must not stop the application from starting; the
            // list is a convenience, not the point of the service.
            System.err.println("wishlist: unreadable file, starting empty — " + e.getMessage());
            entries = new ArrayList<>();
        }
    }

    private void save() {
        try {
            Path parent = file.toAbsolutePath().getParent();
            if (parent != null) Files.createDirectories(parent);

            // Write beside the target and move into place, so an interrupted
            // write cannot leave a half-written list behind.
            Path temp = Files.createTempFile(parent, "wishlist", ".tmp");
            Files.writeString(temp, mapper.writerWithDefaultPrettyPrinter().writeValueAsString(entries));
            Files.move(temp, file, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);

        } catch (IOException e) {
            System.err.println("wishlist: save failed — " + e.getMessage());
        }
    }
}
