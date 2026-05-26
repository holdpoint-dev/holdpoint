import React from "react";
import { Toolbar, type ViewMode } from "./components/Toolbar.js";
import { ListView } from "./components/ListView.js";
import { ReportView } from "./components/ReportView.js";
import { useCanvasStore } from "./store/canvas.js";

export default function App() {
  const { loadFromYaml } = useCanvasStore();
  const [viewMode, setViewMode] = React.useState<ViewMode>("list");
  const projectParam = React.useMemo(
    () => new URLSearchParams(window.location.search).get("project"),
    [],
  );
  const initialYamlPath = projectParam
    ? `/__holdpoint/initial-yaml?project=${encodeURIComponent(projectParam)}`
    : "/__holdpoint/initial-yaml";

  // Load checks.yaml from the dev server on first mount (store empty)
  React.useEffect(() => {
    fetch(initialYamlPath, { credentials: "include" })
      .then((r) => (r.ok ? r.text() : null))
      .then((yaml) => {
        if (!yaml) return;
        if (useCanvasStore.getState().config === null) {
          loadFromYaml(yaml);
        }
      })
      .catch(() => {
        // silently fail in static/production builds
      });
  }, [initialYamlPath]);

  // Hot-reload when checks.yaml changes on disk
  React.useEffect(() => {
    if (!import.meta.hot) return;
    const handler = ({ yaml }: { yaml: string }) => {
      useCanvasStore.getState().loadFromYaml(yaml);
    };
    import.meta.hot.on("holdpoint:checks-yaml-changed", handler);
    return () => {
      import.meta.hot?.off("holdpoint:checks-yaml-changed", handler);
    };
  }, []);

  return (
    <div className="flex h-screen flex-col bg-canvas">
      <Toolbar viewMode={viewMode} onViewChange={setViewMode} />
      <div className="flex flex-1 overflow-hidden">
        {viewMode === "list" ? <ListView /> : <ReportView />}
      </div>
    </div>
  );
}
