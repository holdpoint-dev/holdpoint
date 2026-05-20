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

const HERO_POINTS = [
  "Keep checks and prompts in checks.yaml",
  "Block unfinished work at task completion",
  "Watch sessions, conflicts, approvals, and check runs locally",
] as const;

const LIVE_FEATURES = [
  {
    icon: Radio,
    eyebrow: "Local daemon",
    title: "A browser UI that opens from the CLI.",
    description:
      "Holdpoint Live starts through a local daemon, so the Live view belongs to the repo you are working in instead of a hosted dashboard.",
  },
  {
    icon: Workflow,
    eyebrow: "Project-first timeline",
    title: "One project, many active sessions.",
    description:
      "See multiple sessions side by side, filter events, and keep the current repo in focus instead of mixing work from unrelated codebases.",
  },
  {
    icon: GitBranch,
    eyebrow: "Conflict warnings",
    title: "Same-file overlap shows up early.",
    description:
      "When two sessions in the same project touch the same path, the UI makes that visible before the edits turn into a messy merge.",
  },
  {
    icon: Shield,
    eyebrow: "Copilot controls + SDK",
    title: "Control where it exists, extend where you need it.",
    description:
      "Copilot sessions can expose pending approvals and context injection, while holdpoint engines and the SDK open the door for third-party Live adapters.",
  },
] as const;

const AGENTS = [
  {
    name: "GitHub Copilot",
    summary: "Richest Live bridge",
    color: "#7C3AED",
    bg: "rgba(124,58,237,0.10)",
    border: "rgba(124,58,237,0.24)",
  },
  {
    name: "Claude Code",
    summary: "Hooks + Live events",
    color: "#CC785C",
    bg: "rgba(204,120,92,0.10)",
    border: "rgba(204,120,92,0.24)",
  },
  {
    name: "Cursor",
    summary: "Advisory rules",
    color: "#2563EB",
    bg: "rgba(37,99,235,0.10)",
    border: "rgba(37,99,235,0.24)",
  },
  {
    name: "OpenAI Codex",
    summary: "Stop-hook gating",
    color: "#10A37F",
    bg: "rgba(16,163,127,0.10)",
    border: "rgba(16,163,127,0.24)",
  },
] as const;

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
          ? "inline-flex items-center justify-center gap-2 rounded-full bg-signal px-5 py-3 text-sm font-semibold text-white transition hover:bg-signal/[0.92]"
          : "inline-flex items-center justify-center gap-2 rounded-full border border-white/[0.12] bg-white/5 px-5 py-3 text-sm font-semibold text-bone transition hover:border-white/20 hover:bg-white/[0.08]"
      }
    >
      {children}
    </a>
  );
}

function SectionIntro({
  eyebrow,
  title,
  children,
  align = "center",
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
  align?: "left" | "center";
}) {
  const alignment = align === "left" ? "text-left" : "mx-auto max-w-3xl text-center";
  return (
    <div className={alignment}>
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-signal">{eyebrow}</p>
      <h2 className="mt-5 text-3xl font-bold tracking-tight text-bone sm:text-4xl">{title}</h2>
      <div className="mt-5 text-base leading-8 text-stone sm:text-lg">{children}</div>
    </div>
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
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-bone">{label}</p>
        <p className="mt-1 text-xs leading-6 text-stone">{detail}</p>
      </div>
      <span
        className={`mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
          status === "pass" ? "bg-emerald-500/12 text-emerald-300" : "bg-signal/12 text-signal"
        }`}
      >
        <CheckCircle2 className="h-3.5 w-3.5" />
        {status === "pass" ? "pass" : "open"}
      </span>
    </div>
  );
}

