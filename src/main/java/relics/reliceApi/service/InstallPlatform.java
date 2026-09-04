package relics.reliceApi.service;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Locale;

import relics.reliceApi.desktop.DesktopRuntime;

/**
 * How this copy of Relic Finder was installed, which is what decides what an
 * update would even mean.
 *
 * <p>A Windows install replaces an .exe; a Docker install pulls an image; a jar
 * somebody started from a shell is neither, and offering it either would be
 * offering to do something to a machine nobody asked about.
 *
 * <p>The detection is one pure method taking what it looks at, so a test can
 * ask it about a Windows desktop without being on one. {@link #detect()} is the
 * only part that reads the real machine.
 */
public enum InstallPlatform {

    /** Installed by the Windows setup: the launcher sets the desktop flag. */
    WINDOWS,

    /** Running inside a container. */
    DOCKER,

    /** A jar somebody runs themselves, or anything else. No update to offer. */
    UNKNOWN;

    /**
     * The file every Docker container has and nothing else does. Not a public
     * contract, but there is no supported alternative and the cost of being
     * wrong here is one button offered where two commands would have been.
     */
    private static final Path DOCKER_MARKER = Path.of("/.dockerenv");

    public static InstallPlatform detect() {
        return of(Boolean.getBoolean(DesktopRuntime.FLAG),
                System.getProperty("os.name", ""),
                Files.exists(DOCKER_MARKER));
    }

    /**
     * The desktop flag is checked against the operating system rather than
     * trusted on its own: it says "launched by an icon", and the installer that
     * sets it exists only for Windows. A desktop launch anywhere else is
     * something this project does not build and must not claim to update.
     */
    static InstallPlatform of(boolean desktop, String osName, boolean containerMarker) {
        if (desktop && osName.toLowerCase(Locale.ROOT).startsWith("windows")) return WINDOWS;
        if (containerMarker) return DOCKER;
        return UNKNOWN;
    }

    /** What the endpoint calls this platform. Lowercase, because JSON. */
    public String wireName() {
        return name().toLowerCase(Locale.ROOT);
    }
}
