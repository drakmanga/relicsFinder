package relics.reliceApi.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import relics.reliceApi.Expection.InvalidKuvaPurchasesException;
import relics.reliceApi.model.KuvaPurchases;

import java.io.IOException;
import java.nio.file.*;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.locks.ReentrantLock;
import java.util.regex.Pattern;

/**
 * This week's Kuva purchases, kept on disk so every browser that opens the
 * app sees the same ticks.
 *
 * <p>Same storage and the same whole-object writes as {@link OwnedRelicService}
 * and {@link WishlistService}, for their reasons — single-tenant, self-hosted,
 * and a client that holds the authoritative copy while it is being edited.
 *
 * <p>The vendors, their limits and which week is the current one are the
 * frontend's: the Kuva catalogue lives there, and the server has nothing to
 * check a limit against. What is checked here is shape — a week that is a
 * real weekly reset, ids that look like catalogue ids, counts no offer comes
 * near — so a buggy client cannot write a file the next read chokes on.
 */
@Service
public class KuvaPurchaseService {

    private static final long DAY_MS = 86_400_000L;
    static final long WEEK_MS = 7 * DAY_MS;
    /** 1970-01-01 was a Thursday: epoch weeks roll over four days before a Monday. */
    private static final long MONDAY_SHIFT = 4 * DAY_MS;

    /** The catalogue's ids: lower case, digits and hyphens. */
    static final Pattern OFFER_ID = Pattern.compile("[a-z0-9-]{1,64}");
    /** Above every limit in the catalogue (Teshin's 25) with room to grow. */
    static final int MAX_COUNT = 100;
    /** Above the catalogue's thirteen offers with room to grow. */
    static final int MAX_OFFERS = 100;
    /** Above the Icebind's best week, 363,000, with room to grow. */
    static final int MAX_REWARD_KUVA = 1_000_000;

    private final Path file;
    private final ObjectMapper mapper = new ObjectMapper();
    private final ReentrantLock lock = new ReentrantLock();

    /** Cached in memory; the file is the durable copy, not the hot path. */
    private volatile KuvaPurchases purchases = KuvaPurchases.none();

    public KuvaPurchaseService(@Value("${relics.kuva-purchases.path:data/kuva-purchases.json}") String path) {
        this.file = Paths.get(path);
        load();
    }

    public KuvaPurchases get() {
        return purchases;
    }

    /**
     * Replaces the stored week, or refuses it whole.
     *
     * <p>Zero counts are dropped: an offer bought none of is the same as one
     * never mentioned, and keeping both spellings would make two equal weeks
     * compare different.
     *
     * @throws InvalidKuvaPurchasesException naming the first value out of shape
     */
    public KuvaPurchases replace(KuvaPurchases next) {
        KuvaPurchases checked = validate(next);

        lock.lock();
        try {
            purchases = checked;
            save();
            return purchases;
        } finally {
            lock.unlock();
        }
    }

    static KuvaPurchases validate(KuvaPurchases next) {
        if (next == null) throw new InvalidKuvaPurchasesException("No purchases sent.");

        if (next.week() <= 0 || Math.floorMod(next.week() - MONDAY_SHIFT, WEEK_MS) != 0) {
            throw new InvalidKuvaPurchasesException("Week " + next.week()
                    + " is not a weekly reset: send the Monday 00:00 UTC the week started on, in epoch milliseconds.");
        }

        return new KuvaPurchases(next.week(),
                checked(next.counts(), "Count", MAX_COUNT),
                checked(next.rewards(), "Kuva", MAX_REWARD_KUVA));
    }

    /**
     * One map of ids to non-negative numbers, zeros dropped. Shared by the
     * purchase counts and the reward amounts, which differ only in how large a
     * value may be and in what the message calls it.
     */
    private static Map<String, Integer> checked(Map<String, Integer> values, String what, int max) {
        Map<String, Integer> source = values == null ? Map.of() : values;
        if (source.size() > MAX_OFFERS) {
            throw new InvalidKuvaPurchasesException(source.size() + " entries sent; at most " + MAX_OFFERS + " are kept.");
        }

        Map<String, Integer> kept = new LinkedHashMap<>();
        for (Map.Entry<String, Integer> entry : source.entrySet()) {
            String id = entry.getKey();
            if (id == null || !OFFER_ID.matcher(id).matches()) {
                throw new InvalidKuvaPurchasesException("\"" + id
                        + "\" is not a catalogue id: lower case with hyphens, e.g. \"teshin\".");
            }
            Integer value = entry.getValue();
            if (value == null || value < 0 || value > max) {
                throw new InvalidKuvaPurchasesException(what + " " + value + " for \"" + id
                        + "\" is out of range: 0 to " + max + ".");
            }
            if (value > 0) kept.put(id, value);
        }
        return Map.copyOf(kept);
    }

    private void load() {
        try {
            if (!Files.exists(file)) return;
            purchases = validate(mapper.readValue(Files.readString(file), KuvaPurchases.class));
        } catch (Exception e) {
            // A corrupt file must not stop the application from starting, and
            // losing it costs one week's ticks.
            System.err.println("kuva-purchases: unreadable file, starting empty — " + e.getMessage());
            purchases = KuvaPurchases.none();
        }
    }

    private void save() {
        try {
            Path parent = file.toAbsolutePath().getParent();
            if (parent != null) Files.createDirectories(parent);

            // Write beside the target and move into place, so an interrupted
            // write cannot leave a half-written file behind.
            Path temp = Files.createTempFile(parent, "kuva-purchases", ".tmp");
            Files.writeString(temp, mapper.writerWithDefaultPrettyPrinter().writeValueAsString(purchases));
            Files.move(temp, file, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
        } catch (IOException e) {
            System.err.println("kuva-purchases: save failed — " + e.getMessage());
        }
    }
}
