package relics.reliceApi.desktop;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.boot.web.context.WebServerInitializedEvent;
import org.springframework.context.ApplicationContext;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.awt.AWTException;
import java.awt.Desktop;
import java.awt.Image;
import java.awt.MenuItem;
import java.awt.PopupMenu;
import java.awt.SystemTray;
import java.awt.Toolkit;
import java.awt.TrayIcon;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Path;

/**
 * The part of the application the user actually operates: an icon by the clock.
 *
 * <p>A web application launched from an icon has no window of its own, and the
 * browser tab it opens is not it — closing the tab leaves the server running,
 * and there is nothing left on screen that says so or offers to stop it. The
 * tray icon is that missing window: it says the thing is running, it opens the
 * page again, and it is how the user quits.
 *
 * <p>Only present when {@code relics.desktop} is true. Server deployments and
 * the containers keep a process with no user interface at all.
 */
@Component
@ConditionalOnProperty(name = DesktopRuntime.FLAG, havingValue = "true")
public class DesktopTray {

    private final ApplicationContext context;

    /**
     * Off for the smoke test in the release build, which starts the packaged
     * application on a machine with nobody at it and would otherwise wait on a
     * browser that has no screen to open on.
     */
    private final boolean openBrowser;

    /**
     * The port the server actually bound, which is the requested one unless it
     * had been taken between the check and the bind.
     */
    private volatile int port = DesktopRuntime.PREFERRED_PORT;

    private TrayIcon icon;

    public DesktopTray(ApplicationContext context,
                       @Value("${relics.desktop.browser:true}") boolean openBrowser) {
        this.context = context;
        this.openBrowser = openBrowser;
    }

    @EventListener
    public void onServerReady(WebServerInitializedEvent event) {
        this.port = event.getWebServer().getPort();
        DesktopRuntime.publishPort(DesktopRuntime.home(), this.port);
    }

    /**
     * Waits for the whole context, not just the web server: the first request
     * the browser makes reads the catalogue, and answering it with a 500
     * because a bean was still starting is a worse first impression than half
     * a second of nothing.
     */
    @EventListener
    public void onReady(ApplicationReadyEvent event) {
        install();
        if (openBrowser) {
            DesktopRuntime.browse(url());
        }
    }

    /**
     * Puts the icon in the tray, or carries on without one.
     *
     * <p>Every failure here is caught, including the errors: a desktop session
     * that cannot give out a tray icon is a cosmetic problem, and letting it
     * take the server down with it would turn "no icon" into "the application
     * does not start".
     */
    private void install() {
        try {
            add();
        } catch (Throwable e) {
            System.err.println("relics: no tray icon — " + e);
            icon = null;
        }
    }

    private void add() {
        if (!SystemTray.isSupported()) {
            // Rare on Windows, ordinary on a bare Linux session. The browser
            // still opens; the user quits from the task manager.
            System.err.println("relics: no system tray on this desktop — running without an icon");
            return;
        }

        PopupMenu menu = new PopupMenu();
        menu.add(item("Open Relic Finder", () -> DesktopRuntime.browse(url())));
        menu.add(item("Data folder", () -> open(DesktopRuntime.home().resolve("data"))));
        menu.add(item("Log file", () -> open(DesktopRuntime.home().resolve("logs").resolve("relic-finder.log"))));
        menu.addSeparator();
        menu.add(item("Quit Relic Finder", this::quit));

        icon = new TrayIcon(image(), "Relic Finder — running on port " + port, menu);
        icon.setImageAutoSize(true);
        // The obvious gesture, and the one Windows users try first.
        icon.addActionListener(event -> DesktopRuntime.browse(url()));

        try {
            SystemTray.getSystemTray().add(icon);
            icon.displayMessage("Relic Finder",
                    "Running here. Click the icon to open it again.", TrayIcon.MessageType.NONE);
        } catch (AWTException e) {
            System.err.println("relics: the tray refused the icon — " + e.getMessage());
            icon = null;
        }
    }

    /**
     * Takes the icon away before shutting down.
     *
     * <p>Spring's shutdown takes a moment, and an icon that stays put after the
     * user chose Quit reads as a refusal. Removing it first makes the click
     * land immediately, whatever the JVM is still doing.
     */
    private void quit() {
        if (icon != null) {
            SystemTray.getSystemTray().remove(icon);
        }

        // Off the AWT thread: closing the context tears down the tray's own
        // toolkit, and doing that from inside an AWT event handler deadlocks.
        Thread shutdown = new Thread(() -> {
            int code = SpringApplication.exit((ConfigurableApplicationContext) context, () -> 0);
            System.exit(code);
        }, "relic-finder-shutdown");
        shutdown.setDaemon(false);
        shutdown.start();
    }

    private String url() {
        return "http://127.0.0.1:" + port;
    }

    private static MenuItem item(String label, Runnable action) {
        MenuItem entry = new MenuItem(label);
        entry.addActionListener(event -> action.run());
        return entry;
    }

    private static void open(Path path) {
        File target = path.toFile();
        try {
            if (Desktop.isDesktopSupported() && target.exists()) {
                Desktop.getDesktop().open(target);
            }
        } catch (IOException | UnsupportedOperationException e) {
            System.err.println("relics: could not open " + path + " — " + e.getMessage());
        }
    }

    /**
     * The sigil at 32px, which Windows scales down to 16 at the usual density
     * and uses as it is on a high one. Shipping the larger of the two and
     * letting the tray shrink it beats shipping the smaller and letting it
     * blur.
     */
    private static Image image() {
        try (InputStream stream = DesktopTray.class.getResourceAsStream("/desktop/tray-32.png")) {
            if (stream != null) {
                return Toolkit.getDefaultToolkit().createImage(stream.readAllBytes());
            }
        } catch (IOException e) {
            System.err.println("relics: could not read the tray icon — " + e.getMessage());
        }
        return Toolkit.getDefaultToolkit().createImage(new byte[0]);
    }
}
