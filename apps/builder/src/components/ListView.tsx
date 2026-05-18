import React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Terminal, MessageSquare, Zap, Filter, Tag, Plus, Pencil, Trash2, X } from "lucide-react";
import { useCanvasStore, getCheckEntries } from "../store/canvas.js";
import type { CheckDef } from "@holdpoint/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const WHEN_OPTIONS = [
  { value: "", label: "Always (no filter)" },
  // Web / app layers
  { value: "frontend", label: "Frontend files" },
  { value: "backend", label: "Backend / API files" },
  { value: "socket", label: "WebSocket files" },
  { value: "visual", label: "Visual / Storybook" },
  // Languages
  { value: "python", label: "Python files" },
  { value: "go", label: "Go files" },
  { value: "rust", label: "Rust files" },
  { value: "java", label: "Java / Kotlin files" },
  { value: "ruby", label: "Ruby files" },
  // Cross-cutting
  { value: "database", label: "Database / migrations" },
  { value: "prisma", label: "Prisma schema" },
  { value: "testing", label: "Test files" },
  { value: "infra", label: "Infrastructure (Docker, Terraform, K8s)" },
  { value: "ci", label: "CI / CD pipelines" },
  { value: "docs", label: "Documentation" },
];

const NAMED_SCOPES = [
  "frontend",
  "backend",
  "socket",
  "visual",
  "python",
  "go",
  "rust",
  "java",
  "ruby",
  "database",
  "prisma",
  "testing",
  "infra",
  "ci",
  "docs",
];

const WHEN_BADGE: Record<string, string> = {
  frontend: "border-blue-500/30 bg-blue-500/10 text-blue-400",
  backend: "border-green-500/30 bg-green-500/10 text-green-400",
  socket: "border-orange-500/30 bg-orange-500/10 text-orange-400",
  visual: "border-pink-500/30 bg-pink-500/10 text-pink-400",
  python: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  go: "border-cyan-500/30 bg-cyan-500/10 text-cyan-400",
  rust: "border-red-500/30 bg-red-500/10 text-red-400",
  java: "border-orange-400/30 bg-orange-400/10 text-orange-300",
  ruby: "border-rose-500/30 bg-rose-500/10 text-rose-400",
  database: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  prisma: "border-purple-500/30 bg-purple-500/10 text-purple-400",
  testing: "border-lime-500/30 bg-lime-500/10 text-lime-400",
  infra: "border-stone-500/30 bg-stone-500/10 text-stone-400",
  ci: "border-yellow-500/30 bg-yellow-500/10 text-yellow-400",
  docs: "border-sky-500/30 bg-sky-500/10 text-sky-400",
};

function whenBadgeClass(when: string) {
  return WHEN_BADGE[when] ?? "border-sky-500/30 bg-sky-500/10 text-sky-400";
}

const HOOK_LABELS: Record<string, string> = {
  before_done: "Task Complete",
  before_commit: "Before Commit",
  on_complete: "On Complete",
};

function hookLabel(on: string) {
  return HOOK_LABELS[on] ?? on;
}

// ─── Form field helpers ───────────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="mb-1.5 block text-xs font-medium text-stone">{children}</label>;
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full rounded-md border border-node-border bg-canvas px-3 py-2 text-sm text-bone placeholder-stone/40 focus:border-accent focus:outline-none"
    />
  );
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      rows={4}
      {...props}
      className="w-full resize-none rounded-md border border-node-border bg-canvas px-3 py-2 font-mono text-sm text-bone placeholder-stone/40 focus:border-accent focus:outline-none"
    />
  );
}

function SelectInput(
  props: React.SelectHTMLAttributes<HTMLSelectElement> & { children: React.ReactNode },
) {
  return (
    <select
      {...props}
      className="w-full rounded-md border border-node-border bg-canvas px-3 py-2 text-sm text-bone focus:border-accent focus:outline-none"
    />
  );
}

// ─── Type toggle ─────────────────────────────────────────────────────────────

