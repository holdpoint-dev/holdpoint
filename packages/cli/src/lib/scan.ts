import { execFile } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const HIGH_SEVERITIES = new Set(["high", "critical"]);
const AUDIT_MAX_FINDINGS = 5;
const AUDIT_TIMEOUT_MS = 8_000;

export interface ScanResult {
  mcp: { server: string; verified: boolean }[];
  deps: { name: string; severity: string; title: string }[];
}

type PackageManager = "pnpm" | "yarn" | "npm";

type McpEntry = {
  key: string;
  name?: string;
  command?: string;
  args: string[];
};

function readJson(path: string): unknown {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return undefined;
  }
}

function registryPath(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return join(here, "../data/verified-mcp-registry.json");
}

function loadRegistry(): Set<string> {
  const parsed = readJson(registryPath());
  const entries = Array.isArray(parsed) ? parsed : [];
  return new Set(entries.filter((entry): entry is string => typeof entry === "string"));
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

function mcpServersFromConfig(config: unknown): McpEntry[] {
  if (!config || typeof config !== "object") return [];
  const obj = config as Record<string, unknown>;
  const servers = obj.mcpServers ?? obj.servers;
  if (!servers || typeof servers !== "object" || Array.isArray(servers)) return [];

  return Object.entries(servers as Record<string, unknown>).map(([key, raw]) => {
    const server = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
    const record = server as Record<string, unknown>;
    return {
      key,
      ...(typeof record.name === "string" ? { name: record.name } : {}),
      ...(typeof record.command === "string" ? { command: record.command } : {}),
      args: asStringArray(record.args),
    };
  });
}

function extractPackageName(value: string): string | undefined {
  const normalized = value.replace(/\\/g, "/");
  const nodeModules = normalized.lastIndexOf("node_modules/");
  if (nodeModules >= 0) {
    const after = normalized.slice(nodeModules + "node_modules/".length);
    const parts = after.split("/").filter(Boolean);
    if (parts[0]?.startsWith("@") && parts[1]) return `${parts[0]}/${parts[1]}`;
    return parts[0];
  }
  if (normalized.startsWith("@")) {
    const [scope, name] = normalized.split("/");
    return scope && name ? `${scope}/${name}` : undefined;
  }
  if (!normalized.includes("/") && /^[a-z0-9@._-]+$/i.test(normalized)) return normalized;
  return undefined;
}

function serverCandidates(entry: McpEntry): string[] {
  const values = [entry.name, entry.command, ...entry.args]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .map((value) => value.trim());
  const packages = values
    .map(extractPackageName)
    .filter((value): value is string => Boolean(value));
  return [...values, ...packages];
}

function readMcp(root: string, registry: Set<string>): ScanResult["mcp"] {
  const files = [join(root, ".mcp.json"), join(root, ".claude/mcp.json")];
  const results: ScanResult["mcp"] = [];
  for (const file of files) {
    if (!existsSync(file)) continue;
    for (const entry of mcpServersFromConfig(readJson(file))) {
      const verified = serverCandidates(entry).some((candidate) => registry.has(candidate));
      results.push({ server: entry.name ?? entry.key, verified });
    }
  }
  return results;
}

function detectPackageManager(root: string): PackageManager | undefined {
  if (existsSync(join(root, "pnpm-lock.yaml"))) return "pnpm";
  if (existsSync(join(root, "yarn.lock"))) return "yarn";
  if (
    existsSync(join(root, "package-lock.json")) ||
    existsSync(join(root, "npm-shrinkwrap.json"))
  ) {
    return "npm";
  }
  return undefined;
}

function firstTitle(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    for (const entry of value) {
      const title = firstTitle(entry);
      if (title) return title;
    }
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return typeof record.title === "string" ? record.title : undefined;
  }
  return undefined;
}

function addFinding(
  findings: ScanResult["deps"],
  seen: Set<string>,
  name: string | undefined,
  severity: unknown,
  title: unknown,
): void {
  if (!name || typeof severity !== "string") return;
  const normalizedSeverity = severity.toLowerCase();
  if (!HIGH_SEVERITIES.has(normalizedSeverity)) return;
  const normalizedTitle = firstTitle(title) ?? "Security advisory";
  const key = `${name}\0${normalizedSeverity}\0${normalizedTitle}`;
  if (seen.has(key)) return;
  seen.add(key);
  findings.push({ name, severity: normalizedSeverity, title: normalizedTitle });
}

function parseAuditJson(raw: string): ScanResult["deps"] {
  const findings: ScanResult["deps"] = [];
  const seen = new Set<string>();
  const parseOne = (value: unknown) => {
    if (!value || typeof value !== "object") return;
    const data = value as Record<string, unknown>;

    if (data.vulnerabilities && typeof data.vulnerabilities === "object") {
      for (const [name, vuln] of Object.entries(data.vulnerabilities as Record<string, unknown>)) {
        if (!vuln || typeof vuln !== "object") continue;
        const v = vuln as Record<string, unknown>;
        addFinding(findings, seen, name, v.severity, v.via ?? v.title);
      }
    }

    if (data.advisories && typeof data.advisories === "object") {
      for (const advisory of Object.values(data.advisories as Record<string, unknown>)) {
        if (!advisory || typeof advisory !== "object") continue;
        const a = advisory as Record<string, unknown>;
        addFinding(
          findings,
          seen,
          typeof a.module_name === "string" ? a.module_name : undefined,
          a.severity,
          a.title,
        );
      }
    }

    if (data.type === "auditAdvisory" && data.data && typeof data.data === "object") {
      const advisory = (data.data as Record<string, unknown>).advisory;
      if (advisory && typeof advisory === "object") {
        const a = advisory as Record<string, unknown>;
        addFinding(
          findings,
          seen,
          typeof a.module_name === "string" ? a.module_name : undefined,
          a.severity,
          a.title,
        );
      }
    }
  };

  try {
    parseOne(JSON.parse(raw));
  } catch {
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        parseOne(JSON.parse(trimmed));
      } catch {
        // Ignore non-JSON audit chatter.
      }
    }
  }
  return findings.slice(0, AUDIT_MAX_FINDINGS);
}

async function runAudit(root: string): Promise<ScanResult["deps"]> {
  const pm = detectPackageManager(root);
  if (!pm) return [];
  try {
    const { stdout } = await execFileAsync(pm, ["audit", "--json"], {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 1024 * 1024 * 10,
      timeout: AUDIT_TIMEOUT_MS,
    });
    return parseAuditJson(String(stdout || ""));
  } catch (error) {
    const stdout = (error as { stdout?: unknown }).stdout;
    if (typeof stdout !== "string" || !stdout.trim()) return [];
    return parseAuditJson(stdout);
  }
}

// Verified MCP registry is bundled statically; community PRs welcome.
export async function runScan(root: string): Promise<ScanResult> {
  const resolvedRoot = resolve(root);
  const registry = loadRegistry();
  return {
    mcp: readMcp(resolvedRoot, registry),
    deps: await runAudit(resolvedRoot),
  };
}

export const __scanInternalsForTests = {
  parseAuditJson,
  extractPackageName,
};
