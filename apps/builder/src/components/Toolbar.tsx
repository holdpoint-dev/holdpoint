import React from "react";
import { Copy, Download, ChevronDown, Workflow, LayoutList } from "lucide-react";
import * as Tooltip from "@radix-ui/react-tooltip";
import { useCanvasStore } from "../store/canvas.js";
import { parseHoldpointYaml } from "@holdpoint/yaml-core";
import type { StackType } from "@holdpoint/types";

export type ViewMode = "graph" | "list";

const STACK_OPTIONS: { label: string; value: StackType }[] = [
  { label: "TypeScript", value: "typescript" },
  { label: "Python", value: "python" },
  { label: "Go", value: "go" },
  { label: "Next.js", value: "nextjs" },
  { label: "Full-stack", value: "fullstack" },
];

const INLINE_TEMPLATES: Record<StackType, string> = {
  typescript: `version: 1
context:
  guides: {}
conditions: []
checks:
  - id: lint
    label: "ESLint — no warnings"
    cmd: "pnpm lint --max-warnings 0"
  - id: typecheck
    label: "TypeScript type check"
    cmd: "pnpm typecheck"
  - id: unit-tests
    label: "Vitest unit tests"
    cmd: "pnpm test --run"
  - id: jsdoc
    label: "JSDoc on changed public functions"
    prompt: "Ensure all changed public functions and exports have JSDoc comments with description, @param, and @returns where applicable."
  - id: test-coverage
    label: "Meaningful test coverage for new logic"
    prompt: "Confirm that any new non-trivial logic introduced in this change has corresponding unit tests in the __tests__ directory."
  - id: holdpoint-evolve
    label: "Evolve checks when project structure changes"
    when: structural
    cmd: "npx holdpoint evolve"`,

  python: `version: 1
context:
  guides: {}
conditions: []
checks:
  - id: ruff
    label: "Ruff linter"
    when: python
    cmd: "ruff check ."
  - id: mypy
    label: "Mypy type check"
    when: python
    cmd: "mypy . --ignore-missing-imports"
  - id: pytest
    label: "pytest"
    when: python
    cmd: "pytest --tb=short -q"
  - id: docstrings
    label: "Docstrings on changed functions"
    when: python
    prompt: "Ensure all changed public functions and classes have PEP-257 compliant docstrings (one-line summary + extended description where needed)."
  - id: type-hints
    label: "Type hints on new functions"
    when: python
    prompt: "Confirm that all new functions have complete type annotations on all parameters and return values."
  - id: holdpoint-evolve
    label: "Evolve checks when project structure changes"
    when: structural
    cmd: "npx holdpoint evolve"`,

  go: `version: 1
context:
  guides: {}
conditions: []
checks:
  - id: go-build
    label: "go build — no compilation errors"
    when: go
    cmd: "go build ./..."
  - id: go-vet
    label: "go vet — no suspicious constructs"
    when: go
    cmd: "go vet ./..."
  - id: go-test
    label: "go test — all unit tests pass"
    when: go
    cmd: "go test ./..."
  - id: godoc
    label: "GoDoc on exported symbols"
    when: go
    prompt: "Ensure all exported functions, types, methods, and packages have GoDoc comments."
  - id: test-coverage
    label: "Meaningful test coverage for new logic"
    when: testing
    prompt: "Confirm any new non-trivial logic has corresponding unit tests in *_test.go files."
  - id: holdpoint-evolve
    label: "Evolve checks when project structure changes"
    when: structural
    cmd: "npx holdpoint evolve"`,

  nextjs: `version: 1
context:
  guides: {}
conditions:
  - id: has-openapi
    operator: file_exists
    path: openapi.yaml
checks:
  - id: lint
    label: "ESLint — no warnings"
    cmd: "pnpm lint --max-warnings 0"
  - id: typecheck
    label: "TypeScript type check"
    cmd: "pnpm typecheck"
  - id: unit-tests
    label: "Vitest unit tests"
    cmd: "pnpm test --run"
  - id: build
    label: "Next.js production build"
    cmd: "pnpm build"
  - id: jsdoc
    label: "JSDoc on changed public functions"
    prompt: "Ensure all changed public functions and exports have JSDoc comments."
  - id: visual-regression
    label: "Visual regression check"
    when: frontend
    prompt: "For any UI changes, confirm the layout is correct at 1280px desktop, 768px tablet, and 375px mobile breakpoints."
  - id: i18n
    label: "i18n — no hardcoded strings"
    when: frontend
    prompt: "Ensure all user-visible text is wrapped in the t() translation function and has corresponding entries in all locale files."
  - id: openapi-updated
    label: "OpenAPI spec updated for API changes"
    when: backend
    conditionId: has-openapi
    prompt: "If any API routes were added or changed, confirm the openapi.yaml spec has been updated to match."
  - id: holdpoint-evolve
    label: "Evolve checks when project structure changes"
    when: structural
    cmd: "npx holdpoint evolve"`,

  fullstack: `version: 1
context:
  guides: {}
conditions:
  - id: has-openapi
    operator: file_exists
    path: openapi.yaml
  - id: has-playwright
    operator: file_exists
    path: playwright.config.ts
checks:
  - id: lint
    label: "ESLint — no warnings"
    cmd: "pnpm lint --max-warnings 0"
  - id: typecheck
    label: "TypeScript type check"
    cmd: "pnpm typecheck"
  - id: unit-tests
    label: "Vitest unit tests"
    cmd: "pnpm test --run"
  - id: backend-tests
    label: "Backend integration tests"
    when: backend
    cmd: "pnpm test:integration --run"
  - id: build
    label: "Production build"
    cmd: "pnpm build"
  - id: jsdoc
    label: "JSDoc on changed public functions"
    prompt: "All changed public functions and exports must have JSDoc."
  - id: openapi-updated
    label: "OpenAPI spec updated for API changes"
    when: backend
    conditionId: has-openapi
    prompt: "If any API routes were added or changed, update openapi.yaml to match."
  - id: visual-regression
    label: "Visual regression check"
    when: frontend
    conditionId: has-playwright
    prompt: "Run playwright tests for any UI changes: pnpm playwright test. Review screenshots for regressions."
  - id: i18n
    label: "i18n — no hardcoded user-facing strings"
    when: frontend
    prompt: "Confirm all user-visible strings are wrapped in t() and locale files updated."
  - id: db-migrations
    label: "Database migration for schema changes"
    when: database
    prompt: "If schema or migration files changed, ensure the appropriate migration was generated with your ORM tool and committed."
  - id: holdpoint-evolve
    label: "Evolve checks when project structure changes"
    when: structural
    cmd: "npx holdpoint evolve"`,

  unknown: `version: 1
context:
  guides: {}
conditions: []
checks:
  - id: lint
    label: "Lint codebase"
    cmd: "pnpm lint --max-warnings 0"
  - id: typecheck
    label: "TypeScript type check"
    cmd: "pnpm typecheck"
  - id: jsdoc
    label: "JSDoc on changed public functions"
    prompt: "Ensure all changed public functions, classes, and module exports have accurate JSDoc comments (description + @param + @returns where applicable)."
  - id: changelog-update
    label: "Add a CHANGELOG.md entry for this session"
    prompt: "Before committing, add an entry to CHANGELOG.md under ## [Unreleased]. Use Keep a Changelog format."
  - id: readme-sync
    label: "Update README.md if user-facing changes were made"
    prompt: "If you added, changed, or removed user-facing functionality, update README.md to reflect those changes."
  - id: no-todos
    label: "No TODO/FIXME left in changed code"
    prompt: "Scan the files you changed for any TODO, FIXME, HACK, or XXX comments. Either resolve them or convert to tracked issues."
  - id: holdpoint-evolve
    label: "Evolve checks when project structure changes"
    when: structural
    cmd: "npx holdpoint evolve"
  - id: git-commit
    label: "Commit all changes before finishing"
    cmd: "git rev-parse --is-inside-work-tree 2>/dev/null || exit 0; [ -z \\"$(git status --porcelain)\\" ] && exit 0; git status --short; exit 1"`,
};

