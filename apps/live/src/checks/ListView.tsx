import React from "react";
import {
  ChevronDown,
  Clock,
  FileText,
  ListChecks,
  type LucideIcon,
  MessageSquare,
  Play,
  Plus,
  Send,
  Sparkles,
  Terminal,
  Trash2,
} from "lucide-react";
import type { CheckDef, HookEvent } from "@holdpoint/types";
import { useCanvasStore } from "./store.js";
import { cn } from "../lib/utils";
import { Button } from "../components/ui/button";
import { EmptyState } from "../components/ui/empty-state";

type Tone = "success" | "warning" | "info" | "accent";
type Behavior = "cmd" | "prompt" | "inject";

// ─── Hook (timing) metadata ─────────────────────────────────────────────────

const HOOKS: { value: HookEvent; label: string; hint: string; icon: LucideIcon }[] = [
  {
    value: "session_start",
    label: "Session start",
    hint: "Runs once when a session starts or resumes — ideal for seeding context.",
    icon: Play,
  },
  {
    value: "message_submit",
    label: "Each message",
    hint: "Runs on every prompt you send — good for date/time and reminders.",
    icon: Send,
  },
  {
    value: "before_tool",
    label: "Before a tool runs",
    hint: "Runs before each tool call. A command that fails blocks the tool.",
    icon: Clock,
  },
  {
    value: "before_done",
    label: "Before finishing",
    hint: "The completion gate — the agent can't finish until this passes.",
    icon: ListChecks,
  },
];

const HOOK_ORDER: HookEvent[] = [
  "session_start",
  "message_submit",
  "before_tool",
  "after_tool",
  "session_end",
  "before_done",
];

function hookMeta(hook: HookEvent) {
  return (
    HOOKS.find((h) => h.value === hook) ?? {
      value: hook,
      label: hook,
      hint: "",
      icon: Clock,
    }
  );
}

function checkHookOf(check: CheckDef): HookEvent {
  return check.on ?? "before_done";
}

// ─── Behavior metadata ────────────────────────────────────────────────────────

const BEHAVIORS: { value: Behavior; label: string; icon: LucideIcon; tone: Tone }[] = [
  { value: "cmd", label: "Run a command", icon: Terminal, tone: "success" },
  { value: "prompt", label: "Agent instruction", icon: MessageSquare, tone: "warning" },
  { value: "inject", label: "Inject context", icon: Sparkles, tone: "info" },
];

function behaviorOf(check: CheckDef): Behavior {
  if (check.cmd !== undefined) return "cmd";
  if (check.inject !== undefined) return "inject";
  return "prompt";
}

const toneIconClass: Record<Tone, string> = {
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  info: "bg-info/15 text-info",
  accent: "bg-accent/15 text-accent",
};

const toneTextClass: Record<Tone, string> = {
  success: "text-success",
  warning: "text-warning",
  info: "text-info",
  accent: "text-accent",
};

const toneRuleClass: Record<Tone, string> = {
  success: "border-success/40",
  warning: "border-warning/40",
  info: "border-info/40",
  accent: "border-accent/40",
};

function behaviorIcon(check: CheckDef): LucideIcon {
  return BEHAVIORS.find((b) => b.value === behaviorOf(check))!.icon;
}
function behaviorTone(check: CheckDef): Tone {
  return BEHAVIORS.find((b) => b.value === behaviorOf(check))!.tone;
}

// ─── File-scope ("when") options ────────────────────────────────────────────

const WHEN_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Any file" },
  { value: "frontend", label: "Frontend files" },
  { value: "backend", label: "Backend / API files" },
  { value: "socket", label: "WebSocket files" },
  { value: "visual", label: "Visual / Storybook" },
  { value: "python", label: "Python files" },
  { value: "go", label: "Go files" },
  { value: "rust", label: "Rust files" },
  { value: "java", label: "Java / Kotlin files" },
  { value: "ruby", label: "Ruby files" },
  { value: "database", label: "Database / migrations" },
  { value: "prisma", label: "Prisma schema" },
  { value: "testing", label: "Test files" },
  { value: "infra", label: "Infrastructure files" },
  { value: "ci", label: "CI / CD pipelines" },
  { value: "docs", label: "Documentation" },
  { value: "structural", label: "Config / structural files" },
];
const CUSTOM = "__custom__";
const NAMED_SCOPES = WHEN_OPTIONS.slice(1).map((o) => o.value);

