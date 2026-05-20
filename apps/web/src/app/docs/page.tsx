import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Docs — Holdpoint",
  description:
    "Complete documentation for Holdpoint: checks.yaml reference, supported agents, when: file filters, CLI commands, and the visual builder.",
};

// ─── Shared UI helpers ────────────────────────────────────────────────────────

function CodeBlock({ filename, children }: { filename?: string; children: string }) {
  return (
    <div className="my-4 overflow-hidden rounded-xl border border-ink-3">
      {filename && (
        <div className="flex items-center gap-2 border-b border-ink-3 bg-ink-2 px-4 py-2.5">
          <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
          <div className="h-2.5 w-2.5 rounded-full bg-yellow-500" />
          <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
          <span className="ml-2 font-mono text-xs text-stone">{filename}</span>
        </div>
      )}
      <pre className="overflow-x-auto bg-ink p-5 font-mono text-sm leading-relaxed text-stone">
        {children}
      </pre>
    </div>
  );
}

function InlineCode({ children }: { children: string }) {
  return (
    <code className="rounded bg-ink-2 px-1.5 py-0.5 font-mono text-sm text-signal">{children}</code>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="my-4 overflow-x-auto rounded-xl border border-ink-3">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-ink-3 bg-ink-2">
            {headers.map((h) => (
              <th
                key={h}
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className={`border-b border-ink-3/50 ${i % 2 === 0 ? "bg-ink" : "bg-ink-2/30"}`}
            >
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-3 font-mono text-xs text-stone">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SectionHeading({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2 id={id} className="mb-4 mt-12 scroll-mt-8 text-2xl font-bold text-bone first:mt-0">
      {children}
    </h2>
  );
}

function SubHeading({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h3 id={id} className="mb-3 mt-8 scroll-mt-8 text-lg font-semibold text-bone">
      {children}
    </h3>
  );
}

function Callout({ children }: { children: ReactNode }) {
  return (
    <div className="my-4 rounded-lg border border-signal/30 bg-signal/10 px-4 py-3 text-sm text-signal">
      {children}
    </div>
  );
}

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

// ─── Sidebar nav data ─────────────────────────────────────────────────────────

const NAV = [
  { id: "intro", label: "Introduction" },
  { id: "how-it-works", label: "How it works" },
  { id: "installation", label: "Installation" },
  { id: "reference", label: "checks.yaml reference" },
  { id: "when-scopes", label: "File filters (when:)" },
  { id: "agents", label: "Supported agents" },
  { id: "builder", label: "Visual builder" },
  { id: "cli", label: "CLI reference" },
  { id: "templates", label: "Stack templates" },
  { id: "advanced", label: "Advanced" },
  { id: "ref-engines", label: "↳ Engine overrides" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-ink text-bone">
      {/* ── Nav ── */}
      <nav className="sticky top-0 z-20 border-b border-ink-3 bg-ink/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-6">
            <a href="/" className="flex items-center gap-2 text-bone">
              <Mark size={24} />
              <span
                className="font-bold tracking-tight text-bone"
                style={{
                  fontFamily: "'JetBrains Mono', 'IBM Plex Mono', ui-monospace, monospace",
                }}
              >
                holdpoint
              </span>
            </a>
            <span className="text-stone">/</span>
            <span className="text-sm font-medium text-signal">Docs</span>
          </div>
          <a
            href="https://github.com/holdpoint-dev/holdpoint"
            className="flex items-center gap-1.5 rounded-lg border border-ink-3 bg-ink-2 px-3 py-1.5 text-sm text-stone transition hover:border-stone hover:text-bone"
          >
            <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
            GitHub
          </a>
        </div>
      </nav>

      {/* ── Body ── */}
      <div className="mx-auto flex max-w-6xl gap-10 px-6 py-12">
        {/* Sidebar */}
        <aside className="hidden w-52 shrink-0 lg:block">
          <nav className="sticky top-20 space-y-0.5">
            {NAV.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="block rounded-md px-3 py-1.5 text-sm text-stone transition hover:bg-ink-3 hover:text-bone"
              >
                {item.label}
              </a>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main className="min-w-0 flex-1 text-stone">
          {/* ── Introduction ── */}
          <SectionHeading id="intro">Introduction</SectionHeading>
          <p className="leading-relaxed">
            Holdpoint is a universal eval-guard for AI coding agents. It enforces a set of
            checkpoints — shell commands and agent instructions — that must pass before any agent
            can mark a task as done. You define the rules once in a single{" "}
            <InlineCode>checks.yaml</InlineCode> file. Holdpoint generates the correct adapter for
            whichever agent you use.
          </p>
          <p className="mt-4 leading-relaxed">
            Holdpoint is not tied to any specific agent. It works with any AI coding tool that
            exposes a hook surface, completion event, or instruction-injection mechanism — including
            GitHub Copilot CLI, Claude Code, Cursor, OpenAI Codex, and others.
          </p>
          <p className="mt-4 leading-relaxed">There are two kinds of checks:</p>
          <ul className="mt-3 space-y-2 pl-5">
            <li className="list-disc leading-relaxed">
              <strong className="text-bone">cmd checks</strong> — a shell command (e.g.{" "}
              <InlineCode>pnpm test</InlineCode>) that Holdpoint runs automatically. If it exits
              non-zero, the agent is blocked from completing the task.
            </li>
            <li className="list-disc leading-relaxed">
              <strong className="text-bone">prompt checks</strong> — an instruction that Holdpoint
              surfaces to the agent (e.g. "Update the OpenAPI spec"). The agent reads it and must
              act before marking the task done.
            </li>
          </ul>

          {/* ── How it works ── */}
          <SectionHeading id="how-it-works">How it works</SectionHeading>
          <ol className="space-y-4 pl-5">
            <li className="list-decimal leading-relaxed">
              <strong className="text-bone">
                Define checks in <InlineCode>checks.yaml</InlineCode>
              </strong>{" "}
              — one file at your project root declares all cmd and prompt checks, optional
              file-scope filters, and conditions.
            </li>
            <li className="list-decimal leading-relaxed">
              <strong className="text-bone">
                Run <InlineCode>holdpoint init</InlineCode>
              </strong>{" "}
              — Holdpoint detects your agent and stack, then generates adapter files that hook into
              the agent&apos;s completion mechanism.
            </li>
            <li className="list-decimal leading-relaxed">
              <strong className="text-bone">The adapter enforces checks at task completion</strong>{" "}
              — when the agent tries to finish a task, the adapter runs all relevant checks.
              Failures block completion and surface the issue.
            </li>
          </ol>

          <p className="mt-6 leading-relaxed">The adapter mechanism varies by agent:</p>
          <Table
            headers={["Agent", "Mechanism", "Generated files"]}
            rows={[
              [
                "GitHub Copilot CLI",
                "SDK extension — injects session context, gates task_complete, streams Live events, and exposes Copilot-only Live controls",
                ".github/extensions/holdpoint/extension.mjs\n.github/holdpoint/generated/checks.immutable.json",
              ],
              [
                "Claude Code",
                "PreToolUse / PostToolUse Live events plus TaskCompleted / Stop gate hooks in settings.json",
                ".claude/settings.json",
              ],
              [
                "OpenAI Codex",
                "SessionStart injects context, Stop hook exits 2 — Codex creates a continuation prompt and keeps working",
                ".codex/hooks.json\n.codex/holdpoint-check.mjs\n.codex/config.toml\nAGENTS.md (block appended)",
              ],
              [
                "Cursor",
                ".cursorrules instruction injection — agent reads rules and self-enforces",
                ".cursorrules (appended)",
              ],
            ]}
          />
          <Callout>
            Cursor does not expose a programmatic hook — Holdpoint injects instructions into{" "}
            <InlineCode>.cursorrules</InlineCode> so the agent reads and follows them. cmd checks
            are listed as instructions for the agent to run manually, not enforced by a runtime
            hook.
          </Callout>
          <Callout>
            <strong>Codex note:</strong> Project-level hooks require trust approval before they run.
            Use <InlineCode>/hooks</InlineCode> in the Codex TUI to review and trust the Holdpoint
            hook, or run <InlineCode>codex trust</InlineCode> in your project root.
          </Callout>

          {/* ── Installation ── */}
          <SectionHeading id="installation">Installation</SectionHeading>
          <p className="leading-relaxed">Run in your project root (git repo required):</p>
          <p className="mt-4 leading-relaxed">
            <strong className="text-bone">macOS / Linux</strong>
          </p>
          <CodeBlock>{"curl -fsSL https://holdpoint.dev/install.sh | sh"}</CodeBlock>
          <p className="mt-3 leading-relaxed">
            <strong className="text-bone">Windows (PowerShell)</strong>
          </p>
          <CodeBlock>
            {
              'powershell -NoProfile -ExecutionPolicy Bypass -Command "irm https://holdpoint.dev/install.ps1 | iex"'
            }
          </CodeBlock>
          <p className="mt-3 leading-relaxed">
            Or run the CLI directly (cross-platform, including single-agent installs):
          </p>
          <CodeBlock>{"npx holdpoint@alpha init"}</CodeBlock>
          <Callout>
            <strong>GitHub Copilot CLI local use:</strong> Holdpoint&apos;s Copilot adapter lives in{" "}
            <InlineCode>.github/extensions/holdpoint/extension.mjs</InlineCode> and relies on the
            Copilot CLI <InlineCode>EXTENSIONS</InlineCode> feature. Today that feature requires
            experimental mode, so run <InlineCode>/experimental on</InlineCode> in Copilot CLI
            before using Holdpoint locally. <InlineCode>holdpoint init</InlineCode> also creates{" "}
            <InlineCode>HOLDPOINT_PREREQUISITES.md</InlineCode> with this handoff note and the other
            agent setup caveats.
          </Callout>
          <p className="mt-4 leading-relaxed">
            <InlineCode>holdpoint init</InlineCode> does four things:
          </p>
          <ol className="mt-3 space-y-2 pl-5">
            <li className="list-decimal leading-relaxed">
              Detects your stack and package manager, writes <InlineCode>checks.yaml</InlineCode>{" "}
              from the matching template (with commands adjusted for npm/pnpm/yarn).
            </li>
            <li className="list-decimal leading-relaxed">
              Generates adapter files for all four agents (Copilot, Claude Code, Cursor, Codex).
            </li>
            <li className="list-decimal leading-relaxed">
              Creates repo-local guidance docs such as{" "}
              <InlineCode>HOLDPOINT_PREREQUISITES.md</InlineCode> and{" "}
              <InlineCode>MASTER_PROMPT.md</InlineCode> without overwriting an existing file.
            </li>
            <li className="list-decimal leading-relaxed">
              Installs <InlineCode>holdpoint</InlineCode> as a{" "}
              <InlineCode>devDependency</InlineCode> so hooks resolve via{" "}
              <InlineCode>node_modules/.bin/holdpoint</InlineCode> without downloading on every
              fire.
            </li>
          </ol>
          <p className="mt-4 leading-relaxed">
            You can also pass flags to restrict the stack or agent:
          </p>
          <CodeBlock>
            {
              "# Explicit stack + single agent\nnpx holdpoint@alpha init --stack=typescript --agent=copilot\n\n# Available stacks: typescript, python, go, nextjs, fullstack\n# Available agents: copilot, claude, cursor, codex"
            }
          </CodeBlock>
          <p className="mt-4 leading-relaxed">
            <strong className="text-bone">Requirements:</strong> Node.js 18+, an active git
            repository, and one of the supported agents installed. The PowerShell installer also
            appends <InlineCode>.holdpoint/</InlineCode> to <InlineCode>.gitignore</InlineCode> so
            runtime check reports stay out of source control.
          </p>

          {/* ── checks.yaml reference ── */}
          <SectionHeading id="reference">checks.yaml reference</SectionHeading>
          <p className="leading-relaxed">
            The <InlineCode>checks.yaml</InlineCode> file lives at your project root and is the
            single source of truth for all Holdpoint checks. A minimal example:
          </p>
          <CodeBlock filename="checks.yaml">
            {`version: 1

context:
  guides: {}

conditions: []

checks:
  - id: typecheck
    label: "TypeScript type check"
    cmd: "pnpm typecheck"

  - id: docs-updated
    label: "Update documentation"
    when: docs
    prompt: "Ensure all public APIs changed in this task are documented."`}
          </CodeBlock>

          <SubHeading id="ref-version">version</SubHeading>
          <p className="leading-relaxed">
            Always <InlineCode>1</InlineCode>. Required.
          </p>

          <SubHeading id="ref-session-context">session_context_files</SubHeading>
          <p className="leading-relaxed">
            Optional list of file paths (relative to repo root) injected as agent context at session
            start. Useful for injecting project-specific guides or conventions.
          </p>
          <CodeBlock>
            {"session_context_files:\n  - MASTER_PROMPT.md\n  - AGENT_CONTEXT.md"}
          </CodeBlock>

          <SubHeading id="ref-engines">engines</SubHeading>
          <p className="leading-relaxed">
            Optional per-engine overrides. Each engine defaults to{" "}
            <InlineCode>node_modules/.bin/holdpoint check --staged</InlineCode>. Set overrides here
            when you need a different command — for example, if the project <em>is</em> the
            holdpoint repo and should use the local build instead of the installed package. Claude
            also supports a separate <InlineCode>live_command</InlineCode> override for the
            best-effort Live event emitter.
          </p>
          <CodeBlock filename="checks.yaml">
            {`engines:
  claude:
    stop_command: "node_modules/.bin/holdpoint check --staged"
    live_command: "node_modules/.bin/holdpoint event --engine claude --from-hook"
  codex:
    stop_command: "node_modules/.bin/holdpoint check --staged"
  copilot:
    check_command: "node_modules/.bin/holdpoint check --staged"`}
          </CodeBlock>
          <p className="mt-3 leading-relaxed">
            The override survives <InlineCode>holdpoint update</InlineCode> re-runs because it lives
            in <InlineCode>checks.yaml</InlineCode>, not in the generated files.
          </p>

          <SubHeading id="ref-context">context</SubHeading>
          <p className="leading-relaxed">
            Named guide text injected into every task. Use <InlineCode>context.guides</InlineCode>{" "}
            to add key/value pairs:
          </p>
          <CodeBlock>
            {
              "context:\n  guides:\n    architecture: >\n      This project uses a hexagonal architecture.\n      Always keep domain logic independent of infrastructure."
            }
          </CodeBlock>

          <SubHeading id="ref-conditions">conditions</SubHeading>
          <p className="leading-relaxed">
            Conditions gate checks — a check with a <InlineCode>conditionId</InlineCode> only runs
            when its condition evaluates to true.
          </p>
          <CodeBlock>
            {`conditions:
  - id: has-openapi
    operator: file_exists
    path: openapi.yaml

  - id: has-env-token
    operator: env_var_set
    variable: API_TOKEN

  - id: schema-has-users
    operator: file_contains
    path: prisma/schema.prisma
    contains: "model User"

  - id: server-healthy
    operator: shell_returns_0
    command: "curl -sf http://localhost:3000/health"`}
          </CodeBlock>
          <Table
            headers={["Operator", "Required fields", "Description"]}
            rows={[
              ["file_exists", "path", "True if the file exists on disk"],
              [
                "file_contains",
                "path, contains",
                "True if the file exists and contains the substring",
              ],
              ["env_var_set", "variable", "True if the environment variable is non-empty"],
              ["shell_returns_0", "command", "True if the shell command exits with code 0"],
            ]}
          />

          <SubHeading id="ref-checks">checks</SubHeading>
          <p className="leading-relaxed">
            An array of check definitions. Each check is either a{" "}
            <strong className="text-bone">cmd check</strong> (has a <InlineCode>cmd</InlineCode>{" "}
            field) or a <strong className="text-bone">prompt check</strong> (has a{" "}
            <InlineCode>prompt</InlineCode> field).
          </p>
          <Table
            headers={["Field", "Type", "Required", "Description"]}
            rows={[
              ["id", "string", "yes", "Unique identifier for the check"],
              ["label", "string", "yes", "Human-readable display name"],
              [
                "cmd",
                "string",
                "cmd checks",
                "Shell command — exits non-zero to block task completion",
              ],
              [
                "prompt",
                "string",
                "prompt checks",
                "Instruction the agent must act on before finishing",
              ],
              ["when", "string", "no", "File filter: named scope or regex — see below"],
              ["conditionId", "string", "no", "Gate this check behind a condition"],
              ["on", "string", "no", "Hook event — currently only before_done (default)"],
            ]}
          />
          <CodeBlock filename="checks.yaml">
            {`checks:
  # cmd check — runs a shell command
  - id: lint
    label: "ESLint"
    cmd: "pnpm lint"

  # cmd check with file filter — only runs when frontend files change
  - id: typecheck-frontend
    label: "TypeScript — frontend"
    when: frontend
    cmd: "pnpm tsc --noEmit"

  # prompt check — instruction surfaced to the agent
  - id: changelog
    label: "Add CHANGELOG entry"
    prompt: "Add an entry to CHANGELOG.md describing what changed in this task."

  # prompt check with condition gate
  - id: openapi-sync
    label: "OpenAPI spec up to date"
    when: backend
    conditionId: has-openapi
    prompt: "Update openapi.yaml to reflect any API route changes."`}
          </CodeBlock>

          {/* ── when: scopes ── */}
          <SectionHeading id="when-scopes">File filters (when:)</SectionHeading>
          <p className="leading-relaxed">
            The <InlineCode>when</InlineCode> field narrows which checks activate based on which
            files changed. If omitted, the check always runs. Holdpoint ships with 16 named scopes
            covering the most common patterns across GitHub repos.
          </p>
          <p className="mt-3 leading-relaxed">
            When no git-staged files are detected (e.g. running{" "}
            <InlineCode>holdpoint check</InlineCode> without staged changes), all checks run
            regardless of their <InlineCode>when</InlineCode> filter.
          </p>
          <Table
            headers={["Scope", "Fires when changed files match"]}
            rows={[
              ["(absent)", "Every task — no file filter applied"],
              [
                "frontend",
                "**/*.tsx, **/*.jsx, **/*.css, **/*.scss, **/tailwind.config.*, apps/**",
              ],
              [
                "backend",
                "**/api/**, **/server/**, **/routes/**, **/controllers/**, packages/*/src/**",
              ],
              ["socket", "**/socket/**, **/ws/**, **/websocket/**"],
              ["visual", "**/*.stories.{ts,tsx}, **/__screenshots__/**, **/*.snap"],
              ["python", "**/*.py, **/*.pyi, **/requirements*.txt, **/pyproject.toml"],
              ["go", "**/*.go, **/go.mod, **/go.sum"],
              ["rust", "**/*.rs, **/Cargo.toml, **/Cargo.lock"],
              ["java", "**/*.java, **/*.kt, **/*.gradle, **/pom.xml"],
              ["ruby", "**/*.rb, **/Gemfile, **/Rakefile"],
              ["database", "**/*.sql, **/migrations/**, **/db/**, **/prisma/**, **/*.prisma"],
              ["prisma", "**/prisma/**, **/*.prisma — focused subset for Prisma-specific checks"],
              ["testing", "**/*.test.*, **/*.spec.*, **/__tests__/**, **/tests/**, **/spec/**"],
              ["infra", "**/Dockerfile*, **/docker-compose.*, **/*.tf, **/k8s/**"],
              ["ci", "**/.github/workflows/**, **/.circleci/**, **/Jenkinsfile, **/.gitlab-ci.yml"],
              ["docs", "**/*.mdx, **/*.rst, **/docs/**, **/documentation/**"],
              [
                "structural",
                "package.json, tsconfig*, go.mod, Cargo.toml, Dockerfile*, docker-compose*, *.tf, openapi.*, .github/workflows/*.yml, vitest/jest/playwright configs, linter configs, and more — any file whose change signals the project's dependency graph or toolchain has shifted",
              ],
            ]}
          />
          <p className="mt-4 leading-relaxed">
            You can also use any JavaScript regex as the <InlineCode>when</InlineCode> value. It is
            tested against each changed file&apos;s repo-relative path:
          </p>
          <CodeBlock>
            {
              'checks:\n  - id: e2e\n    label: "E2E tests for builder"\n    when: "^apps/builder/src/"\n    cmd: "pnpm test:e2e"'
            }
          </CodeBlock>
          <Callout>
            Named scopes use glob matching (minimatch). Plain strings that are not a named scope are
            treated as JavaScript regexes. An invalid regex will throw at runtime.
          </Callout>
          <p className="mt-4 leading-relaxed">
            For project-specific paths, define named aliases in a top-level{" "}
            <InlineCode>patterns:</InlineCode> map so checks stay readable:
          </p>
          <CodeBlock filename="checks.yaml">
            {`patterns:
  api-routes: "^src/api/"
  openapi-spec: "openapi\\\\.(yaml|yml|json)$"

checks:
  - id: openapi-lint
    label: "Lint OpenAPI spec"
    when: openapi-spec
    cmd: "npx redocly lint openapi.yaml"`}
          </CodeBlock>
          <Callout>
            Pattern values are JavaScript regex strings matched against changed file paths. Built-in
            scope names (<InlineCode>frontend</InlineCode>, <InlineCode>structural</InlineCode>,
            etc.) cannot be overridden in <InlineCode>patterns</InlineCode>.
          </Callout>

          {/* ── Supported agents ── */}
          <SectionHeading id="agents">Supported agents</SectionHeading>
          <p className="leading-relaxed">
            Holdpoint generates agent-specific adapter files from your{" "}
            <InlineCode>checks.yaml</InlineCode>. Run <InlineCode>holdpoint update</InlineCode>{" "}
            after any change to regenerate them.
          </p>

          <SubHeading id="agents-copilot">GitHub Copilot CLI</SubHeading>
          <p className="leading-relaxed">
            Holdpoint generates a local SDK extension at{" "}
            <InlineCode>.github/extensions/holdpoint/extension.mjs</InlineCode>. The extension runs
            as a persistent Node.js process alongside the CLI and handles three responsibilities:
          </p>
          <Callout>
            <strong>Experimental mode required for local Copilot use:</strong> the extension depends
            on the Copilot CLI <InlineCode>EXTENSIONS</InlineCode> feature. In the CLI, run{" "}
            <InlineCode>/experimental on</InlineCode> so <InlineCode>EXTENSIONS</InlineCode> shows
            up in the enabled feature flags before using Holdpoint locally. This note is also
            written to <InlineCode>HOLDPOINT_PREREQUISITES.md</InlineCode> during{" "}
            <InlineCode>holdpoint init</InlineCode> and <InlineCode>holdpoint update</InlineCode>.
          </Callout>
          <ul className="mt-3 space-y-2 pl-5">
            <li className="list-disc leading-relaxed">
              <strong className="text-bone">onSessionStart</strong> — reads{" "}
              <InlineCode>checks.immutable.json</InlineCode> and injects{" "}
              <InlineCode>session_context_files</InlineCode> as{" "}
              <InlineCode>additionalContext</InlineCode> before the agent starts.
            </li>
            <li className="list-disc leading-relaxed">
              <strong className="text-bone">onPreToolUse → task_complete</strong> — before Copilot
              marks a task done, the extension delegates to the holdpoint CLI. If checks fail, it
              returns <InlineCode>{'{ permissionDecision: "deny" }'}</InlineCode> and Copilot loops
              back to fix the issues.
            </li>
            <li className="list-disc leading-relaxed">
              <strong className="text-bone">Holdpoint Live bridge</strong> — the extension keeps a
              session-scoped live connection to the daemon, streams tool + permission lifecycle
              events, and accepts Copilot-only control commands for approve/deny, queued context
              injection, and registered Holdpoint control tools.
            </li>
          </ul>
          <p className="mt-3 leading-relaxed">
            Phase 4 intentionally keeps this narrow: approvals are approve-once only, injected
            context lands on the next eligible hook boundary, and triggerable tools are restricted
            to Holdpoint-owned extension tools such as <InlineCode>holdpoint_dry_run</InlineCode>.
          </p>
          <p className="mt-3 leading-relaxed">Generated files:</p>
          <ul className="mt-2 space-y-1 pl-5 font-mono text-xs text-stone">
            <li className="list-disc">
              .github/extensions/holdpoint/extension.mjs — SDK extension (onSessionStart + gate)
            </li>
            <li className="list-disc">
              .github/holdpoint/generated/checks.immutable.json — pre-parsed config (JSON, no YAML
              parser needed in .mjs)
            </li>
          </ul>

          <SubHeading id="agents-claude">Claude Code</SubHeading>
          <p className="leading-relaxed">
            Holdpoint registers four hooks in <InlineCode>.claude/settings.json</InlineCode>:
          </p>
          <ul className="mt-3 space-y-2 pl-5">
            <li className="list-disc leading-relaxed">
              <strong className="text-bone">PreToolUse / PostToolUse</strong> — emit best-effort
              Holdpoint Live events for tool intent and completion. These hooks are explicitly
              non-blocking so Live observability never becomes a new hard gate.
            </li>
            <li className="list-disc leading-relaxed">
              <strong className="text-bone">TaskCompleted</strong> — fires inside the agentic loop
              when Claude tries to mark a task done. Non-zero exit blocks the task and Claude stays
              in context to fix issues. This is the primary enforcement gate.
            </li>
            <li className="list-disc leading-relaxed">
              <strong className="text-bone">Stop</strong> — fires at the end of every turn.
              Belt-and-suspenders for sessions that don&apos;t use task management.
            </li>
          </ul>
          <CodeBlock filename=".claude/settings.json">
            {`{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "*",
        "hooks": [
          { "type": "command", "command": "node_modules/.bin/holdpoint event --engine claude --from-hook || true" }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "*",
        "hooks": [
          { "type": "command", "command": "node_modules/.bin/holdpoint event --engine claude --from-hook || true" }
        ]
      }
    ],
    "TaskCompleted": [
      {
        "hooks": [
          { "type": "command", "command": "node_modules/.bin/holdpoint event --engine claude --from-hook || true" },
          { "type": "command", "command": "node_modules/.bin/holdpoint check --staged" }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          { "type": "command", "command": "node_modules/.bin/holdpoint event --engine claude --from-hook || true" },
          { "type": "command", "command": "node_modules/.bin/holdpoint check --staged" }
        ]
      }
    ]
  }
}`}
          </CodeBlock>

          <SubHeading id="agents-codex">OpenAI Codex</SubHeading>
          <p className="leading-relaxed">
            Holdpoint writes hooks to <InlineCode>.codex/hooks.json</InlineCode> and a single
            dispatcher script at <InlineCode>.codex/holdpoint-check.mjs</InlineCode> that handles
            two events:
          </p>
          <ul className="mt-3 space-y-2 pl-5">
            <li className="list-disc leading-relaxed">
              <strong className="text-bone">SessionStart</strong> (when{" "}
              <InlineCode>session_context_files</InlineCode> configured) — reads{" "}
              <InlineCode>checks.immutable.json</InlineCode> and outputs{" "}
              <InlineCode>hookSpecificOutput.additionalContext</InlineCode> JSON per the Codex spec.
            </li>
            <li className="list-disc leading-relaxed">
              <strong className="text-bone">Stop</strong> — runs holdpoint checks after each turn.
              Exits <InlineCode>2</InlineCode> with failure output in stderr — Codex turns this into
              a continuation prompt and keeps working until checks pass.
            </li>
          </ul>
          <p className="mt-3 leading-relaxed">
            Holdpoint also writes <InlineCode>.codex/config.toml</InlineCode> with{" "}
            <InlineCode>[features] hooks = true</InlineCode> to ensure hooks are active at the repo
            level, and appends a structured check list to <InlineCode>AGENTS.md</InlineCode> as an
            instruction layer.
          </p>
          <p className="mt-3 leading-relaxed">
            <strong className="text-bone">Trust required:</strong> Codex only runs project-level
            hooks after trust approval. Use <InlineCode>/hooks</InlineCode> in the Codex TUI to
            review and approve, or run <InlineCode>codex trust</InlineCode> in your project root.
          </p>

          <SubHeading id="agents-cursor">Cursor</SubHeading>
          <p className="leading-relaxed">
            Holdpoint appends a structured instruction block to{" "}
            <InlineCode>.cursorrules</InlineCode>. The block lists all checks the agent must carry
            out before marking a task complete. Because Cursor does not expose a programmatic hook,
            enforcement depends on the agent reading and following the instructions.
          </p>

          {/* ── Visual builder ── */}
          <SectionHeading id="builder">Visual builder</SectionHeading>
          <p className="leading-relaxed">
            The visual builder lets you create and edit <InlineCode>checks.yaml</InlineCode> without
            writing YAML by hand. Open it with:
          </p>
          <CodeBlock>{"holdpoint builder"}</CodeBlock>
          <p className="mt-4 leading-relaxed">The builder has two views:</p>
          <ul className="mt-3 space-y-3 pl-5">
            <li className="list-disc leading-relaxed">
              <strong className="text-bone">Graph view</strong> — an n8n-style node canvas. Nodes
              represent triggers (hook events), file filters, checks (cmd/prompt), and conditions.
              Drag and connect them to define your configuration. Use the side panel to edit node
              properties.
            </li>
            <li className="list-disc leading-relaxed">
              <strong className="text-bone">List view</strong> — displays checks grouped by hook
              event and file filter. Supports inline create, edit, and delete without leaving the
              list. Useful for quickly scanning or bulk-editing checks.
            </li>
          </ul>
          <p className="mt-4 leading-relaxed">
            Both views are bidirectionally synced. Use the{" "}
            <strong className="text-bone">Export YAML</strong> button in the toolbar to copy the
            generated config.
          </p>

          {/* ── CLI reference ── */}
          <SectionHeading id="cli">CLI reference</SectionHeading>
          <Table
            headers={["Command", "Description"]}
            rows={[
              ["holdpoint", "Ensure the singleton daemon and open Holdpoint Live in the browser"],
              [
                "holdpoint init [--stack] [--agent]",
                "Install Holdpoint — detects stack + agent automatically",
              ],
              ["holdpoint check [--staged]", "Run all deterministic checks; surface prompt checks"],
              [
                "holdpoint live [--project]",
                "Open Holdpoint Live, optionally focused to a project hash",
              ],
              ["holdpoint daemon start", "Start or connect to the singleton Holdpoint Live daemon"],
              ["holdpoint daemon status", "Show daemon pid, port, uptime, and session count"],
              ["holdpoint daemon stop", "Stop the running Holdpoint Live daemon"],
              ["holdpoint evolve [--apply]", "Scan project and propose (or apply) new checks"],
              ["holdpoint event", "Internal: ingest live event JSON from stdin"],
              ["holdpoint validate", "Validate checks.yaml against the schema and print errors"],
              ["holdpoint update", "Regenerate adapter files from the current checks.yaml"],
              ["holdpoint builder", "Open the visual builder on localhost:4321"],
            ]}
          />

          <SubHeading id="cli-live">holdpoint / holdpoint live</SubHeading>
          <p className="leading-relaxed">
            <InlineCode>holdpoint</InlineCode> without arguments is the default Live entrypoint. It
            ensures the singleton daemon is running, bootstraps browser auth, and opens the
            Holdpoint Live UI focused on the current project when possible.{" "}
            <InlineCode>holdpoint live</InlineCode> is the explicit alias, and{" "}
            <InlineCode>--project</InlineCode> can force a specific project hash.
          </p>
          <p className="mt-3 leading-relaxed">
            The UI is project-first: the sidebar can list many repos, but the main panel always
            shows exactly one project at a time. Session timelines, filters, and passive conflict
            banners are scoped to that selected project only.
          </p>
          <p className="mt-3 leading-relaxed">
            Active control buttons only appear for Copilot sessions whose extension bridge is
            currently connected. Claude, Codex, and Cursor remain observe-only in this phase.
          </p>

          <SubHeading id="cli-check">holdpoint check</SubHeading>
          <p className="leading-relaxed">
            Reads git-staged files to determine which checks to run (via{" "}
            <InlineCode>when:</InlineCode> filter matching). If no staged files are found, all
            checks run. Use <InlineCode>--staged</InlineCode> to always scope to staged files only.
          </p>
          <p className="mt-3 leading-relaxed">
            cmd checks exit non-zero on failure and print the shell output. prompt checks are
            displayed as a list of instructions — they are not automatically enforced as commands.
          </p>

          <SubHeading id="cli-update">holdpoint update</SubHeading>
          <p className="leading-relaxed">
            Must be run after any change to <InlineCode>checks.yaml</InlineCode>. Regenerates all
            adapter files. The <InlineCode>holdpoint-sync</InlineCode> check in the default
            configuration enforces this automatically when <InlineCode>checks.yaml</InlineCode> is
            staged.
          </p>

          <SubHeading id="cli-evolve">holdpoint evolve</SubHeading>
          <p className="leading-relaxed">
            Scans the project filesystem, detects languages, frameworks, and tooling, then diffs the
            result against the current <InlineCode>checks.yaml</InlineCode>. In dry-run mode
            (default) it prints proposed new checks and any stale checks whose{" "}
            <InlineCode>when:</InlineCode> pattern matches zero files. Pass{" "}
            <InlineCode>--apply</InlineCode> to write all proposals to{" "}
            <InlineCode>checks.yaml</InlineCode> and regenerate engine files automatically.
          </p>
          <p className="mt-3 leading-relaxed">
            The <InlineCode>MASTER_PROMPT.md</InlineCode> installed by{" "}
            <InlineCode>holdpoint init</InlineCode> instructs your AI agent to run{" "}
            <InlineCode>holdpoint evolve --apply</InlineCode> whenever the project structure changes
            — closing the zero-config evolution loop.
          </p>

          {/* ── Templates ── */}
          <SectionHeading id="templates">Stack templates</SectionHeading>
          <p className="leading-relaxed">
            <InlineCode>holdpoint init</InlineCode> generates a starter{" "}
            <InlineCode>checks.yaml</InlineCode> based on a stack template. Templates are
            pre-configured with common checks and appropriate <InlineCode>when:</InlineCode> file
            filters.
          </p>
          <Table
            headers={["Stack", "Cmd checks", "Prompt checks"]}
            rows={[
              ["typescript", "eslint, tsc", "JSDoc coverage, type-hint review"],
              [
                "python",
                "ruff, mypy, pytest (when: python)",
                "docstrings, type-hints (when: python)",
              ],
              [
                "go",
                "go build, go vet, go test (when: go)",
                "GoDoc review (when: go), test coverage (when: testing)",
              ],
              [
                "nextjs",
                "eslint, tsc, next build, lighthouse (when: frontend)",
                "visual regression, accessibility, SEO, OpenAPI (when: backend)",
              ],
              [
                "fullstack",
                "eslint, tsc, pytest, openapi-diff, playwright",
                "visual check, accessibility, type-hints, db-migrations (when: database), PR description",
              ],
            ]}
          />
          <p className="mt-4 leading-relaxed">
            Auto-detection: Holdpoint reads project files to select the best template —{" "}
            <InlineCode>go.mod</InlineCode> for Go, <InlineCode>pyproject.toml</InlineCode> /
            <InlineCode>requirements.txt</InlineCode> for Python,{" "}
            <InlineCode>next.config.*</InlineCode> for Next.js, and so on.
          </p>

          {/* ── Advanced ── */}
          <SectionHeading id="advanced">Advanced</SectionHeading>

          <SubHeading id="adv-conditions">Conditions</SubHeading>
          <p className="leading-relaxed">
            Use <InlineCode>conditionId</InlineCode> to gate a check behind a runtime condition. A
            gated check is skipped entirely when its condition is false — it does not appear in the
            output at all. Useful for checks that only make sense in certain project setups (e.g. an
            OpenAPI check that only applies when an <InlineCode>openapi.yaml</InlineCode> exists).
          </p>
          <CodeBlock>
            {`conditions:
  - id: has-openapi
    operator: file_exists
    path: openapi.yaml

checks:
  - id: openapi-sync
    label: "OpenAPI in sync"
    conditionId: has-openapi   # skipped if openapi.yaml does not exist
    when: backend
    prompt: "Update openapi.yaml for any changed API routes."`}
          </CodeBlock>

          <SubHeading id="adv-regex">Custom when: regex</SubHeading>
          <p className="leading-relaxed">
            Any string that is not a named scope is treated as a JavaScript regex and tested against
            each changed file path. Anchor with <InlineCode>^</InlineCode> to match from the repo
            root:
          </p>
          <CodeBlock>
            {`checks:
  - id: builder-e2e
    label: "Builder E2E tests"
    when: "^apps/builder/src/"   # only runs when builder source changes
    cmd: "pnpm --filter @holdpoint/builder test:e2e"`}
          </CodeBlock>

          <SubHeading id="adv-multi-agent">Multi-agent projects</SubHeading>
          <p className="leading-relaxed">
            <InlineCode>holdpoint init</InlineCode> installs for{" "}
            <strong className="text-bone">all four agents by default</strong> — Copilot, Claude
            Code, Cursor, and Codex. Pass <InlineCode>--agent</InlineCode> to restrict to one:
          </p>
          <CodeBlock>
            {"# Install for a single agent only\nnpx holdpoint@alpha init --agent=claude"}
          </CodeBlock>
          <p className="mt-3 leading-relaxed">
            Run <InlineCode>holdpoint update</InlineCode> after any change to{" "}
            <InlineCode>checks.yaml</InlineCode> to regenerate all adapter files. Holdpoint detects
            which agents are already installed and only regenerates their files.
          </p>

          <SubHeading id="adv-session-context">session_context_files</SubHeading>
          <p className="leading-relaxed">
            Files listed under <InlineCode>session_context_files</InlineCode> are read at session
            start and injected as additional context into the agent via the sessionStart hook.
            Useful for injecting project conventions, architectural guides, or onboarding notes that
            the agent should know before starting any task:
          </p>
          <CodeBlock>
            {`session_context_files:
  - MASTER_PROMPT.md    # project conventions and holdpoint config guide
  - AGENT_CONTEXT.md    # current repo state, what works, what's broken`}
          </CodeBlock>

          <SubHeading id="adv-keep-in-sync">Keeping generated files in sync</SubHeading>
          <p className="leading-relaxed">
            Holdpoint&apos;s own <InlineCode>checks.yaml</InlineCode> includes a{" "}
            <InlineCode>holdpoint-sync</InlineCode> check that runs{" "}
            <InlineCode>npx holdpoint update</InlineCode> whenever{" "}
            <InlineCode>checks.yaml</InlineCode> is staged. Add this to your project to enforce the
            same invariant:
          </p>
          <CodeBlock>
            {`checks:
  - id: holdpoint-sync
    label: "Regenerate adapter files"
    when: "^checks\\.yaml$"
    cmd: "node_modules/.bin/holdpoint update"`}
          </CodeBlock>

          {/* ── Footer ── */}
          <div className="mt-20 border-t border-ink-3 pt-8 text-sm text-stone/70">
            <p>
              Open source under the MIT license.{" "}
              <a
                href="https://github.com/holdpoint-dev/holdpoint"
                className="text-signal hover:text-signal/80"
              >
                GitHub ↗
              </a>
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
