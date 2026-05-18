import { GitBranch, Zap, Shield, Code2, AlertTriangle } from "lucide-react";
import { InstallCommand } from "../components/InstallCommand";

const FEATURES = [
  {
    icon: Shield,
    title: "Deterministic Checkpoints",
    description:
      "Define shell commands that must pass before any agent can commit or mark a task done. Zero tolerance for skipped checks.",
  },
  {
    icon: Code2,
    title: "Visual Builder",
    description:
      "n8n-style node canvas to build your checks.yaml without writing YAML. Trigger → Condition → Check — drag, drop, export.",
  },
  {
    icon: Zap,
    title: "Any Agent, One File",
    description:
      "Works with GitHub Copilot CLI, Claude Code, Cursor, and more. One checks.yaml. Each agent gets a purpose-built adapter.",
  },
  {
    icon: GitBranch,
    title: "Trigger Matching",
    description:
      "Checks activate only when relevant. Frontend checks run on .tsx files. Backend checks on API routes. Custom regex triggers.",
  },
];

const AGENTS = [
  { name: "GitHub Copilot CLI", badge: "beforeTaskComplete hook", enforced: true },
  { name: "Claude Code", badge: "Stop / PostToolUse hooks", enforced: true },
  { name: "Cursor", badge: "advisory only (no block)", enforced: false },
];

function Mark({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.5">
        <path d="M 4 10 C 24 10 36 30 44 46" />
        <path d="M 4 32 C 24 32 36 42 44 48" />
        <path d="M 4 68 C 24 68 36 58 44 52" />
        <path d="M 4 90 C 24 90 36 70 44 54" />
      </g>
      <rect x="42" y="36" width="14" height="28" rx="3" fill="currentColor" />
      <path d="M 56 50 L 96 50" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
    </svg>
  );
}

