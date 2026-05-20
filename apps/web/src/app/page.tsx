import type { ReactNode } from "react";
import {
  ArrowRight,
  CheckCircle2,
  GitBranch,
  Radio,
  Shield,
  TerminalSquare,
  Workflow,
} from "lucide-react";
import { InstallCommand } from "../components/InstallCommand";
import { AgentBanner } from "../components/AgentBanner";

const FEATURES = [
  {
    icon: Shield,
    title: "Deterministic checks",
    description: "Run the commands you already trust before an agent can finish work.",
  },
  {
    icon: Workflow,
    title: "Relevant prompts",
    description: "Show manual review reminders only when the matching files change.",
  },
  {
    icon: Radio,
    title: "Local Live UI",
    description:
      "Open a project-first multi-session view with check runs, conflict warnings, and live Copilot controls.",
  },
  {
    icon: GitBranch,
    title: "Repo-native config",
    description: "Keep the rules in checks.yaml and review them like the rest of the codebase.",
  },
];

const QUICK_POINTS = [
  "checks.yaml stays in git",
  "local Live UI with multi-session timelines and conflict warnings",
  "Copilot CLI, Claude Code, Cursor, and Codex",
  "install, Live, and schema docs in one place",
];

function HeroLink({
  href,
  children,
  primary = false,
}: {
  href: string;
  children: ReactNode;
  primary?: boolean;
}) {
  return (
    <a
      href={href}
      className={
        primary
          ? "inline-flex items-center justify-center gap-2 rounded-xl border border-signal/40 bg-signal px-4 py-3 text-sm font-semibold text-white transition hover:bg-signal/90"
          : "inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-bone transition hover:border-white/20 hover:bg-white/10"
      }
    >
      {children}
    </a>
  );
}

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

function TerminalRow({
  label,
  detail,
  status,
}: {
  label: string;
  detail: string;
  status: "pass" | "open";
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-bone">{label}</p>
        <p className="mt-1 text-xs text-stone">{detail}</p>
      </div>
      <span
        className={`mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
          status === "pass" ? "bg-emerald-500/15 text-emerald-300" : "bg-signal/15 text-signal"
        }`}
      >
        <CheckCircle2 className="h-3.5 w-3.5" />
        {status === "pass" ? "pass" : "open"}
      </span>
    </div>
  );
}

function TerminalPreview() {
  return (
    <div className="surface-panel animate-float-desktop w-full max-w-[33rem] overflow-hidden rounded-[28px] p-3 shadow-[0_30px_120px_rgba(6,10,14,0.55)]">
      <div className="rounded-[22px] border border-white/10 bg-ink/90">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
            <div className="h-2.5 w-2.5 rounded-full bg-yellow-500" />
            <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
            <span className="ml-2 text-xs text-stone">holdpoint check --staged</span>
          </div>
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-stone">
            checks.yaml
          </span>
        </div>

        <div className="space-y-4 p-4 sm:p-5">
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-bone/85">
            <TerminalSquare className="h-4 w-4 text-signal" />2 automated checks passed, 1 prompt
            still open
          </div>

          <div className="space-y-3">
            <TerminalRow
              label="TypeScript typecheck"
              detail="No type errors in the changed packages."
              status="pass"
            />
            <TerminalRow
              label="ESLint"
              detail="Formatting and lint rules stayed clean."
              status="pass"
            />
            <TerminalRow
              label="OpenAPI review"
              detail="Backend files changed, so the API docs still need a human check."
              status="open"
            />
          </div>

          <div className="rounded-2xl border border-signal/20 bg-signal/10 px-4 py-3 text-sm leading-6 text-bone/90">
            task completion stays blocked until the remaining prompt is handled.
          </div>
        </div>
      </div>
    </div>
  );
}

