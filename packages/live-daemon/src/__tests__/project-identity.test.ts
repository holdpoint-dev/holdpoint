import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { identifyProject } from "../project-identity.js";

const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    rmSync(tempDirs.pop() as string, { recursive: true, force: true });
  }
});

function makeTempDir(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

describe("identifyProject", () => {
  it("returns a stable identity for an existing non-git directory", () => {
    const dir = makeTempDir("holdpoint-id-cwd-");
    const id = identifyProject(dir);
    expect(id.hash).toMatch(/^[0-9a-f]{12}$/);
    // realpath may resolve symlinks on macOS (/tmp → /private/tmp); we only
    // assert the basename matches what we created so the test is portable.
    expect(id.name).toBe(basename(dir));
    expect(id.root.length).toBeGreaterThan(0);
  });

  it("does not throw when the cwd no longer exists on disk", () => {
    // Simulate the "renamed/deleted project, but pending event still
    // references the old path" case that used to brick daemon startup.
    const dir = makeTempDir("holdpoint-id-gone-");
    rmSync(dir, { recursive: true, force: true });
    // Pop the cleanup entry since we already deleted it.
    tempDirs.pop();

    expect(() => identifyProject(dir)).not.toThrow();
    const id = identifyProject(dir);
    // Hash + name should still be derived from the literal path even
    // though realpath would fail.
    expect(id.hash).toMatch(/^[0-9a-f]{12}$/);
    expect(id.root).toBe(dir);
    expect(id.name).toBe(basename(dir));
  });

  it("produces the same identity for the same missing path on every call", () => {
    // Stability matters: events from the same dead project must group
    // under one project_hash across replays.
    const dir = "/tmp/holdpoint-this-path-definitely-does-not-exist-xyz123";
    const a = identifyProject(dir);
    const b = identifyProject(dir);
    expect(a.hash).toBe(b.hash);
    expect(a.root).toBe(b.root);
  });
});
