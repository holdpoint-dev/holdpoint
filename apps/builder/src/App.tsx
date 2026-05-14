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
      data: { kind: "trigger", label: "Trigger", trigger: { type: "always" } },
    });
  };

  const addDeterministicCheck = () => {
    addNode({
      id: `check-det-${Date.now()}`,
      type: "check-deterministic",
      position: { x: 380, y: 100 + Math.random() * 200 },
      data: { kind: "check-deterministic", label: "New check", trigger: { type: "always" }, cmd: "" },
    });
  };

  const addManualCheck = () => {
    addNode({
      id: `check-man-${Date.now()}`,
      type: "check-manual",
      position: { x: 380, y: 100 + Math.random() * 200 },
      data: { kind: "check-manual", label: "New manual check", trigger: { type: "always" }, manual: "" },
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
        onClick={addDeterministicCheck}
        className="rounded border border-green-500/30 bg-green-500/10 px-2.5 py-1 text-xs text-green-400 hover:bg-green-500/20"
      >
        + Check (auto)
      </button>
      <button
        onClick={addManualCheck}
        className="rounded border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-400 hover:bg-amber-500/20"
      >
        + Check (manual)
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
