// ─── Session security scan (shared source) ───────────────────────────────────
//
// This is the SINGLE source of truth for the session-start security scan that
// every engine injects as a `node -e` hook. Engines import `SECURITY_SCAN_PACKAGES`
// and `buildSecurityScanScript()` from here and embed the returned string into
// their generated context script. The CLI's `holdpoint update` regenerates the
// per-engine hook files (.codex/.cursor/.github) from the engine output, so a fix
// here propagates everywhere after a build + update.
//
// The returned string is plain ES that runs synchronously inside the hook process.
// It assumes `readFileSync`, `existsSync`, `join`, and `execSync` are already in
// scope (the engine context script imports them before embedding this block).

/** npm package names recognised as first-party / well-known MCP servers. */
export const SECURITY_SCAN_PACKAGES = [
  "@anthropic-ai/mcp-server-brave-search",
  "@anthropic-ai/mcp-server-fetch",
  "@modelcontextprotocol/server-filesystem",
  "@modelcontextprotocol/server-github",
  "@modelcontextprotocol/server-gitlab",
  "@modelcontextprotocol/server-google-maps",
  "@modelcontextprotocol/server-postgres",
  "@modelcontextprotocol/server-slack",
  "@modelcontextprotocol/server-memory",
  "@modelcontextprotocol/server-puppeteer",
  "@modelcontextprotocol/server-sequential-thinking",
  "@modelcontextprotocol/server-everything",
];

/**
 * Build the injected security-scan script body. The returned string defines
 * `formatSecurityScan(root)` (plus its helpers) which returns a banner string or
 * `null` when nothing noteworthy is found.
 */
