package relics.reliceApi;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class ReliceApiApplication {

	public static void main(String[] args) {
		SpringApplication.run(ReliceApiApplication.class, args);
	}

}
