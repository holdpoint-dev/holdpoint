import React, { useCallback, useRef } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { CanvasNodeData } from "@sentinel/types";
import { TriggerNode } from "./nodes/TriggerNode.js";
import { DeterministicCheckNode, ManualCheckNode } from "./nodes/CheckNodes.js";
import { ConditionNode } from "./nodes/ConditionNode.js";
import { useCanvasStore } from "../store/canvas.js";

const nodeTypes: NodeTypes = {
  trigger: TriggerNode as React.ComponentType<never>,
  "check-deterministic": DeterministicCheckNode as React.ComponentType<never>,
  "check-manual": ManualCheckNode as React.ComponentType<never>,
  condition: ConditionNode as React.ComponentType<never>,
};

export function Canvas() {
  const { nodes, edges, setNodes, setEdges, selectNode } = useCanvasStore();
  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState(nodes);
  const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState(edges);

  // Sync Zustand ↔ React Flow
  React.useEffect(() => {
    setFlowNodes(nodes);
  }, [nodes, setFlowNodes]);

  React.useEffect(() => {
    setFlowEdges(edges);
  }, [edges, setFlowEdges]);

  const onConnect = useCallback(
    (connection: Connection) => {
      setFlowEdges((eds) => addEdge({ ...connection, animated: true }, eds));
    },
    [setFlowEdges],
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: { id: string }) => {
      selectNode(node.id);
    },
    [selectNode],
  );

  const onPaneClick = useCallback(() => {
    selectNode(null);
  }, [selectNode]);

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        className="bg-canvas"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1.5}
          color="#1E293B"
        />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            switch (node.type) {
              case "trigger": return "#4F46E5";
              case "check-deterministic": return "#22C55E";
              case "check-manual": return "#F59E0B";
              case "condition": return "#EAB308";
              default: return "#334155";
            }
          }}
          maskColor="rgba(15, 23, 42, 0.7)"
        />
      </ReactFlow>
    </div>
  );
}
