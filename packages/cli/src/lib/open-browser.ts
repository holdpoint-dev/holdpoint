import { execSync } from "node:child_process";

export function openBrowser(url: string): void {
  const openCmd =
    process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";

  try {
    execSync(`${openCmd} ${JSON.stringify(url)}`, { stdio: "ignore" });
  } catch {
    /* non-fatal */
  }
}
