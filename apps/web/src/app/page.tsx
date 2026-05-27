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
    body: "Holdpoint installs a gated default checks.yaml and writes hooks for Copilot, Claude Code, Cursor, and Codex without changing your app runtime.",
  },
  {
    n: "03",
    title: "Gate the handoff",
    body: "When the agent tries to finish, Holdpoint runs matching checks, prints required prompt instructions, and blocks incomplete work.",
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
    summary: "Session context, Live lifecycle hooks, and TaskCompleted / Stop exit-2 gates.",
  },
  {
    name: "Cursor",
    summary:
      "Advisory only: Holdpoint injects .cursorrules instructions, but Cursor cannot hard-block completion checks.",
  },
  {
    name: "OpenAI Codex",
    summary: "SessionStart context injection and Stop hook exit-2 gating with AGENTS.md.",
  },
] as const;

const ASCII_SHADER_CELLS = Array.from({ length: 180 }, (_, index) => ({
  id: index,
  phase: index % 12,
  tone: (index * 7) % 5,
}));

function AsciiBackdrop({ variant = "right" }: { variant?: "right" | "left" | "wide" }) {
  return (
    <div className={`ascii-shader ascii-shader-${variant}`} aria-hidden="true">
      <div className="ascii-shader-grid">
        {ASCII_SHADER_CELLS.map(({ id, phase, tone }) => (
          <span key={id} className={`ascii-glyph ascii-phase-${phase} ascii-tone-${tone}`} />
        ))}
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="font-mono text-xs font-medium uppercase tracking-[0.24em] text-signal">
      {children}
    </p>
  );
}

function SectionCut() {
  return <hr className="border-white/[0.07]" aria-hidden="true" />;
}

/** Holdpoint marketing landing page. */
export default function HomePage() {
  return (
    <main className="min-h-screen bg-ink text-bone">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
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

      <section className="relative isolate overflow-hidden">
        <AsciiBackdrop variant="right" />
        <div className="relative z-10 mx-auto max-w-5xl px-6 pb-32 pt-20 sm:pt-28">
          <SectionLabel>checks.yaml · Holdpoint Live</SectionLabel>

          <h1 className="mt-7 max-w-4xl text-5xl font-bold leading-[1.02] tracking-tight sm:text-6xl lg:text-[5.6rem]">
            Keep agents from <span className="text-signal">calling work done</span> too early.
          </h1>

          <p className="mt-8 max-w-xl text-lg leading-relaxed text-stone">
            Holdpoint enforces deterministic checks and human-readable prompt gates before any AI
            coding agent marks a task done. Every agent, one repo-owned contract.
          </p>

          <ul className="mt-7 space-y-2 text-sm text-stone">
            {HERO_POINTS.map((point) => (
              <li key={point} className="flex items-start gap-2.5">
                <span className="mt-0.5 shrink-0 text-signal" aria-hidden="true">
                  —
                </span>
                <span>{point}</span>
              </li>
            ))}
          </ul>

          <div className="mt-12 max-w-lg">
            <InstallCommand />
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            <a
              href="/docs"
              className="inline-flex items-center gap-2 rounded-full bg-signal px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-signal/90"
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
              className="inline-flex items-center gap-2 rounded-full border border-white/10 px-5 py-2.5 text-sm font-semibold text-bone transition-colors hover:border-white/20"
            >
              View on GitHub
            </a>
          </div>

          <p className="mt-6 text-xs text-stone/50">
            Node.js 18+, a git repository, and a supported agent required.
          </p>
        </div>
      </section>

      <SectionCut />

      <section className="relative isolate overflow-hidden">
        <AsciiBackdrop variant="left" />
        <div className="relative z-10 mx-auto grid max-w-5xl gap-16 px-6 py-24 sm:py-28 lg:grid-cols-2 lg:gap-20">
          <div>
            <SectionLabel>How it works</SectionLabel>
            <h2 className="mt-6 text-3xl font-bold tracking-tight sm:text-4xl">
              One config file.
              <br />
              Clear stop points.
            </h2>
            <p className="mt-6 text-base leading-relaxed text-stone">
              The repo keeps the rules. The adapters enforce them at completion time. The Live view
              makes the hidden agent handoff inspectable without turning the product into dashboard
              clutter.
            </p>
          </div>

          <ol className="space-y-10">
            {HOW_IT_WORKS.map(({ n, title, body }) => (
              <li key={n} className="flex gap-5">
                <span className="mt-0.5 shrink-0 font-mono text-sm text-signal/50">{n}</span>
                <div>
                  <h3 className="font-semibold text-bone">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-stone">{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <SectionCut />

      <section className="relative isolate overflow-hidden">
        <AsciiBackdrop variant="wide" />
        <div className="relative z-10 mx-auto max-w-5xl px-6 py-24 sm:py-28">
          <SectionLabel>Now shipping</SectionLabel>
          <h2 className="mt-6 max-w-xl text-3xl font-bold tracking-tight sm:text-4xl">
            Holdpoint Live makes agent work visible.
          </h2>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-stone">
            The recent work is focused on local visibility: daemon boot, project-first sessions,
            conflict warnings, Copilot controls where available, and adapter discovery for extension
            points.
          </p>

          <div className="mt-16 grid gap-x-14 gap-y-12 sm:grid-cols-2">
            {LIVE_FEATURES.map(({ eyebrow, title, body }) => (
              <div key={title}>
                <p className="font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-stone/50">
                  {eyebrow}
                </p>
                <h3 className="mt-3 text-lg font-semibold leading-snug text-bone">{title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-stone">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <SectionCut />

      <section className="relative isolate overflow-hidden">
        <AsciiBackdrop variant="right" />
        <div className="relative z-10 mx-auto flex max-w-5xl flex-col gap-12 px-6 py-24 sm:py-28 lg:flex-row lg:gap-20">
          <div className="lg:w-72 lg:shrink-0">
            <SectionLabel>Supported agents</SectionLabel>
            <h2 className="mt-6 text-3xl font-bold tracking-tight sm:text-4xl">
              One contract,
              <br />
              four adapters.
            </h2>
            <p className="mt-6 text-base leading-relaxed text-stone">
              Holdpoint installs every adapter by default so the same repo rules can follow
              whichever tool your team is using.
            </p>
            <a
              href="/docs#agents"
              className="mt-6 inline-block text-sm text-signal transition-colors hover:text-signal/70"
            >
              See adapter details →
            </a>
          </div>

          <div className="flex-1 divide-y divide-white/[0.07]">
            {AGENTS.map(({ name, summary }) => (
              <div
                key={name}
                className="flex flex-col gap-2 py-6 sm:flex-row sm:items-baseline sm:gap-8"
              >
                <span className="w-40 shrink-0 font-semibold text-bone">{name}</span>
                <span className="text-sm leading-relaxed text-stone">{summary}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-white/[0.07]">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-8">
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
