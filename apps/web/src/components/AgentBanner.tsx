const AGENTS = [
  {
    name: "GitHub Copilot",
    summary: "Runtime gate plus the richest Live bridge.",
    color: "#7C3AED",
    bg: "rgba(124,58,237,0.10)",
    border: "rgba(124,58,237,0.24)",
    Icon: () => (
      <svg viewBox="0 0 16 16" width="18" height="18" fill="currentColor" aria-hidden="true">
        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
      </svg>
    ),
  },
  {
    name: "Claude Code",
    summary: "Hook-based gating with Live events.",
    color: "#CC785C",
    bg: "rgba(204,120,92,0.10)",
    border: "rgba(204,120,92,0.24)",
    Icon: () => (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
        <path d="M13.827 3.52h3.603L12 20.48 6.57 3.52h3.602l1.828 6.3 1.827-6.3z" />
      </svg>
    ),
  },
  {
    name: "Cursor",
    summary: "Advisory rules generated from the same config.",
    color: "#2563EB",
    bg: "rgba(37,99,235,0.10)",
    border: "rgba(37,99,235,0.24)",
    Icon: () => (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
        <path d="M5 3 L5 19 L9 15 L12 22 L14.5 21 L11.5 14 L18 14 Z" />
      </svg>
    ),
  },
  {
    name: "OpenAI Codex",
    summary: "Stop-hook gating with repo guidance files.",
    color: "#10A37F",
    bg: "rgba(16,163,127,0.10)",
    border: "rgba(16,163,127,0.24)",
    Icon: () => (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
        <path d="M22.28 9.82a5.99 5.99 0 0 0-.52-4.91 6.05 6.05 0 0 0-6.51-2.9 6.07 6.07 0 0 0-4.57 2.24 5.99 5.99 0 0 0-4 2.9 6.05 6.05 0 0 0 .74 7.1 5.98 5.98 0 0 0 .51 4.91 6.05 6.05 0 0 0 6.52 2.9 5.98 5.98 0 0 0 4.52 2.02 6.06 6.06 0 0 0 5.77-4.21 5.99 5.99 0 0 0 4-2.9 6.06 6.06 0 0 0-.75-7.07zM13.26 22.43a4.48 4.48 0 0 1-2.88-1.04l.14-.08 4.78-2.76a.8.8 0 0 0 .39-.68v-6.74l2.02 1.17a.07.07 0 0 1 .04.05v5.58a4.5 4.5 0 0 1-4.49 4.5zM3.6 18.3a4.47 4.47 0 0 1-.53-3.01l.14.08 4.78 2.76a.77.77 0 0 0 .78 0l5.84-3.37v2.33a.08.08 0 0 1-.03.07L9.57 19.9A4.5 4.5 0 0 1 3.6 18.3zM2.34 7.86a4.49 4.49 0 0 1 2.33-1.97v5.61a.77.77 0 0 0 .39.68l5.81 3.36-2.02 1.17a.08.08 0 0 1-.07 0L3.95 13.7A4.5 4.5 0 0 1 2.34 7.86zm16.67 3.86-5.84-3.37 2.02-1.17a.08.08 0 0 1 .07 0l4.83 2.79a4.49 4.49 0 0 1-.68 8.1V12.4a.79.79 0 0 0-.4-.68zm2.01-3.02-.14-.09-4.77-2.78a.78.78 0 0 0-.79 0L9.5 9.19V6.86a.07.07 0 0 1 .03-.07l4.83-2.78a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.13-2.02-1.16a.08.08 0 0 1-.04-.06V6.08a4.5 4.5 0 0 1 7.38-3.45l-.14.08-4.78 2.76a.8.8 0 0 0-.4.68zm1.1-2.37 2.6-1.5 2.61 1.5v3l-2.6 1.5-2.61-1.5z" />
      </svg>
    ),
  },
] as const;

/** Supported-agent grid for the marketing homepage. */
export function AgentBanner() {
  return (
    <section
      className="border-y border-white/10 bg-ink-2/30 py-24 sm:py-28"
      aria-label="Supported agents"
    >
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-signal">
            Supported agents
          </p>
          <h2 className="mt-5 text-3xl font-bold tracking-tight text-bone sm:text-4xl">
            One config file, four adapter surfaces.
          </h2>
          <p className="mt-5 text-base leading-8 text-stone sm:text-lg">
            Holdpoint installs every adapter by default so the same repo rules can follow whichever
            tool your team is using.
          </p>
        </div>

        <div className="mt-14 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {AGENTS.map((agent) => (
            <article
              key={agent.name}
              className="surface-panel rounded-[28px] p-6"
              style={{ borderColor: agent.border, background: agent.bg }}
            >
              <div
                className="flex h-12 w-12 items-center justify-center rounded-2xl"
                style={{ background: "rgba(255,255,255,0.04)", color: agent.color }}
              >
                <agent.Icon />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-bone">{agent.name}</h3>
              <p className="mt-3 text-sm leading-7 text-stone">{agent.summary}</p>
            </article>
          ))}
        </div>

        <p className="mt-8 text-center text-xs text-stone/50">
          GitHub, Anthropic, Cursor, and OpenAI are trademarks of their respective owners.
        </p>
      </div>
    </section>
  );
}
