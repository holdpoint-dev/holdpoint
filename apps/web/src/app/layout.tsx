import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sentinel — Universal Eval-Guard for AI Agents",
  description:
    "Enforce deterministic checkpoints on Copilot CLI, Claude Code, Cursor, and any AI coding agent. One command to install.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
