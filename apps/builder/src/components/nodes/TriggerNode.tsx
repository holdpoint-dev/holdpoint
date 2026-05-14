import React from "react";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import type { CanvasNodeData, TriggerType } from "@sentinel/types";
import { TRIGGER_COLORS, TRIGGER_BG } from "../../lib/triggerColors.js";
import { cn } from "../../lib/utils.js";

const TRIGGER_LABELS: Record<TriggerType, string> = {
  always: "Always",
  frontend: "Frontend",
  backend: "Backend",
  prisma: "Prisma",
  socket: "WebSocket",
  visual: "Visual",
  custom: "Custom",
};

export function TriggerNode({ data, selected }: NodeProps<CanvasNodeData>) {
  const triggerType = data.trigger?.type ?? "always";
  const color = TRIGGER_COLORS[triggerType];
  const bgClass = TRIGGER_BG[triggerType];

  return (
    <div
      className={cn(
        "min-w-[220px] rounded-lg border border-node-border bg-node p-4",
        "border-l-4 shadow-lg",
        selected && "ring-2 ring-accent",
      )}
      style={{ borderLeftColor: color }}
    >
      <div className="mb-2 flex items-center gap-2">
        <div
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: color }}
        />
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Trigger
        </span>
      </div>

      <span
        className={cn(
          "inline-block rounded-full px-2.5 py-0.5 text-sm font-medium",
          bgClass,
        )}
      >
        {TRIGGER_LABELS[triggerType]}
      </span>

      {data.trigger?.type === "custom" && data.trigger.pattern && (
        <p className="mt-2 truncate font-mono text-xs text-slate-400">
          {data.trigger.pattern}
        </p>
      )}

      <Handle
        type="source"
        position={Position.Right}
        className="!border-2 !border-canvas !bg-accent"
      />
    </div>
  );
}
