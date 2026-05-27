import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { discoverLiveEngines, loadLiveAdapter } from "../engines.js";

const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    rmSync(tempDirs.pop() as string, { recursive: true, force: true });
  }
});

function makeTempProject(dependencies: Record<string, string> = {}): string {
  const root = mkdtempSync(join(tmpdir(), "holdpoint-cli-engines-"));
  tempDirs.push(root);
  writeJson(join(root, "package.json"), {
    name: "fixture-project",
    private: true,
    dependencies,
  });
  return root;
}

function packageRootFor(projectRoot: string, packageName: string): string {
  if (packageName.startsWith("@")) {
    const [scope, name] = packageName.split("/");
    return join(projectRoot, "node_modules", scope, name);
  }
  return join(projectRoot, "node_modules", packageName);
}

function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(value, null, 2));
}

function writeFile(path: string, value: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, value);
}

function addEnginePackage(
  projectRoot: string,
  packageName: string,
  options?: {
    keyword?: boolean;
    manifest?: string;
    adapter?: string;
    manifestExport?: string;
    adapterExport?: string;
  },
): void {
  const root = packageRootFor(projectRoot, packageName);
  writeJson(join(root, "package.json"), {
    name: packageName,
    version: "1.0.0",
    type: "module",
    exports: {
      ".": "./dist/index.js",
    },
    main: "./dist/index.js",
    keywords: options?.keyword === false ? [] : ["holdpoint-engine"],
    holdpoint: {
      manifest: options?.manifest ?? "./dist/manifest.js",
      adapter: options?.adapter ?? "./dist/index.js",
    },
  });
  writeFile(
    join(root, "dist", "manifest.js"),
    options?.manifestExport ??
      'export const manifest = { manifestVersion: 1, id: "echo", displayName: "Echo Engine" };',
  );
  writeFile(
    join(root, "dist", "index.js"),
    options?.adapterExport ??
      `export const adapter = {
  id: "echo",
  displayName: "Echo Engine",
  capabilities: { can_stream: true },
  generateBridgeCommand() {
    return "holdpoint event --engine echo --from-hook";
  },
  translateHookInput(raw) {
    return raw && raw.session_id
      ? {
          v: 1,
          id: "echo-event",
          ts: 0,
          engine: "echo",
          session_id: raw.session_id,
          project_hash: "aaaaaaaaaaaa",
          cwd: "/tmp/project",
          type: "meta",
          payload: { kind: "echo_hook" },
        }
      : null;
  },
};`,
  );
}

describe("live engine discovery", () => {
  it("loads an external adapter package declared in the current project", async () => {
    const projectRoot = makeTempProject({ "holdpoint-engine-echo": "1.0.0" });
    addEnginePackage(projectRoot, "holdpoint-engine-echo");

    const engines = await discoverLiveEngines({ cwd: projectRoot });
    const echo = engines.find((engine) => engine.packageName === "holdpoint-engine-echo");

    expect(echo).toMatchObject({
      status: "loaded",
      manifest: { id: "echo", displayName: "Echo Engine" },
    });

    const adapter = await loadLiveAdapter("echo", { cwd: projectRoot });
    expect(adapter?.generateBridgeCommand()).toContain("echo");
  });

  it("ignores packages that do not declare the holdpoint-engine keyword", async () => {
    const projectRoot = makeTempProject({ "holdpoint-engine-silent": "1.0.0" });
    addEnginePackage(projectRoot, "holdpoint-engine-silent", { keyword: false });

    const engines = await discoverLiveEngines({ cwd: projectRoot });
    const silent = engines.find((engine) => engine.packageName === "holdpoint-engine-silent");

    expect(silent).toMatchObject({
      status: "ignored",
      reason: "missing `holdpoint-engine` keyword",
    });
  });

  it("reports manifest import failures instead of crashing", async () => {
    const projectRoot = makeTempProject({ "holdpoint-engine-broken": "1.0.0" });
    addEnginePackage(projectRoot, "holdpoint-engine-broken", {
      manifestExport: 'throw new Error("broken manifest");',
    });

    const engines = await discoverLiveEngines({ cwd: projectRoot });
    const broken = engines.find((engine) => engine.packageName === "holdpoint-engine-broken");

    expect(broken?.status).toBe("ignored");
    expect(broken?.reason).toContain("manifest import failed");
  });

  it("keeps the built-in claude adapter when an external package reuses its id", async () => {
    const projectRoot = makeTempProject({ "holdpoint-engine-duplicate": "1.0.0" });
    addEnginePackage(projectRoot, "holdpoint-engine-duplicate", {
      manifestExport:
        'export const manifest = { manifestVersion: 1, id: "claude", displayName: "Fake Claude" };',
      adapterExport: `export const adapter = {
  id: "claude",
  displayName: "Fake Claude",
  capabilities: { can_stream: true },
  generateBridgeCommand() {
    return "holdpoint event --engine claude --from-hook";
  },
  translateHookInput() {
    return null;
  },
};`,
    });
    const engines = await discoverLiveEngines({ cwd: projectRoot });
    const duplicate = engines.find((engine) => engine.packageName === "holdpoint-engine-duplicate");

    expect(duplicate).toMatchObject({
      status: "ignored",
      reason: expect.stringContaining("collides"),
    });
  });

  it("loads the built-in Cursor adapter", async () => {
    const projectRoot = makeTempProject();
    const engines = await discoverLiveEngines({ cwd: projectRoot });
    const cursor = engines.find((engine) => engine.packageName === "@holdpoint/engine-cursor");

    expect(cursor).toMatchObject({
      source: "built-in",
      status: "loaded",
      manifest: { id: "cursor", displayName: "Cursor" },
    });

    const adapter = await loadLiveAdapter("cursor", { cwd: projectRoot });
    expect(adapter?.generateBridgeCommand()).toContain("cursor");
  });
});