/** Landing page for the Holdpoint marketing site. */
export default function HomePage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-ink text-bone">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[30rem] bg-[radial-gradient(circle_at_top,rgba(224,78,42,0.16),transparent_58%)]" />

      <nav className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 pt-6 sm:pt-8">
        <div className="flex items-center gap-2.5 text-bone">
          <Mark size={32} />
          <span
            className="text-lg font-bold tracking-tight text-bone"
            style={{ fontFamily: "'JetBrains Mono', 'IBM Plex Mono', ui-monospace, monospace" }}
          >
            holdpoint
          </span>
          <span className="ml-1 rounded-full border border-signal/40 bg-signal/10 px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest text-signal">
            alpha
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <a href="/docs" className="text-sm text-stone transition hover:text-bone">
            Docs
          </a>
          <a
            href="https://github.com/holdpoint-dev/holdpoint"
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-stone transition hover:border-white/20 hover:text-bone"
          >
            <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
            GitHub
          </a>
        </div>
      </nav>

      <section className="hero-grid-bg relative mx-auto max-w-6xl px-6 pb-24 pt-14 sm:pb-32 sm:pt-24">
        <div className="grid items-start gap-16 lg:grid-cols-[minmax(0,0.92fr)_minmax(320px,1.08fr)] lg:gap-14">
          <div className="min-w-0 text-center lg:pt-6 lg:text-left">
            <div className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-signal/30 bg-signal/10 px-3 py-1 text-sm text-signal">
              Deterministic checkpoints for AI coding agents
            </div>

            <h1 className="animate-fade-up delay-100 mt-8 text-4xl font-bold leading-[1.08] tracking-tight text-bone sm:text-5xl lg:text-6xl">
              Checks for Copilot CLI, Claude Code, Cursor, and Codex.
            </h1>

            <p className="animate-fade-up delay-200 mt-6 max-w-xl text-lg leading-8 text-stone">
              Holdpoint keeps agent checks in your repo and adds a local Live UI for session
              timelines, conflicts, and Copilot-only controls. Add commands and prompts in{" "}
              <code
                className="rounded bg-white/5 px-1.5 py-0.5 text-sm text-signal"
                style={{ fontFamily: "'JetBrains Mono', 'IBM Plex Mono', ui-monospace, monospace" }}
              >
                checks.yaml
              </code>
              . The docs cover installation, adapters, commands, and the full schema.
            </p>

            <div className="animate-fade-up delay-300 mt-10 space-y-3">
              {QUICK_POINTS.map((point) => (
                <div
                  key={point}
                  className="flex items-start justify-center gap-3 text-sm text-stone lg:justify-start"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-signal" />
                  <span>{point}</span>
                </div>
              ))}
            </div>

            <div className="animate-fade-up delay-400 mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap lg:justify-start">
              <HeroLink href="/docs" primary>
                Read the docs
                <ArrowRight className="h-4 w-4" />
              </HeroLink>
              <HeroLink href="/docs#live-ui">See Holdpoint Live</HeroLink>
              <HeroLink href="https://github.com/holdpoint-dev/holdpoint">
                View the repository
              </HeroLink>
            </div>

            <p className="animate-fade-up delay-400 mt-5 text-sm text-stone">
              Node.js 18+, a git repository, and a supported agent are required.
            </p>
          </div>

          <div className="flex items-center justify-center lg:justify-end">
            <TerminalPreview />
          </div>
        </div>

        <div className="animate-fade-up delay-400 mx-auto mt-16 w-full max-w-5xl">
          <InstallCommand />
        </div>
      </section>

      <AgentBanner />

      <section className="mx-auto max-w-5xl px-6 py-24 sm:py-28">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-signal">
            What Holdpoint does
          </p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-bone sm:text-4xl">
            Checks in repo. Live visibility in the browser.
          </h2>
          <p className="mt-5 text-lg leading-8 text-stone">
            This page stays brief. It shows the core idea, the local Live surface, the install
            command, and the supported agents. The docs explain the CLI, schema, and contributor
            workflows in full.
          </p>
        </div>

        <div className="mt-14 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="surface-panel rounded-[28px] p-6 sm:p-7">
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-signal/12">
                <feature.icon className="h-5 w-5 text-signal" />
              </div>
              <h3 className="text-lg font-semibold text-bone">{feature.title}</h3>
              <p className="mt-3 text-sm leading-7 text-stone">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-24 sm:pb-28">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(260px,0.9fr)]">
          <div className="surface-panel overflow-hidden rounded-[32px]">
            <div className="flex items-center gap-2 border-b border-white/10 bg-white/[0.03] px-4 py-3">
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
              className="overflow-x-auto bg-ink/85 p-5 text-sm leading-7 text-stone sm:p-6"
              style={{ fontFamily: "'JetBrains Mono', 'IBM Plex Mono', ui-monospace, monospace" }}
            >
              <span className="text-signal">{"checks:"}</span>
              {`
  - id: typecheck
    label: "TypeScript type check"
    cmd: "pnpm turbo typecheck"

  - id: web-lint
    label: "Lint the web app"
    when: frontend
    cmd: "pnpm --filter @holdpoint/web lint"

  - id: api-review
    label: "API review"
    when: backend
    prompt: "Update the API docs if the contract changed."`}
            </pre>
          </div>

          <div className="flex flex-col justify-between gap-8">
            <div className="max-w-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-signal">
                Enough for this page
              </p>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-bone">
                The detailed explanation is in the docs.
              </h2>
              <p className="mt-5 text-base leading-8 text-stone">
                If you want the Live UI entrypoints, CLI commands, templates, or the full
                checks.yaml schema, go there. This page only needs to answer what Holdpoint is and
                how to start.
              </p>
            </div>

            <div className="space-y-3">
              <HeroLink href="/docs" primary>
                Open the docs
                <ArrowRight className="h-4 w-4" />
              </HeroLink>
              <p className="text-sm leading-7 text-stone">
                Installation, adapters, templates, and the full{" "}
                <code
                  className="rounded bg-white/5 px-1.5 py-0.5 text-bone"
                  style={{
                    fontFamily: "'JetBrains Mono', 'IBM Plex Mono', ui-monospace, monospace",
                  }}
                >
                  checks.yaml
                </code>{" "}
                reference live there.
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 py-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-stone">
              <Mark size={22} />
              <span
                className="text-sm font-semibold text-stone"
                style={{ fontFamily: "'JetBrains Mono', 'IBM Plex Mono', ui-monospace, monospace" }}
              >
                holdpoint
              </span>
            </div>
            <p className="mt-3 max-w-xl text-sm leading-6 text-stone">
              Eval checkpoints and local Live observability for AI coding agents.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm text-stone">
            <a href="/docs" className="transition hover:text-bone">
              Docs
            </a>
            <a
              href="https://github.com/holdpoint-dev/holdpoint"
              className="inline-flex items-center gap-1 transition hover:text-bone"
            >
              GitHub
              <ArrowRight className="h-4 w-4" />
            </a>
            <span className="rounded-full border border-signal/30 bg-signal/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-signal">
              MIT licensed
            </span>
          </div>
        </div>
      </footer>
    </main>
  );
}
