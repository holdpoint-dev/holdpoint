import { execFileSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildContextScript } from "../engine.js";

const CRITICAL_RULE = "Run `holdpoint check` before marking any task complete.";
const LONG_PROMPT = `${CRITICAL_RULE}\n${"Filler. ".repeat(15_000)}`;
const SHORT_PROMPT = `${CRITICAL_RULE}\nShort context.`;

let cleanupDirs: string[] = [];

function createFixture(content: string): string {
  const root = mkdtempSync(join(tmpdir(), "holdpoint-cursor-context-"));
  cleanupDirs.push(root);
  mkdirSync(join(root, ".github/holdpoint/generated"), { recursive: true });
  writeFileSync(
    join(root, ".github/holdpoint/generated/checks.immutable.json"),
    JSON.stringify({ session_context_files: ["MASTER_PROMPT.md"] }),
    "utf8",
  );
  writeFileSync(join(root, "MASTER_PROMPT.md"), content, "utf8");
  return root;
}

function runContextScript(root: string): { additional_context: string } {
  const scriptPath = join(root, "context.mjs");
  writeFileSync(scriptPath, buildContextScript(), "utf8");
  return JSON.parse(
    execFileSync("node", [scriptPath], {
      cwd: root,
      input: JSON.stringify({ hook_event_name: "sessionStart", cwd: root }),
      encoding: "utf8",
    }),
  );
}

afterEach(() => {
  for (const dir of cleanupDirs) rmSync(dir, { recursive: true, force: true });
  cleanupDirs = [];
});

describe("sessionStart context injection", () => {
  it("preserves the critical rule when long context is truncated", () => {
    const output = runContextScript(createFixture(LONG_PROMPT));
    const context = output.additional_context;

    expect(context).toContain(CRITICAL_RULE);
    expect(context).toContain("truncated");
  });

  it("emits full short context without a truncation marker", () => {
    const output = runContextScript(createFixture(SHORT_PROMPT));
    const context = output.additional_context;

    expect(context).toContain(SHORT_PROMPT);
    expect(context).not.toContain("truncated");
  });
});

// ─── Per-hook behavior (configurable hooks) ───────────────────────────────────

function createHookFixture(config: unknown, opts: { beforeToolFails?: boolean } = {}): string {
  const root = mkdtempSync(join(tmpdir(), "holdpoint-cursor-hook-"));
  cleanupDirs.push(root);
  mkdirSync(join(root, ".github/holdpoint/generated"), { recursive: true });
  mkdirSync(join(root, "node_modules/.bin"), { recursive: true });
  const bin = join(root, "node_modules/.bin/holdpoint");
  writeFileSync(
    bin,
    opts.beforeToolFails
      ? '#!/usr/bin/env sh\ncase "$*" in *before_tool*) echo "guard failed" 1>&2; exit 2;; esac\nexit 0\n'
      : "#!/usr/bin/env sh\nexit 0\n",
    "utf8",
  );
  chmodSync(bin, 0o755);
  writeFileSync(
    join(root, ".github/holdpoint/generated/checks.immutable.json"),
    JSON.stringify(config),
    "utf8",
  );
  return root;
}

function runScript(root: string, event: Record<string, unknown>): string {
  const scriptPath = join(root, "hook.mjs");
  writeFileSync(scriptPath, buildContextScript(), "utf8");
  return execFileSync("node", [scriptPath], {
    cwd: root,
    input: JSON.stringify({ ...event, cwd: root }),
    encoding: "utf8",
  });
}

describe("configurable hooks (Cursor)", () => {
  it("injects a session_start inject check's text at sessionStart", () => {
    const root = createHookFixture({
      checks: [
        { id: "seed", label: "Seed", on: "session_start", inject: { text: "PROJECT_RULE_X" } },
      ],
    });
    const out = JSON.parse(runScript(root, { hook_event_name: "sessionStart" }));
    expect(out.additional_context).toContain("PROJECT_RULE_X");
  });

  it("denies a tool when a before_tool cmd check fails", () => {
    const root = createHookFixture(
      { checks: [{ id: "guard", label: "Guard", on: "before_tool", cmd: "guard" }] },
      { beforeToolFails: true },
    );
    const out = JSON.parse(runScript(root, { hook_event_name: "preToolUse" }));
    expect(out.permission).toBe("deny");
  });

  it("allows a tool when no before_tool checks exist", () => {
    const root = createHookFixture({ checks: [{ id: "lint", label: "Lint", cmd: "pnpm lint" }] });
    const out = JSON.parse(runScript(root, { hook_event_name: "preToolUse" }));
    expect(out.permission).toBe("allow");
  });

  it("never carries context on beforeSubmitPrompt (Cursor limitation)", () => {
    const root = createHookFixture({ checks: [] });
    const out = JSON.parse(runScript(root, { hook_event_name: "beforeSubmitPrompt" }));
    expect(out).toEqual({ continue: true });
  });
});
