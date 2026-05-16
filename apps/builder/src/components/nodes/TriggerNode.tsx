import React from "react";
import { Handle, Position } from "@xyflow/react";
import type { Node, NodeProps } from "@xyflow/react";
import type { CanvasNodeData } from "@sentinel/types";
import { getWhenColor, getWhenBg, getWhenLabel } from "../../lib/triggerColors.js";
import { cn } from "../../lib/utils.js";

const NAMED_SCOPES = ["frontend", "backend", "prisma", "socket", "visual"];

export function TriggerNode({ data, selected }: NodeProps<Node<CanvasNodeData>>) {
  const when = data.when;
  const color = getWhenColor(when);
  const bgClass = getWhenBg(when);
  const whenLabel = getWhenLabel(when);

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
        <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          on: before_done
        </span>
      </div>

      <span className={cn("inline-block rounded-full px-2.5 py-0.5 text-sm font-medium", bgClass)}>
        {whenLabel}
      </span>

      {when && !NAMED_SCOPES.includes(when) && (
        <p className="mt-2 truncate font-mono text-xs text-slate-400">{when}</p>
      )}

      <Handle
        type="source"
        position={Position.Right}
        className="!border-2 !border-canvas !bg-accent"
      />
    </div>
  );
}
