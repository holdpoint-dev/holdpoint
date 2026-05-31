import React from "react";
import { useCanvasStore } from "./store";

export type ChecksStatus = "idle" | "loading" | "loaded" | "missing" | "error";

export interface ProjectChecks {
  status: ChecksStatus;
  /** The YAML currently on disk for this project (the diff/save baseline). */
  savedYaml: string | null;
  error: string | null;
  /** Persist new YAML to disk for this project. Resolves true on success. */
  save: (yaml: string) => Promise<boolean>;
  reload: () => void;
}

/**
 * Loads a project's `checks.yaml` into the shared editor store whenever the
 * selected project changes, and tracks the on-disk text as a baseline so the
 * Checks tab can show a diff and detect unsaved edits. One project is edited at
 * a time, matching the single-project focus of the rest of the dashboard.
 */
export function useProjectChecks(projectHash: string | null): ProjectChecks {
  const [status, setStatus] = React.useState<ChecksStatus>("idle");
  const [savedYaml, setSavedYaml] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [nonce, setNonce] = React.useState(0);

  const reload = React.useCallback(() => setNonce((n) => n + 1), []);

  React.useEffect(() => {
    if (!projectHash) {
      setStatus("idle");
      setSavedYaml(null);
      return;
    }

    let cancelled = false;
    setStatus("loading");
    setError(null);

    fetch(`/__holdpoint/initial-yaml?project=${encodeURIComponent(projectHash)}`, {
      credentials: "include",
    })
      .then(async (response) => {
        if (cancelled) return;
        if (response.status === 404) {
          useCanvasStore.getState().clear();
          setSavedYaml(null);
          setStatus("missing");
          return;
        }
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const text = await response.text();
        if (cancelled) return;
        useCanvasStore.getState().loadFromYaml(text);
        setSavedYaml(text);
        setStatus("loaded");
      })
      .catch((nextError: unknown) => {
        if (cancelled) return;
        setError(nextError instanceof Error ? nextError.message : "Failed to load checks");
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [projectHash, nonce]);

  const save = React.useCallback(
    async (yaml: string) => {
      if (!projectHash) return false;
      try {
        const response = await fetch(
          `/__holdpoint/checks?project=${encodeURIComponent(projectHash)}`,
          {
            method: "PUT",
            credentials: "include",
            headers: { "content-type": "text/yaml" },
            body: yaml,
          },
        );
        if (!response.ok) {
          const detail = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(detail?.error ?? `HTTP ${response.status}`);
        }
        setSavedYaml(yaml);
        setStatus("loaded");
        setError(null);
        return true;
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "Failed to save checks");
        return false;
      }
    },
    [projectHash],
  );

  return { status, savedYaml, error, save, reload };
}