function TypeToggle({
  value,
  onChange,
}: {
  value: "task" | "prompt";
  onChange: (v: "task" | "prompt") => void;
}) {
  return (
    <div className="flex overflow-hidden rounded-md border border-node-border">
      <button
        type="button"
        onClick={() => onChange("task")}
        className={`flex flex-1 items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors ${
          value === "task" ? "bg-green-500/20 text-green-400" : "text-stone hover:text-bone"
        }`}
      >
        <Terminal className="h-3.5 w-3.5" />
        cmd
      </button>
      <div className="w-px bg-node-border" />
      <button
        type="button"
        onClick={() => onChange("prompt")}
        className={`flex flex-1 items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors ${
          value === "prompt" ? "bg-amber-500/20 text-amber-400" : "text-stone hover:text-bone"
        }`}
      >
        <MessageSquare className="h-3.5 w-3.5" />
        prompt
      </button>
    </div>
  );
}

// ─── When filter field ────────────────────────────────────────────────────────

function WhenField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const isCustom = value !== "" && !NAMED_SCOPES.includes(value);
  const selectValue = isCustom ? "__custom__" : value;

  return (
    <div className="space-y-2">
      <SelectInput
        value={selectValue}
        onChange={(e) => {
          const v = e.target.value;
          if (v === "__custom__") onChange(isCustom ? value : "");
          else onChange(v);
        }}
      >
        {WHEN_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
        <option value="__custom__">Custom regex…</option>
      </SelectInput>
      {isCustom && (
        <TextInput
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g. \.test\.ts$"
          className="font-mono"
        />
      )}
    </div>
  );
}

// ─── Dialog overlay / content wrapper ────────────────────────────────────────

