package relics.reliceApi;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;
import relics.reliceApi.desktop.DesktopRuntime;

@SpringBootApplication
@EnableScheduling
public class ReliceApiApplication {

	public static void main(String[] args) {
		// Decides where the state lives, which port is free and whether another
		// copy is already running — all of which have to be settled before the
		// context reads a property. Does nothing unless the Windows launcher
		// started us; see DesktopRuntime.
		DesktopRuntime.configure();

		SpringApplication application = new SpringApplication(ReliceApiApplication.class);
		// Spring Boot forces headless on, which would leave the desktop build
		// with no tray icon and no way to open a browser.
		application.setHeadless(!DesktopRuntime.enabled());
		application.run(args);
	}

}
