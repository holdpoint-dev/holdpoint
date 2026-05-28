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
  // Three layers of fallback, in order of preference:
  //   1. git rev-parse --show-toplevel + realpath  — canonical: matches
  //      whatever git considers the repo root, normalised through symlinks.
  //   2. realpath(cwd)                              — cwd exists but isn't
  //      a git repo (or git binary missing); use the resolved cwd as root.
  //   3. raw cwd string                             — cwd doesn't exist
  //      on disk anymore (deleted/renamed project; common when replaying
  //      old pending events from `~/.holdpoint/spool/pending`). The daemon
  //      still needs a stable identity so the event can be stored and
  //      surfaced; the hash/name are based on the literal path.
  //
  // This function MUST NOT throw. The daemon's startup replay loop ingests
  // historical events from disk and crashing here used to brick startup
  // entirely whenever a project path had been renamed since the events
  // were spooled — see https://github.com/holdpoint-dev/holdpoint/issues
  // (daemon-unavailable on stale pending events).
  let root: string;
  try {
    root = realpathSync(
      execFileSync("git", ["rev-parse", "--show-toplevel"], {
        cwd,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim(),
    );
  } catch {
    try {
      root = realpathSync(cwd);
    } catch {
      // cwd doesn't exist on disk — use the raw path string as identity.
      root = cwd;
    }
  }
  return {
    hash: sha12(root),
    name: basename(root) || root,
    root,
  };
}