function whenLabel(when: string | undefined): string {
  if (!when) return "Any file";
  return WHEN_OPTIONS.find((o) => o.value === when)?.label ?? `Pattern: ${when}`;
}

// ─── Small styled controls ────────────────────────────────────────────────────

const inputClass =
  "w-full rounded-lg border border-input bg-background/60 px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring/60 focus-visible:ring-2 focus-visible:ring-ring/40";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-foreground">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-muted-foreground">{hint}</span> : null}
    </label>
  );
}

function Select({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(inputClass, "cursor-pointer appearance-none pr-9")}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}

/** A color-accented group of fields, used to segregate the axes of a check. */
function Section({
  title,
  hint,
  tone,
  children,
}: {
  title: string;
  hint: string;
  tone: Tone;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("border-l-2 pl-4", toneRuleClass[tone])}>
      <h3 className={cn("text-xs font-semibold uppercase tracking-wide", toneTextClass[tone])}>
        {title}
      </h3>
      <p className="mb-3 mt-0.5 text-xs text-muted-foreground">{hint}</p>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

// ─── Detail panel ─────────────────────────────────────────────────────────────

interface Draft {
  label: string;
  on: HookEvent;
  behavior: Behavior;
  cmd: string;
  prompt: string;
  injectText: string;
  injectFiles: string;
  injectDatetime: boolean;
  when: string;
  conditionId: string;
}

function toDraft(check: CheckDef): Draft {
  return {
    label: check.label,
    on: checkHookOf(check),
    behavior: behaviorOf(check),
    cmd: check.cmd ?? "",
    prompt: check.prompt ?? "",
    injectText: check.inject?.text ?? "",
    injectFiles: (check.inject?.files ?? []).join("\n"),
    injectDatetime: check.inject?.datetime ?? false,
    when: check.when ?? "",
    conditionId: check.conditionId ?? "",
  };
}

function draftToData(draft: Draft): Omit<CheckDef, "id"> {
  const data: Omit<CheckDef, "id"> = { label: draft.label.trim() || "Untitled check" };
  if (draft.on !== "before_done") data.on = draft.on;
  if (draft.when) data.when = draft.when;
  if (draft.conditionId) data.conditionId = draft.conditionId;
  if (draft.behavior === "cmd") {
    data.cmd = draft.cmd;
  } else if (draft.behavior === "prompt") {
    data.prompt = draft.prompt;
  } else {
    const files = draft.injectFiles
      .split(/[\n,]/)
      .map((f) => f.trim())
      .filter(Boolean);
    const inject: NonNullable<CheckDef["inject"]> = {};
    if (draft.injectText.trim()) inject.text = draft.injectText;
    if (files.length) inject.files = files;
    if (draft.injectDatetime) inject.datetime = true;
    // Guarantee at least one inject field so the schema accepts it.
    if (!inject.text && !inject.files && !inject.datetime) inject.text = draft.injectText || " ";
    data.inject = inject;
  }
  return data;
}

function CheckDetail({
  check,
  conditionIds,
  onDeleted,
}: {
  check: CheckDef;
  conditionIds: string[];
  onDeleted: () => void;
}) {
  const { updateCheck, deleteCheck } = useCanvasStore();
  const [draft, setDraft] = React.useState<Draft>(() => toDraft(check));
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  React.useEffect(() => {
    setDraft(toDraft(check));
    setConfirmDelete(false);
  }, [check.id]);

  function patch(next: Partial<Draft>) {
    setDraft((current) => {
      const merged = { ...current, ...next };
      updateCheck(check.id, draftToData(merged));
      return merged;
    });
  }

  const behaviorTone = BEHAVIORS.find((b) => b.value === draft.behavior)!.tone;
  const BehaviorIcon = BEHAVIORS.find((b) => b.value === draft.behavior)!.icon;
  const whenIsCustom = draft.when !== "" && !NAMED_SCOPES.includes(draft.when);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "flex size-6 items-center justify-center rounded-md",
                toneIconClass[behaviorTone],
              )}
            >
              <BehaviorIcon className="size-3.5" />
            </span>
            <span className="truncate text-sm font-semibold text-foreground">
              {draft.label || "Untitled check"}
            </span>
          </div>
          <span className="mt-1 block font-mono text-[11px] text-muted-foreground">{check.id}</span>
        </div>
        <Button
          size="sm"
          variant={confirmDelete ? "danger" : "ghost"}
          onClick={() => {
            if (!confirmDelete) {
              setConfirmDelete(true);
              setTimeout(() => setConfirmDelete(false), 3000);
              return;
            }
            deleteCheck(check.id);
            onDeleted();
          }}
        >
          <Trash2 />
          {confirmDelete ? "Confirm" : "Delete"}
        </Button>
      </div>

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5">
        <Field label="Name">
          <input
            className={inputClass}
            value={draft.label}
            onChange={(e) => patch({ label: e.target.value })}
            placeholder="What this check is for"
          />
        </Field>

        <Section
          title="When it runs"
          hint="The point in the agent's loop this fires at."
          tone="accent"
        >
          <Field label="Hook" hint={hookMeta(draft.on).hint}>
            <Select value={draft.on} onChange={(v) => patch({ on: v as HookEvent })}>
              {HOOKS.map((h) => (
                <option key={h.value} value={h.value}>
                  {h.label}
                </option>
              ))}
            </Select>
          </Field>
        </Section>

        <Section title="What it does" hint="The action taken at that hook." tone={behaviorTone}>
          <Field label="Behavior">
            <Select value={draft.behavior} onChange={(v) => patch({ behavior: v as Behavior })}>
              {BEHAVIORS.map((b) => (
                <option key={b.value} value={b.value}>
                  {b.label}
                </option>
              ))}
            </Select>
          </Field>

          {draft.behavior === "cmd" ? (
            <Field
              label="Command"
              hint="Runs automatically. A non-zero exit blocks the agent at this hook."
            >
              <input
                className={cn(inputClass, "font-mono")}
                value={draft.cmd}
                onChange={(e) => patch({ cmd: e.target.value })}
                placeholder="npm test"
              />
            </Field>
          ) : draft.behavior === "prompt" ? (
            <Field label="Instruction" hint="Surfaced to the agent to read and act on.">
              <textarea
                rows={4}
                className={cn(inputClass, "resize-none")}
                value={draft.prompt}
                onChange={(e) => patch({ prompt: e.target.value })}
                placeholder="e.g. Confirm new API routes validate their input."
              />
            </Field>
          ) : (
            <div className="space-y-4">
              <Field label="Context text" hint="Literal text injected as agent context (optional).">
                <textarea
                  rows={3}
                  className={cn(inputClass, "resize-none")}
                  value={draft.injectText}
                  onChange={(e) => patch({ injectText: e.target.value })}
                  placeholder="e.g. Follow the conventions in CONTRIBUTING.md."
                />
              </Field>
              <Field
                label="Files"
                hint="Repo-relative files whose contents are injected, one per line."
              >
                <textarea
                  rows={2}
                  className={cn(inputClass, "resize-none font-mono")}
                  value={draft.injectFiles}
                  onChange={(e) => patch({ injectFiles: e.target.value })}
                  placeholder={"AGENT_CONTEXT.md\ndocs/conventions.md"}
                />
              </Field>
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  className="size-4 accent-[var(--color-info)]"
                  checked={draft.injectDatetime}
                  onChange={(e) => patch({ injectDatetime: e.target.checked })}
                />
                <FileText className="size-3.5 text-muted-foreground" />
                Inject the current date &amp; time
              </label>
            </div>
          )}
        </Section>

        <Section
          title="What triggers it"
          hint="Optional filters that narrow when this check applies."
          tone="info"
        >
          <Field
            label="Only for files"
            hint="Limit to changes touching matching files. “Any file” always applies."
          >
            <Select
              value={whenIsCustom ? CUSTOM : draft.when}
              onChange={(v) => patch({ when: v === CUSTOM ? (whenIsCustom ? draft.when : "") : v })}
            >
              {WHEN_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
              <option value={CUSTOM}>Custom file pattern…</option>
            </Select>
            {whenIsCustom ? (
              <input
                className={cn(inputClass, "mt-2 font-mono")}
                value={draft.when}
                onChange={(e) => patch({ when: e.target.value })}
                placeholder="\.test\.ts$"
              />
            ) : null}
          </Field>

          <Field label="Only if" hint="Restrict to projects matching a condition from checks.yaml.">
            {conditionIds.length === 0 && !draft.conditionId ? (
              <p className="rounded-lg border border-dashed border-border bg-card/40 px-3 py-2 text-xs text-muted-foreground">
                No conditions defined — this check always applies.
              </p>
            ) : (
              <Select value={draft.conditionId} onChange={(v) => patch({ conditionId: v })}>
                <option value="">Always applies</option>
                {[...new Set([...conditionIds, draft.conditionId].filter(Boolean))].map((id) => (
                  <option key={id} value={id}>
                    {id}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </Section>
      </div>
    </div>
  );
}

// ─── List ─────────────────────────────────────────────────────────────────────

function CheckRow({
  check,
  active,
  onSelect,
}: {
  check: CheckDef;
  active: boolean;
  onSelect: () => void;
}) {
  const Icon = behaviorIcon(check);
  const tone = behaviorTone(check);
  const detail = check.cmd ?? check.inject?.text ?? check.prompt ?? "";
  return (
    <button
      type="button"
      data-testid="check-row"
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors",
        active ? "bg-muted" : "hover:bg-muted/50",
      )}
    >
      <span
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-md",
          toneIconClass[tone],
        )}
      >
        <Icon className="size-3.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm text-foreground">{check.label}</span>
        {detail ? (
          <span className="block truncate font-mono text-[11px] text-muted-foreground">
            {detail}
          </span>
        ) : null}
      </span>
      {check.when ? (
        <span className="shrink-0 text-[11px] text-muted-foreground">{whenLabel(check.when)}</span>
      ) : null}
    </button>
  );
}

