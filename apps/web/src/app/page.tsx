
import { Terminal, GitBranch, Zap, Shield, Code2 } from "lucide-react";

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

/* ─── Inline SVG components so they render without <img> flash ─── */

function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <polygon
        points="50,7 87.2,28.5 87.2,71.5 50,93 12.8,71.5 12.8,28.5"
        fill="#0F172A"
        stroke="#4F46E5"
        strokeWidth="5.5"
        strokeLinejoin="round"
      />
      <path d="M28,50 Q50,37 72,50 Q50,63 28,50Z" fill="white" />
      <circle cx="50" cy="50" r="12" fill="#F59E0B" />
      <circle cx="46" cy="47" r="10.5" fill="#0F172A" />
    </svg>
  );
}

function LogoMarkWhite({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <polygon
        points="50,7 87.2,28.5 87.2,71.5 50,93 12.8,71.5 12.8,28.5"
        fill="#0F172A"
        stroke="white"
        strokeWidth="5.5"
        strokeLinejoin="round"
      />
      <path d="M28,50 Q50,37 72,50 Q50,63 28,50Z" fill="white" />
      <circle cx="50" cy="50" r="12" fill="#F59E0B" />
      <circle cx="46" cy="47" r="10.5" fill="#0F172A" />
    </svg>
  );
}

function RobotMascot() {
  return (
    <svg
      viewBox="0 0 180 270"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full"
    >
      {/* Antenna nubs */}
      <rect x="62" y="0" width="14" height="20" rx="7" fill="#4F46E5" />
      <rect x="104" y="0" width="14" height="20" rx="7" fill="#4F46E5" />
      {/* Head */}
      <rect x="35" y="16" width="110" height="82" rx="18" fill="#4F46E5" />
      <rect x="35" y="78" width="110" height="20" rx="0" fill="#3730A3" opacity="0.45" />
      {/* Eyes */}
      <circle cx="72" cy="52" r="16" fill="white" />
      <circle cx="74" cy="54" r="9" fill="#0F172A" />
      <circle cx="78" cy="50" r="3" fill="white" />
      <circle cx="108" cy="52" r="16" fill="white" />
      <circle cx="110" cy="54" r="9" fill="#0F172A" />
      <circle cx="114" cy="50" r="3" fill="white" />
      {/* Neck */}
      <rect x="75" y="96" width="30" height="16" rx="6" fill="#3730A3" />
      {/* Body */}
      <rect x="25" y="110" width="130" height="98" rx="14" fill="#4F46E5" />
      <rect x="25" y="186" width="130" height="22" rx="14" fill="#3730A3" opacity="0.6" />
      {/* Chest badge — mini hex */}
      <polygon
        points="90,136 109,147 109,169 90,180 71,169 71,147"
        fill="#0F172A"
        stroke="white"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path d="M79,158 Q90,151 101,158 Q90,165 79,158Z" fill="white" />
      <circle cx="90" cy="158" r="6" fill="#F59E0B" />
      <circle cx="88" cy="157" r="5.2" fill="#0F172A" />
      {/* Arms */}
      <rect x="0" y="114" width="26" height="68" rx="10" fill="#4F46E5" />
      <circle cx="13" cy="186" r="11" fill="#3730A3" />
      <rect x="154" y="114" width="26" height="68" rx="10" fill="#4F46E5" />
      <circle cx="167" cy="186" r="11" fill="#3730A3" />
      {/* Legs */}
      <rect x="48" y="206" width="34" height="52" rx="10" fill="#4F46E5" />
      <rect x="98" y="206" width="34" height="52" rx="10" fill="#4F46E5" />
      {/* Feet */}
      <ellipse cx="65" cy="258" rx="24" ry="10" fill="#3730A3" />
      <ellipse cx="115" cy="258" rx="24" ry="10" fill="#3730A3" />
    </svg>
  );
}

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100" style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>

      {/* ── Nav ──────────────────────────────────────────────── */}
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 pt-6">
        <div className="flex items-center gap-2.5">
          <LogoMarkWhite size={32} />
          <span className="text-lg font-bold tracking-tight text-white">sentinel</span>
        </div>
        <a
          href="https://github.com/HarzerHeribert/sentinel"
          className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-300 transition hover:border-slate-500 hover:text-white"
        >
          <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
          </svg>
          GitHub
        </a>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-6 pb-16 pt-16">
        <div className="flex flex-col items-center gap-12 lg:flex-row lg:items-center">

          {/* Left — copy */}
          <div className="flex-1 text-center lg:text-left">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-sm text-indigo-400">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
              Now in private beta
            </div>

            <h1 className="mt-4 text-5xl font-bold tracking-tight text-white leading-tight">
              Stop your AI agent from{" "}
              <span className="text-indigo-400">shipping broken code</span>
            </h1>

            <p className="mt-5 max-w-lg text-lg text-slate-400 leading-relaxed">
              Sentinel enforces deterministic eval checkpoints on Copilot CLI, Claude Code, Cursor,
              and any AI coding agent. One{" "}
              <code className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-sm text-indigo-300">
                checks.yaml
              </code>{" "}
              file. Zero config required.
            </p>

            {/* CLI install command */}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 font-mono text-sm">
                <Terminal className="h-4 w-4 shrink-0 text-indigo-400" />
                <span className="text-slate-300">npx sentinel init</span>
              </div>
              <span className="text-xs text-slate-600 sm:ml-1">or</span>
              <div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 font-mono text-sm text-slate-500">
                curl -fsSL .../install.sh | sh
              </div>
            </div>

            <p className="mt-3 text-xs text-slate-600">Requires Node.js 18+ and an active git repo.</p>
          </div>

          {/* Right — robot mascot */}
          <div className="flex shrink-0 items-end justify-center lg:w-52">
            <div className="w-40 drop-shadow-2xl">
              <RobotMascot />
            </div>
          </div>
        </div>
      </section>

      {/* ── Supported agents ─────────────────────────────────── */}
      <section className="border-y border-slate-800 bg-slate-900/50 py-8">
        <div className="mx-auto max-w-4xl px-6">
          <p className="mb-6 text-center text-xs font-semibold uppercase tracking-widest text-slate-500">
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

      {/* ── Features ─────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-6 py-24">
        <h2 className="mb-12 text-center text-3xl font-bold text-white">
          Everything you need to keep agents honest
        </h2>
        <div className="grid gap-6 sm:grid-cols-2">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-slate-800 bg-slate-900 p-6 transition hover:border-indigo-500/30"
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

      {/* ── Code example ─────────────────────────────────────── */}
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

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="border-t border-slate-800 py-10">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-6 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2">
            <LogoMarkWhite size={22} />
            <span className="text-sm font-semibold text-slate-400">sentinel</span>
          </div>
          <p className="text-sm text-slate-600">
            Open source under the MIT license.{" "}
            <a
              href="https://github.com/HarzerHeribert/sentinel"
              className="text-indigo-500 hover:text-indigo-400"
            >
              GitHub ↗
            </a>
          </p>
        </div>
      </footer>
    </main>
  );
}