export function Toolbar({
  viewMode,
  onViewChange,
}: {
  viewMode: ViewMode;
  onViewChange: (mode: ViewMode) => void;
}) {
  const { exportYaml, loadTemplate } = useCanvasStore();
  const [copied, setCopied] = React.useState(false);

  const handleExport = () => {
    const text = exportYaml();
    const blob = new Blob([text], { type: "text/yaml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "checks.yaml";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = async () => {
    const text = exportYaml();
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleStackSelect = (stack: StackType) => {
    const template = parseHoldpointYaml(INLINE_TEMPLATES[stack]);
    loadTemplate(template);
  };

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-node-border bg-node px-4">
      {/* Logo */}
      <div className="flex items-center gap-2.5 text-bone">
        <svg
          width="24"
          height="24"
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
        <span
          className="font-semibold tracking-tight text-bone"
          style={{ fontFamily: "'JetBrains Mono', 'IBM Plex Mono', ui-monospace, monospace" }}
        >
          holdpoint
        </span>
        <span className="ml-1 rounded-full bg-accent/20 px-2 py-0.5 text-xs text-accent">
          Builder
        </span>
      </div>

      {/* View toggle */}
      <Tooltip.Provider delayDuration={300}>
        <div className="flex overflow-hidden rounded-md border border-node-border">
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <button
                onClick={() => onViewChange("graph")}
                aria-label="Graph view"
                className={`flex items-center px-2.5 py-1.5 text-sm transition-colors ${
                  viewMode === "graph"
                    ? "bg-accent text-white"
                    : "text-stone hover:bg-node-border hover:text-bone"
                }`}
              >
                <Workflow className="h-4 w-4" />
              </button>
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content
                side="bottom"
                className="rounded bg-node-border px-2 py-1 text-xs text-bone shadow-md"
              >
                Graph view
                <Tooltip.Arrow className="fill-node-border" />
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>

          <div className="w-px bg-node-border" />

          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <button
                onClick={() => onViewChange("list")}
                aria-label="List view"
                className={`flex items-center px-2.5 py-1.5 text-sm transition-colors ${
                  viewMode === "list"
                    ? "bg-accent text-white"
                    : "text-stone hover:bg-node-border hover:text-bone"
                }`}
              >
                <LayoutList className="h-4 w-4" />
              </button>
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content
                side="bottom"
                className="rounded bg-node-border px-2 py-1 text-xs text-bone shadow-md"
              >
                List view
                <Tooltip.Arrow className="fill-node-border" />
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>
        </div>
      </Tooltip.Provider>

      {/* Center actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:opacity-90"
        >
          <Download className="h-3.5 w-3.5" />
          Export YAML
        </button>
        <button
          onClick={() => void handleCopy()}
          className="flex items-center gap-1.5 rounded-md border border-node-border px-3 py-1.5 text-sm font-medium text-stone transition-colors hover:border-accent hover:text-bone"
        >
          <Copy className="h-3.5 w-3.5" />
          {copied ? "Copied!" : "Copy YAML"}
        </button>
      </div>

      {/* Stack selector */}
      <div className="relative">
        <select
          onChange={(e) => handleStackSelect(e.target.value as StackType)}
          defaultValue=""
          className="appearance-none rounded-md border border-node-border bg-node py-1.5 pl-3 pr-8 text-sm text-stone focus:border-accent focus:outline-none"
        >
          <option value="" disabled>
            Load template…
          </option>
          {STACK_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 top-2 h-4 w-4 text-stone" />
      </div>
    </header>
  );
}
