import chalk from "chalk";
import { ensureDaemon } from "../lib/ensure-daemon.js";
import { openBrowser } from "../lib/open-browser.js";
import { appendProjectAuthParams, tryResolveCurrentProject } from "../lib/project.js";

/**
 * Open the Holdpoint visual builder through the singleton daemon.
 *
 * The daemon serves both `/live/` and `/builder/`, so users get one browser
 * surface, one auth flow, and one localhost port for watching and editing checks.
 */
export async function buildCommand(): Promise<void> {
  const { info, started } = await ensureDaemon();
  const url = new URL("/__holdpoint/live-auth", `http://127.0.0.1:${info.port}`);
  url.searchParams.set("token", info.token);
  url.searchParams.set("path", "/builder/");
  appendProjectAuthParams(url, tryResolveCurrentProject());

  openBrowser(url.toString());

  console.log(
    chalk.green(
      started ? "✓ Started Holdpoint Live and opened the builder" : "✓ Opened Holdpoint builder",
    ),
  );
  console.log(`  url: ${chalk.cyan(url.toString())}`);
}