function DialogShell({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-node-border bg-node p-6 shadow-2xl focus:outline-none">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-base font-semibold text-bone">{title}</Dialog.Title>
              {description && (
                <Dialog.Description className="mt-0.5 text-xs text-stone/70">
                  {description}
                </Dialog.Description>
              )}
            </div>
            <Dialog.Close className="mt-0.5 shrink-0 rounded p-1 text-stone/70 hover:bg-node-border hover:text-bone">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ─── Edit dialog ─────────────────────────────────────────────────────────────

interface EditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  check: CheckDef;
  nodeId: string;
}

function EditDialog({ open, onOpenChange, check, nodeId }: EditDialogProps) {
  const { updateCheckNode, deleteNode } = useCanvasStore();

  const [label, setLabel] = React.useState(check.label);
  const [type, setType] = React.useState<"task" | "prompt">(
    check.cmd !== undefined ? "task" : "prompt",
  );
  const [cmd, setCmd] = React.useState(check.cmd ?? "");
  const [prompt, setPrompt] = React.useState(check.prompt ?? "");
  const [when, setWhen] = React.useState(check.when ?? "");
  const [conditionId, setConditionId] = React.useState(check.conditionId ?? "");
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  // Re-sync when the dialog opens for a different check
  React.useEffect(() => {
    if (open) {
      setLabel(check.label);
      setType(check.cmd !== undefined ? "task" : "prompt");
      setCmd(check.cmd ?? "");
      setPrompt(check.prompt ?? "");
      setWhen(check.when ?? "");
      setConditionId(check.conditionId ?? "");
      setConfirmDelete(false);
    }
  }, [open, check]);

  const hookEvent = check.on ?? "before_done";
  const whenChanged = when !== (check.when ?? "");
  const originalType: "task" | "prompt" = check.cmd !== undefined ? "task" : "prompt";

  const handleSave = () => {
    const patch: Parameters<typeof updateCheckNode>[1] = {
      label,
      conditionId,
      ...(type === "task" ? { cmd } : { prompt }),
      ...(whenChanged ? { when, hookEvent } : {}),
    };
    if (type !== originalType) patch.type = type;
    updateCheckNode(nodeId, patch);
    onOpenChange(false);
  };

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    deleteNode(nodeId);
    onOpenChange(false);
  };

  return (
    <DialogShell
      open={open}
      onOpenChange={onOpenChange}
      title="Edit Check"
      description="Changes apply to both the list and graph views."
    >
      <div className="space-y-4">
        <div>
          <FieldLabel>Label</FieldLabel>
          <TextInput
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Check label…"
          />
        </div>

        <div>
          <FieldLabel>Type</FieldLabel>
          <TypeToggle value={type} onChange={setType} />
        </div>

        {type === "task" ? (
          <div>
            <FieldLabel>Command</FieldLabel>
            <TextInput
              value={cmd}
              onChange={(e) => setCmd(e.target.value)}
              placeholder="pnpm test --run"
              className="font-mono"
            />
            <p className="mt-1 text-xs text-stone/50">Runs automatically — blocks on failure</p>
          </div>
        ) : (
          <div>
            <FieldLabel>Prompt</FieldLabel>
            <TextArea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe what the agent must check before finishing…"
            />
          </div>
        )}

        <div>
          <FieldLabel>File filter (when)</FieldLabel>
          <WhenField value={when} onChange={setWhen} />
        </div>

        <div>
          <FieldLabel>
            Condition ID <span className="text-stone/50">(optional)</span>
          </FieldLabel>
          <TextInput
            value={conditionId}
            onChange={(e) => setConditionId(e.target.value)}
            placeholder="e.g. has-openapi"
          />
        </div>

        <div className="flex items-center justify-between border-t border-node-border pt-4">
          <button
            type="button"
            onClick={handleDelete}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              confirmDelete
                ? "bg-red-500 text-white"
                : "border border-red-500/30 text-red-400 hover:bg-red-500/10"
            }`}
          >
            <Trash2 className="h-3.5 w-3.5" />
            {confirmDelete ? "Confirm delete" : "Delete"}
          </button>

          <div className="flex gap-2">
            <Dialog.Close className="rounded-md border border-node-border px-3 py-1.5 text-sm text-stone hover:border-accent hover:text-white">
              Cancel
            </Dialog.Close>
            <button
              type="button"
              onClick={handleSave}
              disabled={!label.trim()}
              className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </DialogShell>
  );
}

// ─── Create dialog ────────────────────────────────────────────────────────────

interface CreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hookEvent: string;
  when: string | undefined;
}

function CreateDialog({ open, onOpenChange, hookEvent, when: initialWhen }: CreateDialogProps) {
  const { addCheckToGroup } = useCanvasStore();

  const [label, setLabel] = React.useState("");
  const [type, setType] = React.useState<"task" | "prompt">("task");
  const [cmd, setCmd] = React.useState("");
  const [prompt, setPrompt] = React.useState("");
  const [when, setWhen] = React.useState(initialWhen ?? "");
  const [conditionId, setConditionId] = React.useState("");

  React.useEffect(() => {
    if (open) {
      setLabel("");
      setType("task");
      setCmd("");
      setPrompt("");
      setWhen(initialWhen ?? "");
      setConditionId("");
    }
  }, [open, initialWhen]);

  const handleCreate = () => {
    addCheckToGroup(hookEvent, when || undefined, type, {
      label,
      ...(type === "task" ? { cmd } : { prompt }),
      ...(conditionId ? { conditionId } : {}),
    });
    onOpenChange(false);
  };

  return (
    <DialogShell
      open={open}
      onOpenChange={onOpenChange}
      title="Add Check"
      description={`Adding to hook: ${hookLabel(hookEvent)}${when ? ` · when: ${when}` : ""}`}
    >
      <div className="space-y-4">
        <div>
          <FieldLabel>Label</FieldLabel>
          <TextInput
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Check label…"
            autoFocus
          />
        </div>

        <div>
          <FieldLabel>Type</FieldLabel>
          <TypeToggle value={type} onChange={setType} />
        </div>

        {type === "task" ? (
          <div>
            <FieldLabel>Command</FieldLabel>
            <TextInput
              value={cmd}
              onChange={(e) => setCmd(e.target.value)}
              placeholder="pnpm test --run"
              className="font-mono"
            />
          </div>
        ) : (
          <div>
            <FieldLabel>Prompt</FieldLabel>
            <TextArea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe what the agent must check before finishing…"
            />
          </div>
        )}

        <div>
          <FieldLabel>File filter (when)</FieldLabel>
          <WhenField value={when} onChange={setWhen} />
        </div>

        <div>
          <FieldLabel>
            Condition ID <span className="text-stone/50">(optional)</span>
          </FieldLabel>
          <TextInput
            value={conditionId}
            onChange={(e) => setConditionId(e.target.value)}
            placeholder="e.g. has-openapi"
          />
        </div>

        <div className="flex justify-end gap-2 border-t border-node-border pt-4">
          <Dialog.Close className="rounded-md border border-node-border px-3 py-1.5 text-sm text-stone hover:border-accent hover:text-white">
            Cancel
          </Dialog.Close>
          <button
            type="button"
            onClick={handleCreate}
            disabled={!label.trim()}
            className="flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Check
          </button>
        </div>
      </div>
    </DialogShell>
  );
}

// ─── Check card ───────────────────────────────────────────────────────────────

function CheckCard({ check, nodeId }: { check: CheckDef; nodeId: string }) {
  const [editOpen, setEditOpen] = React.useState(false);
  const isTask = !!check.cmd;

  return (
    <>
      <div
        className={`group relative overflow-hidden rounded-lg border bg-node transition-colors ${
          isTask
            ? "border-green-500/25 hover:border-green-500/45"
            : "border-amber-500/25 hover:border-amber-500/45"
        }`}
      >
        {/* Left color stripe */}
        <div
          className={`absolute inset-y-0 left-0 w-1 ${isTask ? "bg-green-500" : "bg-amber-500"}`}
        />

        <div className="p-3 pl-4">
          {/* Header */}
          <div className="mb-2 flex items-start justify-between gap-2">
            <span className="text-sm font-medium leading-snug text-bone">{check.label}</span>
            <div className="flex shrink-0 items-center gap-1">
              <span
                className={`rounded border px-1.5 py-0.5 font-mono text-xs ${
                  isTask
                    ? "border-green-500/30 bg-green-500/10 text-green-400"
                    : "border-amber-500/30 bg-amber-500/10 text-amber-400"
                }`}
              >
                {isTask ? "cmd" : "prompt"}
              </span>
              {/* Edit button — visible on hover */}
              <button
                onClick={() => setEditOpen(true)}
                className="rounded p-0.5 text-stone/50 opacity-0 transition-opacity hover:bg-node-border hover:text-bone group-hover:opacity-100"
                title="Edit check"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Content */}
          {isTask ? (
            <div className="flex items-start gap-1.5">
              <Terminal className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-500/50" />
              <code className="break-all text-xs text-stone">{check.cmd}</code>
            </div>
          ) : (
            <div className="flex items-start gap-1.5">
              <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500/50" />
              <p className="line-clamp-3 text-xs text-stone">{check.prompt}</p>
            </div>
          )}

          {/* Footer badges */}
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            {check.when && (
              <span
                className={`rounded border px-1.5 py-0.5 text-xs ${whenBadgeClass(check.when)}`}
              >
                {check.when}
              </span>
            )}
            {check.conditionId && (
              <span className="rounded border border-yellow-500/30 bg-yellow-500/10 px-1.5 py-0.5 text-xs text-yellow-400">
                if: {check.conditionId}
              </span>
            )}
            <span className="ml-auto font-mono text-xs text-stone/50">{check.id}</span>
          </div>
        </div>
      </div>

      <EditDialog open={editOpen} onOpenChange={setEditOpen} check={check} nodeId={nodeId} />
    </>
  );
}

// ─── Main ListView ────────────────────────────────────────────────────────────

export function ListView() {
  const { nodes, edges } = useCanvasStore();
  const entries = React.useMemo(() => getCheckEntries(nodes, edges), [nodes, edges]);

  // Group entries by hook event
  const byHook = React.useMemo(() => {
    const map = new Map<string, Array<{ check: CheckDef; nodeId: string }>>();
    for (const entry of entries) {
      const hook = entry.check.on ?? "before_done";
      if (!map.has(hook)) map.set(hook, []);
      map.get(hook)!.push(entry);
    }
    return map;
  }, [entries]);

  // Find all condition nodes for the conditions bar
  const conditions = React.useMemo(
    () => nodes.filter((n) => n.data.kind === "condition" && n.data.condition),
    [nodes],
  );

  const [createTarget, setCreateTarget] = React.useState<{
    hookEvent: string;
    when: string | undefined;
  } | null>(null);

  if (entries.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <Zap className="mx-auto mb-3 h-10 w-10 text-stone/30" />
          <p className="text-sm text-stone/70">No checks configured yet.</p>
          <p className="mt-1 text-xs text-stone/50">Switch to Graph view to add nodes.</p>
          <button
            onClick={() => setCreateTarget({ hookEvent: "before_done", when: undefined })}
            className="mt-4 flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 mx-auto"
          >
            <Plus className="h-3.5 w-3.5" />
            Add first check
          </button>
        </div>
        {createTarget && (
          <CreateDialog
            open={!!createTarget}
            onOpenChange={(o) => !o && setCreateTarget(null)}
            hookEvent={createTarget.hookEvent}
            when={createTarget.when}
          />
        )}
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-canvas p-6">
      <div className="mx-auto max-w-4xl space-y-8">
        {/* Conditions row */}
        {conditions.length > 0 && (
          <section>
            <div className="mb-3 flex items-center gap-2">
              <Tag className="h-4 w-4 text-yellow-400" />
              <h2 className="text-xs font-semibold uppercase tracking-widest text-yellow-400">
                Conditions
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {conditions.map((n) => {
                const cond = n.data.condition as { id: string; operator: string; path?: string };
                return (
                  <span
                    key={cond.id}
                    className="inline-flex items-center gap-1.5 rounded-md border border-yellow-500/30 bg-yellow-500/10 px-2.5 py-1 text-xs text-yellow-300"
                  >
                    <span className="font-mono font-semibold">{cond.id}</span>
                    <span className="text-yellow-600">·</span>
                    <span className="text-yellow-400/80">{cond.operator}</span>
                    {cond.path && (
                      <>
                        <span className="text-yellow-600">·</span>
                        <span className="font-mono text-yellow-400/60">{cond.path}</span>
                      </>
                    )}
                  </span>
                );
              })}
            </div>
          </section>
        )}

        {/* Hook sections */}
        {[...byHook.entries()].map(([hook, hookEntries]) => {
          // Sub-group by `when`
          const byFilter = new Map<string, Array<{ check: CheckDef; nodeId: string }>>();
          for (const entry of hookEntries) {
            const key = entry.check.when ?? "__all__";
            if (!byFilter.has(key)) byFilter.set(key, []);
            byFilter.get(key)!.push(entry);
          }

          return (
            <section key={hook}>
              {/* Hook header */}
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-8 items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-3">
                  <Zap className="h-3.5 w-3.5 text-accent" />
                  <span className="text-sm font-semibold text-bone">{hookLabel(hook)}</span>
                </div>
                <div className="h-px flex-1 bg-accent/20" />
                <span className="text-xs text-stone/50">
                  {hookEntries.length} check{hookEntries.length !== 1 ? "s" : ""}
                </span>
                {/* Add check to this hook (no filter) */}
                <button
                  onClick={() => setCreateTarget({ hookEvent: hook, when: undefined })}
                  className="flex items-center gap-1 rounded-md border border-accent/30 bg-accent/10 px-2 py-1 text-xs text-accent hover:bg-accent/20"
                >
                  <Plus className="h-3 w-3" />
                  Add
                </button>
              </div>

              {/* Filter groups */}
              <div className="space-y-5">
                {[...byFilter.entries()].map(([filterKey, filterEntries]) => {
                  const filterWhen = filterKey !== "__all__" ? filterKey : undefined;

                  return (
                    <div key={filterKey}>
                      {/* Filter sub-header */}
                      {filterKey !== "__all__" && (
                        <div className="mb-2.5 flex items-center gap-2">
                          <Filter className="h-3 w-3 text-sky-400" />
                          <span className="text-xs font-medium text-sky-400">
                            when: {filterKey}
                          </span>
                          <div className="h-px flex-1 bg-sky-500/15" />
                          <button
                            onClick={() => setCreateTarget({ hookEvent: hook, when: filterWhen })}
                            className="flex items-center gap-1 rounded-md border border-sky-500/30 bg-sky-500/10 px-2 py-1 text-xs text-sky-400 hover:bg-sky-500/20"
                          >
                            <Plus className="h-3 w-3" />
                            Add
                          </button>
                        </div>
                      )}

                      {/* Check cards */}
                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {filterEntries.map(({ check, nodeId }) => (
                          <CheckCard key={nodeId} check={check} nodeId={nodeId} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {/* Global create dialog */}
      {createTarget && (
        <CreateDialog
          open={!!createTarget}
          onOpenChange={(o) => !o && setCreateTarget(null)}
          hookEvent={createTarget.hookEvent}
          when={createTarget.when}
        />
      )}
    </div>
  );
}