function HeroPreview() {
  return (
    <div className="surface-panel overflow-hidden rounded-[32px] p-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)]">
        <div className="rounded-[28px] border border-white/10 bg-ink/92">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-4">
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
              <div className="h-2.5 w-2.5 rounded-full bg-yellow-500" />
              <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
              <span className="ml-2 text-xs text-stone">holdpoint check --staged</span>
            </div>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-stone">
              task gate
            </span>
          </div>

          <div className="space-y-3 p-4">
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-bone/85">
              <TerminalSquare className="h-4 w-4 text-signal" />2 automated checks passed, 1 prompt
              still open
            </div>
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
            <div className="rounded-2xl border border-signal/[0.18] bg-signal/10 px-4 py-3 text-sm leading-6 text-bone/90">
              task completion stays blocked until the remaining prompt is handled.
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-ink/92">
          <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-stone">Holdpoint Live</p>
              <h3 className="mt-1 text-lg font-semibold text-bone">Project-first session view</h3>
            </div>
            <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
              local daemon
            </span>
          </div>

          <div className="grid gap-0 lg:grid-cols-[176px_minmax(0,1fr)]">
            <aside className="border-b border-white/10 bg-black/[0.16] lg:border-b-0 lg:border-r">
              <div className="border-b border-white/10 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-stone">
                Projects
              </div>
              <div className="space-y-2 p-3">
                {[
                  { name: "holdpoint", detail: "3 sessions · 8s ago", active: true },
                  { name: "api-gateway", detail: "1 session · 2m ago", active: false },
                  { name: "design-system", detail: "2 sessions · 9m ago", active: false },
                ].map((project) => (
                  <div
                    key={project.name}
                    className={`rounded-2xl border px-3 py-3 ${
                      project.active
                        ? "border-white/[0.12] bg-white/[0.06]"
                        : "border-white/[0.08] bg-white/[0.02]"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-signal" />
                      <span className="text-sm font-medium text-bone">{project.name}</span>
                    </div>
                    <p className="mt-2 text-xs text-stone">{project.detail}</p>
                  </div>
                ))}
              </div>
            </aside>

            <div className="min-w-0">
              <div className="border-b border-red-500/[0.18] bg-red-500/[0.08] px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-red-500/28 bg-red-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-red-200">
                    conflict warning
                  </span>
                  <span className="text-xs text-red-100/90">src/check.ts · copilot vs claude</span>
                </div>
              </div>

              <div className="grid gap-4 p-4">
                <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-bone">copilot · 8ac91e</p>
                      <p className="mt-1 text-xs text-stone">packages/cli/src/commands/check.ts</p>
                    </div>
                    <span className="rounded-full border border-orange-500/30 bg-orange-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-200">
                      awaiting approval
                    </span>
                  </div>

                  <div className="mt-4 rounded-2xl border border-orange-500/20 bg-orange-500/10 px-3 py-3">
                    <p className="text-xs font-medium text-orange-100">Apply workspace edit</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] text-emerald-100">
                        Approve
                      </span>
                      <span className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-[11px] text-red-100">
                        Deny
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-stone">
                        Inject context
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone">
                      Timeline
                    </p>
                    <p className="text-xs text-stone">check_run · conflict · permission_pending</p>
                  </div>
                  <div className="space-y-3">
                    {[
                      ["09:41:17", "check_run", "TypeScript — pass"],
                      ["09:41:20", "permission_pending", "apply workspace edit"],
                      ["09:41:29", "conflict", "src/check.ts touched by another session"],
                    ].map(([time, kind, detail]) => (
                      <div
                        key={`${time}-${kind}`}
                        className="grid grid-cols-[68px_104px_minmax(0,1fr)] gap-3"
                      >
                        <span className="text-xs text-stone">{time}</span>
                        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-bone">
                          {kind}
                        </span>
                        <span className="truncate text-xs text-stone">{detail}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SystemPreview() {
  return (
    <div className="surface-panel rounded-[32px] p-5 sm:p-6">
      <div className="grid gap-4">
        <div className="rounded-[28px] border border-white/10 bg-black/20 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-stone">checks.yaml</p>
              <p className="mt-2 text-lg font-semibold text-bone">The repo stays in charge.</p>
            </div>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-stone">
              source of truth
            </span>
          </div>
          <div className="mt-4 rounded-[22px] border border-white/10 bg-ink/85 px-4 py-4 font-mono text-xs text-stone">
            <div className="text-signal">checks:</div>
            <div className="mt-2">- id: typecheck</div>
            <div>cmd: pnpm turbo typecheck</div>
            <div className="mt-2">- id: docs-review</div>
            <div>prompt: update API docs</div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,0.92fr)_72px_minmax(0,1.08fr)] lg:items-center">
          <div className="rounded-[28px] border border-white/10 bg-black/20 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-stone">Adapter surfaces</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {["Copilot", "Claude", "Cursor", "Codex"].map((agent) => (
                <div
                  key={agent}
                  className="rounded-[20px] border border-white/10 bg-white/[0.04] px-4 py-4 text-center text-sm font-medium text-bone"
                >
                  {agent}
                </div>
              ))}
            </div>
          </div>

          <div className="hidden justify-center lg:flex">
            <div className="rounded-full border border-white/10 bg-white/[0.04] p-4 text-stone">
              <ArrowRight className="h-5 w-5" />
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-black/20 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-stone">What users see</p>
            <div className="mt-4 space-y-3">
              <div className="rounded-[20px] border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                TypeScript — pass
              </div>
              <div className="rounded-[20px] border border-signal/20 bg-signal/10 px-4 py-3 text-sm text-signal">
                Prompt still open
              </div>
              <div className="rounded-[20px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-stone">
                Holdpoint Live shows sessions, conflicts, approvals, and check runs.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  eyebrow,
  title,
  description,
}: {
  icon: (typeof LIVE_FEATURES)[number]["icon"];
  eyebrow: string;
  title: string;
  description: string;
}) {
  const Icon = icon;
  return (
    <article className="surface-panel rounded-[30px] p-7 sm:p-8">
      <div className="flex items-center justify-between gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-signal/12">
          <Icon className="h-5 w-5 text-signal" />
        </div>
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone">
          {eyebrow}
        </span>
      </div>
      <h3 className="mt-6 max-w-sm text-2xl font-semibold leading-tight text-bone">{title}</h3>
      <p className="mt-4 max-w-xl text-base leading-8 text-stone">{description}</p>
    </article>
  );
}

/** Landing page for the Holdpoint marketing site. */
export default function HomePage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-ink text-bone">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(circle_at_top,rgba(224,78,42,0.12),transparent_62%)]" />

      <nav className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 pt-6 sm:pt-8">
        <div className="flex items-center gap-2.5 text-bone">
          <Mark size={32} />
          <span
            className="text-lg font-bold tracking-tight text-bone"
            style={{ fontFamily: "'JetBrains Mono', 'IBM Plex Mono', ui-monospace, monospace" }}
          >
            holdpoint
          </span>
          <span className="ml-1 rounded-full border border-signal/[0.35] bg-signal/10 px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest text-signal">
            alpha
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <a href="/docs" className="text-sm text-stone transition hover:text-bone">
            Docs
          </a>
          <a
            href="https://github.com/holdpoint-dev/holdpoint"
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-stone transition hover:border-white/20 hover:text-bone"
          >
            <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
            GitHub
          </a>
        </div>
      </nav>

      <section className="mx-auto max-w-6xl px-6 pb-24 pt-16 sm:pb-28 sm:pt-24">
        <div className="grid gap-12 xl:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)] xl:items-start">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-signal/25 bg-signal/10 px-4 py-2 text-sm text-signal">
              checks.yaml + Holdpoint Live
            </div>

            <h1 className="mt-8 text-5xl font-bold leading-[1.02] tracking-tight text-bone sm:text-6xl lg:text-7xl">
              Keep your agents in check
            </h1>

            <p className="mt-7 text-lg leading-8 text-stone sm:text-xl">
              Holdpoint keeps eval checkpoints in your repo, blocks unfinished work at task
              completion, and gives you a local Live view for sessions, conflicts, approvals, and
              check runs.
            </p>

            <div className="mt-10 grid gap-3 text-sm text-stone sm:text-base">
              {HERO_POINTS.map((point) => (
                <div key={point} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-signal" />
                  <span>{point}</span>
                </div>
              ))}
            </div>

            <div className="mt-10">
              <InstallCommand />
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <HeroLink href="/docs" primary>
                Read the docs
                <ArrowRight className="h-4 w-4" />
              </HeroLink>
              <HeroLink href="https://github.com/holdpoint-dev/holdpoint">
                View the repository
              </HeroLink>
            </div>

            <p className="mt-6 text-sm text-stone">
              Node.js 18+, a git repository, and a supported agent are required.
            </p>
          </div>

          <HeroPreview />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-24 sm:py-28">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] lg:items-center">
          <SectionIntro
            eyebrow="How it works"
            title="One config file. Clear stop points."
            align="left"
          >
            Holdpoint is strongest when it stays boring in the right places: the repo keeps the
            rules, the adapters enforce them where they can, and the Live view makes active work
            visible without turning the product into a dashboard circus.
          </SectionIntro>
          <SystemPreview />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-24 sm:py-28">
        <SectionIntro eyebrow="Now shipping" title="Recent Holdpoint Live work, shown plainly.">
          The recent work is mostly about the Live layer: local daemon boot, project-first session
          views, same-file conflict warnings, Copilot controls where available, and adapter
          discovery for extension points.
        </SectionIntro>

        <div className="mt-14 grid gap-6 md:grid-cols-2">
          {LIVE_FEATURES.map((feature) => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24 sm:pb-28">
        <div className="surface-panel rounded-[34px] p-8 sm:p-10">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-signal">
                Supported agents
              </p>
              <h2 className="mt-5 text-3xl font-bold tracking-tight text-bone sm:text-4xl">
                One config, four adapter surfaces.
              </h2>
              <p className="mt-5 text-base leading-8 text-stone sm:text-lg">
                Holdpoint installs every adapter by default so the same repo rules can travel across
                Copilot, Claude Code, Cursor, and Codex without splitting the configuration.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <HeroLink href="/docs#agents">See supported agents</HeroLink>
            </div>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {AGENTS.map((agent) => (
              <div
                key={agent.name}
                className="rounded-[24px] border px-5 py-5"
                style={{ borderColor: agent.border, background: agent.bg }}
              >
                <div className="text-sm font-semibold text-bone">{agent.name}</div>
                <div className="mt-2 text-sm text-stone">{agent.summary}</div>
              </div>
            ))}
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
              Eval checkpoints and local Live visibility for AI coding agents.
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
