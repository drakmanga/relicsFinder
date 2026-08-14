package relics.reliceApi.desktop;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.PrintStream;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The two claims the desktop launcher rests on.
 *
 * <p>The first is that it is invisible: this class rewrites where the whole
 * application keeps its state, and it must do so only when a Windows launcher
 * asked for it. Running from source, from the jar or in a container has to keep
 * reading {@code data/} out of the working directory, and nothing else in the
 * test suite would notice if that stopped being true.
 *
 * <p>The second is that, when it is asked for, the state lands somewhere the
 * user can actually write to — which on Windows is not the folder the
 * application was installed into.
 */
class DesktopRuntimeTest {

    @TempDir
    Path temp;

    /**
     * Configuring the desktop launcher sends the console to a file, because the
     * launcher has no console. Left in place that would swallow the rest of the
     * suite's output, so the streams are handed back afterwards.
     */
    private final PrintStream out = System.out;
    private final PrintStream err = System.err;

    @AfterEach
    void restoreTheConsole() {
        System.setOut(out);
        System.setErr(err);
    }

    @AfterEach
    void clearFlags() {
        System.clearProperty(DesktopRuntime.FLAG);
        System.clearProperty("relics.home");
        System.clearProperty("relics.wishlist.path");
        System.clearProperty("relics.catalogue.path");
        System.clearProperty("relics.owned.path");
        System.clearProperty("relics.price-cache.path");
        System.clearProperty("server.address");
        System.clearProperty("server.port");
    }

    @Test
    void doesNothingWhenTheFlagIsAbsent() {
        DesktopRuntime.configure();

        assertThat(DesktopRuntime.enabled()).isFalse();
        assertThat(System.getProperty("relics.wishlist.path")).isNull();
        assertThat(System.getProperty("relics.catalogue.path")).isNull();
        assertThat(System.getProperty("relics.owned.path")).isNull();
        assertThat(System.getProperty("relics.price-cache.path")).isNull();
        assertThat(System.getProperty("server.address")).isNull();
        assertThat(System.getProperty("server.port")).isNull();
    }

    @Test
    void doesNothingWhenTheFlagIsFalse() {
        System.setProperty(DesktopRuntime.FLAG, "false");

        DesktopRuntime.configure();

        assertThat(DesktopRuntime.enabled()).isFalse();
        assertThat(System.getProperty("relics.wishlist.path")).isNull();
    }

    /**
     * The override exists for this test and for anyone running two copies, but
     * what it proves is the shape of the answer: one directory, with everything
     * under it.
     */
    @Test
    void keepsEverythingUnderOneDirectory() {
        System.setProperty("relics.home", temp.toString());

        assertThat(DesktopRuntime.home()).isEqualTo(temp);
    }

    @Test
    void ignoresAnEmptyOverride() {
        System.setProperty("relics.home", "  ");

        assertThat(DesktopRuntime.home()).isNotEqualTo(Path.of("  "));
        assertThat(DesktopRuntime.home().toString()).endsWith("RelicFinder");
    }

    /**
     * Every path the application reads is settled here, and a state file left
     * pointing at the working directory would be written into Program Files —
     * where it cannot be written at all.
     */
    @Test
    void placesEveryStateFileUnderTheHomeDirectory() {
        System.setProperty(DesktopRuntime.FLAG, "true");
        System.setProperty("relics.home", temp.toString());

        DesktopRuntime.configure();

        Path data = temp.resolve("data");
        assertThat(System.getProperty("relics.catalogue.path")).isEqualTo(data.resolve("relics.json").toString());
        assertThat(System.getProperty("relics.wishlist.path")).isEqualTo(data.resolve("wishlist.json").toString());
        assertThat(System.getProperty("relics.owned.path")).isEqualTo(data.resolve("owned.json").toString());
        assertThat(System.getProperty("relics.price-cache.path"))
                .isEqualTo(data.resolve("price-cache.json").toString());
    }

    /**
     * The first launch may be offline, and an application that answers with an
     * empty catalogue looks broken rather than disconnected.
     */
    @Test
    void seedsTheCatalogueSoTheFirstLaunchHasData() {
        System.setProperty(DesktopRuntime.FLAG, "true");
        System.setProperty("relics.home", temp.toString());

        DesktopRuntime.configure();

        assertThat(temp.resolve("data").resolve("relics.json")).isNotEmptyFile();
    }

    /**
     * Binding every interface makes Windows Firewall ask a question about a
     * service that is for this machine alone.
     */
    @Test
    void listensOnLoopbackOnly() {
        System.setProperty(DesktopRuntime.FLAG, "true");
        System.setProperty("relics.home", temp.toString());

        DesktopRuntime.configure();

        assertThat(System.getProperty("server.address")).isEqualTo("127.0.0.1");
        assertThat(Integer.parseInt(System.getProperty("server.port"))).isPositive();
    }

    /**
     * A port passed on the command line is the operator saying which one they
     * want, and the launcher's guess must not overrule it.
     */
    @Test
    void leavesAPortThatWasAskedForAlone() {
        System.setProperty(DesktopRuntime.FLAG, "true");
        System.setProperty("relics.home", temp.toString());
        System.setProperty("server.port", "9137");

        DesktopRuntime.configure();

        assertThat(System.getProperty("server.port")).isEqualTo("9137");
    }
}
