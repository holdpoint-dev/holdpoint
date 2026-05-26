import chalk from "chalk";
import { discoverLiveEngines } from "../engines.js";

export async function enginesCommand(options: { json?: boolean } = {}): Promise<void> {
  const engines = await discoverLiveEngines();

  if (options.json) {
    console.log(JSON.stringify(engines, null, 2));
    return;
  }

  if (engines.length === 0) {
    console.log("No Holdpoint Live engines were discovered.");
    return;
  }

  for (const engine of engines) {
    if (engine.status === "loaded" && engine.manifest) {
      console.log(
        `${chalk.green("loaded")} ${chalk.cyan(engine.manifest.id)} (${engine.manifest.displayName}) ` +
          `from ${chalk.yellow(engine.packageName)} [${engine.source}]`,
      );
      continue;
    }

    console.log(
      `${chalk.yellow("ignored")} ${chalk.yellow(engine.packageName)} [${engine.source}] — ${engine.reason ?? "unknown reason"}`,
    );
  }
}
