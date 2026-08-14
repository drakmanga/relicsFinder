package relics.reliceApi.desktop;

import java.awt.Desktop;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.PrintStream;
import java.net.InetAddress;
import java.net.ServerSocket;
import java.net.URI;
import java.nio.channels.FileChannel;
import java.nio.channels.FileLock;
import java.nio.channels.OverlappingFileLockException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.nio.file.StandardOpenOption;
import java.util.Locale;

/**
 * Everything the application has to decide before Spring starts, when it was
 * launched by double-clicking an icon rather than by typing a command.
 *
 * <p>A server started from a shell inherits sane answers to all of this: the
 * working directory is where the data lives, the console is where the log goes,
 * a busy port prints an error somebody reads, and a second copy is something
 * the operator chose to start. None of that holds for a desktop launcher —
 * the working directory is Program Files and is not writable, there is no
 * console, a crash at startup is a window that never appears, and double
 * clicking twice is the most ordinary thing a user does.
 *
 * <p>The whole class is inert unless {@code relics.desktop} is true, which the
 * Windows launcher sets and nothing else does. Running from source, from the
 * jar or in Docker is untouched.
 */
public final class DesktopRuntime {

    /** Set by the Windows launcher through the jpackage configuration file. */
    public static final String FLAG = "relics.desktop";

    /** The port the browser is told about when nothing has claimed it yet. */
    static final int PREFERRED_PORT = 8080;

    /**
     * Written with the port actually bound, so a second launch can open the
     * browser on the copy already running instead of failing to bind.
     */
    static final String PORT_FILE = "port";

    private static final String LOCK_FILE = ".lock";

    /**
     * The lock is held for the life of the process, so the channel has to
     * outlive the method that took it — a collected channel releases it.
     */
    @SuppressWarnings("unused")
    private static FileChannel lockChannel;

    private DesktopRuntime() {
    }

    public static boolean enabled() {
        return Boolean.getBoolean(FLAG);
    }

    /**
     * Prepares the process, or hands over to the copy already running and never
     * returns.
     */
    public static void configure() {
        if (!enabled()) {
            return;
        }

        // Before anything touches AWT: the single-instance path below opens a
        // browser, and Spring would otherwise force headless on at run().
        System.setProperty("java.awt.headless", "false");

        Path home = home();
        try {
            Files.createDirectories(home.resolve("data"));
            Files.createDirectories(home.resolve("logs"));
        } catch (IOException e) {
            throw new IllegalStateException("Cannot create the application directory at " + home, e);
        }

        // Before the log is touched: a second launch is about to hand over and
        // exit, and rotating the file the running copy is writing to would cost
        // that copy its log to save nothing.
        if (!takeSingleInstanceLock(home)) {
            browse("http://127.0.0.1:" + waitForPort(home));
            System.exit(0);
        }

        redirectConsole(home.resolve("logs"));

        placeState(home);
        seedCatalogue(Path.of(System.getProperty("relics.catalogue.path")));

        // Loopback only. Binding every interface makes Windows Firewall ask a
        // question the user cannot answer, about a service that is for this
        // machine alone.
        setIfAbsent("server.address", "127.0.0.1");
        setIfAbsent("server.port", String.valueOf(freePort()));
    }

    /**
     * {@code %LOCALAPPDATA%\RelicFinder} on Windows, its equivalent elsewhere.
     *
     * <p>Roaming is deliberately not used: the price cache is megabytes of
     * data with a six-hour life, and a domain user should not carry it between
     * machines at every login.
     */
    public static Path home() {
        String override = System.getProperty("relics.home");
        if (override != null && !override.isBlank()) {
            return Path.of(override);
        }

        if (System.getProperty("os.name", "").toLowerCase(Locale.ROOT).contains("win")) {
            String local = System.getenv("LOCALAPPDATA");
            if (local != null && !local.isBlank()) {
                return Path.of(local, "RelicFinder");
            }
        }

        String xdg = System.getenv("XDG_DATA_HOME");
        Path base = (xdg == null || xdg.isBlank())
                ? Path.of(System.getProperty("user.home"), ".local", "share")
                : Path.of(xdg);
        return base.resolve("RelicFinder");
    }

    /** Points the four state files at the per-user directory. */
    private static void placeState(Path home) {
        Path data = home.resolve("data");
        setIfAbsent("relics.catalogue.path", data.resolve("relics.json").toString());
        setIfAbsent("relics.wishlist.path", data.resolve("wishlist.json").toString());
        setIfAbsent("relics.owned.path", data.resolve("owned.json").toString());
        setIfAbsent("relics.price-cache.path", data.resolve("price-cache.json").toString());
    }

