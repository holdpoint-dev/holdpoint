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

/**
 * Convert a SentinelConfig to a React Flow graph.
 *
 * Topology:
 *   Trigger (on: before_done)
 *     ├─→ FilterNode (when: frontend) ─→ Task / Prompt
 *     └─→ Task / Prompt  (no filter = always runs)
 *
 * Checks that share the same `when` value share a single FilterNode.
 * Checks with no `when` connect directly to the Trigger node.
 */
function configToGraph(config: SentinelConfig): {
  nodes: Node<CanvasNodeData>[];
  edges: Edge[];
} {
  const nodes: Node<CanvasNodeData>[] = [];
  const edges: Edge[] = [];

  const allChecks = [...config.task, ...config.prompt];

  // Group checks by `on` hook
  const byHook = new Map<string, typeof allChecks>();
  for (const check of allChecks) {
    const hookKey = check.on ?? "before_done";
    if (!byHook.has(hookKey)) byHook.set(hookKey, []);
    byHook.get(hookKey)!.push(check);
  }

  let triggerY = 50;
  for (const [hookKey, checks] of byHook) {
    const triggerId = nextId("trigger");
    nodes.push({
      id: triggerId,
      type: "trigger",
      position: { x: 50, y: triggerY },
      data: {
        kind: "trigger",
        label: `on: ${hookKey}`,
        on: hookKey as HookEvent,
      },
    });

    // Group checks by `when` within this hook
    const byFilter = new Map<string, typeof checks>();
    for (const check of checks) {
      const filterKey = check.when ?? "";
      if (!byFilter.has(filterKey)) byFilter.set(filterKey, []);
      byFilter.get(filterKey)!.push(check);
    }

    let filterY = triggerY;
    for (const [when, filteredChecks] of byFilter) {
      let checkSourceId = triggerId;

      if (when !== "") {
        const filterId = nextId("filter");
        nodes.push({
          id: filterId,
          type: "filter",
          position: { x: 230, y: filterY },
          data: {
            kind: "filter",
            label: when,
            when,
          },
        });
        edges.push({
          id: `e-${triggerId}-${filterId}`,
          source: triggerId,
          target: filterId,
          animated: false,
        });
        checkSourceId = filterId;
      }

      let checkY = filterY;
      for (const check of filteredChecks) {
        const isTask = !!check.cmd;
        const checkId = nextId(isTask ? "task" : "prompt");
        nodes.push({
          id: checkId,
          type: isTask ? "task" : "prompt",
          position: { x: when !== "" ? 450 : 350, y: checkY },
          data: {
            kind: isTask ? "task" : "prompt",
            label: check.label,
            ...(check.on !== undefined ? { on: check.on } : {}),
            ...(check.cmd !== undefined ? { cmd: check.cmd } : {}),
            ...(check.prompt !== undefined ? { prompt: check.prompt } : {}),
            ...(check.conditionId !== undefined ? { conditionId: check.conditionId } : {}),
          },
        });
        edges.push({
          id: `e-${checkSourceId}-${checkId}`,
          source: checkSourceId,
          target: checkId,
          animated: true,
        });
        checkY += 160;
      }

      filterY = Math.max(filterY + filteredChecks.length * 160, filterY + 200);
    }

    triggerY = Math.max(filterY + 60, triggerY + checks.length * 130 + 100);
  }

  return { nodes, edges };
}

/**
 * Convert a React Flow graph back to a SentinelConfig.
 *
 * For each task/prompt node:
 * - Walk edges backwards: if connected via a FilterNode → use filter's `when`
 * - If connected directly to a TriggerNode → no `when`
 * - The Trigger node provides the `on` hook
 */
function graphToConfig(nodes: Node<CanvasNodeData>[], edges: Edge[]): SentinelConfig {
  const nodeById = new Map(nodes.map((n) => [n.id, n]));

  // Build adjacency: target → source (single parent per node in our topology)
  const sourceOf = new Map<string, string>();
  for (const edge of edges) {
    sourceOf.set(edge.target, edge.source);
  }

  function resolveHook(nodeId: string): { on?: HookEvent; when?: string } {
    const parentId = sourceOf.get(nodeId);
    if (!parentId) return {};
    const parent = nodeById.get(parentId);
    if (!parent) return {};

    if (parent.data.kind === "filter") {
      const triggerParentId = sourceOf.get(parentId);
      const triggerNode = triggerParentId ? nodeById.get(triggerParentId) : undefined;
      return {
        ...(triggerNode?.data.on !== undefined ? { on: triggerNode.data.on } : {}),
        ...(parent.data.when !== undefined ? { when: parent.data.when } : {}),
      };
    }

    if (parent.data.kind === "trigger") {
      return {
        ...(parent.data.on !== undefined ? { on: parent.data.on } : {}),
      };
    }

    return {};
  }

  const conditions: ConditionDef[] = nodes
    .filter((n) => n.data.kind === "condition" && n.data.condition)
    .map((n) => n.data.condition as ConditionDef);

  const task = nodes
    .filter((n) => n.data.kind === "task")
    .map((n, i) => {
      const hook = resolveHook(n.id);
      return {
        id: `task-${i + 1}`,
        label: n.data.label,
        ...(hook.on !== undefined ? { on: hook.on } : {}),
        ...(hook.when !== undefined ? { when: hook.when } : {}),
        ...(n.data.cmd !== undefined ? { cmd: n.data.cmd } : {}),
        ...(n.data.conditionId !== undefined ? { conditionId: n.data.conditionId } : {}),
      };
    });

  const prompt = nodes
    .filter((n) => n.data.kind === "prompt")
    .map((n, i) => {
      const hook = resolveHook(n.id);
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
    task,
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
