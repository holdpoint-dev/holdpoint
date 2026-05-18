import { create } from "zustand";
import type { Node, Edge } from "@xyflow/react";
import type {
  HoldpointConfig,
  CanvasNodeData,
  ConditionDef,
  HookEvent,
  CheckDef,
} from "@holdpoint/types";
import { generateYaml, parseHoldpointYaml } from "@holdpoint/yaml-core";

const HOOK_LABELS: Record<string, string> = {
  before_done: "task complete",
  before_commit: "before commit",
  on_complete: "on complete",
};

function hookLabel(key: string): string {
  return HOOK_LABELS[key] ?? key;
}

interface CanvasState {
  nodes: Node<CanvasNodeData>[];
  edges: Edge[];
  selectedNodeId: string | null;
  yaml: string;
  /** Named regex patterns from the loaded config — preserved through graph round-trips. */
  storedPatterns?: Record<string, string>;

  // Node actions
  setNodes: (nodes: Node<CanvasNodeData>[]) => void;
  setEdges: (edges: Edge[]) => void;
  addNode: (node: Node<CanvasNodeData>) => void;
  updateNode: (id: string, data: Record<string, unknown>) => void;
  deleteNode: (id: string) => void;
  selectNode: (id: string | null) => void;

  // List view editing actions
  updateCheckNode: (
    nodeId: string,
    patch: {
      label?: string;
      type?: "task" | "prompt";
      cmd?: string;
      prompt?: string;
      conditionId?: string;
      /** Pass `""` to remove the filter. Pass a string to set/change it. Omit to leave unchanged. */
      when?: string;
      /** Required when `when` is being changed — identifies which trigger to anchor to. */
      hookEvent?: string;
    },
  ) => void;
  addCheckToGroup: (
    hookEvent: string,
    when: string | undefined,
    type: "task" | "prompt",
    data: { label: string; cmd?: string; prompt?: string; conditionId?: string },
  ) => void;

  // YAML actions
  exportYaml: () => string;
  loadFromYaml: (text: string) => void;
  loadTemplate: (template: HoldpointConfig) => void;
}

let nodeCounter = 0;
function nextId(prefix: string) {
  return `${prefix}-${++nodeCounter}`;
}

/**
 * Convert a HoldpointConfig to a React Flow graph.
 *
 * Topology:
 *   Trigger (on: before_done)
 *     ├─→ FilterNode (when: frontend) ─→ Task / Prompt
 *     └─→ Task / Prompt  (no filter = always runs)
 *
 * Checks that share the same `when` value share a single FilterNode.
 * Checks with no `when` connect directly to the Trigger node.
 */
