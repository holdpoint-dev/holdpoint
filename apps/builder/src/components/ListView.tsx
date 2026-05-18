import React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Terminal,
  MessageSquare,
  Tag,
  Plus,
  Pencil,
  Trash2,
  X,
  Zap,
  ShieldCheck,
} from "lucide-react";
import { useCanvasStore } from "../store/canvas.js";
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
  { value: "structural", label: "Structural / config files" },
];

const NAMED_SCOPES = WHEN_OPTIONS.slice(1).map((o) => o.value);

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
  structural: "border-violet-500/30 bg-violet-500/10 text-violet-400",
};

const WHEN_LABELS: Record<string, string> = {
  frontend: "Frontend",
  backend: "Backend",
  socket: "WebSocket",
  visual: "Visual",
  python: "Python",
  go: "Go",
  rust: "Rust",
  java: "Java / Kotlin",
  ruby: "Ruby",
  database: "Database",
  prisma: "Prisma",
  testing: "Tests",
  infra: "Infrastructure",
  ci: "CI / CD",
  docs: "Docs",
  structural: "Structural",
};

function whenBadgeClass(when: string) {
  return WHEN_BADGE[when] ?? "border-sky-500/30 bg-sky-500/10 text-sky-400";
}

function whenLabel(when: string) {
  return WHEN_LABELS[when] ?? when;
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
        Automated (cmd)
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
        Manual (prompt)
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
}

function EditDialog({ open, onOpenChange, check }: EditDialogProps) {
  const { updateCheck, deleteCheck } = useCanvasStore();

  const [label, setLabel] = React.useState(check.label);
  const [type, setType] = React.useState<"task" | "prompt">(
    check.cmd !== undefined ? "task" : "prompt",
  );
  const [cmd, setCmd] = React.useState(check.cmd ?? "");
  const [prompt, setPrompt] = React.useState(check.prompt ?? "");
  const [when, setWhen] = React.useState(check.when ?? "");
  const [conditionId, setConditionId] = React.useState(check.conditionId ?? "");
  const [confirmDelete, setConfirmDelete] = React.useState(false);

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

  const handleSave = () => {
    const data: Omit<CheckDef, "id"> = { label };
    if (when) data.when = when;
    if (conditionId) data.conditionId = conditionId;
    if (type === "task") {
      data.cmd = cmd;
    } else {
      data.prompt = prompt;
    }
    updateCheck(check.id, data);
    onOpenChange(false);
  };

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    deleteCheck(check.id);
    onOpenChange(false);
  };

  return (
    <DialogShell
      open={open}
      onOpenChange={onOpenChange}
      title="Edit Check"
      description={`ID: ${check.id}`}
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
            <p className="mt-1 text-xs text-stone/50">Runs automatically — blocks on failure</p>
          </div>
        ) : (
          <div>
            <FieldLabel>Prompt</FieldLabel>
            <TextArea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe what the agent must verify before finishing…"
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
  initialType?: "task" | "prompt";
  initialWhen?: string;
}

function CreateDialog({
  open,
  onOpenChange,
  initialType = "task",
  initialWhen,
}: CreateDialogProps) {
  const { addCheck } = useCanvasStore();

  const [label, setLabel] = React.useState("");
  const [type, setType] = React.useState<"task" | "prompt">(initialType);
  const [cmd, setCmd] = React.useState("");
  const [prompt, setPrompt] = React.useState("");
  const [when, setWhen] = React.useState(initialWhen ?? "");
  const [conditionId, setConditionId] = React.useState("");

  React.useEffect(() => {
    if (open) {
      setLabel("");
      setType(initialType);
      setCmd("");
      setPrompt("");
      setWhen(initialWhen ?? "");
      setConditionId("");
    }
  }, [open, initialType, initialWhen]);

  const handleCreate = () => {
    addCheck({
      label,
      ...(when ? { when } : {}),
      ...(type === "task" ? { cmd } : { prompt }),
      ...(conditionId ? { conditionId } : {}),
    });
    onOpenChange(false);
  };

  return (
    <DialogShell open={open} onOpenChange={onOpenChange} title="Add Check">
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
              placeholder="Describe what the agent must verify before finishing…"
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

function CheckCard({ check }: { check: CheckDef }) {
  const [editOpen, setEditOpen] = React.useState(false);
  const isTask = check.cmd !== undefined;

  return (
    <>
      <div
        data-testid="check-card"
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
              {/* Edit button — visible on hover */}
              <button
                onClick={() => setEditOpen(true)}
                className="rounded p-0.5 text-stone/50 opacity-0 transition-opacity hover:bg-node-border hover:text-bone group-hover:opacity-100"
                title="Edit check"
                aria-label="Edit check"
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
                {whenLabel(check.when)}
              </span>
            )}
            {check.conditionId && (
              <span className="rounded border border-yellow-500/30 bg-yellow-500/10 px-1.5 py-0.5 text-xs text-yellow-400">
                if: {check.conditionId}
              </span>
            )}
            <span className="ml-auto font-mono text-xs text-stone/40">{check.id}</span>
          </div>
        </div>
      </div>

      <EditDialog open={editOpen} onOpenChange={setEditOpen} check={check} />
    </>
  );
}

// ─── Scope group header ───────────────────────────────────────────────────────

