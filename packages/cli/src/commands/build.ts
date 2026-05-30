import chalk from "chalk";
import { ensureDaemon } from "../lib/ensure-daemon.js";
import { openBrowser } from "../lib/open-browser.js";
import { appendProjectAuthParams, tryResolveCurrentProject } from "../lib/project.js";

/**
 * Open the Holdpoint check editor through the singleton daemon.
 *
 * The builder is now the "Checks" tab of the unified Live UI, so this opens
 * `/live/?tab=checks` — one browser surface, one auth flow, and one localhost
 * port for watching and editing checks.
 */
export async function buildCommand(): Promise<void> {
  const { info, started } = await ensureDaemon();
  const url = new URL("/__holdpoint/live-auth", `http://127.0.0.1:${info.port}`);
  url.searchParams.set("token", info.token);
  url.searchParams.set("path", "/live/");
  url.searchParams.set("tab", "checks");
  appendProjectAuthParams(url, tryResolveCurrentProject());

  openBrowser(url.toString());

  console.log(
    chalk.green(
      started ? "✓ Started Holdpoint Live and opened the builder" : "✓ Opened Holdpoint builder",
    ),
  );
  console.log(`  url: ${chalk.cyan(url.toString())}`);
}
