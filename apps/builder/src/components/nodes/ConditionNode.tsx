import React from "react";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import type { CanvasNodeData } from "@sentinel/types";
import { cn } from "../../lib/utils.js";

export function ConditionNode({ data, selected }: NodeProps<CanvasNodeData>) {
  const condition = data.condition;

  return (
    <div
      className={cn(
        "min-w-[220px] rounded-lg border border-node-border bg-node p-4 shadow-lg",
        "border-l-4 border-l-yellow-500",
        selected && "ring-2 ring-accent",
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!border-2 !border-canvas !bg-yellow-500"
      />

      <div className="mb-2 flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Condition
        </span>
      </div>

      <p className="mb-3 font-medium text-slate-100">{data.label || "If / Else"}</p>

      {condition && (
        <div className="rounded bg-slate-900 px-2 py-1.5 text-xs text-slate-300">
          <span className="text-yellow-400">{condition.operator}</span>
          {condition.path && (
            <span className="ml-1 font-mono text-slate-400">{condition.path}</span>
          )}
        </div>
      )}

      {/* True branch */}
      <Handle
        type="source"
        position={Position.Right}
        id="true"
        style={{ top: "35%" }}
        className="!border-2 !border-canvas !bg-green-500"
      />

      {/* False branch */}
      <Handle
        type="source"
        position={Position.Right}
        id="false"
        style={{ top: "65%" }}
        className="!border-2 !border-canvas !bg-red-500"
      />

      <div className="mt-3 flex justify-between text-xs text-slate-500">
        <span></span>
        <div className="flex flex-col items-end gap-3">
          <span className="text-green-500">true →</span>
          <span className="text-red-500">false →</span>
        </div>
      </div>
    </div>
  );
}
