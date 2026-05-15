import { create } from "zustand";
import type { Node, Edge } from "@xyflow/react";
import type { SentinelConfig, CanvasNodeData, ConditionDef, Trigger } from "@sentinel/types";
import { generateYaml, parseSentinelYaml } from "@sentinel/yaml-core";

interface CanvasState {
  nodes: Node<CanvasNodeData>[];
  edges: Edge[];
  selectedNodeId: string | null;
  yaml: string;

  // Node actions
  setNodes: (nodes: Node<CanvasNodeData>[]) => void;
  setEdges: (edges: Edge[]) => void;
  addNode: (node: Node<CanvasNodeData>) => void;
  updateNode: (id: string, data: Partial<CanvasNodeData>) => void;
  deleteNode: (id: string) => void;
  selectNode: (id: string | null) => void;

  // YAML actions
  exportYaml: () => string;
  loadFromYaml: (text: string) => void;
  loadTemplate: (template: SentinelConfig) => void;
}

let nodeCounter = 0;
function nextId(prefix: string) {
  return `${prefix}-${++nodeCounter}`;
}

function configToGraph(config: SentinelConfig): {
  nodes: Node<CanvasNodeData>[];
  edges: Edge[];
} {
  const nodes: Node<CanvasNodeData>[] = [];
  const edges: Edge[] = [];

  const allChecks = [...config.deterministic, ...config.manual];

  // Group checks by trigger type
  const byTrigger = new Map<string, typeof allChecks>();
  for (const check of allChecks) {
    const key = check.trigger.type + (check.trigger.pattern ?? "");
    if (!byTrigger.has(key)) byTrigger.set(key, []);
    byTrigger.get(key)!.push(check);
  }

  let triggerY = 50;
  for (const [, checks] of byTrigger) {
    const firstCheck = checks[0]!;
    const triggerId = nextId("trigger");
    nodes.push({
      id: triggerId,
      type: "trigger",
      position: { x: 50, y: triggerY },
      data: {
        kind: "trigger",
        label: `Trigger: ${firstCheck.trigger.type}`,
        trigger: firstCheck.trigger,
      },
    });

    let checkY = triggerY;
    for (const check of checks) {
      const checkId = nextId(check.cmd ? "check-det" : "check-man");
      nodes.push({
        id: checkId,
        type: check.cmd ? "check-deterministic" : "check-manual",
        position: { x: 350, y: checkY },
        data: {
          kind: check.cmd ? "check-deterministic" : "check-manual",
          label: check.label,
          trigger: check.trigger,
          cmd: check.cmd,
          manual: check.manual,
        },
      });
      edges.push({
        id: `e-${triggerId}-${checkId}`,
        source: triggerId,
        target: checkId,
        animated: true,
      });
      checkY += 130;
    }

    triggerY = Math.max(triggerY + checks.length * 130 + 60, triggerY + 200);
  }

  return { nodes, edges };
}

function graphToConfig(
  nodes: Node<CanvasNodeData>[],
  edges: Edge[],
): SentinelConfig {
  const nodeById = new Map(nodes.map((n) => [n.id, n]));

  // Build map from check-node id → trigger from its connected source trigger node
  const triggerByCheckId = new Map<string, Trigger>();
  for (const edge of edges) {
    const sourceNode = nodeById.get(edge.source);
    const targetNode = nodeById.get(edge.target);
    if (
      sourceNode?.data.kind === "trigger" &&
      targetNode &&
      sourceNode.data.trigger
    ) {
      triggerByCheckId.set(edge.target, sourceNode.data.trigger);
    }
  }

  const conditions: ConditionDef[] = nodes
    .filter((n) => n.data.kind === "condition" && n.data.condition)
    .map((n) => n.data.condition as ConditionDef);

  const deterministic = nodes
    .filter((n) => n.data.kind === "check-deterministic")
    .map((n, i) => ({
      id: `det-${i + 1}`,
      label: n.data.label,
      trigger: triggerByCheckId.get(n.id) ?? n.data.trigger ?? { type: "always" as const },
      cmd: n.data.cmd,
    }));

  const manual = nodes
    .filter((n) => n.data.kind === "check-manual")
    .map((n, i) => ({
      id: `man-${i + 1}`,
      label: n.data.label,
      trigger: triggerByCheckId.get(n.id) ?? n.data.trigger ?? { type: "always" as const },
      manual: n.data.manual,
    }));

  return {
    version: 1,
    context: { guides: {} },
    conditions,
    deterministic,
    manual,
  };
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,
  yaml: "",

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  addNode: (node) =>
    set((state) => ({ nodes: [...state.nodes, node] })),

  updateNode: (id, data) =>
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, ...data } } : n,
      ),
    })),

  deleteNode: (id) =>
    set((state) => ({
      nodes: state.nodes.filter((n) => n.id !== id),
      edges: state.edges.filter((e) => e.source !== id && e.target !== id),
      selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
    })),

  selectNode: (id) => set({ selectedNodeId: id }),

  exportYaml: () => {
    const { nodes, edges } = get();
    const config = graphToConfig(nodes, edges);
    const text = generateYaml(config);
    set({ yaml: text });
    return text;
  },

  loadFromYaml: (text) => {
    try {
      const config = parseSentinelYaml(text);
      const { nodes, edges } = configToGraph(config);
      set({ nodes, edges, yaml: text });
    } catch (err) {
      console.error("Failed to load YAML:", err);
    }
  },

  loadTemplate: (template) => {
    const { nodes, edges } = configToGraph(template);
    set({ nodes, edges, yaml: generateYaml(template) });
  },
}));