function ScopeGroup({
  when,
  checks,
  onAdd,
}: {
  when: string | undefined;
  checks: CheckDef[];
  onAdd: () => void;
}) {
  return (
    <div>
      {/* Scope header */}
      <div className="mb-2.5 flex items-center gap-2">
        {when ? (
          <>
            <span
              className={`rounded border px-2 py-0.5 text-xs font-medium ${whenBadgeClass(when)}`}
            >
              {whenLabel(when)}
            </span>
            <span className="text-xs text-stone/40">files only</span>
          </>
        ) : (
          <span className="text-xs font-medium text-stone/60">Always</span>
        )}
        <div className="h-px flex-1 bg-node-border" />
        <button
          onClick={onAdd}
          className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-stone/50 hover:text-bone"
          title={`Add check${when ? ` when: ${when}` : ""}`}
        >
          <Plus className="h-3 w-3" />
          Add
        </button>
      </div>
      {/* Check cards */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {checks.map((check) => (
          <CheckCard key={check.id} check={check} />
        ))}
      </div>
    </div>
  );
}

// ─── Category section ─────────────────────────────────────────────────────────

function CategorySection({
  title,
  description,
  icon,
  accentClass,
  checks,
  onAdd,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  accentClass: string;
  checks: CheckDef[];
  onAdd: (when?: string) => void;
}) {
  // Group by when scope
  const byWhen = new Map<string, CheckDef[]>();
  for (const c of checks) {
    const key = c.when ?? "__always__";
    if (!byWhen.has(key)) byWhen.set(key, []);
    byWhen.get(key)!.push(c);
  }

  return (
    <section>
      {/* Section header */}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${accentClass}`}>
            {icon}
          </div>
          <div>
            <h2 className="text-sm font-semibold text-bone">{title}</h2>
            <p className="text-xs text-stone/50">{description}</p>
          </div>
        </div>
        <button
          onClick={() => onAdd(undefined)}
          className="flex shrink-0 items-center gap-1.5 rounded-md border border-accent/30 bg-accent/10 px-2.5 py-1.5 text-xs font-medium text-accent hover:bg-accent/20"
        >
          <Plus className="h-3 w-3" />
          Add
        </button>
      </div>

      <div className="space-y-5">
        {byWhen.size === 0 ? (
          <p className="text-xs text-stone/40">No checks in this category yet.</p>
        ) : (
          [...byWhen.entries()].map(([key, scopeChecks]) => (
            <ScopeGroup
              key={key}
              when={key === "__always__" ? undefined : key}
              checks={scopeChecks}
              onAdd={() => onAdd(key === "__always__" ? undefined : key)}
            />
          ))
        )}
      </div>
    </section>
  );
}

// ─── Main ListView ────────────────────────────────────────────────────────────

export function ListView() {
  const { config } = useCanvasStore();

  const [createOpts, setCreateOpts] = React.useState<{
    type: "task" | "prompt";
    when?: string;
  } | null>(null);

  const checks = config?.checks ?? [];
  const conditions = config?.conditions ?? [];

  const automated = checks.filter((c) => c.cmd !== undefined);
  const manual = checks.filter((c) => c.prompt !== undefined);

  if (checks.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <Zap className="mx-auto mb-3 h-10 w-10 text-stone/30" />
          <p className="text-sm text-stone/70">No checks configured yet.</p>
          <p className="mt-1 text-xs text-stone/50">
            Load a template from the toolbar or add your first check.
          </p>
          <button
            onClick={() => setCreateOpts({ type: "task" })}
            className="mx-auto mt-4 flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
          >
            <Plus className="h-3.5 w-3.5" />
            Add first check
          </button>
        </div>

        {createOpts && (
          <CreateDialog
            open
            onOpenChange={(o) => !o && setCreateOpts(null)}
            initialType={createOpts.type}
            {...(createOpts.when !== undefined ? { initialWhen: createOpts.when } : {})}
          />
        )}
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-y-auto bg-canvas p-6">
      <div className="mx-auto max-w-5xl space-y-10">
        {/* Automated checks */}
        <CategorySection
          title="Automated Checks"
          description="Commands that run automatically — the agent is blocked until all pass"
          icon={<Terminal className="h-4 w-4 text-green-400" />}
          accentClass="bg-green-500/10"
          checks={automated}
          onAdd={(when) => setCreateOpts({ type: "task", ...(when !== undefined ? { when } : {}) })}
        />

        {/* Manual checks */}
        <CategorySection
          title="Manual Checks"
          description="Instructions the agent must read and act on before finishing"
          icon={<ShieldCheck className="h-4 w-4 text-amber-400" />}
          accentClass="bg-amber-500/10"
          checks={manual}
          onAdd={(when) =>
            setCreateOpts({ type: "prompt", ...(when !== undefined ? { when } : {}) })
          }
        />

        {/* Conditions */}
        {conditions.length > 0 && (
          <section>
            <div className="mb-3 flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-yellow-500/10">
                <Tag className="h-4 w-4 text-yellow-400" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-bone">Conditions</h2>
                <p className="text-xs text-stone/50">
                  Gate checks on project-level conditions (e.g. file exists)
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {conditions.map((cond) => (
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
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Create dialog */}
      {createOpts && (
        <CreateDialog
          open
          onOpenChange={(o) => !o && setCreateOpts(null)}
          initialType={createOpts.type}
          {...(createOpts.when !== undefined ? { initialWhen: createOpts.when } : {})}
        />
      )}
    </div>
  );
}
