import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseEventV1 } from "@holdpoint/live-protocol";
import type { LiveCapabilities } from "@holdpoint/live-protocol";
import type { HoldpointEngineManifest, LiveAdapter } from "@holdpoint/sdk";

const require = createRequire(import.meta.url);
const CLI_SRC_DIR = dirname(fileURLToPath(import.meta.url));
const MONOREPO_ROOT = resolve(CLI_SRC_DIR, "../../..");
const BUILTIN_LIVE_ENGINE_PACKAGES = [
  "@holdpoint/engine-claude",
  "@holdpoint/engine-cursor",
] as const;
const HOLDPOINT_ENGINE_KEYWORD = "holdpoint-engine";

export type LiveEngineSource = "built-in" | "dependency";

export interface DiscoveredLiveEngine {
  packageName: string;
  source: LiveEngineSource;
  status: "loaded" | "ignored";
  reason?: string;
  manifest?: HoldpointEngineManifest;
}

interface HoldpointPackageMetadata {
  manifest?: string;
  adapter?: string;
}

interface ResolvedLiveEngine extends DiscoveredLiveEngine {
  packageRoot?: string;
  adapterPath?: string;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function isExternalLiveEnginePackageName(packageName: string): boolean {
  return (
    /^holdpoint-engine-[a-z0-9-]+$/.test(packageName) ||
    /^@[a-z0-9_.-]+\/holdpoint-engine-[a-z0-9-]+$/.test(packageName)
  );
}

function readJsonFile(path: string): Record<string, unknown> | null {
  if (!existsSync(path)) {
    return null;
  }
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8"));
    return isObject(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function findNearestPackageRoot(startDir: string): string {
  let current = resolve(startDir);
  while (true) {
    if (existsSync(join(current, "package.json"))) {
      return current;
    }
    const parent = dirname(current);
    if (parent === current) {
      return resolve(startDir);
    }
    current = parent;
  }
}

function findPackageRootFromFile(path: string): string | null {
  let current = dirname(path);
  while (true) {
    if (existsSync(join(current, "package.json"))) {
      return current;
    }
    const parent = dirname(current);
    if (parent === current) {
      return null;
    }
    current = parent;
  }
}

function getDependencyEnginePackageNames(projectRoot: string): string[] {
  const packageJson = readJsonFile(join(projectRoot, "package.json"));
  if (!packageJson) {
    return [];
  }

  const packageNames = new Set<string>();
  for (const field of ["dependencies", "devDependencies", "optionalDependencies"]) {
    const deps = packageJson[field];
    if (!isObject(deps)) {
      continue;
    }
    for (const packageName of Object.keys(deps)) {
      if (isExternalLiveEnginePackageName(packageName)) {
        packageNames.add(packageName);
      }
    }
  }

  return [...packageNames];
}

function resolvePackageRoot(packageName: string, projectRoot: string): string | null {
  try {
    const entryPath = require.resolve(packageName);
    return findPackageRootFromFile(entryPath);
  } catch {
    // Fall through to project-local lookup for external adapters.
  }

  try {
    const entryPath = require.resolve(packageName, {
      paths: [projectRoot, process.cwd()],
    });
    return findPackageRootFromFile(entryPath);
  } catch {
    // Fall through to package.json lookup for packages without an exports entry.
  }

  try {
    const packageJsonPath = require.resolve(`${packageName}/package.json`, {
      paths: [projectRoot, process.cwd()],
    });
    return dirname(packageJsonPath);
  } catch {
    if (packageName.startsWith("@holdpoint/")) {
      const scopedName = packageName.split("/")[1];
      if (scopedName) {
        const packageDir = resolve(MONOREPO_ROOT, "packages", scopedName);
        if (existsSync(join(packageDir, "package.json"))) {
          return packageDir;
        }
      }
    }
    return null;
  }
}

function formatImportError(error: unknown): string {
  return error instanceof Error && error.message ? error.message : String(error);
}

function parseManifest(value: unknown): HoldpointEngineManifest | null {
  if (!isObject(value)) {
    return null;
  }
  if (value.manifestVersion !== 1) {
    return null;
  }
  if (typeof value.id !== "string" || !/^[a-z0-9-]+$/.test(value.id)) {
    return null;
  }
  if (typeof value.displayName !== "string" || !value.displayName.trim()) {
    return null;
  }
  return {
    manifestVersion: 1,
    id: value.id,
    displayName: value.displayName,
  };
}

function parseLiveCapabilities(value: unknown): LiveCapabilities | null {
  if (!isObject(value)) {
    return null;
  }

  const capabilities: LiveCapabilities = {};
  for (const key of [
    "can_stream",
    "can_control",
    "can_modify_context",
    "can_register_tools",
    "control_online",
  ] as const) {
    const entry = value[key];
    if (entry === undefined) {
      continue;
    }
    if (typeof entry !== "boolean") {
      return null;
    }
    capabilities[key] = entry;
  }

  return capabilities;
}

function parseLiveAdapter(value: unknown, manifest: HoldpointEngineManifest): LiveAdapter | null {
  if (!isObject(value)) {
    return null;
  }
  if (typeof value.id !== "string" || typeof value.displayName !== "string") {
    return null;
  }
  if (value.id !== manifest.id || value.displayName !== manifest.displayName) {
    return null;
  }
  const capabilities = parseLiveCapabilities(value.capabilities);
  if (!capabilities) {
    return null;
  }
  const generateBridgeCommand = value.generateBridgeCommand;
  if (typeof generateBridgeCommand !== "function") {
    return null;
  }
  const translateHookInput = value.translateHookInput;
  if (typeof translateHookInput !== "function") {
    return null;
  }
  return {
    id: value.id,
    displayName: value.displayName,
    capabilities,
    generateBridgeCommand: () => {
      const command = generateBridgeCommand();
      if (typeof command !== "string") {
        throw new Error("adapter.generateBridgeCommand() must return a string");
      }
      return command;
    },
    translateHookInput: (raw, options) => {
      const event = translateHookInput(raw, options);
      return event == null ? null : parseEventV1(event);
    },
  };
}

async function importModule(modulePath: string): Promise<Record<string, unknown>> {
  const moduleUrl = pathToFileURL(modulePath).href;
  return (await import(moduleUrl)) as Record<string, unknown>;
}

function resolvePackageAssetPath(packageRoot: string, relativePath: string): string {
  const declaredPath = resolve(packageRoot, relativePath);
  const sourceFallback = resolve(
    packageRoot,
    relativePath.replace(/^\.\/dist\//, "./src/").replace(/\.js$/, ".ts"),
  );
  if (
    packageRoot.startsWith(resolve(MONOREPO_ROOT, "packages") + sep) &&
    existsSync(sourceFallback)
  ) {
    return sourceFallback;
  }
  if (existsSync(declaredPath)) {
    return declaredPath;
  }
  return sourceFallback;
}

async function resolveCandidate(
  packageName: string,
  source: LiveEngineSource,
  projectRoot: string,
): Promise<ResolvedLiveEngine> {
  const packageRoot = resolvePackageRoot(packageName, projectRoot);
  if (!packageRoot) {
    return {
      packageName,
      source,
      status: "ignored",
      reason: "package could not be resolved from this project",
    };
  }

  const packageJson = readJsonFile(join(packageRoot, "package.json"));
  if (!packageJson) {
    return {
      packageName,
      source,
      status: "ignored",
      reason: "package.json could not be read",
    };
  }

  const keywords = Array.isArray(packageJson.keywords) ? packageJson.keywords : [];
  if (!keywords.includes(HOLDPOINT_ENGINE_KEYWORD)) {
    return {
      packageName,
      source,
      status: "ignored",
      reason: `missing \`${HOLDPOINT_ENGINE_KEYWORD}\` keyword`,
    };
  }

  const metadata = isObject(packageJson.holdpoint)
    ? (packageJson.holdpoint as HoldpointPackageMetadata)
    : undefined;
  if (!metadata?.manifest) {
    return {
      packageName,
      source,
      status: "ignored",
      reason: "missing `holdpoint.manifest` package.json field",
    };
  }
  if (!metadata.adapter) {
    return {
      packageName,
      source,
      status: "ignored",
      reason: "missing `holdpoint.adapter` package.json field",
    };
  }

  const manifestPath = resolvePackageAssetPath(packageRoot, metadata.manifest);
  const adapterPath = resolvePackageAssetPath(packageRoot, metadata.adapter);
  if (!existsSync(manifestPath)) {
    return {
      packageName,
      source,
      status: "ignored",
      reason: "manifest file does not exist",
    };
  }
  if (!existsSync(adapterPath)) {
    return {
      packageName,
      source,
      status: "ignored",
      reason: "adapter file does not exist",
    };
  }

  try {
    const manifestModule = await importModule(manifestPath);
    const manifest = parseManifest(manifestModule.manifest);
    if (!manifest) {
      return {
        packageName,
        source,
        status: "ignored",
        reason: "manifest export is invalid",
      };
    }
    return {
      packageName,
      source,
      status: "loaded",
      manifest,
      packageRoot,
      adapterPath,
    };
  } catch (error) {
    return {
      packageName,
      source,
      status: "ignored",
      reason: `manifest import failed: ${formatImportError(error)}`,
    };
  }
}

async function discoverLiveEnginesDetailed(options?: {
  cwd?: string;
}): Promise<ResolvedLiveEngine[]> {
  const projectRoot = findNearestPackageRoot(options?.cwd ?? process.cwd());
  const dependencyPackages = getDependencyEnginePackageNames(projectRoot);
  const seenPackages = new Set<string>();
  const results: ResolvedLiveEngine[] = [];
  const loadedIds = new Set<string>();

  const candidates: Array<{ packageName: string; source: LiveEngineSource }> = [
    ...BUILTIN_LIVE_ENGINE_PACKAGES.map((packageName) => ({
      packageName,
      source: "built-in" as const,
    })),
    ...dependencyPackages.map((packageName) => ({ packageName, source: "dependency" as const })),
  ];

  for (const candidate of candidates) {
    if (seenPackages.has(candidate.packageName)) {
      continue;
    }
    seenPackages.add(candidate.packageName);
    const result = await resolveCandidate(candidate.packageName, candidate.source, projectRoot);
    if (result.status === "loaded" && result.manifest) {
      if (loadedIds.has(result.manifest.id)) {
        results.push({
          packageName: result.packageName,
          source: result.source,
          status: "ignored",
          reason: `engine id \`${result.manifest.id}\` collides with an already loaded adapter`,
          manifest: result.manifest,
        });
        continue;
      }
      loadedIds.add(result.manifest.id);
    }
    results.push(result);
  }

  return results;
}

export async function discoverLiveEngines(options?: {
  cwd?: string;
}): Promise<DiscoveredLiveEngine[]> {
  const results = await discoverLiveEnginesDetailed(options);
  return results.map(({ packageName, source, status, reason, manifest }) => ({
    packageName,
    source,
    status,
    ...(reason ? { reason } : {}),
    ...(manifest ? { manifest } : {}),
  }));
}

export async function loadLiveAdapter(
  engineId: string,
  options?: { cwd?: string },
): Promise<LiveAdapter | null> {
  const results = await discoverLiveEnginesDetailed(options);
  const match = results.find(
    (result) => result.status === "loaded" && result.manifest?.id === engineId,
  );
  if (!match?.adapterPath || !match.manifest) {
    return null;
  }

  try {
    const adapterModule = await importModule(match.adapterPath);
    return parseLiveAdapter(adapterModule.adapter, match.manifest);
  } catch {
    return null;
  }
}
