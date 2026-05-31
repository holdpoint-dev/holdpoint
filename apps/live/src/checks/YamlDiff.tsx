import React from "react";
import { cn } from "../lib/utils";

type Row = { kind: "same" | "add" | "del"; text: string };

/** Longest-common-subsequence line diff — enough to preview a checks.yaml edit. */
function diffLines(before: string, after: string): Row[] {
  const a = before.length ? before.split("\n") : [];
  const b = after.length ? after.split("\n") : [];
  const m = a.length;
  const n = b.length;
  const lcs: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      lcs[i]![j] =
        a[i] === b[j] ? lcs[i + 1]![j + 1]! + 1 : Math.max(lcs[i + 1]![j]!, lcs[i]![j + 1]!);
    }
  }
  const rows: Row[] = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (a[i] === b[j]) {
      rows.push({ kind: "same", text: a[i]! });
      i++;
      j++;
    } else if (lcs[i + 1]![j]! >= lcs[i]![j + 1]!) {
      rows.push({ kind: "del", text: a[i]! });
      i++;
    } else {
      rows.push({ kind: "add", text: b[j]! });
      j++;
    }
  }
  while (i < m) rows.push({ kind: "del", text: a[i++]! });
  while (j < n) rows.push({ kind: "add", text: b[j++]! });
  return rows;
}

export function YamlDiff({ before, after }: { before: string; after: string }) {
  const rows = React.useMemo(() => diffLines(before, after), [before, after]);
  const changed = rows.some((row) => row.kind !== "same");

  if (!changed) {
    return (
      <div className="rounded-lg border border-border bg-background/40 px-4 py-6 text-center text-sm text-muted-foreground">
        No changes — the editor matches what's on disk.
      </div>
    );
  }

  return (
    <pre className="max-h-[50vh] overflow-auto rounded-lg border border-border bg-background/60 p-0 font-mono text-xs leading-relaxed">
      {rows.map((row, index) => (
        <div
          key={index}
          className={cn(
            "flex gap-2 px-3 py-0.5",
            row.kind === "add" && "bg-success/10 text-success",
            row.kind === "del" && "bg-danger/10 text-danger",
            row.kind === "same" && "text-muted-foreground",
          )}
        >
          <span className="select-none opacity-60">
            {row.kind === "add" ? "+" : row.kind === "del" ? "-" : " "}
          </span>
          <span className="whitespace-pre-wrap break-all">{row.text || " "}</span>
        </div>
      ))}
    </pre>
  );
}
