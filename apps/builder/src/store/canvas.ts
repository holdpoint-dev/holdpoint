import { create } from "zustand";
import type { Node, Edge } from "@xyflow/react";
import type { SentinelConfig, CanvasNodeData, ConditionDef, HookEvent } from "@sentinel/types";
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
  updateNode: (id: string, data: Record<string, unknown>) => void;
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

  const allChecks = [...config.deterministic, ...config.prompt];

  // Group checks by (on ?? "before_done") + ":" + (when ?? "")
  const byHook = new Map<string, typeof allChecks>();
  for (const check of allChecks) {
    const key = (check.on ?? "before_done") + ":" + (check.when ?? "");
    if (!byHook.has(key)) byHook.set(key, []);
    byHook.get(key)!.push(check);
  }

  let triggerY = 50;
  for (const [, checks] of byHook) {
    const firstCheck = checks[0]!;
    const triggerId = nextId("trigger");
    const whenLabel = firstCheck.when ? `when: ${firstCheck.when}` : "always";
    nodes.push({
      id: triggerId,
      type: "trigger",
      position: { x: 50, y: triggerY },
      data: {
        kind: "trigger",
        label: `on: ${firstCheck.on ?? "before_done"} — ${whenLabel}`,
        ...(firstCheck.on !== undefined ? { on: firstCheck.on } : {}),
        ...(firstCheck.when !== undefined ? { when: firstCheck.when } : {}),
      },
    });

    let checkY = triggerY;
    for (const check of checks) {
      const checkId = nextId(check.cmd ? "check-det" : "check-prompt");
      nodes.push({
        id: checkId,
        type: check.cmd ? "check-deterministic" : "check-prompt",
        position: { x: 350, y: checkY },
        data: {
          kind: check.cmd ? "check-deterministic" : "check-prompt",
          label: check.label,
          ...(check.on !== undefined ? { on: check.on } : {}),
          ...(check.when !== undefined ? { when: check.when } : {}),
          ...(check.cmd !== undefined ? { cmd: check.cmd } : {}),
          ...(check.prompt !== undefined ? { prompt: check.prompt } : {}),
          ...(check.conditionId !== undefined ? { conditionId: check.conditionId } : {}),
        },
      });
      edges.push({
        id: `e-${triggerId}-${checkId}`,
        source: triggerId,
        target: checkId,
        animated: true,
      });
      checkY += 160;
    }

    triggerY = Math.max(triggerY + checks.length * 130 + 60, triggerY + 200);
  }

  return { nodes, edges };
}

function graphToConfig(nodes: Node<CanvasNodeData>[], edges: Edge[]): SentinelConfig {
  const nodeById = new Map(nodes.map((n) => [n.id, n]));

  // Build map from check-node id → {on, when} from its connected source trigger node
  const hookByCheckId = new Map<string, { on?: HookEvent; when?: string }>();
  for (const edge of edges) {
    const sourceNode = nodeById.get(edge.source);
    const targetNode = nodeById.get(edge.target);
    if (sourceNode?.data.kind === "trigger" && targetNode) {
      const sourceOn = sourceNode.data.on;
      const sourceWhen = sourceNode.data.when;
      hookByCheckId.set(edge.target, {
        ...(sourceOn !== undefined ? { on: sourceOn } : {}),
        ...(sourceWhen !== undefined ? { when: sourceWhen } : {}),
      });
    }
  }

  const conditions: ConditionDef[] = nodes
    .filter((n) => n.data.kind === "condition" && n.data.condition)
    .map((n) => n.data.condition as ConditionDef);

  const deterministic = nodes
    .filter((n) => n.data.kind === "check-deterministic")
    .map((n, i) => {
      const hook = hookByCheckId.get(n.id) ?? {
        on: n.data.on,
        when: n.data.when,
      };
      return {
        id: `det-${i + 1}`,
        label: n.data.label,
        ...(hook.on !== undefined ? { on: hook.on } : {}),
        ...(hook.when !== undefined ? { when: hook.when } : {}),
        ...(n.data.cmd !== undefined ? { cmd: n.data.cmd } : {}),
        ...(n.data.conditionId !== undefined ? { conditionId: n.data.conditionId } : {}),
      };
    });

  const prompt = nodes
    .filter((n) => n.data.kind === "check-prompt")
    .map((n, i) => {
      const hook = hookByCheckId.get(n.id) ?? {
        on: n.data.on,
        when: n.data.when,
      };
      return {
        id: `prompt-${i + 1}`,
        label: n.data.label,
        ...(hook.on !== undefined ? { on: hook.on } : {}),
        ...(hook.when !== undefined ? { when: hook.when } : {}),
        ...(n.data.prompt !== undefined ? { prompt: n.data.prompt } : {}),
        ...(n.data.conditionId !== undefined ? { conditionId: n.data.conditionId } : {}),
      };
    });

  return {
    version: 1,
    context: { guides: {} },
    conditions,
    deterministic,
    prompt,
  };
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,
  yaml: "",

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  addNode: (node) => set((state) => ({ nodes: [...state.nodes, node] })),

  updateNode: (id, data) =>
    set((state) => ({
      nodes: state.nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...data } } : n)),
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
