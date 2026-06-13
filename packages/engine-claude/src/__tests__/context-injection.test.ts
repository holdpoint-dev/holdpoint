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

function createFixture(content: string, config?: Record<string, unknown>): string {
  const root = mkdtempSync(join(tmpdir(), "holdpoint-claude-context-"));
  cleanupDirs.push(root);
  mkdirSync(join(root, ".github/holdpoint/generated"), { recursive: true });
  writeFileSync(
    join(root, ".github/holdpoint/generated/checks.immutable.json"),
    JSON.stringify(config ?? { session_context_files: ["MASTER_PROMPT.md"] }),
    "utf8",
  );
  writeFileSync(join(root, "MASTER_PROMPT.md"), content, "utf8");
  return root;
}

function runContextScript(
  root: string,
  source = "startup",
): { hookSpecificOutput: { additionalContext: string } } {
  const scriptPath = join(root, "context.mjs");
  writeFileSync(scriptPath, buildContextScript(), "utf8");
  return JSON.parse(
    execFileSync("node", [scriptPath], {
      cwd: root,
      input: JSON.stringify({ hook_event_name: "SessionStart", source }),
      encoding: "utf8",
    }),
  );
}

afterEach(() => {
  for (const dir of cleanupDirs) rmSync(dir, { recursive: true, force: true });
  cleanupDirs = [];
});

describe("SessionStart context injection", () => {
  it("preserves the critical rule when long context is truncated", () => {
    const output = runContextScript(createFixture(LONG_PROMPT));
    const context = output.hookSpecificOutput.additionalContext;

    expect(context).toContain(CRITICAL_RULE);
    expect(context).toContain("truncated");
  });

  it("emits full short context without a truncation marker", () => {
    const output = runContextScript(createFixture(SHORT_PROMPT));
    const context = output.hookSpecificOutput.additionalContext;

    expect(context).toContain(SHORT_PROMPT);
    expect(context).not.toContain("truncated");
    expect(context).not.toContain("Holdpoint Security Scan");
  });

  it("injects a security warning for unverified MCP servers", () => {
    const root = createFixture(SHORT_PROMPT);
    writeFileSync(
      join(root, ".mcp.json"),
      JSON.stringify({ mcpServers: { custom: { command: "./tools/custom-mcp.js" } } }),
      "utf8",
    );

    const output = runContextScript(root);
    const context = output.hookSpecificOutput.additionalContext;

    expect(context).toContain("Holdpoint Security Scan");
    expect(context).toContain("custom");
  });

  it("appends the security scan AFTER user session_context_files", () => {
    const root = createFixture(SHORT_PROMPT);
    writeFileSync(
      join(root, ".mcp.json"),
      JSON.stringify({ mcpServers: { custom: { command: "./tools/custom-mcp.js" } } }),
      "utf8",
    );

    const output = runContextScript(root);
    const context = output.hookSpecificOutput.additionalContext;

    // User-configured context must precede the auto-scan so overflow truncates the scan, not user files.
    expect(context.indexOf(CRITICAL_RULE)).toBeLessThan(context.indexOf("Holdpoint Security Scan"));
  });

  it("skips the security scan on resume re-fires but still injects user files", () => {
    const root = createFixture(SHORT_PROMPT);
    writeFileSync(
      join(root, ".mcp.json"),
      JSON.stringify({ mcpServers: { custom: { command: "./tools/custom-mcp.js" } } }),
      "utf8",
    );

    const output = runContextScript(root, "resume");
    const context = output.hookSpecificOutput.additionalContext;

    expect(context).toContain(SHORT_PROMPT);
    expect(context).not.toContain("Holdpoint Security Scan");
  });

  it("skips the security scan when security_scan is false", () => {
    const root = createFixture(SHORT_PROMPT, {
      session_context_files: ["MASTER_PROMPT.md"],
      security_scan: false,
    });
    writeFileSync(
      join(root, ".mcp.json"),
      JSON.stringify({ mcpServers: { custom: { command: "./tools/custom-mcp.js" } } }),
      "utf8",
    );

    const output = runContextScript(root);
    const context = output.hookSpecificOutput.additionalContext;

    expect(context).toContain(SHORT_PROMPT);
    expect(context).not.toContain("Holdpoint Security Scan");
  });

  it("uses the shared security scan builder (formatSecurityScan present in script)", () => {
    expect(buildContextScript()).toContain("formatSecurityScan");
  });
});
