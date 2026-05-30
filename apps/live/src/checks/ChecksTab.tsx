import React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Copy, Download, FileWarning, ListChecks, Loader2, Save, Sparkles } from "lucide-react";
import { parseHoldpointYaml, generateYaml } from "@holdpoint/yaml-core";
import defaultTemplateYaml from "../../../../templates/default.yaml?raw";
import { Button } from "../components/ui/button";
import { EmptyState } from "../components/ui/empty-state";
import { useCanvasStore } from "./store";
import { useProjectChecks } from "./useProjectChecks";
import { ListView } from "./ListView";
import { YamlDiff } from "./YamlDiff";

function safeNormalize(text: string): string {
  try {
    return generateYaml(parseHoldpointYaml(text));
  } catch {
    return text;
  }
}

export function ChecksTab({
  projectHash,
  projectName,
}: {
  projectHash: string | null;
  projectName: string;
}) {
  const { config, exportYaml, loadTemplate } = useCanvasStore();
  const { status, savedYaml, error, save } = useProjectChecks(projectHash);

  const [diffOpen, setDiffOpen] = React.useState(false);
  const [pendingYaml, setPendingYaml] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const currentYaml = config ? exportYaml() : "";
  const savedNormalized = React.useMemo(
    () => (savedYaml === null ? null : safeNormalize(savedYaml)),
    [savedYaml],
  );
  const dirty =
    savedNormalized === null
      ? (config?.checks.length ?? 0) > 0 || (config?.conditions.length ?? 0) > 0
      : currentYaml !== savedNormalized;

  if (!projectHash) {
    return (
      <div className="h-full overflow-y-auto px-5 py-4">
        <EmptyState
          icon={ListChecks}
          title="No project selected"
          description="Pick a project in the sidebar to view and edit its checks.yaml."
        />
      </div>
    );
  }

  function handleExport() {
    const blob = new Blob([currentYaml], { type: "text/yaml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "checks.yaml";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(currentYaml);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function openSave() {
    setPendingYaml(exportYaml());
    setDiffOpen(true);
  }

  async function confirmSave() {
    setSaving(true);
    const ok = await save(pendingYaml);
    setSaving(false);
    if (ok) setDiffOpen(false);
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium text-foreground">{projectName}</span>
          <span className="font-mono text-xs text-muted-foreground">checks.yaml</span>
          {status === "loading" ? (
            <span className="text-xs text-muted-foreground">loading…</span>
          ) : status === "missing" ? (
            <span className="text-xs text-warning">not on disk yet — saving will create it</span>
          ) : dirty ? (
            <span className="flex items-center gap-1 text-xs text-accent">
              <span className="size-1.5 rounded-full bg-accent" />
              unsaved changes
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">saved</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => loadTemplate(parseHoldpointYaml(defaultTemplateYaml))}
          >
            <Sparkles />
            Template
          </Button>
          <Button size="sm" variant="ghost" onClick={() => void handleCopy()}>
            <Copy />
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button size="sm" variant="outline" onClick={handleExport}>
            <Download />
            Export
          </Button>
          <Button size="sm" onClick={openSave} disabled={!dirty}>
            <Save />
            Save
          </Button>
        </div>
      </div>

      {error && status === "error" ? (
        <div className="flex items-center gap-2 border-b border-danger/30 bg-danger/10 px-5 py-2 text-sm text-danger">
          <FileWarning className="size-4" />
          {error}
        </div>
      ) : null}

      <div className="min-h-0 flex-1">
        <ListView />
      </div>

      <Dialog.Root open={diffOpen} onOpenChange={(open) => !saving && setDiffOpen(open)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(720px,92vw)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-card p-5 shadow-2xl">
            <Dialog.Title className="text-sm font-semibold text-foreground">
              Review changes to checks.yaml
            </Dialog.Title>
            <Dialog.Description className="mt-1 text-xs text-muted-foreground">
              Writing to <span className="font-mono">{projectName}/checks.yaml</span>. Lines in{" "}
              <span className="text-success">green</span> are added,{" "}
              <span className="text-danger">red</span> removed.
            </Dialog.Description>
            <div className="mt-4">
              <YamlDiff before={savedYaml ?? ""} after={pendingYaml} />
            </div>
            {error ? <p className="mt-3 text-xs text-danger">{error}</p> : null}
            <div className="mt-5 flex justify-end gap-2">
              <Dialog.Close asChild>
                <Button variant="ghost" size="sm" disabled={saving}>
                  Cancel
                </Button>
              </Dialog.Close>
              <Button size="sm" onClick={() => void confirmSave()} disabled={saving}>
                {saving ? <Loader2 className="animate-spin" /> : <Save />}
                {saving ? "Writing…" : "Write to disk"}
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
