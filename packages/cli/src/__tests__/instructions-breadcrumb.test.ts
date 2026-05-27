import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { BREADCRUMB_BODY, spliceBreadcrumb } from "../lib/instructions-breadcrumb.js";

let cleanupDirs: string[] = [];

function tempPath(fileName = "AGENTS.md"): string {
  const root = mkdtempSync(join(tmpdir(), "holdpoint-breadcrumb-"));
  cleanupDirs.push(root);
  return join(root, fileName);
}

afterEach(() => {
  for (const dir of cleanupDirs) rmSync(dir, { recursive: true, force: true });
  cleanupDirs = [];
});

describe("spliceBreadcrumb", () => {
  it("creates a missing instructions file", () => {
    const filePath = tempPath("nested/CLAUDE.md");

    spliceBreadcrumb(filePath);

    const content = readFileSync(filePath, "utf8");
    expect(content).toContain("HOLDPOINT_MANAGED");
    expect(content).toContain(BREADCRUMB_BODY);
  });

  it("replaces an existing managed block and preserves surrounding content", () => {
    const filePath = tempPath();
    spliceBreadcrumb(filePath, "old body");
    const first = readFileSync(filePath, "utf8");
    spliceBreadcrumb(filePath, "new body");

    const content = readFileSync(filePath, "utf8");
    expect(content).toContain("new body");
    expect(content).not.toContain("old body");
    expect(content.split("HOLDPOINT_MANAGED")).toHaveLength(
      first.split("HOLDPOINT_MANAGED").length,
    );
  });

  it("appends a managed block to an existing unmarked file", () => {
    const filePath = tempPath();
    writeFileSync(filePath, "# Existing\n", "utf8");

    spliceBreadcrumb(filePath);

    const content = readFileSync(filePath, "utf8");
    expect(content).toContain("# Existing");
    expect(content).toContain(BREADCRUMB_BODY);
  });

  it("is idempotent", () => {
    const filePath = tempPath();
    spliceBreadcrumb(filePath);
    const once = readFileSync(filePath, "utf8");
    spliceBreadcrumb(filePath);
    const twice = readFileSync(filePath, "utf8");

    expect(twice).toBe(once);
  });
});
