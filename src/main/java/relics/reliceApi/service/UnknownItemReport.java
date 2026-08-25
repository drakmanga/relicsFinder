package relics.reliceApi.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.Instant;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ConcurrentSkipListMap;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * The names in the catalogue that warframe.market has no item for.
 *
 * <p>The market tells two things apart that this application did not. It
 * answers 200 with empty statistics for an item it carries that nobody is
 * currently selling, and 404 only for a slug it has never heard of. The first
 * is an answer about the market; the second is an answer about us — the name
 * the slug was built from is wrong. Both used to produce the same record, so a
 * part whose name is misspelt was shown as a part nobody wants: a false price
 * rather than a missing one, which is the quietest kind of wrong there is.
 * Every failure {@code RelicMarketServiceSlugTest} guards against hid here,
 * and each one was found by somebody noticing a price that looked odd.
 *
 * <p>A file rather than an endpoint, because of what it is for. Correcting a
 * name is hand work against the drop tables, done once and probably not on the
 * day the report was produced, so the artifact has to outlive the process that
 * wrote it and be readable by grep and by eye. The count on the first line is
 * the half of the answer a list alone does not give: forty-one items 404 is a
 * rule applied wrongly across a whole category, three is a handful of odd
 * names, and the two are worked through completely differently.
 */
@Service
public class UnknownItemReport {

    /** Marks the two lines of preamble, so {@code grep -v '^#'} is the list. */
    private static final String COMMENT = "#";

    /** Between the slug and the name, so {@code cut -f2} is the names alone. */
    private static final String COLUMNS = "\t";

    private final Path file;

    /**
     * Every slug that came back 404 in this run, and the name behind it.
     *
     * <p>Keyed by slug so an item that 404s on every pass is one line rather
     * than one per pass, and sorted so two readings of the file differ only
     * where something actually changed. Six warmer threads write to it.
     */
    private final Map<String, String> unknown = new ConcurrentSkipListMap<>();

    /**
     * Armed at construction, so every run rewrites the file at least once.
     *
     * <p>Without that, a run in which nothing 404s never writes, and the
     * previous run's file survives untouched — which is precisely the thing
     * {@link #save()} says must not happen: names corrected between two runs
     * would keep sending somebody to look at items that are already right. One
     * write at the first flush beat costs nothing and makes the file always a
     * report of the run that is on, even when the answer is "none".
     */
    private final AtomicBoolean dirty = new AtomicBoolean(true);

    /**
     * @param path where to write the report, and there is deliberately no
     *             default beside it — unlike the wishlist, the owned list and
     *             the price cache, which are state this application owns and
     *             can recreate anywhere. This is a report somebody goes
     *             looking for, so exactly one place may say where it is: a
     *             fallback here would let it be written somewhere other than
     *             the configured path with nothing saying so, which is the same
     *             quiet wrongness the report exists to end.
     */
    public UnknownItemReport(@Value("${relics.unknown-items.path}") String path) {
        this.file = Paths.get(path);
    }

    /**
     * Writes down one slug the market had no item for.
     *
     * @param slug     what was asked for
     * @param itemName the name it was built from, which is the thing that has
     *                 to be corrected. Empty when a slug reached the queue
     *                 without a name behind it, which nothing does today; the
     *                 line then carries the slug alone, because a 404 recorded
     *                 half is worth more than a 404 dropped.
     */
    void record(String slug, String itemName) {
        if (slug == null || slug.isBlank()) return;

        String previous = unknown.put(slug, Objects.requireNonNullElse(itemName, ""));

        // Only a slug that was not already on the list makes the file worth
        // rewriting. The same names 404 on every pass, ten minutes apart,
        // forever, and rewriting an unchanged file every minute would churn
        // the disk for nothing.
        if (previous == null) dirty.set(true);
    }

    /**
     * Rewrites the file whole, when there is something new on the list.
     *
     * <p>Rewritten rather than appended to. Every pass asks about the same
     * catalogue — the warm-up runner re-enqueues every ten minutes, the
     * catalogue itself refreshes daily, and the rolling sweep never stops — so
     * a slug built from a wrong name comes back 404 on every one of them.
     * Appending would write the same forty lines every ten minutes: six
     * thousand lines by morning, and a count at the top that counts passes
     * rather than items. Keyed by slug and rewritten, the file is always the
     * whole current list and the count is the number that was asked for.
     *
     * <p>That loses no evidence. The map only ever grows within a run, so every
     * rewrite is a superset of the one before it. It is deliberately not seeded
     * from the file at startup either: a name corrected between two runs has to
     * stop appearing, and a line for an item that has since been fixed is worse
     * than no line at all — it sends somebody to look at something that is
     * already right.
     *
     * <p>Never throws. A report that cannot be written is a report that is not
     * there, not a reason to take the price warmer down with it.
     */
    void save() {
        if (!dirty.compareAndSet(true, false)) return;

        try {
            Path parent = file.toAbsolutePath().getParent();
            if (parent != null) Files.createDirectories(parent);

            // Written beside the target and moved into place, like the wishlist
            // and the price cache: an operator reading the file while a pass is
            // writing it must not be handed half of one.
            Path temp = Files.createTempFile(parent, "unknown-items", ".tmp");
            Files.writeString(temp, contents());
            Files.move(temp, file, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);

        } catch (IOException e) {
            System.err.println("unknown-items: save failed — " + e.getMessage());
            // Re-armed rather than left clean, so the next beat tries again. A
            // full disk that empties an hour later must not cost the whole run
            // its report.
            dirty.set(true);
        }
    }

    private String contents() {
        StringBuilder out = new StringBuilder();

        out.append(COMMENT).append(' ').append(unknown.size())
                .append(" items warframe.market has no listing for, read at ")
                .append(Instant.now()).append('\n');
        out.append(COMMENT)
                .append(" slug, then the name it was built from — the name is what to correct\n");

        for (Map.Entry<String, String> entry : unknown.entrySet()) {
            out.append(entry.getKey());
            if (!entry.getValue().isEmpty()) out.append(COLUMNS).append(entry.getValue());
            out.append('\n');
        }

        return out.toString();
    }
}
