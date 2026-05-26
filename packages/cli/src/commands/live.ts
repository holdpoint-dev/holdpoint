import chalk from "chalk";
import { ensureDaemon } from "../lib/ensure-daemon.js";
import { openBrowser } from "../lib/open-browser.js";
import { appendProjectAuthParams, tryResolveCurrentProject } from "../lib/project.js";

interface LiveCommandOptions {
  project?: string;
}

export async function liveCommand(options: LiveCommandOptions = {}): Promise<void> {
  const { info, started } = await ensureDaemon();
  const baseUrl = new URL(`/__holdpoint/live-auth`, `http://127.0.0.1:${info.port}`);
  baseUrl.searchParams.set("token", info.token);
  baseUrl.searchParams.set("path", "/live/");

  const currentProject = options.project ? null : tryResolveCurrentProject();
  if (options.project) {
    baseUrl.searchParams.set("project", options.project);
  } else if (currentProject) {
    appendProjectAuthParams(baseUrl, currentProject);
  }

  openBrowser(baseUrl.toString());

  console.log(
    chalk.green(
      started ? "✓ Started Holdpoint Live and opened the browser" : "✓ Opened Holdpoint Live",
    ),
  );
  console.log(`  url: ${chalk.cyan(baseUrl.toString())}`);
}
