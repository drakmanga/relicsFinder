package relics.reliceApi.service;

/**
 * Which build of Relic Finder this is.
 *
 * <p>Read from the jar manifest, which Maven fills from the {@code revision}
 * property in pom.xml — the one place the version is declared. Nothing here
 * hardcodes it, and nothing else in the tree should: the frontend asks the
 * running backend, and the Windows installer reads the same pom.
 *
 * <p>Running from classes rather than from a jar there is no manifest, and the
 * answer is {@link #UNKNOWN} rather than a guess. A version that misreports
 * which build is running is worse than one that admits it does not know —
 * the update check would compare a made-up number against a real release and
 * tell somebody to update to what they already have, or not to update at all.
 */
public final class AppVersion {

    /** What a build with no manifest reports. Not a version, and not comparable to one. */
    public static final String UNKNOWN = "dev";

    /** The version this process is running, or {@link #UNKNOWN}. */
    public static final String RUNNING = running();

    private static String running() {
        String packaged = AppVersion.class.getPackage().getImplementationVersion();
        return packaged != null ? packaged : UNKNOWN;
    }

    private AppVersion() {}
}
