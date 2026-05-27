import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
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
