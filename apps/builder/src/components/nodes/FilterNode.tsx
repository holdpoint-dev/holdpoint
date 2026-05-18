import React from "react";
import { Handle, Position } from "@xyflow/react";
import type { Node, NodeProps } from "@xyflow/react";
import type { CanvasNodeData } from "@holdpoint/types";
import { cn } from "../../lib/utils.js";

export function FilterNode({ data, selected }: NodeProps<Node<CanvasNodeData>>) {
  return (
    <div
      className={cn(
        "min-w-[180px] max-w-[240px] rounded-lg border border-node-border bg-node p-3 shadow-lg",
        selected && "ring-2 ring-accent",
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!border-2 !border-canvas !bg-sky-400"
      />

      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-stone">
          Filter
        </span>
        <span className="rounded-full bg-sky-500/20 px-2 py-0.5 text-xs font-medium text-sky-400">
          when
        </span>
      </div>

      <code className="block w-full break-all rounded bg-canvas px-2 py-1 font-mono text-xs text-sky-300">
        {data.when || ".*"}
      </code>

      <Handle
        type="source"
        position={Position.Right}
        className="!border-2 !border-canvas !bg-sky-400"
      />
    </div>
  );
}
