import { CommandBlock } from "relic-finder-ui";

import { DOCKER_UPDATE, DOCKER_UPDATE_CAVEAT } from "../lib/updateInstall";

/**
 * How a container install is updated: four commands, in this order.
 *
 * `cd` because compose reads the files in the directory it is run from, and a
 * reader who pastes the rest somewhere else gets an error about a missing file.
 * `git pull` because the compose files themselves change between releases, and
 * the two docker lines would otherwise run last month's. `pull` fetches the new
 * images and `up -d` is what swaps the containers onto them: either one alone
 * looks like it worked and leaves the old version running.
 */
const BY_HAND = ["cd ~/relicsFinder", "git pull", "docker compose pull", "docker compose up -d"];

/**
 * The container ending of the update dialog, and it has only one ending now.
 *
 * There is no button and there is no state to poll, so this holds neither. It
 * used to offer both: a button on an install that had mounted the Docker socket
 * and the commands on one that had not. That switch is gone — it bought one
 * click twice a year in exchange for the run of the whole machine, and a
 * capability that dangerous is safer as code that does not exist than as code
 * nobody is expected to turn on.
 */
export function DockerUpdateAction() {
  return (
    <div className="rf-update-install">
      <p className="rf-text-body-sm">{DOCKER_UPDATE}</p>
      <CommandBlock commands={BY_HAND} label="the four update commands" />
      <p className="rf-text-body-sm">{DOCKER_UPDATE_CAVEAT}</p>
    </div>
  );
}
