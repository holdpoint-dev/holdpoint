import React from "react";
import { Handle, Position } from "@xyflow/react";
import type { Node, NodeProps } from "@xyflow/react";
import type { CanvasNodeData } from "@holdpoint/types";
import { cn } from "../../lib/utils.js";

export function TaskNode({ data, selected }: NodeProps<Node<CanvasNodeData>>) {
  return (
    <div
      className={cn(
        "min-w-[260px] max-w-[320px] rounded-lg border border-node-border bg-node p-4 shadow-lg",
        selected && "ring-2 ring-accent",
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!border-2 !border-canvas !bg-accent"
      />

      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-stone">Check</span>
        <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-xs font-medium text-green-400">
          automated
        </span>
      </div>

      <p className="mb-2 font-medium text-bone">{data.label || "Untitled check"}</p>

      {data.cmd && (
        <code className="block w-full break-all rounded bg-canvas px-2 py-1 font-mono text-xs text-bone">
          {data.cmd}
        </code>
      )}

      {data.conditionId && (
        <p className="mt-2 text-xs text-stone/70">
          <span className="text-yellow-500/80">if</span>{" "}
          <span className="font-mono">{data.conditionId}</span>
        </p>
      )}
    </div>
  );
}

export function PromptCheckNode({ data, selected }: NodeProps<Node<CanvasNodeData>>) {
  return (
    <div
      className={cn(
        "min-w-[260px] max-w-[320px] rounded-lg border border-node-border bg-node p-4 shadow-lg",
        selected && "ring-2 ring-accent",
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!border-2 !border-canvas !bg-accent-amber"
      />

      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-stone">
          Prompt
        </span>
        <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-400">
          agent prompt
        </span>
      </div>

      <p className="mb-2 font-medium text-bone">{data.label || "Untitled check"}</p>

      {data.prompt && <p className="line-clamp-2 text-xs text-stone">{data.prompt}</p>}

      {data.conditionId && (
        <p className="mt-2 text-xs text-stone/70">
          <span className="text-yellow-500/80">if</span>{" "}
          <span className="font-mono">{data.conditionId}</span>
        </p>
      )}
    </div>
  );
}