// ─── Main ListView ──────────────────────────────────────────────────────────

export function ListView() {
  const { config, addCheck } = useCanvasStore();
  const checks = React.useMemo(() => config?.checks ?? [], [config]);
  const conditionIds = React.useMemo(() => (config?.conditions ?? []).map((c) => c.id), [config]);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  // Group checks by hook, in lifecycle order.
  const groups = React.useMemo(() => {
    return HOOK_ORDER.map((hook) => ({
      hook,
      checks: checks.filter((c) => checkHookOf(c) === hook),
    })).filter((g) => g.checks.length > 0);
  }, [checks]);

  React.useEffect(() => {
    if (checks.length === 0) setSelectedId(null);
    else if (!selectedId || !checks.some((c) => c.id === selectedId)) {
      setSelectedId(checks[0]!.id);
    }
  }, [checks, selectedId]);

  function handleAdd() {
    addCheck({ label: "New check", cmd: "" });
    const next = useCanvasStore.getState().config?.checks ?? [];
    const created = next[next.length - 1];
    if (created) setSelectedId(created.id);
  }

  const selected = checks.find((c) => c.id === selectedId) ?? null;

  return (
    <div className="grid h-full min-h-0 grid-cols-[minmax(280px,360px)_1fr]">
      <div className="flex min-h-0 flex-col border-r border-border">
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Checks
          </span>
          <Button size="sm" variant="ghost" onClick={handleAdd}>
            <Plus />
            Add check
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
          {groups.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">
              No checks yet. Add one to get started.
            </p>
          ) : (
            <div className="flex flex-col gap-5">
              {groups.map(({ hook, checks: groupChecks }) => {
                const meta = hookMeta(hook);
                const Icon = meta.icon;
                return (
                  <section key={hook}>
                    <div className="mb-1.5 flex items-center gap-2 px-3">
                      <Icon className="size-3.5 text-muted-foreground" />
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {meta.label}
                      </span>
                      <span className="text-[11px] text-muted-foreground/70">
                        {groupChecks.length}
                      </span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      {groupChecks.map((check) => (
                        <CheckRow
                          key={check.id}
                          check={check}
                          active={check.id === selectedId}
                          onSelect={() => setSelectedId(check.id)}
                        />
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="min-h-0">
        {selected ? (
          <CheckDetail
            key={selected.id}
            check={selected}
            conditionIds={conditionIds}
            onDeleted={() => setSelectedId(null)}
          />
        ) : (
          <div className="flex h-full items-center justify-center p-6">
            <EmptyState
              icon={ListChecks}
              title="No check selected"
              description="Pick a check on the left to edit it, or add one."
            />
          </div>
        )}
      </div>
    </div>
  );
}
