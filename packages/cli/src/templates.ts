import { copyFileSync, existsSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export function getBundledTemplatePath(filename: string): string {
  const candidates = [
    join(__dirname, "templates", filename), // dist/templates/ (published package)
    join(__dirname, "../../../templates", filename), // monorepo dev fallback
    join(process.cwd(), "templates", filename), // cwd fallback
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  return "";
}

export function ensureBundledFile(
  outputPath: string,
  templateFilename: string,
  fallbackContent: string,
): boolean {
  if (existsSync(outputPath)) {
    return false;
  }

  const templatePath = getBundledTemplatePath(templateFilename);
  if (templatePath) {
    copyFileSync(templatePath, outputPath);
  } else {
    writeFileSync(outputPath, fallbackContent, "utf8");
  }

  return true;
}
