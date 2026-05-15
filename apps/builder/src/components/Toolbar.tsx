import React from "react";
import { Copy, Download, ChevronDown } from "lucide-react";
import { useCanvasStore } from "../store/canvas.js";
import { parseSentinelYaml } from "@sentinel/yaml-core";
import type { StackType } from "@sentinel/types";

const STACK_OPTIONS: { label: string; value: StackType }[] = [
  { label: "TypeScript", value: "typescript" },
  { label: "Python", value: "python" },
  { label: "Next.js", value: "nextjs" },
  { label: "Full-stack", value: "fullstack" },
];

// Inline templates — kept in sync with templates/*.yaml on disk
const INLINE_TEMPLATES: Record<StackType, string> = {
  typescript: `version: 1
context:
  guides: {}
conditions: []
deterministic:
  - id: lint
    label: "ESLint — no warnings"
    trigger:
      type: always
    cmd: "pnpm lint --max-warnings 0"
  - id: typecheck
    label: "TypeScript type check"
    trigger:
      type: always
    cmd: "pnpm typecheck"
  - id: unit-tests
    label: "Vitest unit tests"
    trigger:
      type: always
    cmd: "pnpm test --run"
manual:
  - id: jsdoc
    label: "JSDoc on changed public functions"
    trigger:
      type: always
    manual: "Ensure all changed public functions and exports have JSDoc comments with description, @param, and @returns where applicable."
  - id: test-coverage
    label: "Meaningful test coverage for new logic"
    trigger:
      type: always
    manual: "Confirm that any new non-trivial logic introduced in this change has corresponding unit tests in the __tests__ directory."`,

  python: `version: 1
context:
  guides: {}
conditions: []
deterministic:
  - id: ruff
    label: "Ruff linter"
    trigger:
      type: always
    cmd: "ruff check ."
  - id: mypy
    label: "Mypy type check"
    trigger:
      type: always
    cmd: "mypy . --ignore-missing-imports"
  - id: pytest
    label: "pytest"
    trigger:
      type: always
    cmd: "pytest --tb=short -q"
manual:
  - id: docstrings
    label: "Docstrings on changed functions"
    trigger:
      type: always
    manual: "Ensure all changed public functions and classes have PEP-257 compliant docstrings (one-line summary + extended description where needed)."
  - id: type-hints
    label: "Type hints on new functions"
    trigger:
      type: always
    manual: "Confirm that all new functions have complete type annotations on all parameters and return values."`,

  nextjs: `version: 1
context:
  guides: {}
conditions:
  - id: has-openapi
    operator: file_exists
    path: openapi.yaml
deterministic:
  - id: lint
    label: "ESLint — no warnings"
    trigger:
      type: always
    cmd: "pnpm lint --max-warnings 0"
  - id: typecheck
    label: "TypeScript type check"
    trigger:
      type: always
    cmd: "pnpm typecheck"
  - id: unit-tests
    label: "Vitest unit tests"
    trigger:
      type: always
    cmd: "pnpm test --run"
  - id: build
    label: "Next.js production build"
    trigger:
      type: always
    cmd: "pnpm build"
manual:
  - id: jsdoc
    label: "JSDoc on changed public functions"
    trigger:
      type: always
    manual: "Ensure all changed public functions and exports have JSDoc comments."
  - id: visual-regression
    label: "Visual regression check"
    trigger:
      type: frontend
    manual: "For any UI changes, confirm the layout is correct at 1280px desktop, 768px tablet, and 375px mobile breakpoints."
  - id: i18n
    label: "i18n — no hardcoded strings"
    trigger:
      type: frontend
    manual: "Ensure all user-visible text is wrapped in the t() translation function and has corresponding entries in all locale files."
  - id: openapi-updated
    label: "OpenAPI spec updated for API changes"
    trigger:
      type: backend
    conditionId: has-openapi
    manual: "If any API routes were added or changed, confirm the openapi.yaml spec has been updated to match."`,

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
deterministic:
  - id: lint
    label: "ESLint — no warnings"
    trigger:
      type: always
    cmd: "pnpm lint --max-warnings 0"
  - id: typecheck
    label: "TypeScript type check"
    trigger:
      type: always
    cmd: "pnpm typecheck"
  - id: unit-tests
    label: "Vitest unit tests"
    trigger:
      type: always
    cmd: "pnpm test --run"
  - id: backend-tests
    label: "Backend integration tests"
    trigger:
      type: backend
    cmd: "pnpm test:integration --run"
  - id: build
    label: "Production build"
    trigger:
      type: always
    cmd: "pnpm build"
manual:
  - id: jsdoc
    label: "JSDoc on changed public functions"
    trigger:
      type: always
    manual: "All changed public functions and exports must have JSDoc."
  - id: openapi-updated
    label: "OpenAPI spec updated for API changes"
    trigger:
      type: backend
    conditionId: has-openapi
    manual: "If any API routes were added or changed, update openapi.yaml to match."
  - id: visual-regression
    label: "Visual regression check"
    trigger:
      type: frontend
    conditionId: has-playwright
    manual: "Run playwright tests for any UI changes: pnpm playwright test. Review screenshots for regressions."
  - id: i18n
    label: "i18n — no hardcoded user-facing strings"
    trigger:
      type: frontend
    manual: "Confirm all user-visible strings are wrapped in t() and locale files updated."
  - id: db-migrations
    label: "Database migration for schema changes"
    trigger:
      type: prisma
    manual: "If the Prisma schema changed, ensure a migration was generated with prisma migrate dev and committed."`,

  unknown: `version: 1
context:
  guides: {}
conditions: []
deterministic: []
manual: []`,
};

export function Toolbar() {
  const { exportYaml, loadTemplate, nodes } = useCanvasStore();
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
    const template = parseSentinelYaml(INLINE_TEMPLATES[stack]);
    loadTemplate(template);
  };

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-node-border bg-node px-4">
      {/* Logo */}
      <div className="flex items-center gap-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded bg-accent">
          <span className="font-mono text-xs font-bold text-white">S</span>
        </div>
        <span className="font-semibold tracking-tight text-white">Sentinel</span>
        <span className="ml-1 rounded-full bg-indigo-500/20 px-2 py-0.5 text-xs text-indigo-400">
          Builder
        </span>
      </div>

      {/* Center actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
        >
          <Download className="h-3.5 w-3.5" />
          Export YAML
        </button>
        <button
          onClick={() => void handleCopy()}
          className="flex items-center gap-1.5 rounded-md border border-node-border px-3 py-1.5 text-sm font-medium text-slate-300 transition-colors hover:border-slate-500 hover:text-white"
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
          className="appearance-none rounded-md border border-node-border bg-node py-1.5 pl-3 pr-8 text-sm text-slate-300 focus:border-accent focus:outline-none"
        >
          <option value="" disabled>Load template…</option>
          {STACK_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 top-2 h-4 w-4 text-slate-400" />
      </div>
    </header>
  );
}
