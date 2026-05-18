import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("node:fs", () => ({
  existsSync: vi.fn(),
}));

import { existsSync } from "node:fs";
import { detectAgent, detectStack } from "../detect.js";

const mockExists = existsSync as ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockExists.mockReset();
  mockExists.mockReturnValue(false);
});

// ── detectAgent ────────────────────────────────────────────────────────────────

describe("detectAgent", () => {
  it("returns 'copilot' when .github/extensions exists", () => {
    mockExists.mockImplementation((p: string) => p === ".github/extensions");
    expect(detectAgent()).toBe("copilot");
  });

  it("returns 'claude' when .claude exists (and no copilot markers)", () => {
    mockExists.mockImplementation((p: string) => p === ".claude");
    expect(detectAgent()).toBe("claude");
  });

  it("returns 'cursor' when .cursorrules exists (and no copilot/claude markers)", () => {
    mockExists.mockImplementation((p: string) => p === ".cursorrules");
    expect(detectAgent()).toBe("cursor");
  });

  it("returns 'unknown' when none of the markers exist", () => {
    mockExists.mockReturnValue(false);
    expect(detectAgent()).toBe("unknown");
  });

  it("copilot takes precedence over claude when both markers present", () => {
    mockExists.mockImplementation((p: string) => p === ".github/extensions" || p === ".claude");
    expect(detectAgent()).toBe("copilot");
  });

  it("claude takes precedence over cursor when both markers present", () => {
    mockExists.mockImplementation((p: string) => p === ".claude" || p === ".cursorrules");
    expect(detectAgent()).toBe("claude");
  });
});

// ── detectStack ────────────────────────────────────────────────────────────────

describe("detectStack", () => {
  it("returns 'nextjs' when next.config.ts exists", () => {
    mockExists.mockImplementation((p: string) => p === "next.config.ts");
    expect(detectStack()).toBe("nextjs");
  });

  it("returns 'nextjs' when next.config.js exists", () => {
    mockExists.mockImplementation((p: string) => p === "next.config.js");
    expect(detectStack()).toBe("nextjs");
  });

  it("returns 'nextjs' when next.config.mjs exists", () => {
    mockExists.mockImplementation((p: string) => p === "next.config.mjs");
    expect(detectStack()).toBe("nextjs");
  });

  it("returns 'typescript' when only tsconfig.json exists", () => {
    mockExists.mockImplementation((p: string) => p === "tsconfig.json");
    expect(detectStack()).toBe("typescript");
  });

  it("returns 'python' when requirements.txt exists", () => {
    mockExists.mockImplementation((p: string) => p === "requirements.txt");
    expect(detectStack()).toBe("python");
  });

  it("returns 'python' when pyproject.toml exists", () => {
    mockExists.mockImplementation((p: string) => p === "pyproject.toml");
    expect(detectStack()).toBe("python");
  });

  it("returns 'python' when setup.py exists", () => {
    mockExists.mockImplementation((p: string) => p === "setup.py");
    expect(detectStack()).toBe("python");
  });

  it("returns 'go' when go.mod exists", () => {
    mockExists.mockImplementation((p: string) => p === "go.mod");
    expect(detectStack()).toBe("go");
  });

  it("returns 'fullstack' when Next.js + prisma/schema.prisma coexist", () => {
    mockExists.mockImplementation(
      (p: string) => p === "next.config.ts" || p === "prisma/schema.prisma",
    );
    expect(detectStack()).toBe("fullstack");
  });

  it("returns 'fullstack' when Next.js + server dir coexist", () => {
    mockExists.mockImplementation((p: string) => p === "next.config.ts" || p === "server");
    expect(detectStack()).toBe("fullstack");
  });

  it("returns 'unknown' when no recognisable markers exist", () => {
    mockExists.mockReturnValue(false);
    expect(detectStack()).toBe("unknown");
  });
});
