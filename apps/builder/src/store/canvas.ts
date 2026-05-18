import { create } from "zustand";
import type { HoldpointConfig, CheckDef } from "@holdpoint/types";
import { generateYaml, parseHoldpointYaml } from "@holdpoint/yaml-core";

/** Generate a URL-safe kebab-case ID from a label string. */
function labelToId(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

function ensureUniqueId(base: string, existing: Set<string>): string {
  if (!existing.has(base)) return base;
  let i = 2;
  while (existing.has(`${base}-${i}`)) i++;
  return `${base}-${i}`;
}

interface ChecksState {
  /** The loaded configuration, or null if nothing is loaded yet. */
  config: HoldpointConfig | null;

  loadFromYaml: (text: string) => void;
  loadTemplate: (template: HoldpointConfig) => void;
  exportYaml: () => string;

  addCheck: (check: Omit<CheckDef, "id"> & { id?: string }) => void;
  /** Fully replaces the non-id fields of a check (no partial merge — avoids stale cmd/prompt keys). */
  updateCheck: (id: string, data: Omit<CheckDef, "id">) => void;
  deleteCheck: (id: string) => void;
}

const EMPTY_CONFIG: HoldpointConfig = {
  version: 1,
  context: { guides: {} },
  conditions: [],
  checks: [],
};

export const useCanvasStore = create<ChecksState>((set, get) => ({
  config: null,

  loadFromYaml: (text) => {
    try {
      const config = parseHoldpointYaml(text);
      set({ config });
    } catch (err) {
      console.error("Failed to load YAML:", err);
    }
  },

  loadTemplate: (template) => {
    set({ config: template });
  },

  exportYaml: () => {
    const config = get().config ?? EMPTY_CONFIG;
    return generateYaml(config);
  },

  addCheck: (checkData) => {
    const config = get().config ?? EMPTY_CONFIG;
    const existing = new Set(config.checks.map((c) => c.id));
    const baseId = (checkData.id ?? labelToId(checkData.label)) || `check-${Date.now()}`;
    const id = ensureUniqueId(baseId, existing);
    const check: CheckDef = { ...checkData, id };
    set({ config: { ...config, checks: [...config.checks, check] } });
  },

  updateCheck: (id, data) => {
    const config = get().config;
    if (!config) return;
    set({
      config: {
        ...config,
        checks: config.checks.map((c) => (c.id === id ? { id, ...data } : c)),
      },
    });
  },

  deleteCheck: (id) => {
    const config = get().config;
    if (!config) return;
    set({
      config: {
        ...config,
        checks: config.checks.filter((c) => c.id !== id),
      },
    });
  },
}));
