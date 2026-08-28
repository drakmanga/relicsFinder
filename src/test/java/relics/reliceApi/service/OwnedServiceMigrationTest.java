package relics.reliceApi.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import relics.reliceApi.model.OwnedEntry;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * A collection stored before pieces had counts is worth exactly what it was.
 *
 * <p>The file that exists in the wild is a list of bare names. A name has
 * always meant "I have this", which is one copy, and reading it as zero would
 * empty a collection somebody spent months ticking — the one failure this
 * migration must not have. {@code lib/owned.ts} reads the same two shapes for
 * the same reason.
 */
class OwnedServiceMigrationTest {

    private static Path fileWith(Path dir, String json) throws Exception {
        Path file = dir.resolve("owned.json");
        Files.writeString(file, json);
        return file;
    }

    @Test
    void readsAStoredNameAsOneCopy(@TempDir Path dir) throws Exception {
        Path file = fileWith(dir, "[\"Volt Prime Chassis Blueprint\", \"Kestrel Prime Blade\"]");

        List<OwnedEntry> owned = new OwnedService(file.toString()).all();

        assertThat(owned).extracting(OwnedEntry::getItemName)
                .containsExactly("Volt Prime Chassis Blueprint", "Kestrel Prime Blade");
        assertThat(owned).extracting(OwnedEntry::getQuantity).containsOnly(1);
    }

    @Test
    void readsACountedEntryAsItsCount(@TempDir Path dir) throws Exception {
        Path file = fileWith(dir, "[{ \"itemName\": \"Kestrel Prime Blade\", \"quantity\": 2 }]");

        assertThat(new OwnedService(file.toString()).all())
                .singleElement()
                .extracting(OwnedEntry::getQuantity)
                .isEqualTo(2);
    }

    /** An entry that names no count is the old shape wearing the new one. */
    @Test
    void readsAnEntryWithNoCountAsOneCopy(@TempDir Path dir) throws Exception {
        Path file = fileWith(dir, "[{ \"itemName\": \"Kestrel Prime Blade\" }]");

        assertThat(new OwnedService(file.toString()).all())
                .singleElement()
                .extracting(OwnedEntry::getQuantity)
                .isEqualTo(1);
    }

    /** An explicit zero is not the old shape: it says nothing is held. */
    @Test
    void dropsAnEntryThatHoldsNothing(@TempDir Path dir) throws Exception {
        Path file = fileWith(dir, "[{ \"itemName\": \"Kestrel Prime Blade\", \"quantity\": 0 }]");

        assertThat(new OwnedService(file.toString()).all()).isEmpty();
    }

    /**
     * The migration reaches the file, and only when something writes to it.
     *
     * <p>Reading does not rewrite: a boot that migrates a file nobody touched
     * is a change made on the reader's behalf without them asking for it.
     */
    @Test
    void writesTheCountsBackOnTheFirstSave(@TempDir Path dir) throws Exception {
        Path file = fileWith(dir, "[\"Kestrel Prime Blade\"]");
        OwnedService service = new OwnedService(file.toString());

        assertThat(Files.readString(file)).doesNotContain("quantity");

        service.replace(List.of(new OwnedEntry("Kestrel Prime Blade", 2)));

        assertThat(Files.readString(file)).contains("\"quantity\" : 2");
    }

    @Test
    void keepsOneEntryPerNameAndDropsWhatIsNotHeld(@TempDir Path dir) {
        OwnedService service = new OwnedService(dir.resolve("owned.json").toString());

        List<OwnedEntry> stored = service.replace(List.of(
                new OwnedEntry("Kestrel Prime Blade", 1),
                new OwnedEntry("Kestrel Prime Blade", 2),
                new OwnedEntry("Kestrel Prime Grip", 0)));

        assertThat(stored).singleElement().extracting(OwnedEntry::getQuantity).isEqualTo(2);
    }
}