    /**
     * Copies the catalogue shipped in the jar on first run.
     *
     * <p>The refresher downloads a fresh one at every startup, so this only
     * decides what the first launch looks like — and the first launch is
     * exactly the one that may happen on a train with no connection. Without
     * the seed that user gets an empty application and no way to tell whether
     * it is broken.
     */
    private static void seedCatalogue(Path target) {
        if (Files.exists(target)) {
            return;
        }
        try (InputStream bundled = DesktopRuntime.class.getResourceAsStream("/relics.json")) {
            if (bundled == null) {
                return;
            }
            Files.copy(bundled, target, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            // A missing seed is recoverable the moment the download lands, so
            // it must not stop the application from starting.
            System.err.println("relics: could not seed the catalogue — " + e.getMessage());
        }
    }

    /**
     * Sends the console to a file, keeping the previous run alongside it.
     *
     * <p>The launcher has no console attached, so without this every stack
     * trace the application prints goes to nowhere at all, and a user
     * reporting "it does not open" has nothing to send.
     */
    private static void redirectConsole(Path logs) {
        Path current = logs.resolve("relic-finder.log");
        try {
            Files.deleteIfExists(logs.resolve("relic-finder.log.1"));
            if (Files.exists(current)) {
                Files.move(current, logs.resolve("relic-finder.log.1"));
            }

            PrintStream out = new PrintStream(
                    new FileOutputStream(current.toFile(), true), true, StandardCharsets.UTF_8);
            System.setOut(out);
            System.setErr(out);
        } catch (IOException e) {
            // Nothing useful to say and nowhere to say it: the console this
            // would complain to is the one that does not exist.
        }
    }

    /**
     * Takes the lock that marks this process as the running copy.
     *
     * @return false when another copy holds it
     */
    private static boolean takeSingleInstanceLock(Path home) {
        try {
            FileChannel channel = FileChannel.open(home.resolve(LOCK_FILE),
                    StandardOpenOption.CREATE, StandardOpenOption.WRITE);
            FileLock lock = channel.tryLock();
            if (lock == null) {
                channel.close();
                return false;
            }
            lockChannel = channel;
            return true;
        } catch (OverlappingFileLockException e) {
            return false;
        } catch (IOException e) {
            // If the lock cannot be taken at all, starting is better than not:
            // the worst case is the port conflict this was meant to avoid.
            return true;
        }
    }

    /** Records the port for the next launch to find. */
    static void publishPort(Path home, int port) {
        try {
            Files.writeString(home.resolve(PORT_FILE), Integer.toString(port), StandardCharsets.UTF_8);
        } catch (IOException e) {
            System.err.println("relics: could not record the port — " + e.getMessage());
        }
    }

    /**
     * Reads the port of the copy already running, waiting for it to say.
     *
     * <p>The second launch usually happens because the first is slow to appear,
     * which means the file is often not there yet. Falling straight through to
     * the default would open a browser on nothing.
     */
    private static int waitForPort(Path home) {
        Path file = home.resolve(PORT_FILE);
        long deadline = System.currentTimeMillis() + 30_000;

        while (System.currentTimeMillis() < deadline) {
            try {
                int port = Integer.parseInt(Files.readString(file, StandardCharsets.UTF_8).trim());
                if (port > 0 && !isFree(port)) {
                    return port;
                }
            } catch (IOException | NumberFormatException ignored) {
                // Not written yet, or half written.
            }
            try {
                Thread.sleep(250);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                break;
            }
        }
        return PREFERRED_PORT;
    }

    /**
     * 8080 when it is free, any free port otherwise.
     *
     * <p>8080 is worth trying for: it is the address in every note, bookmark
     * and screenshot about this application. It is also the most contended
     * port on a developer's machine, and "port already in use" is not an error
     * a desktop user can act on.
     */
    private static int freePort() {
        if (isFree(PREFERRED_PORT)) {
            return PREFERRED_PORT;
        }
        try (ServerSocket socket = new ServerSocket(0, 1, InetAddress.getLoopbackAddress())) {
            return socket.getLocalPort();
        } catch (IOException e) {
            return PREFERRED_PORT;
        }
    }

    private static boolean isFree(int port) {
        try (ServerSocket socket = new ServerSocket(port, 1, InetAddress.getLoopbackAddress())) {
            socket.setReuseAddress(false);
            return true;
        } catch (IOException e) {
            return false;
        }
    }

    /** Opens the default browser, by whichever of the two routes works. */
    static void browse(String url) {
        try {
            if (Desktop.isDesktopSupported() && Desktop.getDesktop().isSupported(Desktop.Action.BROWSE)) {
                Desktop.getDesktop().browse(URI.create(url));
                return;
            }
        } catch (IOException | UnsupportedOperationException e) {
            System.err.println("relics: Desktop.browse refused — " + e.getMessage());
        }

        try {
            // The empty argument is the window title `start` insists on
            // consuming; without it the URL is taken as the title and nothing
            // opens.
            new ProcessBuilder("cmd", "/c", "start", "", url).start();
        } catch (IOException e) {
            System.err.println("relics: could not open a browser — " + e.getMessage());
        }
    }

    /**
     * Sets a property only if nothing already has, so a command line argument
     * or an environment variable still wins over these defaults.
     */
    private static void setIfAbsent(String key, String value) {
        if (System.getProperty(key) == null) {
            System.setProperty(key, value);
        }
    }
}
