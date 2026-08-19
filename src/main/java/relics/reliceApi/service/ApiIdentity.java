package relics.reliceApi.service;

/**
 * How this application names itself to the APIs it calls.
 *
 * <p>warframe.market's published rules require every client to send a dedicated
 * and descriptive User-Agent carrying a project name, a version and a way to
 * reach the author, and to state plainly that clients which "hide their
 * identity, impersonate browsers, or intentionally make traffic difficult to
 * classify may be blocked". Sending nothing leaves the JDK default of
 * {@code Java-http-client/21}, which identifies a runtime rather than a caller;
 * sending a copied Chrome string is the impersonation the rules name outright.
 *
 * <p>Kept in one place so a service added later cannot quietly go out
 * unidentified, and so the version is bumped once rather than six times.
 */
public final class ApiIdentity {

    /**
     * Read from the jar's manifest, falling back when running from classes.
     *
     * <p>Hardcoding it meant the string drifted from pom.xml the first time
     * anyone bumped a version, and a User-Agent that misreports which build is
     * calling is worse than one that admits it does not know.
     */
    private static final String VERSION = version();

    private static String version() {
        String packaged = ApiIdentity.class.getPackage().getImplementationVersion();
        return packaged != null ? packaged : "dev";
    }

    private static final String REPOSITORY = "https://github.com/drakmanga/relicsFinder";

    /** The value every outbound request sends as its {@code User-Agent}. */
    public static final String USER_AGENT = "RelicFinder/" + VERSION + " (+" + REPOSITORY + ")";

    private ApiIdentity() {}
}
