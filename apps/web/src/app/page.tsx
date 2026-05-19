import type { ReactNode } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Code2,
  GitBranch,
  Shield,
  Sparkles,
  TerminalSquare,
  Workflow,
  Zap,
} from "lucide-react";
import { InstallCommand } from "../components/InstallCommand";
import { AgentBanner } from "../components/AgentBanner";

const FEATURES = [
  {
    icon: Shield,
    title: "Deterministic Checkpoints",
    description:
      "Define shell commands that must pass before an agent can finish. Failed checks stay visible and blocking instead of getting hand-waved away.",
  },
  {
    icon: Workflow,
    title: "Scoped to the files that changed",
    description:
      "Frontend edits trigger frontend review. Backend changes surface API and schema reminders. Your checks stay relevant instead of noisy.",
  },
  {
    icon: Zap,
    title: "Any agent, one config",
    description:
      "Copilot CLI, Claude Code, Cursor, and OpenAI Codex all read from the same checks.yaml, with agent-specific adapters generated for you.",
  },
  {
    icon: Code2,
    title: "Builder + YAML workflow",
    description:
      "Start from templates, fine-tune with the builder, then keep the generated YAML in git like the rest of your engineering system.",
  },
  {
    icon: GitBranch,
    title: "Fits real repo workflows",
    description:
      "Use it locally, in monorepos, and in CI-minded projects. Holdpoint stays close to your git state instead of inventing a separate control plane.",
  },
];

const STATS = [
  {
    value: "4",
    label: "supported agent adapters",
    description: "Copilot CLI, Claude Code, Cursor, and Codex.",
  },
  {
    value: "1",
    label: "source-of-truth file",
    description: "Everything stays in a single checks.yaml committed beside your code.",
  },
  {
    value: "0",
    label: "hosted lock-in required",
    description: "The checks run from your repository and shell commands.",
  },
];

const STEPS = [
  {
    title: "Install into the repo",
    description:
      "Bootstrap Holdpoint with one command, then let it generate the right adapter files for the agents you use.",
  },
  {
    title: "Describe what must be true",
    description:
      "Write deterministic checks and human prompts in checks.yaml so the guardrails match your team's actual definition of done.",
  },
  {
    title: "Let agents move fast safely",
    description:
      "Agents can explore and edit freely, but task completion gets blocked until the required checks and prompts are satisfied.",
  },
];

const TRUST_POINTS = [
  "Blocks task completion when checks fail",
  "Surfaces manual review prompts alongside automated checks",
  "Keeps the policy in git, not in a hosted dashboard",
];

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.28em] text-signal">
        {eyebrow}
      </p>
      <h2 className="text-3xl font-bold tracking-tight text-bone sm:text-4xl">{title}</h2>
      <p className="mt-4 text-base leading-7 text-stone sm:text-lg">{description}</p>
    </div>
  );
}

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

function SignalChip({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-bone/90">
      {children}
    </span>
  );
}

