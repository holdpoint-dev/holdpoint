import { Terminal, GitBranch, Zap, Shield, Code2, ArrowRight } from "lucide-react";

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
  { name: "Copilot CLI", badge: "extension.mjs", color: "text-blue-400" },
  { name: "Claude Code", badge: "settings.json hooks", color: "text-orange-400" },
  { name: "Cursor", badge: ".cursorrules", color: "text-purple-400" },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 pt-24 pb-16 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-sm text-indigo-400">
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
          Now in private beta
        </div>

        <h1 className="mx-auto mt-6 max-w-3xl text-5xl font-bold tracking-tight text-white">
          Stop your AI agent from{" "}
          <span className="text-indigo-400">shipping broken code</span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-400">
          Sentinel enforces deterministic eval checkpoints on Copilot CLI, Claude Code, Cursor,
          and any AI coding agent. One{" "}
          <code className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-sm text-indigo-300">
            checks.yaml
          </code>{" "}
          file. Zero configuration required.
        </p>

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 font-mono text-sm">
            <Terminal className="h-4 w-4 text-indigo-400" />
            <span className="text-slate-300">
              curl -fsSL https://raw.githubusercontent.com/HarzerHeribert/sentinel/main/install.sh | sh
            </span>
          </div>
        </div>

        <p className="mt-4 text-sm text-slate-600">
          Requires Node.js 18+ and an active git repo.
        </p>
      </section>

      {/* Supported agents */}
      <section className="border-y border-slate-800 bg-slate-900/50 py-8">
        <div className="mx-auto max-w-4xl px-6">
          <p className="mb-6 text-center text-sm font-medium uppercase tracking-widest text-slate-500">
            Works with
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8">
            {AGENTS.map((agent) => (
              <div key={agent.name} className="flex items-center gap-2">
                <span className={`font-semibold ${agent.color}`}>{agent.name}</span>
                <code className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-xs text-slate-400">
                  {agent.badge}
                </code>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-5xl px-6 py-24">
        <h2 className="mb-12 text-center text-3xl font-bold text-white">
          Everything you need to keep agents honest
        </h2>
        <div className="grid gap-6 sm:grid-cols-2">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-slate-800 bg-slate-900 p-6"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/20">
                <feature.icon className="h-5 w-5 text-indigo-400" />
              </div>
              <h3 className="mb-2 font-semibold text-white">{feature.title}</h3>
              <p className="text-sm leading-relaxed text-slate-400">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Code example */}
      <section className="mx-auto max-w-3xl px-6 pb-24">
        <h2 className="mb-8 text-center text-3xl font-bold text-white">
          As simple as a YAML file
        </h2>
        <div className="overflow-hidden rounded-xl border border-slate-800">
          <div className="flex items-center gap-2 border-b border-slate-800 bg-slate-900 px-4 py-2.5">
            <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
            <div className="h-2.5 w-2.5 rounded-full bg-yellow-500" />
            <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
            <span className="ml-2 font-mono text-xs text-slate-500">checks.yaml</span>
          </div>
          <pre className="overflow-x-auto bg-slate-950 p-6 font-mono text-sm leading-relaxed text-slate-300">
{`version: 1
context:
  guides: {}
conditions:
  - id: has-openapi
    operator: file_exists
    path: openapi.yaml
deterministic:
  - id: typecheck
    label: "TypeScript type check"
    trigger:
      type: always
    cmd: "pnpm typecheck"
  - id: test
    label: "Run unit tests"
    trigger:
      type: always
    cmd: "pnpm test --run"
manual:
  - id: openapi-updated
    label: "OpenAPI spec updated"
    trigger:
      type: backend
    conditionId: has-openapi
    manual: "Update openapi.yaml for any API route changes."`}
          </pre>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8 text-center text-sm text-slate-600">
        <p>
          Sentinel is open source under the MIT license.{" "}
          <a
            href="https://github.com/HarzerHeribert/sentinel"
            className="text-indigo-500 hover:text-indigo-400"
          >
            GitHub ↗
          </a>
        </p>
      </footer>
    </main>
  );
}
