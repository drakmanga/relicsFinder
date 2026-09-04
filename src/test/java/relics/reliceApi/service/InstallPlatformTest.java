package relics.reliceApi.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Which update a copy could take, decided without being on the machine.
 *
 * <p>The rule being defended: the platform decides what the dialog offers, so
 * getting it wrong offers somebody a Windows setup on a container or two
 * container commands on a desktop. UNKNOWN is the right answer more often than
 * it looks, and it is asserted as hard as the other two.
 */
class InstallPlatformTest {

    @Test
    void aDesktopLaunchOnWindowsIsAWindowsInstall() {
        assertThat(InstallPlatform.of(true, "Windows 11", false)).isEqualTo(InstallPlatform.WINDOWS);
    }

    /** There is no desktop installer for anything else, so there is nothing to offer. */
    @Test
    void aDesktopLaunchAnywhereElseIsNotOne() {
        assertThat(InstallPlatform.of(true, "Linux", false)).isEqualTo(InstallPlatform.UNKNOWN);
        assertThat(InstallPlatform.of(true, "Mac OS X", false)).isEqualTo(InstallPlatform.UNKNOWN);
    }

    @Test
    void theContainerMarkerIsADockerInstall() {
        assertThat(InstallPlatform.of(false, "Linux", true)).isEqualTo(InstallPlatform.DOCKER);
    }

    /** The flag wins: a Windows desktop is not a container whatever else is on disk. */
    @Test
    void aWindowsDesktopIsNotReadAsDockerWhenBothLookTrue() {
        assertThat(InstallPlatform.of(true, "Windows 10", true)).isEqualTo(InstallPlatform.WINDOWS);
    }

    @Test
    void aJarSomebodyStartedIsNeither() {
        assertThat(InstallPlatform.of(false, "Linux", false)).isEqualTo(InstallPlatform.UNKNOWN);
        assertThat(InstallPlatform.of(false, "Windows 11", false)).isEqualTo(InstallPlatform.UNKNOWN);
    }

    @Test
    void theWireNameIsWhatTheEndpointSays() {
        assertThat(InstallPlatform.WINDOWS.wireName()).isEqualTo("windows");
        assertThat(InstallPlatform.DOCKER.wireName()).isEqualTo("docker");
        assertThat(InstallPlatform.UNKNOWN.wireName()).isEqualTo("unknown");
    }
}
