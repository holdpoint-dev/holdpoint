import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import chalk from "chalk";
import { identifyProject } from "@holdpoint/live-daemon";
import { ensureDaemon } from "../lib/ensure-daemon.js";
import { openBrowser } from "../lib/open-browser.js";

interface LiveCommandOptions {
  project?: string;
}

function findChecksYaml(startDir: string): string | null {
  let current = startDir;
  for (;;) {
    const candidate = join(current, "checks.yaml");
    if (existsSync(candidate)) {
      return candidate;
    }
    const parent = dirname(current);
    if (parent === current) {
      return null;
    }
    current = parent;
  }
}

function tryResolveCurrentProject(): { hash: string; name: string; root: string } | null {
  const checksYaml = findChecksYaml(process.cwd());
  if (checksYaml) {
    return identifyProject(dirname(checksYaml));
  }

  try {
    return identifyProject(process.cwd());
  } catch {
    return null;
  }
}

export async function liveCommand(options: LiveCommandOptions = {}): Promise<void> {
  const { info, started } = await ensureDaemon();
  const baseUrl = new URL(`/__holdpoint/live-auth`, `http://127.0.0.1:${info.port}`);
  baseUrl.searchParams.set("token", info.token);

  const currentProject = options.project ? null : tryResolveCurrentProject();
  if (options.project) {
    baseUrl.searchParams.set("project", options.project);
  } else if (currentProject) {
    baseUrl.searchParams.set("project", currentProject.hash);
    baseUrl.searchParams.set("name", currentProject.name);
    baseUrl.searchParams.set("root", currentProject.root);
  }

  openBrowser(baseUrl.toString());

  console.log(
    chalk.green(
      started ? "✓ Started Holdpoint Live and opened the browser" : "✓ Opened Holdpoint Live",
    ),
  );
  console.log(`  url: ${chalk.cyan(baseUrl.toString())}`);
}
