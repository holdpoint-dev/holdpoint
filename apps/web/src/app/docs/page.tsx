import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Docs — Sentinel",
  description:
    "Complete documentation for Sentinel: checks.yaml reference, supported agents, when: file filters, CLI commands, and the visual builder.",
};

// ─── Shared UI helpers ────────────────────────────────────────────────────────

function CodeBlock({ filename, children }: { filename?: string; children: string }) {
  return (
    <div className="my-4 overflow-hidden rounded-xl border border-slate-800">
      {filename && (
        <div className="flex items-center gap-2 border-b border-slate-800 bg-slate-900 px-4 py-2.5">
          <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
          <div className="h-2.5 w-2.5 rounded-full bg-yellow-500" />
          <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
          <span className="ml-2 font-mono text-xs text-slate-500">{filename}</span>
        </div>
      )}
      <pre className="overflow-x-auto bg-slate-950 p-5 font-mono text-sm leading-relaxed text-slate-300">
        {children}
      </pre>
    </div>
  );
}

function InlineCode({ children }: { children: string }) {
  return (
    <code className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-sm text-indigo-300">
      {children}
    </code>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="my-4 overflow-x-auto rounded-xl border border-slate-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-800 bg-slate-900">
            {headers.map((h) => (
              <th
                key={h}
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400"
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
              className={`border-b border-slate-800/50 ${i % 2 === 0 ? "bg-slate-950" : "bg-slate-900/30"}`}
            >
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-3 font-mono text-xs text-slate-300">
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
    <h2 id={id} className="mb-4 mt-12 scroll-mt-8 text-2xl font-bold text-white first:mt-0">
      {children}
    </h2>
  );
}

function SubHeading({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h3 id={id} className="mb-3 mt-8 scroll-mt-8 text-lg font-semibold text-slate-100">
      {children}
    </h3>
  );
}

function Callout({ children }: { children: ReactNode }) {
  return (
    <div className="my-4 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-4 py-3 text-sm text-indigo-300">
      {children}
    </div>
  );
}

function LogoMarkWhite({ size = 28 }: { size?: number }) {
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
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DocsPage() {
  return (
    <div
      className="min-h-screen bg-slate-950 text-slate-100"
      style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
    >
      {/* ── Nav ── */}
      <nav className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-6">
            <a href="/" className="flex items-center gap-2">
              <LogoMarkWhite size={24} />
              <span className="font-bold tracking-tight text-white">sentinel</span>
            </a>
            <span className="text-slate-600">/</span>
            <span className="text-sm font-medium text-indigo-400">Docs</span>
          </div>
          <a
            href="https://github.com/HarzerHeribert/sentinel"
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-300 transition hover:border-slate-500 hover:text-white"
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
                className="block rounded-md px-3 py-1.5 text-sm text-slate-400 transition hover:bg-slate-800 hover:text-white"
              >
                {item.label}
              </a>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main className="min-w-0 flex-1 text-slate-300">
          {/* ── Introduction ── */}
          <SectionHeading id="intro">Introduction</SectionHeading>
          <p className="leading-relaxed">
            Sentinel is a universal eval-guard for AI coding agents. It enforces a set of
            checkpoints — shell commands and agent instructions — that must pass before any agent
            can mark a task as done. You define the rules once in a single{" "}
            <InlineCode>checks.yaml</InlineCode> file. Sentinel generates the correct adapter for
            whichever agent you use.
          </p>
          <p className="mt-4 leading-relaxed">
            Sentinel is not tied to any specific agent. It works with any AI coding tool that
            exposes a hook surface, completion event, or instruction-injection mechanism — including
            GitHub Copilot CLI, Claude Code, Cursor, and others.
          </p>
          <p className="mt-4 leading-relaxed">There are two kinds of checks:</p>
          <ul className="mt-3 space-y-2 pl-5">
            <li className="list-disc leading-relaxed">
              <strong className="text-slate-100">cmd checks</strong> — a shell command (e.g.{" "}
              <InlineCode>pnpm test</InlineCode>) that Sentinel runs automatically. If it exits
              non-zero, the agent is blocked from completing the task.
            </li>
            <li className="list-disc leading-relaxed">
              <strong className="text-slate-100">prompt checks</strong> — an instruction that
              Sentinel surfaces to the agent (e.g. "Update the OpenAPI spec"). The agent reads it
              and must act before marking the task done.
            </li>
          </ul>

          {/* ── How it works ── */}
          <SectionHeading id="how-it-works">How it works</SectionHeading>
          <ol className="space-y-4 pl-5">
            <li className="list-decimal leading-relaxed">
              <strong className="text-slate-100">
                Define checks in <InlineCode>checks.yaml</InlineCode>
              </strong>{" "}
              — one file at your project root declares all cmd and prompt checks, optional
              file-scope filters, and conditions.
            </li>
            <li className="list-decimal leading-relaxed">
              <strong className="text-slate-100">
                Run <InlineCode>sentinel init</InlineCode>
              </strong>{" "}
              — Sentinel detects your agent and stack, then generates adapter files that hook into
              the agent&apos;s completion mechanism.
            </li>
            <li className="list-decimal leading-relaxed">
              <strong className="text-slate-100">
                The adapter enforces checks at task completion
              </strong>{" "}
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
                "beforeTaskComplete hook in extension.mjs",
                ".github/hooks/sentinel.json\n.github/hooks/sentinel-check.mjs\n.github/sentinel/generated/checks.immutable.json",
              ],
              ["Claude Code", "PostToolUse + Stop hooks in settings.json", ".claude/settings.json"],
              [
                "Cursor",
                ".cursorrules instruction injection — agent reads rules and self-enforces",
                ".cursorrules (appended)",
              ],
            ]}
          />
          <Callout>
            Cursor does not expose a programmatic hook — Sentinel injects instructions into{" "}
            <InlineCode>.cursorrules</InlineCode> so the agent reads and follows them. cmd checks
            are listed as instructions for the agent to run manually, not enforced by a runtime
            hook.
          </Callout>

          {/* ── Installation ── */}
          <SectionHeading id="installation">Installation</SectionHeading>
          <p className="leading-relaxed">Run in your project root (git repo required):</p>
          <CodeBlock>{"npx sentinel@latest init"}</CodeBlock>
          <p className="mt-4 leading-relaxed">Or with the shell installer:</p>
          <CodeBlock>
            {
              "curl -fsSL https://raw.githubusercontent.com/HarzerHeribert/sentinel/main/install.sh | sh"
            }
          </CodeBlock>
          <p className="mt-4 leading-relaxed">
            Sentinel auto-detects your agent type and project stack. You can also pass flags:
          </p>
          <CodeBlock>
            {
              "# Explicit stack + agent\nnpx sentinel init --stack=typescript --agent=copilot\n\n# Available stacks: typescript, python, go, nextjs, fullstack\n# Available agents: copilot, claude, cursor"
            }
          </CodeBlock>
          <p className="mt-4 leading-relaxed">
            <strong className="text-slate-100">Requirements:</strong> Node.js 18+, an active git
            repository, and one of the supported agents installed.
          </p>

          {/* ── checks.yaml reference ── */}
          <SectionHeading id="reference">checks.yaml reference</SectionHeading>
          <p className="leading-relaxed">
            The <InlineCode>checks.yaml</InlineCode> file lives at your project root and is the
            single source of truth for all Sentinel checks. A minimal example:
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
            <strong className="text-slate-100">cmd check</strong> (has a{" "}
            <InlineCode>cmd</InlineCode> field) or a{" "}
            <strong className="text-slate-100">prompt check</strong> (has a{" "}
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
            files changed. If omitted, the check always runs. Sentinel ships with 15 named scopes
            covering the most common patterns across GitHub repos.
          </p>
          <p className="mt-3 leading-relaxed">
            When no git-staged files are detected (e.g. running{" "}
            <InlineCode>sentinel check</InlineCode> without staged changes), all checks run
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

          {/* ── Supported agents ── */}
          <SectionHeading id="agents">Supported agents</SectionHeading>
          <p className="leading-relaxed">
            Sentinel generates agent-specific adapter files from your{" "}
            <InlineCode>checks.yaml</InlineCode>. Run <InlineCode>sentinel update</InlineCode> after
            any change to regenerate them.
          </p>

          <SubHeading id="agents-copilot">GitHub Copilot CLI</SubHeading>
          <p className="leading-relaxed">
            Sentinel registers a <InlineCode>beforeTaskComplete</InlineCode> extension hook. Before
            Copilot marks a task done, the hook reads git-staged files, runs all matching
            deterministic checks with a 60-second timeout, and blocks completion if any fail.
          </p>
          <p className="mt-3 leading-relaxed">Generated files:</p>
          <ul className="mt-2 space-y-1 pl-5 font-mono text-xs text-slate-400">
            <li className="list-disc">.github/hooks/sentinel.json — hook registration</li>
            <li className="list-disc">
              .github/hooks/sentinel-check.mjs — self-contained check runner
            </li>
            <li className="list-disc">
              .github/sentinel/generated/checks.immutable.json — parsed config
            </li>
          </ul>

          <SubHeading id="agents-claude">Claude Code</SubHeading>
          <p className="leading-relaxed">
            Sentinel adds <InlineCode>PostToolUse</InlineCode> and <InlineCode>Stop</InlineCode>{" "}
            hook entries to <InlineCode>.claude/settings.json</InlineCode>. The hooks delegate to{" "}
            <InlineCode>npx sentinel check</InlineCode> at runtime, which reads the current
            <InlineCode>checks.yaml</InlineCode> directly.
          </p>
          <CodeBlock filename=".claude/settings.json">
            {`{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Task",
        "hooks": [{ "type": "command", "command": "npx sentinel check" }]
      }
    ],
    "Stop": [
      { "type": "command", "command": "npx sentinel check" }
    ]
  }
}`}
          </CodeBlock>

          <SubHeading id="agents-cursor">Cursor</SubHeading>
          <p className="leading-relaxed">
            Sentinel appends a structured instruction block to <InlineCode>.cursorrules</InlineCode>
            . The block lists all checks the agent must carry out before marking a task complete.
            Because Cursor does not expose a programmatic hook, enforcement depends on the agent
            reading and following the instructions.
          </p>

          {/* ── Visual builder ── */}
          <SectionHeading id="builder">Visual builder</SectionHeading>
          <p className="leading-relaxed">
            The visual builder lets you create and edit <InlineCode>checks.yaml</InlineCode> without
            writing YAML by hand. Open it with:
          </p>
          <CodeBlock>{"npx sentinel build"}</CodeBlock>
          <p className="mt-4 leading-relaxed">The builder has two views:</p>
          <ul className="mt-3 space-y-3 pl-5">
            <li className="list-disc leading-relaxed">
              <strong className="text-slate-100">Graph view</strong> — an n8n-style node canvas.
              Nodes represent triggers (hook events), file filters, checks (cmd/prompt), and
              conditions. Drag and connect them to define your configuration. Use the side panel to
              edit node properties.
            </li>
            <li className="list-disc leading-relaxed">
              <strong className="text-slate-100">List view</strong> — displays checks grouped by
              hook event and file filter. Supports inline create, edit, and delete without leaving
              the list. Useful for quickly scanning or bulk-editing checks.
            </li>
          </ul>
          <p className="mt-4 leading-relaxed">
            Both views are bidirectionally synced. Use the{" "}
            <strong className="text-slate-100">Export YAML</strong> button in the toolbar to copy
            the generated config.
          </p>

          {/* ── CLI reference ── */}
          <SectionHeading id="cli">CLI reference</SectionHeading>
          <Table
            headers={["Command", "Description"]}
            rows={[
              [
                "sentinel init [--stack] [--agent]",
                "Install Sentinel — detects stack + agent automatically",
              ],
              ["sentinel check [--staged]", "Run all deterministic checks; surface prompt checks"],
              ["sentinel validate", "Validate checks.yaml against the schema and print errors"],
              ["sentinel update", "Regenerate adapter files from the current checks.yaml"],
              ["sentinel build", "Open the visual builder on localhost:4321"],
            ]}
          />

          <SubHeading id="cli-check">sentinel check</SubHeading>
          <p className="leading-relaxed">
            Reads git-staged files to determine which checks to run (via{" "}
            <InlineCode>when:</InlineCode> filter matching). If no staged files are found, all
            checks run. Use <InlineCode>--staged</InlineCode> to always scope to staged files only.
          </p>
          <p className="mt-3 leading-relaxed">
            cmd checks exit non-zero on failure and print the shell output. prompt checks are
            displayed as a list of instructions — they are not automatically enforced as commands.
          </p>

          <SubHeading id="cli-update">sentinel update</SubHeading>
          <p className="leading-relaxed">
            Must be run after any change to <InlineCode>checks.yaml</InlineCode>. Regenerates all
            adapter files. The <InlineCode>sentinel-sync</InlineCode> check in the default
            configuration enforces this automatically when <InlineCode>checks.yaml</InlineCode> is
            staged.
          </p>

          {/* ── Templates ── */}
          <SectionHeading id="templates">Stack templates</SectionHeading>
          <p className="leading-relaxed">
            <InlineCode>sentinel init</InlineCode> generates a starter{" "}
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
            Auto-detection: Sentinel reads project files to select the best template —{" "}
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
    cmd: "pnpm --filter @sentinel/builder test:e2e"`}
          </CodeBlock>

          <SubHeading id="adv-multi-agent">Multi-agent projects</SubHeading>
          <p className="leading-relaxed">
            <InlineCode>sentinel init</InlineCode> detects and configures a single agent. If your
            project uses multiple agents (e.g. Copilot and Claude Code), run{" "}
            <InlineCode>sentinel init --agent=copilot</InlineCode> then{" "}
            <InlineCode>sentinel update</InlineCode> for the second agent after manually editing the
            config. Automatic multi-agent support is planned.
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
  - MASTER_PROMPT.md    # project conventions and sentinel config guide
  - AGENT_CONTEXT.md    # current repo state, what works, what's broken`}
          </CodeBlock>

          <SubHeading id="adv-keep-in-sync">Keeping generated files in sync</SubHeading>
          <p className="leading-relaxed">
            Sentinel&apos;s own <InlineCode>checks.yaml</InlineCode> includes a{" "}
            <InlineCode>sentinel-sync</InlineCode> check that runs{" "}
            <InlineCode>npx sentinel update</InlineCode> whenever{" "}
            <InlineCode>checks.yaml</InlineCode> is staged. Add this to your project to enforce the
            same invariant:
          </p>
          <CodeBlock>
            {`checks:
  - id: sentinel-sync
    label: "Regenerate adapter files"
    when: "^checks\\.yaml$"
    cmd: "npx sentinel update"`}
          </CodeBlock>

          {/* ── Footer ── */}
          <div className="mt-20 border-t border-slate-800 pt-8 text-sm text-slate-600">
            <p>
              Open source under the MIT license.{" "}
              <a
                href="https://github.com/HarzerHeribert/sentinel"
                className="text-indigo-500 hover:text-indigo-400"
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
