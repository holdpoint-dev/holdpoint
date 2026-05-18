import { Command } from "commander";
import { initCommand } from "./commands/init.js";
import { checkCommand } from "./commands/check.js";
import { validateCommand } from "./commands/validate.js";
import { updateCommand } from "./commands/update.js";
import { buildCommand } from "./commands/build.js";
import { evolveCommand } from "./commands/evolve.js";

const program = new Command();

program
  .name("holdpoint")
  .description("Universal eval-guard for AI coding agents (alpha)")
  .version("0.1.0-alpha.2");

program
  .command("init")
  .description("Initialise Holdpoint in the current project")
  .option("--stack <stack>", "Stack type: typescript | python | nextjs | fullstack")
  .option("--agent <agent>", "Agent type: copilot | claude | cursor")
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
  .description("Open the visual builder UI on localhost:4321")
  .action(buildCommand);

program
  .command("evolve")
  .description("Scan project and propose (or apply) new checks to keep checks.yaml in sync")
  .option("--apply", "Write proposed changes to checks.yaml and regenerate engine files")
  .action(evolveCommand);

program.parse();
