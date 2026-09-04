package relics.reliceApi.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import relics.reliceApi.model.UpdateInstall;
import relics.reliceApi.model.UpdateInstall.Problem;
import relics.reliceApi.model.UpdateStatus;

import java.io.IOException;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.Supplier;
import java.util.regex.Pattern;

/**
 * The container update: fetch the new images, rebuild the containers on them.
 *
 * <p><b>Why a second container does the work.</b> Nothing can replace the
 * container it is running in — the moment the old one stops, whatever was doing
 * the stopping stops with it. So this starts a small helper from the official
 * {@code docker:cli} image, hands it the compose files and the socket, and lets
 * it run the two commands a person would have run themselves. The helper
 * outlives this process by design: the container it recreates first is this one.
 *
 * <p><b>Why compose rather than the API.</b> Recreating a container through the
 * daemon means reading its whole configuration — mounts, networks, ports,
 * restart policy, environment — and writing it back onto a new image without
 * losing any of it. Compose already knows all of that, from the files the
 * operator started with, and getting it wrong means an install that comes back
 * without its bind mount and quietly stops saving anybody's wishlist.
 *
 * <p><b>Off unless somebody turned it on.</b> The socket is the run of the whole
 * machine, so the compose file that ships mounts nothing and this answers
 * {@link Problem#SELF_UPDATE_OFF} — which is not an error but the ending for an
 * install that declined, and the screen turns it into the two commands to run
 * by hand. See docker-compose.self-update.yaml.
 */
@Service
public class DockerUpdateInstaller implements UpdateInstaller {

    /** The image the helper runs. Official, tiny, and it carries the compose plugin. */
    static final String HELPER_IMAGE_NAME = "docker";
    static final String HELPER_IMAGE_TAG = "cli";
    static final String HELPER_IMAGE = HELPER_IMAGE_NAME + ":" + HELPER_IMAGE_TAG;

    /**
     * The helper's name, fixed so a failed one can be found and read.
     *
     * <p>{@code docker logs relic-finder-updater} is what the screen tells a
     * user to run when an update fails, and a generated name would make that
     * sentence impossible to write.
     */
    static final String HELPER_CONTAINER = "relic-finder-updater";

    /** Where the project directory is mounted inside the helper. */
    private static final String PROJECT_MOUNT = "/project";

    /** How the compose files arrive in one environment variable. */
    private static final String FILE_SEPARATOR = ":";

    /**
     * What a compose file may be called.
     *
     * <p>These names are pasted into a shell command, and they come from an
     * environment variable rather than from this code. The operator who sets it
     * already has the socket and so is not the threat — but a name with a
     * backtick in it turning into a second command is the kind of thing nobody
     * notices until it matters, and a compose file has never needed a character
     * outside this set.
     */
    private static final Pattern COMPOSE_FILE = Pattern.compile("[A-Za-z0-9._-]{1,120}");

    /** Long enough for a slow registry, short enough to fail rather than hang. */
    private static final Duration SOCKET_TIMEOUT = Duration.ofMinutes(10);

    /** How often the helper is asked whether it has finished. */
    private static final Duration POLL = Duration.ofSeconds(2);

    private final AtomicReference<UpdateInstall> state =
            new AtomicReference<>(UpdateInstall.idle());

    /** One thread, so two clicks cannot start two helpers. */
    private final ExecutorService worker = Executors.newSingleThreadExecutor(runnable -> {
        Thread thread = new Thread(runnable, "docker-update-installer");
        thread.setDaemon(true);
        return thread;
    });

    private final ObjectMapper mapper = new ObjectMapper();

    private final Supplier<UpdateStatus> status;
    private final DockerSocket docker;
    private final boolean switchedOn;
    private final String projectDirectory;
    private final List<String> composeFiles;

    @Autowired
    public DockerUpdateInstaller(
            UpdateCheckService updates,
            @Value("${relics.docker.update:false}") boolean switchedOn,
            @Value("${relics.docker.project-dir:}") String projectDirectory,
            @Value("${relics.docker.compose-files:}") String composeFiles) {
        this(updates::status,
                new DockerSocket(DockerSocket.DEFAULT_PATH, SOCKET_TIMEOUT),
                switchedOn, projectDirectory, composeFiles);
    }

    DockerUpdateInstaller(
            Supplier<UpdateStatus> status,
            DockerSocket docker,
            boolean switchedOn,
            String projectDirectory,
            String composeFiles) {
        this.status = status;
        this.docker = docker;
        this.switchedOn = switchedOn;
        this.projectDirectory = projectDirectory.trim();
        this.composeFiles = parseComposeFiles(composeFiles);
    }

