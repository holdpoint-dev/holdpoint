import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildSecurityScanScript } from "@holdpoint/types";

// The canonical session-start security scan lives in @holdpoint/types as a
// STRING (buildSecurityScanScript) that engines embed into a `node -e` hook.
// It expects `readFileSync`, `existsSync`, `join`, and `execSync` already in
// scope. We reconstruct the function here so the shared source is covered
// end-to-end. `execSync` is a no-op stub: every fixture below omits a lockfile,
// so securityScanPackageManager() returns null and the audit branch never runs.
const scanBody = buildSecurityScanScript();
const noopExecSync = (): string => "";
const { formatSecurityScan, securityScanMcp } = new Function(
  "readFileSync",
  "existsSync",
  "join",
  "execSync",
  scanBody + "\nreturn { formatSecurityScan, securityScanMcp };",
)(readFileSync, existsSync, join, noopExecSync) as {
  formatSecurityScan: (root: string) => string | null;
  securityScanMcp: (
    root: string,
  ) => Array<{ server: string; verified: boolean; checkable: boolean }>;
};

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

describe("securityScanMcp", () => {
  it("verifies MCP servers by package command", () => {
    const root = createFixture();
    writeJson(join(root, ".mcp.json"), {
      mcpServers: {
        github: { command: "@modelcontextprotocol/server-github" },
      },
    });

    expect(securityScanMcp(root)).toEqual([{ server: "github", verified: true, checkable: true }]);
  });

  it("verifies MCP servers by scoped package path under node_modules", () => {
    const root = createFixture();
    writeJson(join(root, ".claude/mcp.json"), {
      mcpServers: {
        github: {
          command: "node",
          args: ["./node_modules/@modelcontextprotocol/server-github/dist/index.js"],
        },
      },
    });

    expect(securityScanMcp(root)).toEqual([{ server: "github", verified: true, checkable: true }]);
  });

  it("marks an unknown npm-checkable MCP server as unverified", () => {
    const root = createFixture();
    writeJson(join(root, ".mcp.json"), {
      mcpServers: {
        // A bare npm-style command name resolves to a checkable package that is
        // simply not in the verified registry.
        custom: { command: "some-unknown-mcp-pkg" },
      },
    });

    expect(securityScanMcp(root)).toEqual([{ server: "custom", verified: false, checkable: true }]);
  });

  it("treats an unresolvable local path command as not checkable", () => {
    const root = createFixture();
    writeJson(join(root, ".mcp.json"), {
      mcpServers: {
        local: { command: "./scripts/local-mcp.js" },
      },
    });

    expect(securityScanMcp(root)).toEqual([{ server: "local", verified: false, checkable: false }]);
  });

  it("does not trust a forged `name` — verification uses command/args only", () => {
    const root = createFixture();
    writeJson(join(root, ".mcp.json"), {
      mcpServers: {
        x: {
          name: "@modelcontextprotocol/server-github",
          command: "node",
          args: ["evil.js"],
        },
      },
    });

    expect(securityScanMcp(root)).toEqual([
      // server label comes from the forged name, but it is NOT verified.
      { server: "@modelcontextprotocol/server-github", verified: false, checkable: true },
    ]);
  });

  it("strips a version/dist-tag before verifying (npx -y …@latest)", () => {
    const root = createFixture();
    writeJson(join(root, ".mcp.json"), {
      mcpServers: {
        gh: {
          command: "npx",
          args: ["-y", "@modelcontextprotocol/server-github@latest"],
        },
      },
    });

    expect(securityScanMcp(root)).toEqual([{ server: "gh", verified: true, checkable: true }]);
  });

  it("treats non-npm (uvx) servers as not checkable", () => {
    const root = createFixture();
    writeJson(join(root, ".mcp.json"), {
      mcpServers: {
        fetch: { command: "uvx", args: ["mcp-server-fetch"] },
      },
    });

    expect(securityScanMcp(root)).toEqual([{ server: "fetch", verified: false, checkable: false }]);
  });

  it("skips the dependency audit silently without a lockfile", () => {
    const root = createFixture();
    expect(formatSecurityScan(root)).toBeNull();
  });
});

describe("formatSecurityScan banner grouping", () => {
  it("renders non-npm servers in the calmer 'source not checkable' group, not 'unverified'", () => {
    const root = createFixture();
    writeJson(join(root, ".mcp.json"), {
      mcpServers: {
        fetch: { command: "uvx", args: ["mcp-server-fetch"] },
      },
    });

    const banner = formatSecurityScan(root);
    expect(banner).not.toBeNull();
    expect(banner).toContain("MCP servers — source not checkable (non-npm):");
    expect(banner).not.toContain("MCP servers — unverified:");
    expect(banner).toContain("fetch");
  });

  it("renders genuinely unreviewed npm-checkable servers in the 'unverified' group", () => {
    const root = createFixture();
    writeJson(join(root, ".mcp.json"), {
      mcpServers: {
        custom: { command: "some-unknown-mcp-pkg" },
      },
    });

    const banner = formatSecurityScan(root);
    expect(banner).not.toBeNull();
    expect(banner).toContain("MCP servers — unverified:");
    expect(banner).not.toContain("MCP servers — source not checkable (non-npm):");
    expect(banner).toContain("custom");
  });
});
