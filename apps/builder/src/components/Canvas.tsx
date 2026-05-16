import React, { useCallback } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Connection,
  type NodeProps,
  type NodeTypes,
} from "@xyflow/react";
import type { Node } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { CanvasNodeData } from "@sentinel/types";
import { TriggerNode } from "./nodes/TriggerNode.js";
import { TaskNode, PromptCheckNode } from "./nodes/CheckNodes.js";
import { FilterNode } from "./nodes/FilterNode.js";
import { ConditionNode } from "./nodes/ConditionNode.js";
import { useCanvasStore } from "../store/canvas.js";

type AnyCanvasNodeProps = NodeProps<Node<CanvasNodeData>>;

const nodeTypes: NodeTypes = {
  trigger: TriggerNode as React.ComponentType<AnyCanvasNodeProps>,
  filter: FilterNode as React.ComponentType<AnyCanvasNodeProps>,
  task: TaskNode as React.ComponentType<AnyCanvasNodeProps>,
  prompt: PromptCheckNode as React.ComponentType<AnyCanvasNodeProps>,
  condition: ConditionNode as React.ComponentType<AnyCanvasNodeProps>,
};

export function Canvas() {
  const { nodes, edges, selectNode } = useCanvasStore();
  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState(nodes);
  const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState(edges);
  const { fitView } = useReactFlow();

  // Sync Zustand ↔ React Flow
  React.useEffect(() => {
    setFlowNodes(nodes);
  }, [nodes, setFlowNodes]);

  React.useEffect(() => {
    setFlowEdges(edges);
  }, [edges, setFlowEdges]);

  // Fit view the first time nodes populate (e.g. after checks.yaml loads)
  const prevNodeCount = React.useRef(0);
  React.useEffect(() => {
    if (nodes.length > 0 && prevNodeCount.current === 0) {
      setTimeout(() => fitView({ padding: 0.15, duration: 400 }), 50);
    }
    prevNodeCount.current = nodes.length;
  }, [nodes.length, fitView]);

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
        <Background variant={BackgroundVariant.Dots} gap={20} size={1.5} color="#1E293B" />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            switch (node.type) {
              case "trigger":
                return "#4F46E5";
              case "filter":
                return "#0EA5E9";
              case "task":
                return "#22C55E";
              case "prompt":
                return "#F59E0B";
              case "condition":
                return "#EAB308";
              default:
                return "#334155";
            }
          }}
          maskColor="rgba(15, 23, 42, 0.7)"
        />
      </ReactFlow>
    </div>
  );
}
