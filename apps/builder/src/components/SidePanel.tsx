import React from "react";
import { X, Trash2 } from "lucide-react";
import { useCanvasStore } from "../store/canvas.js";
import { generateYaml } from "@sentinel/yaml-core";
import type { TriggerType } from "@sentinel/types";

const TRIGGER_TYPES: TriggerType[] = ["always", "frontend", "backend", "prisma", "socket", "visual", "custom"];

export function SidePanel() {
  const { nodes, selectedNodeId, selectNode, updateNode, deleteNode, exportYaml } = useCanvasStore();
  const node = nodes.find((n) => n.id === selectedNodeId);

  if (!node) return null;

  const data = node.data;

  // Generate mini YAML preview for this node
  const miniConfig = {
    version: 1 as const,
    context: { guides: {} },
    conditions: [],
    deterministic: data.kind === "check-deterministic"
      ? [{ id: "preview", label: data.label, trigger: data.trigger ?? { type: "always" as const }, cmd: data.cmd }]
      : [],
    manual: data.kind === "check-manual"
      ? [{ id: "preview", label: data.label, trigger: data.trigger ?? { type: "always" as const }, manual: data.manual }]
      : [],
  };

  let previewYaml = "";
  try {
    previewYaml = generateYaml(miniConfig);
  } catch { /* ignore */ }

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

        {/* Trigger type selector */}
        {(data.kind === "check-deterministic" || data.kind === "check-manual") && (
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Trigger</label>
            <select
              value={data.trigger?.type ?? "always"}
              onChange={(e) =>
                updateNode(node.id, { trigger: { type: e.target.value as TriggerType } })
              }
              className="w-full rounded-md border border-node-border bg-canvas px-3 py-1.5 text-sm text-slate-100 focus:border-accent focus:outline-none"
            >
              {TRIGGER_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        )}

        {/* Trigger type for trigger node */}
        {data.kind === "trigger" && (
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Trigger type</label>
            <select
              value={data.trigger?.type ?? "always"}
              onChange={(e) =>
                updateNode(node.id, { trigger: { type: e.target.value as TriggerType } })
              }
              className="w-full rounded-md border border-node-border bg-canvas px-3 py-1.5 text-sm text-slate-100 focus:border-accent focus:outline-none"
            >
              {TRIGGER_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
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
              <div className="h-2 w-2 rounded-full bg-red-500" />
              <span className="text-xs text-slate-500">Blocks on failure (locked)</span>
            </div>
          </div>
        )}

        {/* Instruction — manual check */}
        {data.kind === "check-manual" && (
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Instruction</label>
            <textarea
              value={data.manual ?? ""}
              onChange={(e) => updateNode(node.id, { manual: e.target.value })}
              rows={4}
              className="w-full rounded-md border border-node-border bg-canvas px-3 py-1.5 font-mono text-sm text-slate-100 focus:border-accent focus:outline-none"
              placeholder="Describe what the agent must verify…"
            />
            <div className="mt-1 flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-amber-500" />
              <span className="text-xs text-slate-500">Agent must confirm (locked)</span>
            </div>
          </div>
        )}
      </div>

      {/* YAML preview */}
      {(data.kind === "check-deterministic" || data.kind === "check-manual") && previewYaml && (
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