export function buildSecurityScanScript(): string {
  return `
// Generated from @holdpoint/types buildSecurityScanScript — do not edit by hand.
const SECURITY_SCAN_VERIFIED = new Set(${JSON.stringify(SECURITY_SCAN_PACKAGES)});
const SECURITY_SCAN_SEVERITIES = new Set(["high", "critical"]);
function securityScanReadJson(path) {
  try { return JSON.parse(readFileSync(path, "utf8")); } catch { return undefined; }
}
function securityScanStringArray(value) {
  return Array.isArray(value) ? value.filter((entry) => typeof entry === "string") : [];
}
function securityScanPackageName(value) {
  const normalized = String(value || "").replace(/\\\\/g, "/");
  const idx = normalized.lastIndexOf("node_modules/");
  if (idx >= 0) {
    const parts = normalized.slice(idx + "node_modules/".length).split("/").filter(Boolean);
    if (parts[0] && parts[0].startsWith("@") && parts[1]) return parts[0] + "/" + parts[1];
    return parts[0];
  }
  if (normalized.startsWith("@")) {
    const parts = normalized.split("/");
    return parts[0] && parts[1] ? parts[0] + "/" + parts[1] : undefined;
  }
  if (!normalized.includes("/") && /^[a-z0-9@._-]+$/i.test(normalized)) return normalized;
  return undefined;
}
function securityScanMcpEntries(config) {
  if (!config || typeof config !== "object") return [];
  const servers = config.mcpServers || config.servers;
  if (!servers || typeof servers !== "object" || Array.isArray(servers)) return [];
  return Object.entries(servers).map(([key, raw]) => {
    const server = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
    return {
      key,
      name: typeof server.name === "string" ? server.name : undefined,
      command: typeof server.command === "string" ? server.command : undefined,
      args: securityScanStringArray(server.args),
    };
  });
}
// Strip a leading version/dist-tag from a package spec, leaving the bare name.
// "@scope/name@1.2.3" -> "@scope/name"; "pkg@latest" -> "pkg". Leaves paths/urls alone.
function securityScanStripVersion(spec) {
  const s = String(spec || "");
  if (!s) return s;
  if (s.startsWith("@")) {
    // Scoped: keep through the "@scope/name" segment, then cut at a later "@".
    const slash = s.indexOf("/");
    if (slash < 0) return s;
    const rest = s.slice(slash + 1);
    const at = rest.indexOf("@");
    return at >= 0 ? s.slice(0, slash + 1 + at) : s;
  }
  const at = s.indexOf("@");
  return at > 0 ? s.slice(0, at) : s;
}
// Pick the first non-flag argument from args, skipping anything starting with "-".
function securityScanFirstNonFlag(args, startIndex) {
  for (let i = startIndex || 0; i < args.length; i++) {
    const a = args[i];
    if (typeof a === "string" && a && !a.startsWith("-")) return a;
  }
  return undefined;
}
// Derive the single package that will actually execute, from command + args ONLY.
// Returns { pkg, checkable } where checkable indicates the pkg is an npm name we
// can look up in the verified registry. NEVER consults entry.name or unrelated args.
function securityScanExecutedPackage(entry) {
  const command = entry.command;
  const args = entry.args || [];
  if (!command) return { pkg: undefined, checkable: false };
  const base = securityScanPackageName(command);
  if (command === "npx" || command === "bunx") {
    const target = securityScanFirstNonFlag(args, 0);
    if (!target) return { pkg: undefined, checkable: false };
    return { pkg: securityScanStripVersion(target), checkable: true };
  }
  if ((command === "pnpm" || command === "yarn") && args[0] === "dlx") {
    const target = securityScanFirstNonFlag(args, 1);
    if (!target) return { pkg: undefined, checkable: false };
    return { pkg: securityScanStripVersion(target), checkable: true };
  }
  if (command === "uvx") {
    // Python/uv package — not resolvable to an npm name.
    const target = securityScanFirstNonFlag(args, 0);
    return { pkg: target ? securityScanStripVersion(target) : undefined, checkable: false };
  }
  if (command === "node" || base === "node") {
    const script = securityScanFirstNonFlag(args, 0);
    const pkg = script ? securityScanPackageName(script) : undefined;
    return pkg ? { pkg, checkable: true } : { pkg: undefined, checkable: false };
  }
  // Command is itself a path / binary.
  return base ? { pkg: base, checkable: true } : { pkg: undefined, checkable: false };
}
function securityScanMcp(root) {
  const results = [];
  for (const file of [join(root, ".mcp.json"), join(root, ".claude/mcp.json")]) {
    if (!existsSync(file)) continue;
    for (const entry of securityScanMcpEntries(securityScanReadJson(file))) {
      const executed = securityScanExecutedPackage(entry);
      const verified = executed.checkable && executed.pkg ? SECURITY_SCAN_VERIFIED.has(executed.pkg) : false;
      results.push({ server: entry.name || entry.key, verified, checkable: executed.checkable });
    }
  }
  return results;
}
// Returns { pm, cmd } where pm is the display label and cmd is the full audit
// command string, or null when no lockfile is present.
function securityScanPackageManager(root) {
  if (existsSync(join(root, "pnpm-lock.yaml"))) return { pm: "pnpm", cmd: "pnpm audit --json" };
  if (existsSync(join(root, "yarn.lock"))) {
    // Yarn Berry (v2+) has no "yarn audit --json"; it uses "yarn npm audit".
    let berry = existsSync(join(root, ".yarnrc.yml"));
    if (!berry) {
      const pkg = securityScanReadJson(join(root, "package.json"));
      const pm = pkg && typeof pkg.packageManager === "string" ? pkg.packageManager : "";
      const m = /^yarn@(\\d+)/.exec(pm);
      if (m && Number(m[1]) >= 2) berry = true;
    }
    return berry
      ? { pm: "yarn", cmd: "yarn npm audit --all --json" }
      : { pm: "yarn", cmd: "yarn audit --json" };
  }
  if (existsSync(join(root, "package-lock.json")) || existsSync(join(root, "npm-shrinkwrap.json"))) {
    return { pm: "npm", cmd: "npm audit --json" };
  }
  return null;
}
function securityScanFirstTitle(value) {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    for (const entry of value) {
      const title = securityScanFirstTitle(entry);
      if (title) return title;
    }
  }
  if (value && typeof value === "object" && typeof value.title === "string") return value.title;
  return undefined;
}
// #7: For npm v7+ transitive vulns, "via" is an array of STRINGS naming parent
// packages — those must never become the advisory title. Resolve a "via" value to
// a safe title: object entries with a string .title are real advisories; an array
// of plain strings falls back to "Vulnerable dependency (via <parent>)" so a raw
// package name never lands in the title slot.
function securityScanTitleFromVia(via) {
  const objectTitle = securityScanFirstTitle(
    Array.isArray(via)
      ? via.filter((entry) => entry && typeof entry === "object")
      : via && typeof via === "object" ? via : undefined,
  );
  if (objectTitle) return objectTitle;
  const parents = securityScanStringArray(Array.isArray(via) ? via : [via]);
  if (parents.length > 0) return "Vulnerable dependency (via " + parents[0] + ")";
  return undefined;
}
function securityScanAddFinding(findings, seen, name, severity, title) {
  if (!name || typeof severity !== "string") return;
  const normalizedSeverity = severity.toLowerCase();
  if (!SECURITY_SCAN_SEVERITIES.has(normalizedSeverity)) return;
  const normalizedTitle = securityScanFirstTitle(title) || "Security advisory";
  const key = name + "\\0" + normalizedSeverity + "\\0" + normalizedTitle;
  if (seen.has(key)) return;
  seen.add(key);
  findings.push({ name, severity: normalizedSeverity, title: normalizedTitle });
}
function securityScanParseAudit(raw) {
  const findings = [];
  const seen = new Set();
  const parseOne = (data) => {
    if (!data || typeof data !== "object") return;
    if (data.vulnerabilities && typeof data.vulnerabilities === "object") {
      for (const [name, vuln] of Object.entries(data.vulnerabilities)) {
        if (!vuln || typeof vuln !== "object") continue;
        // #7: resolve "via" safely so string-parent names never become the title.
        const title = vuln.via !== undefined ? securityScanTitleFromVia(vuln.via) : vuln.title;
        securityScanAddFinding(findings, seen, name, vuln.severity, title);
      }
    }
    if (data.advisories && typeof data.advisories === "object") {
      for (const advisory of Object.values(data.advisories)) {
        if (!advisory || typeof advisory !== "object") continue;
        securityScanAddFinding(findings, seen, advisory.module_name, advisory.severity, advisory.title);
      }
    }
    if (data.type === "auditAdvisory" && data.data && data.data.advisory) {
      const advisory = data.data.advisory;
      securityScanAddFinding(findings, seen, advisory.module_name, advisory.severity, advisory.title);
    }
  };
  try { parseOne(JSON.parse(raw)); }
  catch {
    for (const line of String(raw || "").split(/\\r?\\n/)) {
      if (!line.trim()) continue;
      try { parseOne(JSON.parse(line)); } catch {}
    }
  }
  // #4: sort by severity (critical outranks high) BEFORE capping so criticals are
  // never dropped by insertion order. Comparator is stable for equal severities.
  const rank = (s) => (s === "critical" ? 0 : 1);
  findings.sort((a, b) => rank(a.severity) - rank(b.severity));
  return findings.slice(0, 5);
}
function securityScanAudit(root) {
  const manager = securityScanPackageManager(root);
  if (!manager) return { pm: null, findings: [] };
  const pm = manager.pm;
  try {
    const stdout = execSync(manager.cmd, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 1024 * 1024 * 10,
      timeout: 8000,
    });
    return { pm, findings: securityScanParseAudit(stdout) };
  } catch (err) {
    const stdout = err && typeof err.stdout === "string" ? err.stdout : "";
    if (stdout.trim()) {
      // #6: non-zero exit with JSON on stdout is the normal "vulns found" path.
      return { pm, findings: securityScanParseAudit(stdout) };
    }
    // #6: timeout / error with no usable stdout — return a sentinel so the banner
    // can distinguish "audit didn't complete" from "clean repo".
    return { pm, findings: [], error: "timeout" };
  }
}
function formatSecurityScan(root) {
  const mcp = securityScanMcp(root);
  // #1/#11: npm-checkable servers not in the registry are genuinely unreviewed;
  // non-checkable (uvx/python/unresolvable) servers get a calmer, separate group.
  const unverified = mcp.filter((entry) => !entry.verified && entry.checkable !== false);
  const nonCheckable = mcp.filter((entry) => entry.checkable === false);
  const audit = securityScanAudit(root);
  const auditDidNotComplete = audit.error && audit.findings.length === 0;
  if (
    unverified.length === 0 &&
    nonCheckable.length === 0 &&
    audit.findings.length === 0 &&
    !auditDidNotComplete
  ) {
    return null;
  }
  const lines = ["⚠ Holdpoint Security Scan", ""];
  if (unverified.length > 0) {
    lines.push("MCP servers — unverified:");
    for (const entry of unverified) lines.push("  • " + entry.server + " (source unknown — review before trusting)");
    lines.push("");
  }
  if (nonCheckable.length > 0) {
    lines.push("MCP servers — source not checkable (non-npm):");
    for (const entry of nonCheckable) lines.push("  • " + entry.server + " (can't verify automatically — review the source)");
    lines.push("");
  }
  if (audit.findings.length > 0) {
    lines.push((audit.pm || "npm") + " audit — high/critical:");
    for (const dep of audit.findings) lines.push("  • " + dep.name + " · " + dep.title + " (" + dep.severity + ")");
    lines.push("");
  } else if (auditDidNotComplete) {
    // #6: surface an incomplete audit so a timeout no longer looks like a clean repo.
    const pm = audit.pm || "npm";
    lines.push((audit.pm || "npm") + " audit — high/critical:");
    lines.push("  • dependency audit did not complete (timeout) — run \`" + pm + " audit\` manually");
    lines.push("");
  }
  lines.push("Review these before allowing the agent to install dependencies or invoke tools.");
  return lines.join("\\n");
}
`;
}
