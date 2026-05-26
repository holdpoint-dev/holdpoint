import { describe, expect, it } from "vitest";
import { changesetTestInternals } from "../commands/changeset.js";

const { analyzeChangesetRequirement, isReleaseAffectingPackageFile, toRegex } =
  changesetTestInternals;

describe("require-changeset analysis", () => {
  it("requires a changeset for release-affecting package source changes", () => {
    const result = analyzeChangesetRequirement({
      changedFiles: ["packages/cli/src/index.ts"],
      packageRoots: [{ path: "packages/cli", name: "@holdpoint/cli", private: false }],
    });

    expect(result.hasChangeset).toBe(false);
    expect(result.requiredFiles).toEqual([
      { file: "packages/cli/src/index.ts", packageName: "@holdpoint/cli" },
    ]);
  });

  it("accepts package changes when the diff includes a changeset file", () => {
    const result = analyzeChangesetRequirement({
      changedFiles: ["packages/cli/src/index.ts", ".changeset/quiet-lions.md"],
      packageRoots: [{ path: "packages/cli", name: "@holdpoint/cli", private: false }],
    });

    expect(result.hasChangeset).toBe(true);
    expect(result.requiredFiles).toHaveLength(1);
  });

  it("ignores tests and package documentation", () => {
    expect(isReleaseAffectingPackageFile("src/index.ts")).toBe(true);
    expect(isReleaseAffectingPackageFile("src/index.test.ts")).toBe(false);
    expect(isReleaseAffectingPackageFile("__tests__/index.test.ts")).toBe(false);
    expect(isReleaseAffectingPackageFile("README.md")).toBe(false);
  });

  it("matches simple include globs", () => {
    expect(toRegex("packages/*").test("packages/cli")).toBe(true);
    expect(toRegex("packages/*").test("apps/web")).toBe(false);
    expect(toRegex("apps/**").test("apps/builder/src/App.tsx")).toBe(true);
  });
});
