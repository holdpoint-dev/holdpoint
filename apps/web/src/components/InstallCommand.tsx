"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

const INSTALL_COMMAND = "curl -fsSL https://holdpoint.dev/install.sh | sh";

export function InstallCommand() {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    void navigator.clipboard.writeText(INSTALL_COMMAND).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div
      className="flex items-center justify-between gap-3 rounded-xl border border-ink-3 bg-ink-2 px-4 py-3 text-sm"
      style={{ fontFamily: "'JetBrains Mono', 'IBM Plex Mono', ui-monospace, monospace" }}
    >
      <span className="text-bone">
        <span className="select-none text-stone">$ </span>
        {INSTALL_COMMAND}
      </span>
      <button
        onClick={handleCopy}
        aria-label="Copy install command"
        className="shrink-0 text-stone transition hover:text-bone"
      >
        {copied ? <Check size={14} className="text-signal" /> : <Copy size={14} />}
      </button>
    </div>
  );
}
