import React from "react";
import { X, Trash2 } from "lucide-react";
import { useCanvasStore } from "../store/canvas.js";
import { generateYaml } from "@sentinel/yaml-core";

const WHEN_OPTIONS = [
  { value: "", label: "Always (no filter)" },
  { value: "frontend", label: "Frontend files" },
  { value: "backend", label: "Backend files" },
  { value: "prisma", label: "Prisma schema" },
  { value: "socket", label: "WebSocket files" },
  { value: "visual", label: "Visual / storybook" },
  { value: "__custom__", label: "Custom regex…" },
];

const NAMED_SCOPES = ["frontend", "backend", "prisma", "socket", "visual"];

export function SidePanel() {
  const { nodes, selectedNodeId, selectNode, updateNode, deleteNode } = useCanvasStore();
  const node = nodes.find((n) => n.id === selectedNodeId);

  if (!node) return null;

  const data = node.data;

  // Generate mini YAML preview for this node
  const miniConfig = {
    version: 1 as const,
    context: { guides: {} },
    conditions: [],
    deterministic:
      data.kind === "check-deterministic"
        ? [
            {
              id: "preview",
              label: data.label,
              ...(data.when ? { when: data.when } : {}),
              ...(data.cmd !== undefined ? { cmd: data.cmd } : {}),
            },
          ]
        : [],
    prompt:
      data.kind === "check-prompt"
        ? [
            {
              id: "preview",
              label: data.label,
              ...(data.when ? { when: data.when } : {}),
              ...(data.prompt !== undefined ? { prompt: data.prompt } : {}),
            },
          ]
        : [],
  };

  let previewYaml = "";
  try {
    previewYaml = generateYaml(miniConfig);
  } catch {
    /* ignore */
  }

  return (
    <aside className="flex w-80 shrink-0 flex-col border-l border-node-border bg-node">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-node-border px-4 py-3">
        <span className="text-sm font-semibold capitalize text-slate-200">
          {data.kind?.replace("-", " ") ?? "Node"} properties
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => deleteNode(node.id)}
            className="rounded p-1 text-slate-400 hover:bg-red-500/20 hover:text-red-400"
            title="Delete node"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => selectNode(null)}
            className="rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Label */}
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-400">Label</label>
          <input
            type="text"
            value={data.label}
            onChange={(e) => updateNode(node.id, { label: e.target.value })}
            className="w-full rounded-md border border-node-border bg-canvas px-3 py-1.5 text-sm text-slate-100 focus:border-accent focus:outline-none"
            placeholder="Check label…"
          />
        </div>

        {/* File filter — check nodes and trigger nodes */}
        {(data.kind === "check-deterministic" ||
          data.kind === "check-prompt" ||
          data.kind === "trigger") && (
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">File filter</label>
            <select
              value={!data.when ? "" : NAMED_SCOPES.includes(data.when) ? data.when : "__custom__"}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "") updateNode(node.id, { when: undefined });
                else if (val === "__custom__")
                  updateNode(node.id, {
                    when: data.when && !NAMED_SCOPES.includes(data.when) ? data.when : "",
                  });
                else updateNode(node.id, { when: val });
              }}
              className="w-full rounded-md border border-node-border bg-canvas px-3 py-1.5 text-sm text-slate-100 focus:border-accent focus:outline-none"
            >
              {WHEN_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            {data.when && !NAMED_SCOPES.includes(data.when) && (
              <input
                type="text"
                value={data.when}
                onChange={(e) => updateNode(node.id, { when: e.target.value })}
                className="mt-2 w-full rounded-md border border-node-border bg-canvas px-3 py-1.5 font-mono text-sm text-indigo-300 focus:border-accent focus:outline-none"
                placeholder="e.g. \.test\.ts$"
              />
            )}
          </div>
        )}

        {/* Command — deterministic check */}
        {data.kind === "check-deterministic" && (
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Command</label>
            <input
              type="text"
              value={data.cmd ?? ""}
              onChange={(e) => updateNode(node.id, { cmd: e.target.value })}
              className="w-full rounded-md border border-node-border bg-canvas px-3 py-1.5 font-mono text-sm text-indigo-300 focus:border-accent focus:outline-none"
              placeholder="pnpm test --run"
            />
            <div className="mt-1 flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-xs text-slate-500">
                Automated — blocks task completion on failure
              </span>
            </div>
          </div>
        )}

        {/* Prompt — prompt check */}
        {data.kind === "check-prompt" && (
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Prompt</label>
            <textarea
              value={data.prompt ?? ""}
              onChange={(e) => updateNode(node.id, { prompt: e.target.value })}
              rows={4}
              className="w-full rounded-md border border-node-border bg-canvas px-3 py-1.5 font-mono text-sm text-slate-100 focus:border-accent focus:outline-none"
              placeholder="Describe what the agent must act on…"
            />
            <div className="mt-1 flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-amber-500" />
              <span className="text-xs text-slate-500">
                Agent reads and acts on this before marking task done
              </span>
            </div>
          </div>
        )}
      </div>

      {/* YAML preview */}
      {(data.kind === "check-deterministic" || data.kind === "check-prompt") && previewYaml && (
        <div className="border-t border-node-border">
          <div className="px-4 py-2 text-xs font-medium text-slate-500">YAML preview</div>
          <pre className="max-h-48 overflow-y-auto px-4 pb-4 font-mono text-xs text-slate-400">
            {previewYaml}
          </pre>
        </div>
      )}
    </aside>
  );
}
