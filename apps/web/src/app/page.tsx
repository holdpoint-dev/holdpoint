import type { ReactNode } from "react";
import { InstallCommand } from "../components/InstallCommand";

function Mark({ size = 28 }: { size?: number }) {
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

const HERO_POINTS = [
  "checks.yaml stays in the repo",
  "completion is blocked until checks pass",
  "prompt checks surface exactly when they matter",
] as const;

const HOW_IT_WORKS = [
  {
    n: "01",
    title: "Write the contract",
    body: "Define deterministic commands and manual prompt checks once in checks.yaml. The file becomes the completion contract for every agent in the repo.",
  },
  {
    n: "02",
    title: "Install the adapters",
    body: "Holdpoint detects your stack and writes agent-specific hooks for Copilot, Claude Code, Cursor, and Codex without changing your app runtime.",
  },
  {
    n: "03",
    title: "Gate the handoff",
    body: "When the agent tries to finish, Holdpoint runs the matching checks, prints the required prompt instructions, and blocks incomplete work.",
  },
] as const;

const LIVE_FEATURES = [
  {
    eyebrow: "Local daemon",
    title: "A browser UI that opens from the CLI.",
    body: "Holdpoint Live belongs to the repo you are working in, not a remote dashboard that mixes unrelated projects.",
  },
  {
    eyebrow: "Project-first timeline",
    title: "One project, many active sessions.",
    body: "See active sessions, check runs, approvals, and file activity side by side while keeping the current repo in focus.",
  },
  {
    eyebrow: "Conflict warnings",
    title: "Same-file overlap shows up early.",
    body: "When two sessions touch the same path, Holdpoint makes that visible before the edits turn into a messy merge.",
  },
  {
    eyebrow: "Copilot controls + SDK",
    title: "Control where it exists, extend where you need it.",
    body: "Copilot sessions can expose pending approvals and context injection, while adapter hooks keep the door open for third-party integrations.",
  },
] as const;

const AGENTS = [
  {
    name: "GitHub Copilot",
    summary:
      "SDK extension with session context injection, task_complete gate, and the richest Live bridge.",
  },
  {
    name: "Claude Code",
    summary: "PreToolUse / PostToolUse Live events plus TaskCompleted and Stop gate hooks.",
  },
  {
    name: "Cursor",
    summary: "Advisory rules injected into .cursorrules so the agent reads and self-enforces.",
  },
  {
    name: "OpenAI Codex",
    summary: "SessionStart context injection and Stop hook exit-2 gating with AGENTS.md.",
  },
] as const;

const CHECK_ROWS = [
  { label: "TypeScript", value: "pnpm turbo typecheck", status: "passed" },
  { label: "ESLint", value: "pnpm turbo lint", status: "passed" },
  { label: "Prompt", value: "No unresolved marker comments", status: "manual" },
] as const;

const RUN_OUTPUT = [
  "{",
  '  "agent": "copilot",',
  '  "decision": "block",',
  '  "reason": "format-check failed",',
  '  "next": "fix, rerun, then finish"',
  "}",
] as const;

const ASCII_SHADER_CELLS = Array.from({ length: 180 }, (_, index) => ({
  id: index,
  phase: index % 12,
  tone: (index * 7) % 5,
}));

function SectionIntro({
  eyebrow,
  title,
  body,
  align = "left",
}: {
  eyebrow: string;
  title: ReactNode;
  body: string;
  align?: "left" | "center";
}) {
  return (
    <div className={align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      <p className="font-mono text-xs font-medium uppercase tracking-[0.26em] text-signal">
        {eyebrow}
      </p>
      <h2 className="mt-5 text-3xl font-bold leading-tight tracking-tight text-bone sm:text-5xl">
        {title}
      </h2>
      <p className="mt-5 text-base leading-relaxed text-stone sm:text-lg">{body}</p>
    </div>
  );
}

function StatusPill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "hot";
}) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] ${
        tone === "hot"
          ? "border-signal/30 bg-signal/10 text-signal"
          : "border-white/10 bg-white/[0.04] text-stone"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${tone === "hot" ? "bg-signal" : "bg-stone/50"}`}
        aria-hidden="true"
      />
      {children}
    </span>
  );
}

function AsciiShader() {
  return (
    <div className="ascii-shader" aria-hidden="true">
      <div className="ascii-shader-grid">
        {ASCII_SHADER_CELLS.map(({ id, phase, tone }) => (
          <span key={id} className={`ascii-glyph ascii-phase-${phase} ascii-tone-${tone}`} />
        ))}
      </div>
    </div>
  );
}

function ProductMock() {
  return (
    <div className="relative mx-auto mt-16 max-w-6xl px-3 sm:px-6">
      <div className="absolute inset-x-0 top-16 -z-10 h-80 rounded-full bg-signal/15 blur-3xl" />
      <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-ink-2/85 shadow-2xl shadow-black/40 backdrop-blur">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-2" aria-hidden="true">
            <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
            <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
            <span className="h-2.5 w-2.5 rounded-full bg-signal/80" />
          </div>
          <span className="font-mono text-xs text-stone">.github/extensions/holdpoint</span>
        </div>

        <div className="relative grid gap-0 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="border-b border-white/10 p-5 sm:p-8 lg:border-b-0 lg:border-r">
            <div className="rounded-3xl border border-white/10 bg-ink/70 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <StatusPill tone="hot">Completion gate</StatusPill>
                <span className="font-mono text-xs text-stone/60">before task_complete</span>
              </div>

              <h3 className="mt-8 text-3xl font-semibold tracking-tight text-bone">
                Keep agents from calling work done too early.
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-stone">
                Holdpoint turns completion into a checkpoint: run the matching commands, print the
                manual instructions, then let the agent finish only after the repo is clean.
              </p>

              <div className="mt-7 grid gap-3">
                {CHECK_ROWS.map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.03] px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-bone">{row.label}</p>
                      <p className="mt-1 font-mono text-xs text-stone/60">{row.value}</p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest ${
                        row.status === "manual"
                          ? "bg-white/[0.06] text-stone"
                          : "bg-signal/10 text-signal"
                      }`}
                    >
                      {row.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="relative min-h-[30rem] overflow-hidden bg-ink">
            <div className="hp-scanline absolute inset-0" aria-hidden="true" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_18%,rgba(224,78,42,0.18),transparent_30%),radial-gradient(circle_at_80%_72%,rgba(245,241,232,0.08),transparent_24%)]" />
            <AsciiShader />

            <div className="relative z-10 p-5 sm:p-8">
              <div className="flex flex-wrap gap-2">
                <StatusPill>changed files</StatusPill>
                <StatusPill>web-src</StatusPill>
                <StatusPill tone="hot">blocked</StatusPill>
              </div>

              <div className="mt-8 overflow-hidden rounded-3xl border border-white/10 bg-ink-2/90 shadow-xl shadow-black/30 backdrop-blur-sm">
                <div className="border-b border-white/10 px-4 py-3 font-mono text-xs text-stone">
                  run-result.json
                </div>
                <pre className="overflow-x-auto p-5 font-mono text-sm leading-7 text-stone">
                  {RUN_OUTPUT.map((line, index) => (
                    <span
                      key={`${line}-${index}`}
                      className={line.includes("block") ? "text-signal" : ""}
                    >
                      {line}
                      {"\n"}
                    </span>
                  ))}
                </pre>
              </div>

              <div className="mt-6 rounded-3xl border border-signal/25 bg-ink-2/90 p-5 shadow-xl shadow-black/25 backdrop-blur-sm">
                <p className="font-mono text-xs uppercase tracking-[0.22em] text-signal">
                  prompt checks emitted
                </p>
                <p className="mt-3 text-sm leading-relaxed text-bone/90">
                  Scan changed code for unfinished marker comments. Commit only after checks pass
                  and the product page is verified locally.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return (
    <article className="rounded-[1.75rem] border border-white/[0.08] bg-white/[0.035] p-6 transition-colors hover:border-signal/25">
      <p className="font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-stone/50">
        {eyebrow}
      </p>
      <h3 className="mt-4 text-xl font-semibold leading-snug text-bone">{title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-stone">{body}</p>
    </article>
  );
}

