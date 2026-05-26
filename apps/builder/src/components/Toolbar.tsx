import React from "react";
import { Copy, Download, LayoutList, History } from "lucide-react";
import * as Tooltip from "@radix-ui/react-tooltip";
import { useCanvasStore } from "../store/canvas.js";
import { parseHoldpointYaml } from "@holdpoint/yaml-core";
import defaultTemplateYaml from "../../../../templates/default.yaml?raw";

export type ViewMode = "list" | "history";

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

  const handleLoadDefaultTemplate = () => {
    const template = parseHoldpointYaml(defaultTemplateYaml);
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
                onClick={() => onViewChange("list")}
                aria-label="Checks list"
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
                Checks
                <Tooltip.Arrow className="fill-node-border" />
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>

          <div className="w-px bg-node-border" />

          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <button
                onClick={() => onViewChange("history")}
                aria-label="Check history"
                className={`flex items-center px-2.5 py-1.5 text-sm transition-colors ${
                  viewMode === "history"
                    ? "bg-accent text-white"
                    : "text-stone hover:bg-node-border hover:text-bone"
                }`}
              >
                <History className="h-4 w-4" />
              </button>
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content
                side="bottom"
                className="rounded bg-node-border px-2 py-1 text-xs text-bone shadow-md"
              >
                History
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

      <button
        onClick={handleLoadDefaultTemplate}
        className="rounded-md border border-node-border bg-node px-3 py-1.5 text-sm text-stone transition-colors hover:border-accent hover:text-bone"
      >
        Load default template
      </button>
    </header>
  );
}
