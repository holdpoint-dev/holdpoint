import type { ReactNode } from "react";
import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "holdpoint — eval checkpoints for AI coding agents",
  description:
    "Enforce deterministic checkpoints before any AI coding agent commits or marks a task done. (Alpha)",
  metadataBase: new URL("https://holdpoint.dev"),
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  openGraph: {
    title: "holdpoint — eval checkpoints for AI coding agents",
    description:
      "Enforce deterministic checkpoints before any AI coding agent commits or marks a task done. (Alpha)",
    images: [{ url: "/og.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "holdpoint — eval checkpoints for AI coding agents",
    description:
      "Enforce deterministic checkpoints before any AI coding agent commits or marks a task done. (Alpha)",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ fontFamily: "'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif" }}>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
