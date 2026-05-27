"use client";

import { useState } from "react";
import { Check, Copy, Info } from "lucide-react";

const AGENTS = [
  { id: "all", label: "All agents" },
  { id: "copilot", label: "Copilot" },
  { id: "claude", label: "Claude" },
  { id: "cursor", label: "Cursor" },
  { id: "codex", label: "Codex" },
] as const;

const PLATFORMS = [
  { id: "unix", label: "macOS / Linux" },
  { id: "windows", label: "Windows" },
] as const;

const CURSOR_NOTICE =
  "Cursor cannot hard-block completion: Holdpoint only writes .cursorrules instructions, so checks are advisory there.";
const INSTALL_NOTICE =
  "Choose all agents for the platform installer. Single-agent installs use npx and are the same on every platform.";

type AgentId = (typeof AGENTS)[number]["id"];
type PlatformId = (typeof PLATFORMS)[number]["id"];

function buildCommand(agentId: AgentId, platformId: PlatformId): string {
  if (agentId === "all") {
    return platformId === "windows"
      ? 'powershell -NoProfile -ExecutionPolicy Bypass -Command "irm https://holdpoint.dev/install.ps1 | iex"'
      : "curl -fsSL https://holdpoint.dev/install.sh | sh";
  }
  return `npx holdpoint@alpha init --agent ${agentId}`;
}

function InfoTooltip({ label, children }: { label: string; children: string }) {
  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        aria-label={label}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/[0.08] text-stone/55 transition-colors hover:border-signal/30 hover:text-bone focus:border-signal/40 focus:text-bone focus:outline-none"
      >
        <Info size={12} aria-hidden="true" />
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute right-0 top-full z-20 mt-2 w-64 rounded-lg border border-white/[0.08] bg-ink-2 px-3 py-2 text-left text-xs normal-case leading-relaxed tracking-normal text-stone opacity-0 shadow-xl shadow-black/25 transition duration-150 group-focus-within:opacity-100 group-hover:opacity-100"
      >
        {children}
      </span>
    </span>
  );
}

/** Agent-aware install command picker with copy support for the landing page. */
export function InstallCommand() {
  const [agent, setAgent] = useState<AgentId>("all");
  const [platform, setPlatform] = useState<PlatformId>("unix");
  const [copied, setCopied] = useState(false);
  const command = buildCommand(agent, platform);

  function handleCopy() {
    void navigator.clipboard
      .writeText(command)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch((error: unknown) => {
        console.error("Failed to copy install command.", error);
      });
  }

  return (
    <div className="w-full space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <p className="font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-stone/55">
            Install command
          </p>
          <InfoTooltip label="Install command details">{INSTALL_NOTICE}</InfoTooltip>
        </div>

        <div
          className="inline-flex w-fit rounded-full border border-white/[0.07] bg-white/[0.035] p-0.5"
          role="group"
          aria-label="Choose your operating system"
        >
          {PLATFORMS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPlatform(p.id)}
              aria-pressed={platform === p.id}
              className={`rounded-full px-3 py-1 text-xs transition-colors ${
                platform === p.id ? "bg-white/[0.1] text-bone" : "text-stone/55 hover:text-stone"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div
          className="flex flex-wrap items-center gap-1"
          role="group"
          aria-label="Choose which agent to install for"
        >
          {AGENTS.map((a) => {
            const button = (
              <button
                key={a.id}
                type="button"
                onClick={() => setAgent(a.id)}
                aria-pressed={agent === a.id}
                className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
                  agent === a.id
                    ? "bg-signal/10 text-signal"
                    : "text-stone/55 hover:bg-white/[0.04] hover:text-stone"
                }`}
              >
                {a.label}
              </button>
            );

            if (a.id !== "cursor") return button;

            return (
              <span key={a.id} className="flex items-center gap-1">
                {button}
                <InfoTooltip label="Cursor support details">{CURSOR_NOTICE}</InfoTooltip>
              </span>
            );
          })}
        </div>
      </div>

      <div className="flex items-start justify-between gap-3 rounded-[1rem] border border-white/[0.08] bg-white/[0.035] px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <code
            className="block whitespace-pre-wrap break-all font-mono text-[13px] leading-6 text-bone"
            style={{ fontFamily: "'JetBrains Mono', 'IBM Plex Mono', ui-monospace, monospace" }}
          >
            <span className="select-none text-stone/40">$ </span>
            {command}
          </code>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          aria-label="Copy install command"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/[0.07] bg-white/[0.06] px-2.5 py-1.5 text-xs text-stone transition-colors hover:border-signal/30 hover:text-bone"
        >
          {copied ? <Check size={13} className="text-signal" /> : <Copy size={13} />}
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
    </div>
  );
}
