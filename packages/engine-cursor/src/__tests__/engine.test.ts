import { describe, it, expect } from "vitest";
import { buildEngine } from "../engine.js";
import type { HoldpointConfig } from "@holdpoint/types";

const FULL_CONFIG: HoldpointConfig = {
  version: 1,
  context: { guides: {} },
  conditions: [],
  checks: [
    { id: "lint", label: "Lint checks", cmd: "pnpm lint" },
    { id: "types", label: "Type check", cmd: "pnpm typecheck" },
    { id: "review", label: "Peer review", prompt: "Verify all edge cases are handled" },
  ],
};

const EMPTY_CONFIG: HoldpointConfig = {
  version: 1,
  context: { guides: {} },
  conditions: [],
  checks: [],
};

describe("buildEngine (Cursor adapter)", () => {
  it("returns a string", () => {
    expect(typeof buildEngine(FULL_CONFIG)).toBe("string");
  });

  it("includes the Holdpoint Rules header marker", () => {
    const output = buildEngine(FULL_CONFIG);
    expect(output).toContain("Holdpoint Rules");
  });

  it("includes AUTO-GENERATED comment so users know not to edit it", () => {
    const output = buildEngine(FULL_CONFIG);
    expect(output).toContain("auto-generated");
  });

  it("lists each cmd check label", () => {
    const output = buildEngine(FULL_CONFIG);
    expect(output).toContain("Lint checks");
    expect(output).toContain("Type check");
  });

  it("embeds the cmd for each deterministic check", () => {
    const output = buildEngine(FULL_CONFIG);
    expect(output).toContain("pnpm lint");
    expect(output).toContain("pnpm typecheck");
  });

  it("lists prompt checks separately", () => {
    const output = buildEngine(FULL_CONFIG);
    expect(output).toContain("Peer review");
    expect(output).toContain("Verify all edge cases are handled");
  });

  it("instructs the agent to run holdpoint check before completing", () => {
    const output = buildEngine(FULL_CONFIG);
    expect(output.toLowerCase()).toContain("holdpoint@alpha check");
  });

  it("handles empty checks gracefully (no crash)", () => {
    expect(() => buildEngine(EMPTY_CONFIG)).not.toThrow();
  });

  it("shows fallback text for empty cmd checks", () => {
    const output = buildEngine(EMPTY_CONFIG);
    expect(output).toContain("(no tasks configured)");
  });

  it("shows fallback text for empty prompt checks", () => {
    const output = buildEngine(EMPTY_CONFIG);
    expect(output).toContain("(no prompt checks configured)");
  });

  it("applies the when filter to cmd checks", () => {
    const config: HoldpointConfig = {
      ...FULL_CONFIG,
      checks: [{ id: "lint", label: "Lint", cmd: "pnpm lint", when: ["frontend"] }],
    };
    const output = buildEngine(config);
    expect(output).toContain("[frontend]");
  });

  it("applies the when filter to prompt checks", () => {
    const config: HoldpointConfig = {
      ...FULL_CONFIG,
      checks: [{ id: "review", label: "Review", prompt: "Check it", when: ["backend"] }],
    };
    const output = buildEngine(config);
    expect(output).toContain("[backend]");
  });

  it("includes end-of-block marker", () => {
    const output = buildEngine(FULL_CONFIG);
    expect(output).toContain("End Holdpoint Rules");
  });
});