function TerminalRow({
  label,
  status,
  detail,
}: {
  label: string;
  status: "pass" | "fail";
  detail: string;
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
        {status === "pass" ? (
          <CheckCircle2 className="h-3.5 w-3.5" />
        ) : (
          <Sparkles className="h-3.5 w-3.5" />
        )}
        {status}
      </span>
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

function TerminalPreview() {
  return (
    <div className="surface-panel animate-float-desktop w-full max-w-[34rem] overflow-hidden rounded-[28px] p-3 shadow-[0_30px_120px_rgba(6,10,14,0.55)]">
      <div className="rounded-[22px] border border-white/10 bg-ink/90">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
            <div className="h-2.5 w-2.5 rounded-full bg-yellow-500" />
            <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
            <span className="ml-2 text-xs text-stone">holdpoint check --staged</span>
          </div>
          <span className="rounded-full border border-signal/30 bg-signal/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-signal">
            guardrails active
          </span>
        </div>

        <div className="space-y-4 p-4 sm:p-5">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone">
                  Current run
                </p>
                <p className="mt-1 text-base font-semibold text-bone">
                  Agent wants to finish the task
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-bone/85">
                <TerminalSquare className="h-4 w-4 text-signal" />3 automated checks, 1 manual
                prompt
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <TerminalRow
                label="TypeScript typecheck"
                status="pass"
                detail="No type errors found in changed packages."
              />
              <TerminalRow
                label="ESLint"
                status="pass"
                detail="Formatting and rule checks stayed clean."
              />
              <TerminalRow
                label="OpenAPI prompt"
                status="fail"
                detail="Backend files changed — confirm the API contract and docs were updated."
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-3xl border border-emerald-500/15 bg-emerald-500/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-200/80">
                What passed
              </p>
              <p className="mt-2 text-sm leading-6 text-bone/90">
                The fast feedback is automatic, visible, and tied to the repo state.
              </p>
            </div>
            <div className="rounded-3xl border border-signal/20 bg-signal/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-signal/90">
                Why it blocked
              </p>
              <p className="mt-2 text-sm leading-6 text-bone/90">
                Human review still matters when schema, contracts, or release steps are involved.
              </p>
            </div>
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
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[34rem] bg-[radial-gradient(circle_at_top,rgba(224,78,42,0.20),transparent_58%)]" />

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

      <section className="hero-grid-bg relative mx-auto max-w-6xl px-6 pb-16 pt-12 sm:pb-24 sm:pt-20">
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1.02fr)_minmax(320px,0.98fr)] lg:gap-10">
          <div className="min-w-0 text-center lg:text-left">
            <div className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-signal/30 bg-signal/10 px-3 py-1 text-sm text-signal">
              <span className="animate-pulse-signal h-1.5 w-1.5 rounded-full bg-signal" />
              Early alpha — designed for teams shipping with agents now
            </div>

            <h1 className="animate-fade-up delay-100 mt-6 text-4xl font-bold leading-[1.08] tracking-tight text-bone sm:text-5xl lg:text-6xl">
              Ship faster with AI agents, without letting broken work slip through.
            </h1>

            <p className="animate-fade-up delay-200 mt-5 max-w-2xl text-lg leading-8 text-stone">
              Holdpoint adds deterministic checkpoints to Copilot CLI, Claude Code, Cursor, and
              OpenAI Codex. You keep one{" "}
              <code
                className="rounded bg-white/5 px-1.5 py-0.5 text-sm text-signal"
                style={{ fontFamily: "'JetBrains Mono', 'IBM Plex Mono', ui-monospace, monospace" }}
              >
                checks.yaml
              </code>{" "}
              file in the repo, and every supported agent has to respect it.
            </p>

            <div className="animate-fade-up delay-300 mt-6 flex flex-wrap justify-center gap-3 lg:justify-start">
              {TRUST_POINTS.map((point) => (
                <SignalChip key={point}>{point}</SignalChip>
              ))}
            </div>

            <div className="animate-fade-up delay-400 mt-8 max-w-2xl">
              <InstallCommand />
            </div>

            <div className="animate-fade-up delay-400 mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap lg:justify-start">
              <HeroLink href="/docs" primary>
                Read the docs
                <ArrowRight className="h-4 w-4" />
              </HeroLink>
              <HeroLink href="https://github.com/holdpoint-dev/holdpoint">
                View the repository
              </HeroLink>
            </div>

            <p className="animate-fade-up delay-400 mt-4 text-sm text-stone">
              Requires Node.js 18+, a git repository, and an agent that supports Holdpoint's adapter
              files.
            </p>
          </div>

          <div className="flex items-center justify-center lg:justify-end">
            <TerminalPreview />
          </div>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {STATS.map((stat) => (
            <div key={stat.label} className="surface-panel rounded-3xl p-5">
              <p className="text-3xl font-semibold tracking-tight text-bone">{stat.value}</p>
              <p className="mt-2 text-sm font-semibold uppercase tracking-[0.22em] text-signal">
                {stat.label}
              </p>
              <p className="mt-3 text-sm leading-6 text-stone">{stat.description}</p>
            </div>
          ))}
        </div>
      </section>

      <AgentBanner />

      <section className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
        <SectionHeading
          eyebrow="Why teams use Holdpoint"
          title="Guardrails that feel like engineering, not theater"
          description="Holdpoint is opinionated about the last mile: agents can move quickly, but they should not be able to declare victory before the repo's required checks are green."
        />

        <div className="mt-12 grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
          <div className="grid gap-6 sm:grid-cols-2">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="surface-panel group rounded-3xl p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-signal/25 hover:shadow-[0_24px_80px_rgba(224,78,42,0.10)]"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-signal/12 transition-colors group-hover:bg-signal/18">
                  <feature.icon className="h-5 w-5 text-signal" />
                </div>
                <h3 className="text-lg font-semibold text-bone">{feature.title}</h3>
                <p className="mt-3 text-sm leading-6 text-stone">{feature.description}</p>
              </div>
            ))}
          </div>

          <div className="surface-panel rounded-[30px] p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-signal">
              What this changes
            </p>
            <h3 className="mt-4 text-2xl font-semibold tracking-tight text-bone">
              Agents stop guessing what "done" means.
            </h3>
            <p className="mt-4 text-base leading-7 text-stone">
              Instead of relying on prompt discipline alone, Holdpoint puts the team's evaluation
              rules next to the code. That makes failures explainable, reproducible, and much easier
              to trust.
            </p>
            <div className="mt-6 space-y-4">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-sm font-semibold text-bone">
                  Deterministic checks stay deterministic
                </p>
                <p className="mt-2 text-sm leading-6 text-stone">
                  Typecheck, lint, test, contract validation, schema sync, or any shell command your
                  project already depends on.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-sm font-semibold text-bone">Prompt checks stay visible</p>
                <p className="mt-2 text-sm leading-6 text-stone">
                  Accessibility review, release notes, data migrations, and other human sign-off
                  work show up when the affected files demand it.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20 sm:pb-24">
        <SectionHeading
          eyebrow="How it works"
          title="Three steps from install to enforced guardrails"
          description="The goal is simple: keep the setup lightweight enough for a repo to adopt quickly, but strict enough that the final gate actually means something."
        />

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {STEPS.map((step, index) => (
            <div key={step.title} className="surface-panel rounded-3xl p-6 sm:p-7">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-signal/30 bg-signal/10 text-sm font-semibold text-signal">
                0{index + 1}
              </div>
              <h3 className="mt-5 text-xl font-semibold text-bone">{step.title}</h3>
              <p className="mt-3 text-sm leading-7 text-stone">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
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

  - id: openapi-review
    label: "API contract reviewed"
    when: backend
    prompt: "Update OpenAPI docs and confirm the new response shape."`}
            </pre>
          </div>

          <div className="surface-panel rounded-[32px] p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-signal">
              Simple on purpose
            </p>
            <h3 className="mt-4 text-2xl font-semibold tracking-tight text-bone">
              Start with a YAML file, then scale into the builder.
            </h3>
            <p className="mt-4 text-base leading-7 text-stone">
              Holdpoint works well when the rule set is easy to audit in code review. You can keep
              it hand-written, generate it from the builder, or mix both as the project evolves.
            </p>
            <div className="mt-6 space-y-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-stone">
                Templates for common stacks to get you moving quickly.
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-stone">
                Custom <code className="text-bone">when:</code> scopes and conditions for
                repo-specific rules.
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-stone">
                Generated adapter files so each supported agent enforces the same policy.
              </div>
            </div>
            <div className="mt-8">
              <HeroLink href="/docs" primary>
                Explore the docs
                <ArrowRight className="h-4 w-4" />
              </HeroLink>
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
              Open-source eval checkpoints for teams using AI coding agents in real repositories.
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
