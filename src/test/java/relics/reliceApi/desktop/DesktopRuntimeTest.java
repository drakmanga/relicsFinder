package relics.reliceApi.desktop;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.io.PrintStream;
import java.net.InetAddress;
import java.net.ServerSocket;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.FileTime;
import java.time.Duration;
import java.time.Instant;

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

    /**
     * Handed back and then closed. Restoring the streams alone leaves the log
     * file open, and on Windows an open file is a temporary directory JUnit
     * cannot delete — which it reports as this test failing, after it passed.
     */
    @AfterEach
    void restoreTheConsole() {
        PrintStream redirected = System.out;
        System.setOut(out);
        System.setErr(err);
        if (redirected != out && redirected != err) {
            redirected.close();
        }
    }

    /**
     * The lock is held for the life of a process, and a test is not a process.
     * Left held, it keeps the temporary directory open, and Windows will not
     * delete a directory holding an open file — which JUnit reports as this
     * test failing, after it has already passed.
     */
    @AfterEach
    void releaseTheLock() {
        DesktopRuntime.releaseLock();
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

    /**
     * The override is compared as text rather than as a path: Windows has no
     * path made of two spaces, so building one to assert against is an error on
     * the machine this most needs to be right on.
     */
    @Test
    void ignoresAnEmptyOverride() {
        System.setProperty("relics.home", "  ");

        assertThat(DesktopRuntime.home().toString()).isNotEqualTo("  ");
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

    /**
     * The whole of the fix for the update that ended with two tabs.
     *
     * <p>A browser tab is sitting on the port the outgoing copy served, waiting
     * to be told the new version is up. Binding anywhere else leaves it
     * pointing at nothing, and the only ending left is to open a second tab
     * beside it.
     */
    @Test
    void takesBackThePortTheWaitingTabIsOn() throws Exception {
        int wanted = aFreePort();
        System.setProperty(DesktopRuntime.FLAG, "true");
        System.setProperty("relics.home", temp.toString());
        Files.writeString(temp.resolve(DesktopRuntime.RESTART_FILE), Integer.toString(wanted));

        DesktopRuntime.configure();

        assertThat(System.getProperty("server.port")).isEqualTo(Integer.toString(wanted));
        assertThat(DesktopRuntime.resumingOn()).isEqualTo(wanted);
    }

    /**
     * A record left behind by an update that never finished — a setup that
     * failed, a machine switched off halfway — must not still be believed days
     * later. Obeyed, it would skip opening a browser on an ordinary launch,
     * which is an application that starts and puts nothing on screen.
     */
    @Test
    void ignoresAndForgetsARestartTooOldToBeAboutThisStart() throws Exception {
        int wanted = aFreePort();
        System.setProperty(DesktopRuntime.FLAG, "true");
        System.setProperty("relics.home", temp.toString());
        Path record = temp.resolve(DesktopRuntime.RESTART_FILE);
        Files.writeString(record, Integer.toString(wanted));
        Files.setLastModifiedTime(record, FileTime.from(Instant.now().minus(Duration.ofHours(2))));

        DesktopRuntime.configure();

        assertThat(DesktopRuntime.resumingOn()).isZero();
        assertThat(record).doesNotExist();
    }

    /** Every launch but the one an update causes, which is nearly all of them. */
    @Test
    void reportsNoRestartWhenNobodyRecordedOne() {
        System.setProperty(DesktopRuntime.FLAG, "true");
        System.setProperty("relics.home", temp.toString());

        DesktopRuntime.configure();

        assertThat(DesktopRuntime.resumingOn()).isZero();
        assertThat(temp.resolve(DesktopRuntime.RESTART_FILE)).doesNotExist();
    }

    /**
     * The updater knows an update is happening and nothing else; the port is
     * the running copy's business, and it has already published it.
     */
    @Test
    void recordsTheRestartOnThePortAlreadyPublished() throws Exception {
        Files.writeString(temp.resolve(DesktopRuntime.PORT_FILE), "51734");

        DesktopRuntime.recordRestart(temp);

        assertThat(temp.resolve(DesktopRuntime.RESTART_FILE)).hasContent("51734");
    }

    /**
     * Left in place by the start that read it, because a second launch arriving
     * while the update settles has to see the same answer — it is the one that
     * would otherwise open the spare tab. Clearing it is a separate decision,
     * taken once the browser question has been answered.
     */
    @Test
    void forgetsTheRestartOnlyWhenTold() throws Exception {
        int wanted = aFreePort();
        System.setProperty(DesktopRuntime.FLAG, "true");
        System.setProperty("relics.home", temp.toString());
        Files.writeString(temp.resolve(DesktopRuntime.RESTART_FILE), Integer.toString(wanted));

        DesktopRuntime.configure();
        assertThat(temp.resolve(DesktopRuntime.RESTART_FILE)).exists();

        DesktopRuntime.clearRestart(temp);
        assertThat(temp.resolve(DesktopRuntime.RESTART_FILE)).doesNotExist();
    }

    /**
     * A port nothing is on at the moment of asking. Taken and released rather
     * than picked, because a number chosen by hand is a number some other test
     * or some other program on the build machine may be sitting on.
     */
    private static int aFreePort() throws IOException {
        try (ServerSocket socket = new ServerSocket(0, 1, InetAddress.getLoopbackAddress())) {
            return socket.getLocalPort();
        }
    }
}