    @Override
    public InstallPlatform platform() {
        return InstallPlatform.DOCKER;
    }

    /**
     * How far an update has got, or the standing reason there will not be one.
     *
     * <p>A refusal that is true before anybody clicks is reported before
     * anybody clicks. The screen needs it that way: an install that declined the
     * socket has to show the two commands in place of a button, rather than a
     * button that fails when pressed.
     */
    @Override
    public UpdateInstall state() {
        UpdateInstall current = state.get();
        if (current.stage() != UpdateInstall.Stage.IDLE) return current;

        return switchedOn() ? current : UpdateInstall.failed(Problem.SELF_UPDATE_OFF);
    }

    @Override
    public synchronized UpdateInstall start() {
        UpdateInstall current = state.get();
        if (current.stage().running()) return current;

        UpdateStatus latest = status.get();
        Problem refusal = refuse(latest);
        if (refusal != null) return publish(UpdateInstall.failed(refusal));

        UpdateInstall started = publish(UpdateInstall.pulling());
        worker.execute(this::update);
        return started;
    }

    /**
     * Whether this install can replace itself, decided before anything is
     * started.
     *
     * <p>The platform comes first and the switch second, because the two say
     * different things to a reader: one is "not this way, ever", the other is
     * "not until you decide to".
     */
    private Problem refuse(UpdateStatus latest) {
        if (!InstallPlatform.DOCKER.wireName().equals(latest.platform())) return Problem.NOT_DOCKER;
        if (!switchedOn()) return Problem.SELF_UPDATE_OFF;
        if (!latest.updateAvailable()) return Problem.NO_UPDATE;
        return null;
    }

    /**
     * Whether everything the update needs is actually here.
     *
     * <p>All four together, because a missing one leaves an install that cannot
     * update itself however true the flag is, and the answer a user needs is the
     * same in every case: the two commands. Which one is missing goes to the log,
     * so an operator who edited the override by hand is not left guessing.
     */
    private boolean switchedOn() {
        if (!switchedOn) return false;

        if (!docker.present()) {
            log("the switch is on but there is no Docker socket in this container");
            return false;
        }
        if (projectDirectory.isEmpty()) {
            log("the switch is on but relics.docker.project-dir is empty");
            return false;
        }
        if (composeFiles.isEmpty()) {
            log("the switch is on but relics.docker.compose-files names no usable file");
            return false;
        }
        return true;
    }