function configToGraph(config: HoldpointConfig): {
  nodes: Node<CanvasNodeData>[];
  edges: Edge[];
} {
  const nodes: Node<CanvasNodeData>[] = [];
  const edges: Edge[] = [];

  const allChecks = config.checks;

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
        label: hookLabel(hookKey),
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

export /**
 * Convert a React Flow graph back to a HoldpointConfig.
 *
 * For each task/prompt node:
 * - Walk edges backwards: if connected via a FilterNode → use filter's `when`
 * - If connected directly to a TriggerNode → no `when`
 * - The Trigger node provides the `on` hook
 */
function graphToConfig(
  nodes: Node<CanvasNodeData>[],
  edges: Edge[],
  storedPatterns?: Record<string, string>,
): HoldpointConfig {
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

  // Build checks in canvas order (task and prompt nodes together, preserving position order)
  const checkNodes = nodes.filter((n) => n.data.kind === "task" || n.data.kind === "prompt");
  const checks = checkNodes.map((n, i) => {
    const hook = resolveHook(n.id);
    return {
      id: `check-${i + 1}`,
      label: n.data.label,
      ...(hook.on !== undefined ? { on: hook.on } : {}),
      ...(hook.when !== undefined ? { when: hook.when } : {}),
      ...(n.data.cmd !== undefined ? { cmd: n.data.cmd } : {}),
      ...(n.data.prompt !== undefined ? { prompt: n.data.prompt } : {}),
      ...(n.data.conditionId !== undefined ? { conditionId: n.data.conditionId } : {}),
    };
  });

  return {
    version: 1,
    context: { guides: {} },
    conditions,
    checks,
    ...(storedPatterns && Object.keys(storedPatterns).length > 0
      ? { patterns: storedPatterns }
      : {}),
  };
}

/**
 * Single-pass derivation of checks with their source node IDs.
 * Mirrors `graphToConfig`'s traversal so node ↔ check mapping is always consistent.
 */
export function getCheckEntries(
  nodes: Node<CanvasNodeData>[],
  edges: Edge[],
): Array<{ check: CheckDef; nodeId: string }> {
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
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
      return { ...(parent.data.on !== undefined ? { on: parent.data.on } : {}) };
    }
    return {};
  }

  return nodes
    .filter((n) => n.data.kind === "task" || n.data.kind === "prompt")
    .map((node, i) => {
      const hook = resolveHook(node.id);
      return {
        nodeId: node.id,
        check: {
          id: `check-${i + 1}`,
          label: node.data.label,
          ...(hook.on !== undefined ? { on: hook.on } : {}),
          ...(hook.when !== undefined ? { when: hook.when } : {}),
          ...(node.data.cmd !== undefined ? { cmd: node.data.cmd } : {}),
          ...(node.data.prompt !== undefined ? { prompt: node.data.prompt } : {}),
          ...(node.data.conditionId !== undefined ? { conditionId: node.data.conditionId } : {}),
        },
      };
    });
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

  updateCheckNode: (nodeId, patch) => {
    const { nodes, edges } = get();

    // 1. Update node content / type atomically
    let updatedNodes = nodes.map((n): Node<CanvasNodeData> => {
      if (n.id !== nodeId) return n;

      const newType = patch.type ?? (n.type as "task" | "prompt");
      const typeChanged = patch.type !== undefined && patch.type !== n.type;

      const data: CanvasNodeData = { ...n.data };

      if (patch.label !== undefined) data.label = patch.label;
      if (patch.conditionId !== undefined) {
        if (patch.conditionId) {
          data.conditionId = patch.conditionId;
        } else {
          delete data.conditionId;
        }
      }

      if (typeChanged) {
        data.kind = newType;
        if (newType === "task") {
          data.cmd = patch.cmd ?? "";
          delete data.prompt;
        } else {
          data.prompt = patch.prompt ?? "";
          delete data.cmd;
        }
      } else {
        if (patch.cmd !== undefined) data.cmd = patch.cmd;
        if (patch.prompt !== undefined) data.prompt = patch.prompt;
      }

      return { ...n, type: newType, data };
    });

    // 2. Re-wire edges when `when` filter is being changed
    if (patch.when !== undefined && patch.hookEvent) {
      const newWhen = patch.when || undefined;
      let newEdges = edges.filter((e) => e.target !== nodeId);

      const triggerNode = updatedNodes.find(
        (n) => n.data.kind === "trigger" && (n.data.on ?? "before_done") === patch.hookEvent,
      );

      if (triggerNode) {
        let parentId = triggerNode.id;

        if (newWhen) {
          // Filter lookup is scoped to this trigger's outgoing edges
          const triggerChildIds = new Set(
            newEdges.filter((e) => e.source === triggerNode.id).map((e) => e.target),
          );
          const filterNode = updatedNodes.find(
            (n) => triggerChildIds.has(n.id) && n.data.kind === "filter" && n.data.when === newWhen,
          );

          if (filterNode) {
            parentId = filterNode.id;
          } else {
            const filterId = `filter-${Date.now()}`;
            const filterCount = updatedNodes.filter((n) => n.data.kind === "filter").length;
            updatedNodes = [
              ...updatedNodes,
              {
                id: filterId,
                type: "filter",
                position: { x: 230, y: triggerNode.position.y + filterCount * 80 },
                data: { kind: "filter", label: newWhen, when: newWhen },
              },
            ];
            newEdges = [
              ...newEdges,
              {
                id: `e-${triggerNode.id}-${filterId}`,
                source: triggerNode.id,
                target: filterId,
                animated: false,
              },
            ];
            parentId = filterId;
          }
        }

        newEdges = [
          ...newEdges,
          { id: `e-${parentId}-${nodeId}`, source: parentId, target: nodeId, animated: true },
        ];

        set({ nodes: updatedNodes, edges: newEdges });
        return;
      }
    }

    set({ nodes: updatedNodes });
  },

  addCheckToGroup: (hookEvent, when, type, checkData) => {
    const { nodes, edges } = get();
    let newNodes = [...nodes];
    let newEdges = [...edges];

    // Find or create the trigger node for this hook
    let triggerNode = newNodes.find(
      (n) => n.data.kind === "trigger" && (n.data.on ?? "before_done") === hookEvent,
    );
    if (!triggerNode) {
      const maxY = newNodes.reduce((y, n) => Math.max(y, n.position.y), 0);
      const triggerId = `trigger-${Date.now()}`;
      triggerNode = {
        id: triggerId,
        type: "trigger",
        position: { x: 50, y: maxY + 120 },
        data: { kind: "trigger", label: hookLabel(hookEvent), on: hookEvent as HookEvent },
      };
      newNodes = [...newNodes, triggerNode];
    }

    let parentId = triggerNode.id;

    if (when) {
      const triggerChildIds = new Set(
        newEdges.filter((e) => e.source === triggerNode.id).map((e) => e.target),
      );
      const existingFilter = newNodes.find(
        (n) => triggerChildIds.has(n.id) && n.data.kind === "filter" && n.data.when === when,
      );

      if (existingFilter) {
        parentId = existingFilter.id;
      } else {
        const filterId = `filter-${Date.now() + 1}`;
        const filterCount = newNodes.filter((n) => n.data.kind === "filter").length;
        newNodes = [
          ...newNodes,
          {
            id: filterId,
            type: "filter",
            position: { x: 230, y: triggerNode.position.y + filterCount * 80 },
            data: { kind: "filter", label: when, when },
          },
        ];
        newEdges = [
          ...newEdges,
          {
            id: `e-${triggerNode.id}-${filterId}`,
            source: triggerNode.id,
            target: filterId,
            animated: false,
          },
        ];
        parentId = filterId;
      }
    }

    const checkId = `${type}-${Date.now() + 2}`;
    const checkCount = newNodes.filter(
      (n) => n.data.kind === "task" || n.data.kind === "prompt",
    ).length;
    newNodes = [
      ...newNodes,
      {
        id: checkId,
        type,
        position: { x: when ? 450 : 350, y: triggerNode.position.y + checkCount * 30 },
        data: {
          kind: type,
          label: checkData.label,
          ...(type === "task" ? { cmd: checkData.cmd ?? "" } : { prompt: checkData.prompt ?? "" }),
          ...(checkData.conditionId ? { conditionId: checkData.conditionId } : {}),
        },
      },
    ];
    newEdges = [
      ...newEdges,
      { id: `e-${parentId}-${checkId}`, source: parentId, target: checkId, animated: true },
    ];

    set({ nodes: newNodes, edges: newEdges });
  },

  exportYaml: () => {
    const { nodes, edges, storedPatterns } = get();
    const config = graphToConfig(nodes, edges, storedPatterns);
    const text = generateYaml(config);
    set({ yaml: text });
    return text;
  },

  loadFromYaml: (text) => {
    try {
      const config = parseHoldpointYaml(text);
      const { nodes, edges } = configToGraph(config);
      set({
        nodes,
        edges,
        yaml: text,
        ...(config.patterns ? { storedPatterns: config.patterns } : {}),
      });
    } catch (err) {
      console.error("Failed to load YAML:", err);
    }
  },

  loadTemplate: (template) => {
    const { nodes, edges } = configToGraph(template);
    set({
      nodes,
      edges,
      yaml: generateYaml(template),
      ...(template.patterns ? { storedPatterns: template.patterns } : {}),
    });
  },
}));
