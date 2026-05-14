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

// Minimal inline templates for the builder (loaded when user picks a stack)
const INLINE_TEMPLATES: Record<StackType, string> = {
  typescript: `version: 1
context:
  guides: {}
conditions: []
deterministic:
  - id: lint
    label: "ESLint"
    trigger:
      type: always
    cmd: "pnpm lint --max-warnings 0"
  - id: typecheck
    label: "TypeScript"
    trigger:
      type: always
    cmd: "pnpm typecheck"
  - id: test
    label: "Vitest"
    trigger:
      type: always
    cmd: "pnpm test --run"
manual:
  - id: jsdoc
    label: "JSDoc on changed exports"
    trigger:
      type: always
    manual: "Ensure all changed public functions have JSDoc."`,

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
    label: "Mypy"
    trigger:
      type: always
    cmd: "mypy . --ignore-missing-imports"
  - id: pytest
    label: "pytest"
    trigger:
      type: always
    cmd: "pytest -q"
manual:
  - id: docstrings
    label: "Docstrings on changed functions"
    trigger:
      type: always
    manual: "Add PEP-257 docstrings to all changed public functions."`,

  nextjs: `version: 1
context:
  guides: {}
conditions: []
deterministic:
  - id: lint
    label: "ESLint"
    trigger:
      type: always
    cmd: "pnpm lint --max-warnings 0"
  - id: typecheck
    label: "TypeScript"
    trigger:
      type: always
    cmd: "pnpm typecheck"
  - id: build
    label: "Next.js build"
    trigger:
      type: always
    cmd: "pnpm build"
manual:
  - id: visual
    label: "Visual regression check"
    trigger:
      type: frontend
    manual: "Check layout at 1280px, 768px, 375px."`,

  fullstack: `version: 1
context:
  guides: {}
conditions:
  - id: has-openapi
    operator: file_exists
    path: openapi.yaml
deterministic:
  - id: lint
    label: "ESLint"
    trigger:
      type: always
    cmd: "pnpm lint --max-warnings 0"
  - id: typecheck
    label: "TypeScript"
    trigger:
      type: always
    cmd: "pnpm typecheck"
  - id: test
    label: "Tests"
    trigger:
      type: always
    cmd: "pnpm test --run"
manual:
  - id: openapi
    label: "OpenAPI spec updated"
    trigger:
      type: backend
    conditionId: has-openapi
    manual: "Update openapi.yaml for any API changes."`,

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
