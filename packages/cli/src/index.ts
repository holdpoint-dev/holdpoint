import { Command } from "commander";
import { initCommand } from "./commands/init.js";
import { checkCommand } from "./commands/check.js";
import { validateCommand } from "./commands/validate.js";
import { updateCommand } from "./commands/update.js";
import { buildCommand } from "./commands/build.js";
import { evolveCommand } from "./commands/evolve.js";
import { liveCommand } from "./commands/live.js";
import {
  daemonServeCommand,
  daemonStartCommand,
  daemonStatusCommand,
  daemonStopCommand,
} from "./commands/daemon.js";
import { enginesCommand } from "./commands/engines.js";
import { eventCommand } from "./commands/event.js";
import { requireChangesetCommand } from "./commands/changeset.js";
import { CLI_VERSION } from "./version.js";

const program = new Command();

program
  .name("holdpoint")
  .description("Universal eval-guard for AI coding agents (alpha)")
  .version(CLI_VERSION);

// Bare `holdpoint` (no subcommand) prints help. Earlier alphas auto-launched
// Holdpoint Live here, which surprised users and broke scripts that
// accidentally invoked the binary. Use `holdpoint live` for the browser UI.
program.action(() => {
  program.outputHelp();
});

program
  .command("init")
  .description("Initialise Holdpoint in the current project")
  .option("--stack <stack>", "Stack type: typescript | python | nextjs | fullstack")
  .option(
    "--agent <agent>",
    "Agent to install for: copilot | claude | cursor | codex (default: all four)",
  )
  .action(initCommand);

program
  .command("check")
  .description("Run task checks from checks.yaml")
  .option("--staged", "Only check against git-staged files")
  .action(checkCommand);

program
  .command("validate")
  .description("Validate checks.yaml schema and print any errors")
  .action(validateCommand);

program
  .command("update")
  .description("Regenerate engine files from current checks.yaml (preserves checks.yaml)")
  .action(updateCommand);

program
  .command("builder")
  .description("Open the visual builder UI in the Holdpoint daemon")
  .action(buildCommand);

program
  .command("live")
  .description("Open the Holdpoint Live UI")
  .option("--project <project>", "Open the UI focused on a specific project hash")
  .action(liveCommand);

const daemon = program.command("daemon").description("Manage the Holdpoint Live daemon");

daemon
  .command("start")
  .description("Start or connect to the singleton Holdpoint Live daemon")
  .action(daemonStartCommand);

daemon
  .command("status")
  .description("Show Holdpoint Live daemon status")
  .action(daemonStatusCommand);

daemon
  .command("stop")
  .description("Stop the running Holdpoint Live daemon")
  .action(daemonStopCommand);

program
  .command("event")
  .description("Internal: read event JSON from stdin and publish it to Holdpoint Live")
  .option("--engine <engine>", "Engine name when converting native hook payloads")
  .option("--from-hook", "Interpret stdin as an engine-native hook payload")
  .action(eventCommand);

program
  .command("engines")
  .description("List discovered Holdpoint Live engine packages")
  .option("--json", "Print machine-readable discovery output")
  .action(enginesCommand);

program
  .command("require-changeset")
  .description("Ensure release-affecting package changes include a changeset")
  .option("--staged", "Prefer git-staged files when deciding what changed")
  .option(
    "--include <pattern...>",
    "Package directory glob(s) to enforce, e.g. packages/* apps/builder",
  )
  .action(requireChangesetCommand);

program
  .command("daemon-serve")
  .description("Internal: run the Holdpoint Live daemon in the foreground")
  .option("--port <port>", "Fixed port for the daemon process")
  .action(daemonServeCommand);

program
  .command("suggest")
  .description("Scan project and propose (or apply) new checks to keep checks.yaml in sync")
  .option("--apply", "Write proposed changes to checks.yaml and regenerate engine files")
  .action(evolveCommand);

// `evolve` is the pre-alpha.17 name for `suggest`. Kept as a hidden alias
// for one or two alpha bumps so existing scripts don't break overnight;
// prints a deprecation notice to stderr and then delegates. Drop before 1.0.
program
  .command("evolve", { hidden: true })
  .description("Deprecated alias for `holdpoint suggest`")
  .option("--apply", "Write proposed changes to checks.yaml and regenerate engine files")
  .action(async (options: { apply?: boolean }) => {
    process.stderr.write(
      "warning: `holdpoint evolve` is deprecated; use `holdpoint suggest` instead.\n",
    );
    await evolveCommand(options);
  });

program.parse();
