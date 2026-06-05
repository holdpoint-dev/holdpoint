import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { __scanInternalsForTests, runScan } from "../lib/scan.js";

let cleanupDirs: string[] = [];

function createFixture(): string {
  const root = mkdtempSync(join(tmpdir(), "holdpoint-scan-"));
  cleanupDirs.push(root);
  return root;
}

function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(value, null, 2), "utf8");
}

afterEach(() => {
  for (const dir of cleanupDirs) rmSync(dir, { recursive: true, force: true });
  cleanupDirs = [];
});

describe("runScan", () => {
  it("verifies MCP servers by package command", async () => {
    const root = createFixture();
    writeJson(join(root, ".mcp.json"), {
      mcpServers: {
        github: { command: "@modelcontextprotocol/server-github" },
      },
    });

    await expect(runScan(root)).resolves.toMatchObject({
      mcp: [{ server: "github", verified: true }],
      deps: [],
    });
  });

  it("verifies MCP servers by scoped package path under node_modules", async () => {
    const root = createFixture();
    writeJson(join(root, ".claude/mcp.json"), {
      mcpServers: {
        github: {
          command: "node",
          args: ["./node_modules/@modelcontextprotocol/server-github/dist/index.js"],
        },
      },
    });

    const result = await runScan(root);
    expect(result.mcp).toEqual([{ server: "github", verified: true }]);
  });

  it("marks unknown local MCP servers as unverified", async () => {
    const root = createFixture();
    writeJson(join(root, ".mcp.json"), {
      mcpServers: {
        local: { command: "./scripts/local-mcp.js" },
      },
    });

    const result = await runScan(root);
    expect(result.mcp).toEqual([{ server: "local", verified: false }]);
  });

  it("skips dependency audit silently without a lockfile", async () => {
    const root = createFixture();

    const result = await runScan(root);
    expect(result).toEqual({ mcp: [], deps: [] });
  });
});

describe("audit parsing", () => {
  it("parses high and critical npm-style vulnerabilities and caps at five", () => {
    const raw = JSON.stringify({
      vulnerabilities: {
        a: { severity: "critical", via: [{ title: "A issue" }] },
        b: { severity: "high", via: [{ title: "B issue" }] },
        c: { severity: "moderate", via: [{ title: "C issue" }] },
        d: { severity: "high", title: "D issue" },
        e: { severity: "high", title: "E issue" },
        f: { severity: "high", title: "F issue" },
        g: { severity: "high", title: "G issue" },
      },
    });

    expect(__scanInternalsForTests.parseAuditJson(raw)).toEqual([
      { name: "a", severity: "critical", title: "A issue" },
      { name: "b", severity: "high", title: "B issue" },
      { name: "d", severity: "high", title: "D issue" },
      { name: "e", severity: "high", title: "E issue" },
      { name: "f", severity: "high", title: "F issue" },
    ]);
  });

  it("parses yarn audit JSON lines", () => {
    const raw = [
      JSON.stringify({
        type: "auditAdvisory",
        data: {
          advisory: { module_name: "lodash", severity: "high", title: "Prototype Pollution" },
        },
      }),
      JSON.stringify({ type: "info", data: "done" }),
    ].join("\n");

    expect(__scanInternalsForTests.parseAuditJson(raw)).toEqual([
      { name: "lodash", severity: "high", title: "Prototype Pollution" },
    ]);
  });
});