function TerminalPreview() {
  return (
    <div className="w-full max-w-lg rounded-xl border border-ink-3 bg-ink-2 font-mono text-sm shadow-2xl overflow-hidden">
      <div className="flex items-center gap-2 border-b border-ink-3 bg-ink px-4 py-2.5">
        <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
        <div className="h-2.5 w-2.5 rounded-full bg-yellow-500" />
        <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
        <span className="ml-2 text-xs text-stone">holdpoint check</span>
      </div>
      <div className="p-5 space-y-1 leading-relaxed">
        <div className="text-bone">
          <span className="text-green-400">✓</span> typecheck passed{" "}
          <span className="text-stone text-xs">in 1.2s</span>
        </div>
        <div className="text-bone">
          <span className="text-green-400">✓</span> lint passed{" "}
          <span className="text-stone text-xs">in 0.8s</span>
        </div>
        <div className="text-signal">
          <span>✗</span> test 1 failing — see vitest output
        </div>
        <div className="mt-3 pt-3 border-t border-ink-3">
          <div className="text-signal font-semibold">blocked: 1 check failed.</div>
          <div className="text-stone text-xs mt-1">agent cannot mark task complete.</div>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <main className="min-h-screen bg-ink text-bone">
      {/* ── Nav ──────────────────────────────────────────────── */}
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 pt-6">
        <div className="flex items-center gap-2.5 text-bone">
          <Mark size={32} />
          <span
            className="text-lg font-bold tracking-tight text-bone"
            style={{ fontFamily: "'JetBrains Mono', 'IBM Plex Mono', ui-monospace, monospace" }}
          >
            holdpoint
          </span>
          <span className="ml-2 rounded-full border border-signal/40 bg-signal/10 px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest text-signal">
            alpha
          </span>
        </div>
        <div className="flex items-center gap-3">
          <a href="/docs" className="text-sm text-stone transition hover:text-bone">
            Docs
          </a>
          <a
            href="https://github.com/holdpoint-dev/holdpoint"
            className="flex items-center gap-1.5 rounded-lg border border-ink-3 bg-ink-2 px-3 py-1.5 text-sm text-stone transition hover:border-stone hover:text-bone"
          >
            <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
            GitHub
          </a>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-6 pb-16 pt-16">
        <div className="flex flex-col items-center gap-12 lg:flex-row lg:items-center">
          {/* Left — copy */}
          <div className="flex-1 text-center lg:text-left">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-signal/30 bg-signal/10 px-3 py-1 text-sm text-signal">
              <span className="h-1.5 w-1.5 rounded-full bg-signal" />
              Early alpha — feedback welcome
            </div>

            <h1 className="mt-4 text-5xl font-bold tracking-tight text-bone leading-tight">
              Stop your AI agent from <span className="text-signal">shipping broken code</span>
            </h1>

            <p className="mt-5 max-w-lg text-lg text-stone leading-relaxed">
              Holdpoint enforces deterministic eval checkpoints on Copilot CLI, Claude Code, Cursor,
              and any AI coding agent. One{" "}
              <code
                className="rounded bg-ink-2 px-1.5 py-0.5 text-sm text-signal"
                style={{ fontFamily: "'JetBrains Mono', 'IBM Plex Mono', ui-monospace, monospace" }}
              >
                checks.yaml
              </code>{" "}
              file. Zero config required.
            </p>

            {/* CLI install command */}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <InstallCommand />
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-stone/70">
              <span>or:</span>
              <code
                style={{ fontFamily: "'JetBrains Mono', 'IBM Plex Mono', ui-monospace, monospace" }}
              >
                npx holdpoint@alpha init
              </code>
            </div>

            <p className="mt-3 text-xs text-stone/70">
              Requires Node.js 18+ and an active git repo.
            </p>
          </div>

          {/* Right — terminal preview */}
          <div className="flex shrink-0 items-center justify-center lg:w-auto">
            <TerminalPreview />
          </div>
        </div>
      </section>

      {/* ── Supported agents ─────────────────────────────────── */}
      <section className="border-y border-ink-3 bg-ink-2/50 py-8">
        <div className="mx-auto max-w-4xl px-6">
          <p className="mb-6 text-center text-xs font-semibold uppercase tracking-widest text-stone">
            Works with
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8">
            {AGENTS.map((agent) => (
              <div key={agent.name} className="flex items-center gap-2">
                <span className="font-semibold text-bone">{agent.name}</span>
                <code
                  className={`rounded px-1.5 py-0.5 text-xs ${agent.enforced ? "bg-ink-3 text-stone" : "bg-signal/10 text-signal"}`}
                  style={{
                    fontFamily: "'JetBrains Mono', 'IBM Plex Mono', ui-monospace, monospace",
                  }}
                >
                  {agent.badge}
                </code>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-6 py-24">
        <h2 className="mb-12 text-center text-3xl font-bold text-bone">
          Everything you need to keep agents honest
        </h2>
        <div className="grid gap-6 sm:grid-cols-2">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-ink-3 bg-ink-2 p-6 transition hover:border-signal/30"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-signal/15">
                <feature.icon className="h-5 w-5 text-signal" />
              </div>
              <h3 className="mb-2 font-semibold text-bone">{feature.title}</h3>
              <p className="text-sm leading-relaxed text-stone">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Status ───────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-6 pb-8">
        <div className="rounded-xl border border-ink-3 bg-ink-2 p-6">
          <div className="mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-signal" />
            <h2 className="text-xl font-bold text-bone">Status</h2>
          </div>
          <p className="mb-4 text-sm text-stone">
            Holdpoint is in <span className="font-semibold text-bone">early alpha</span>. What works
            today:
          </p>
          <ul className="mb-4 space-y-1 text-sm text-stone">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-green-400">✓</span>
              Deterministic check enforcement on GitHub Copilot CLI
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-green-400">✓</span>
              Deterministic check enforcement on Claude Code (PostToolUse + Stop hooks)
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-green-400">✓</span>
              YAML schema + validation (
              <code
                className="rounded bg-ink-3 px-1 text-xs text-stone"
                style={{ fontFamily: "'JetBrains Mono', 'IBM Plex Mono', ui-monospace, monospace" }}
              >
                yaml-core
              </code>{" "}
              package, covered by tests)
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-green-400">✓</span>
              Stack auto-detection for TypeScript, Next.js, Python, Go, fullstack
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-green-400">✓</span>
              Visual builder ships inside{" "}
              <code
                className="rounded bg-ink-3 px-1 text-xs text-stone"
                style={{ fontFamily: "'JetBrains Mono', 'IBM Plex Mono', ui-monospace, monospace" }}
              >
                @holdpoint/cli
              </code>{" "}
              — works for any installed user via{" "}
              <code
                className="rounded bg-ink-3 px-1 text-xs text-stone"
                style={{ fontFamily: "'JetBrains Mono', 'IBM Plex Mono', ui-monospace, monospace" }}
              >
                holdpoint builder
              </code>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-green-400">✓</span>
              86 tests across all engine packages and CLI detection logic
            </li>
          </ul>
          <p className="mb-2 text-sm text-stone">What&apos;s incomplete:</p>
          <ul className="space-y-1 text-sm text-stone">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-signal">–</span>
              Cursor support is advisory; no hard block (see agent table above)
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-signal">–</span>
              Packages published to npm — install with{" "}
              <code
                className="rounded bg-ink-3 px-1 text-xs text-stone"
                style={{ fontFamily: "'JetBrains Mono', 'IBM Plex Mono', ui-monospace, monospace" }}
              >
                npx holdpoint@alpha init
              </code>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-signal">–</span>
              npm-published API surface may change before 1.0
            </li>
          </ul>
        </div>
      </section>

      {/* ── Code example ─────────────────────────────────────── */}
      <section className="mx-auto max-w-3xl px-6 pb-24">
        <h2 className="mb-8 text-center text-3xl font-bold text-bone">As simple as a YAML file</h2>
        <div className="overflow-hidden rounded-xl border border-ink-3">
          <div className="flex items-center gap-2 border-b border-ink-3 bg-ink-2 px-4 py-2.5">
            <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
            <div className="h-2.5 w-2.5 rounded-full bg-yellow-500" />
            <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
            <span
              className="ml-2 text-xs text-stone"
              style={{ fontFamily: "'JetBrains Mono', 'IBM Plex Mono', ui-monospace, monospace" }}
            >
              checks.yaml
            </span>
          </div>
          <pre
            className="overflow-x-auto bg-ink p-6 text-sm leading-relaxed text-stone"
            style={{ fontFamily: "'JetBrains Mono', 'IBM Plex Mono', ui-monospace, monospace" }}
          >
            <span className="text-signal">{"checks:"}</span>
            {`
  - id: typecheck
    label: "TypeScript type check"
    cmd: "pnpm typecheck"
  - id: test
    label: "Run unit tests"
    cmd: "pnpm test --run"
  - id: openapi-updated
    label: "OpenAPI spec updated"
    when: backend
    conditionId: has-openapi
    prompt: "Update openapi.yaml for any API route changes."`}
          </pre>
        </div>
        <p className="mt-6 text-center text-sm text-stone">
          Install with{" "}
          <code
            className="rounded bg-ink-2 px-1.5 py-0.5 text-signal"
            style={{ fontFamily: "'JetBrains Mono', 'IBM Plex Mono', ui-monospace, monospace" }}
          >
            npx holdpoint@alpha init
          </code>
        </p>
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="border-t border-ink-3 py-10">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-6 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2 text-stone">
            <Mark size={22} />
            <span
              className="text-sm font-semibold text-stone"
              style={{ fontFamily: "'JetBrains Mono', 'IBM Plex Mono', ui-monospace, monospace" }}
            >
              holdpoint
            </span>
          </div>
          <p className="text-sm text-stone/70">
            Open source under the MIT license.{" "}
            <a
              href="https://github.com/holdpoint-dev/holdpoint"
              className="text-signal hover:text-signal/80"
            >
              GitHub ↗
            </a>
          </p>
        </div>
      </footer>
    </main>
  );
}
