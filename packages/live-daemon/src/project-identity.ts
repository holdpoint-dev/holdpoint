import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { realpathSync } from "node:fs";
import { basename } from "node:path";

export interface ProjectIdentity {
  hash: string;
  name: string;
  root: string;
}

function sha12(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
}

export function identifyProject(cwd: string): ProjectIdentity {
  try {
    const root = realpathSync(
      execFileSync("git", ["rev-parse", "--show-toplevel"], {
        cwd,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim(),
    );
    return {
      hash: sha12(root),
      name: basename(root),
      root,
    };
  } catch {
    const root = realpathSync(cwd);
    return {
      hash: sha12(root),
      name: basename(root),
      root,
    };
  }
}