    /** The worker's whole job: make sure the helper image is here, then let it run. */
    private void update() {
        try {
            pullHelperImage();

            // Any helper left by a previous update, including the one that
            // succeeded — the command it ran killed the process that would have
            // cleaned it up. Removing it here rather than at the end is what
            // makes `docker logs relic-finder-updater` still readable after a
            // failure, which is what the screen tells people to look at.
            removeHelper();

            String id = createHelper();
            publish(UpdateInstall.recreating());
            startHelper(id);

            watch(id);
        } catch (IOException e) {
            fail(Problem.RECREATE_FAILED, e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            fail(Problem.RECREATE_FAILED, e);
        }
    }

    /**
     * Fetches {@code docker:cli} if the daemon has not got it.
     *
     * <p>Unconditional: the endpoint is a no-op when the image is already there,
     * and asking first would be a second round trip to learn what the answer
     * tells us anyway.
     */
    private void pullHelperImage() throws IOException {
        DockerSocket.Response response = docker.post(
                "/images/create?fromImage=" + HELPER_IMAGE_NAME + "&tag=" + HELPER_IMAGE_TAG, null);

        if (!response.ok()) {
            throw new IOException("Could not fetch " + HELPER_IMAGE + ": " + response.body());
        }
    }

    private void removeHelper() throws IOException {
        DockerSocket.Response response =
                docker.delete("/containers/" + HELPER_CONTAINER + "?force=true");

        // 404 is the ordinary answer — most of the time there is no previous
        // helper — and it is the one failure that is not one.
        if (!response.ok() && response.status() != 404) {
            throw new IOException("Could not remove the previous updater: " + response.body());
        }
    }

    /** The helper, described to the daemon exactly as `docker run` would. */
    private String createHelper() throws IOException {
        DockerSocket.Response response = docker.post(
                "/containers/create?name=" + HELPER_CONTAINER, helperDefinition());

        if (!response.ok()) {
            throw new IOException("Could not create the updater: " + response.body());
        }

        JsonNode created = mapper.readTree(response.body());
        String id = created.path("Id").asText("");
        if (id.isEmpty()) {
            throw new IOException("The daemon created an updater with no id: " + response.body());
        }
        return id;
    }

    /**
     * Built with Jackson rather than by pasting strings together.
     *
     * <p>The project directory is a path from the operator's machine and lands
     * in a JSON string; a quote or a backslash in it would otherwise produce a
     * body the daemon rejects, or worse, one it accepts with a different meaning.
     */
    private String helperDefinition() throws IOException {
        ObjectNode definition = mapper.createObjectNode();
        definition.put("Image", HELPER_IMAGE);
        definition.put("WorkingDir", PROJECT_MOUNT);

        ArrayNode command = definition.putArray("Cmd");
        command.add("sh");
        command.add("-c");
        command.add(composeCommand());

        ObjectNode hostConfig = definition.putObject("HostConfig");
        ArrayNode binds = hostConfig.putArray("Binds");
        binds.add(DockerSocket.DEFAULT_PATH + ":" + DockerSocket.DEFAULT_PATH);
        binds.add(projectDirectory + ":" + PROJECT_MOUNT);

        // Kept after it exits so a failed run can be read. The next update
        // removes it, which is the only moment anything is left to do it.
        hostConfig.put("AutoRemove", false);

        return mapper.writeValueAsString(definition);
    }

    /**
     * The two commands a person would have run, in the order they would run them.
     *
     * <p>Both carry the same {@code -f} list the operator started with. Leaving a
     * file out would recreate the containers from a different description of
     * them — most visibly the one that mounts the socket, which would switch this
     * button off as a side effect of using it.
     */
    String composeCommand() {
        StringBuilder files = new StringBuilder();
        for (String file : composeFiles) {
            files.append(" -f ").append(file);
        }

        String compose = "docker compose" + files;
        return compose + " pull && " + compose + " up -d";
    }

    private void startHelper(String id) throws IOException {
        DockerSocket.Response response = docker.post("/containers/" + id + "/start", null);
        if (!response.ok()) {
            throw new IOException("Could not start the updater: " + response.body());
        }
    }

    /**
     * Watches the helper until it stops, which on a successful update it never
     * appears to do.
     *
     * <p>The helper recreates this container, so this process is killed partway
     * through the loop and the last thing anybody saw was {@code recreating}.
     * The loop is therefore only really here for the failing case — a pull that
     * could not reach the registry, a compose file that no longer parses — where
     * this process is still alive to say so.
     */
    private void watch(String id) throws IOException, InterruptedException {
        while (true) {
            Thread.sleep(POLL);

            DockerSocket.Response response = docker.get("/containers/" + id + "/json");
            if (!response.ok()) {
                throw new IOException("The updater could not be found: " + response.body());
            }

            JsonNode inspected = mapper.readTree(response.body()).path("State");
            if (inspected.path("Running").asBoolean(false)) continue;

            int exit = inspected.path("ExitCode").asInt(-1);
            if (exit == 0) {
                // Reached when compose had nothing to change: the images were
                // already the newest and this container was left alone.
                publish(UpdateInstall.idle());
            } else {
                fail(Problem.RECREATE_FAILED,
                        new IOException("the updater exited " + exit
                                + " — docker logs " + HELPER_CONTAINER));
            }
            return;
        }
    }

    /**
     * Splits the environment variable, dropping anything that is not a plain
     * file name.
     *
     * <p>Dropped rather than refused at construction: a bad value must not stop
     * the application from starting, and an install left with no usable file
     * reports itself off, which points the reader at the commands to run by hand.
     */
    private static List<String> parseComposeFiles(String configured) {
        List<String> files = new ArrayList<>();

        for (String candidate : configured.split(FILE_SEPARATOR)) {
            String file = candidate.trim();
            if (file.isEmpty()) continue;

            if (COMPOSE_FILE.matcher(file).matches()) {
                files.add(file);
            } else {
                log("ignoring a compose file name that is not one: " + file);
            }
        }
        return List.copyOf(files);
    }

    private void fail(Problem problem, Exception cause) {
        log(problem.wireName() + (cause == null ? "" : " — " + cause.getMessage()));
        publish(UpdateInstall.failed(problem));
    }

    private UpdateInstall publish(UpdateInstall next) {
        state.set(next);
        return next;
    }

    private static void log(String message) {
        System.out.println("DockerUpdateInstaller: " + message);
    }
}
