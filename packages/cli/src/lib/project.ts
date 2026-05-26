import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { identifyProject } from "@holdpoint/live-daemon";

export interface CurrentProject {
  hash: string;
  name: string;
  root: string;
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

export function tryResolveCurrentProject(): CurrentProject | null {
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

export function appendProjectAuthParams(url: URL, project: CurrentProject | null): void {
  if (!project) {
    return;
  }
  url.searchParams.set("project", project.hash);
  url.searchParams.set("name", project.name);
  url.searchParams.set("root", project.root);
}