/** Holdpoint marketing landing page. */
export default function HomePage() {
  return (
    <main className="hp-grid min-h-screen overflow-hidden bg-ink text-bone">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <a href="/" className="flex items-center gap-2.5 text-bone">
          <Mark size={26} />
          <span
            className="text-base font-bold tracking-tight"
            style={{ fontFamily: "'JetBrains Mono', 'IBM Plex Mono', ui-monospace, monospace" }}
          >
            holdpoint
          </span>
          <span className="ml-0.5 rounded-full border border-signal/30 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-signal">
            alpha
          </span>
        </a>
        <div className="flex items-center gap-6">
          <a href="/docs" className="text-sm text-stone transition-colors hover:text-bone">
            Docs
          </a>
          <a
            href="https://github.com/holdpoint-dev/holdpoint"
            className="flex items-center gap-1.5 text-sm text-stone transition-colors hover:text-bone"
          >
            <svg viewBox="0 0 16 16" width="15" height="15" fill="currentColor" aria-hidden="true">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
            GitHub
          </a>
        </div>
      </nav>

      <section className="relative px-6 pb-28 pt-16 sm:pt-24">
        <div className="absolute left-1/2 top-10 -z-10 h-96 w-96 -translate-x-1/2 rounded-full bg-signal/10 blur-3xl" />
        <div className="mx-auto max-w-5xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 font-mono text-xs uppercase tracking-[0.22em] text-stone">
            <span className="h-1.5 w-1.5 rounded-full bg-signal" aria-hidden="true" />
            checks.yaml · Holdpoint Live
          </div>

          <h1 className="mx-auto mt-8 max-w-5xl text-6xl font-bold leading-[0.95] tracking-tight sm:text-7xl lg:text-[6.8rem]">
            Eval checkpoints for <span className="text-signal">agents that ship code</span>
          </h1>

          <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-stone sm:text-xl">
            Holdpoint enforces deterministic checks and human-readable prompt gates before any AI
            coding agent marks a task done. Every agent, one repo-owned contract.
          </p>

          <div className="mx-auto mt-8 flex max-w-3xl flex-wrap items-center justify-center gap-3">
            {HERO_POINTS.map((point) => (
              <span
                key={point}
                className="rounded-full border border-white/[0.08] bg-white/[0.035] px-4 py-2 text-sm text-stone"
              >
                {point}
              </span>
            ))}
          </div>

          <div className="mx-auto mt-10 max-w-2xl">
            <InstallCommand />
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a
              href="/docs"
              className="inline-flex items-center gap-2 rounded-full bg-signal px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-signal/20 transition-colors hover:bg-signal/90"
            >
              Read the docs
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path
                  d="M3 7h8M7 3l4 4-4 4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </a>
            <a
              href="https://github.com/holdpoint-dev/holdpoint"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-5 py-2.5 text-sm font-semibold text-bone transition-colors hover:border-white/20"
            >
              View on GitHub
            </a>
          </div>
        </div>

        <ProductMock />
      </section>

      <section className="mx-auto max-w-7xl px-6 py-24 sm:py-32">
        <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
          <SectionIntro
            eyebrow="How it works"
            title={
              <>
                One config file.
                <br />
                Clear stop points.
              </>
            }
            body="The repo keeps the rules. The adapters enforce them at completion time. The product surface makes the hidden agent handoff feel inspectable."
          />

          <ol className="grid gap-4">
            {HOW_IT_WORKS.map(({ n, title, body }) => (
              <li
                key={n}
                className="group grid gap-4 rounded-[1.75rem] border border-white/[0.08] bg-white/[0.035] p-5 sm:grid-cols-[4rem_1fr]"
              >
                <span className="font-mono text-sm text-signal/60">{n}</span>
                <div>
                  <h3 className="text-lg font-semibold text-bone">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-stone">{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-y border-white/[0.07] bg-white/[0.018] px-6 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl">
          <SectionIntro
            eyebrow="Now shipping"
            title="Holdpoint Live makes agent work visible."
            body="The recent work is focused on local visibility: daemon boot, project-first sessions, conflict warnings, Copilot controls where available, and adapter discovery for extension points."
            align="center"
          />

          <div className="mt-14 grid gap-4 sm:grid-cols-2">
            {LIVE_FEATURES.map((feature) => (
              <FeatureCard key={feature.title} {...feature} />
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-24 sm:py-32">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <SectionIntro
            eyebrow="Supported agents"
            title={
              <>
                One contract,
                <br />
                four adapters.
              </>
            }
            body="Holdpoint installs every adapter by default so the same repo rules can follow whichever tool your team is using."
          />

          <div className="overflow-hidden rounded-[2rem] border border-white/[0.08] bg-white/[0.035]">
            {AGENTS.map(({ name, summary }) => (
              <div
                key={name}
                className="grid gap-2 border-b border-white/[0.07] p-5 last:border-0 sm:grid-cols-[12rem_1fr] sm:gap-8"
              >
                <span className="font-semibold text-bone">{name}</span>
                <span className="text-sm leading-relaxed text-stone">{summary}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-white/[0.07]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-8">
          <div className="flex items-center gap-2.5 text-stone">
            <Mark size={20} />
            <span
              className="text-sm font-semibold"
              style={{ fontFamily: "'JetBrains Mono', 'IBM Plex Mono', ui-monospace, monospace" }}
            >
              holdpoint
            </span>
            <span className="text-stone/30">·</span>
            <span className="text-sm text-stone/50">MIT licensed</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-stone">
            <a href="/docs" className="transition-colors hover:text-bone">
              Docs
            </a>
            <a
              href="https://github.com/holdpoint-dev/holdpoint"
              className="transition-colors hover:text-bone"
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
