import React from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { Canvas } from "./components/Canvas.js";
import { Toolbar } from "./components/Toolbar.js";
import { SidePanel } from "./components/SidePanel.js";
import { useCanvasStore } from "./store/canvas.js";

function AddNodeBar() {
  const { addNode } = useCanvasStore();

  const addTrigger = () => {
    addNode({
      id: `trigger-${Date.now()}`,
      type: "trigger",
      position: { x: 80, y: 100 + Math.random() * 200 },
      data: { kind: "trigger", label: "Trigger" },
    });
  };

  const addFilter = () => {
    addNode({
      id: `filter-${Date.now()}`,
      type: "filter",
      position: { x: 230, y: 100 + Math.random() * 200 },
      data: {
        kind: "filter",
        label: ".*",
        when: ".*",
      },
    });
  };

  const addTask = () => {
    addNode({
      id: `task-${Date.now()}`,
      type: "task",
      position: { x: 450, y: 100 + Math.random() * 200 },
      data: {
        kind: "task",
        label: "New task",
        cmd: "",
      },
    });
  };

  const addPromptCheck = () => {
    addNode({
      id: `prompt-${Date.now()}`,
      type: "prompt",
      position: { x: 450, y: 100 + Math.random() * 200 },
      data: {
        kind: "prompt",
        label: "New prompt",
        prompt: "",
      },
    });
  };

  const addCondition = () => {
    addNode({
      id: `condition-${Date.now()}`,
      type: "condition",
      position: { x: 230, y: 100 + Math.random() * 200 },
      data: { kind: "condition", label: "Condition" },
    });
  };

  return (
    <div className="flex items-center gap-2 border-b border-node-border bg-node px-4 py-2">
      <span className="text-xs font-medium text-slate-500">Add node:</span>
      <button
        onClick={addTrigger}
        className="rounded border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-1 text-xs text-indigo-400 hover:bg-indigo-500/20"
      >
        + Trigger
      </button>
      <button
        onClick={addFilter}
        className="rounded border border-sky-500/30 bg-sky-500/10 px-2.5 py-1 text-xs text-sky-400 hover:bg-sky-500/20"
      >
        + Filter
      </button>
      <button
        onClick={addTask}
        className="rounded border border-green-500/30 bg-green-500/10 px-2.5 py-1 text-xs text-green-400 hover:bg-green-500/20"
      >
        + Task
      </button>
      <button
        onClick={addPromptCheck}
        className="rounded border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-400 hover:bg-amber-500/20"
      >
        + Prompt
      </button>
      <button
        onClick={addCondition}
        className="rounded border border-yellow-500/30 bg-yellow-500/10 px-2.5 py-1 text-xs text-yellow-400 hover:bg-yellow-500/20"
      >
        + Condition
      </button>
    </div>
  );
}

export default function App() {
  const { loadFromYaml } = useCanvasStore();

  // Load checks.yaml from the dev server on first mount (canvas empty)
  React.useEffect(() => {
    fetch("/__sentinel/initial-yaml")
      .then((r) => (r.ok ? r.text() : null))
      .then((yaml) => {
        if (!yaml) return;
        if (useCanvasStore.getState().nodes.length === 0) {
          loadFromYaml(yaml);
        }
      })
      .catch(() => {
        // silently fail in static/production builds
      });
  }, []);

  // Hot-reload canvas when checks.yaml changes on disk
  React.useEffect(() => {
    if (!import.meta.hot) return;
    const handler = ({ yaml }: { yaml: string }) => {
      useCanvasStore.getState().loadFromYaml(yaml);
    };
    import.meta.hot.on("sentinel:checks-yaml-changed", handler);
    return () => {
      import.meta.hot?.off("sentinel:checks-yaml-changed", handler);
    };
  }, []);

  return (
    <ReactFlowProvider>
      <div className="flex h-screen flex-col bg-canvas">
        <Toolbar />
        <AddNodeBar />
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1">
            <Canvas />
          </div>
          <SidePanel />
        </div>
      </div>
    </ReactFlowProvider>
  );
}
