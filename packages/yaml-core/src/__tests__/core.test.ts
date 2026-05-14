import { describe, it, expect } from "vitest";
import { parseSentinelYaml, validateConfig, generateYaml } from "../parser.js";
import { matchesTrigger } from "../trigger.js";

const MINIMAL_YAML = `
version: 1
context:
  guides: {}
conditions: []
deterministic:
  - id: lint
    label: "Run linter"
    trigger:
      type: always
    cmd: "pnpm lint"
manual:
  - id: jsdoc
    label: "JSDoc on changed functions"
    trigger:
      type: always
    manual: "Ensure all changed public functions have JSDoc."
`;

describe("parseSentinelYaml", () => {
  it("parses a valid config", () => {
    const config = parseSentinelYaml(MINIMAL_YAML);
    expect(config.version).toBe(1);
    expect(config.deterministic).toHaveLength(1);
    expect(config.manual).toHaveLength(1);
  });

  it("throws on invalid YAML", () => {
    expect(() => parseSentinelYaml("{ invalid: [ mismatched }")).toThrow();
  });

  it("throws on schema violation", () => {
    expect(() => parseSentinelYaml("version: -1\n")).toThrow(/Invalid checks.yaml/);
  });
});

describe("validateConfig", () => {
  it("returns valid for a correct config", () => {
    const config = parseSentinelYaml(MINIMAL_YAML);
    const result = validateConfig(config);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

describe("generateYaml", () => {
  it("round-trips a config", () => {
    const config = parseSentinelYaml(MINIMAL_YAML);
    const text = generateYaml(config);
    const reparsed = parseSentinelYaml(text);
    expect(reparsed.deterministic[0]?.id).toBe("lint");
  });
});

describe("matchesTrigger", () => {
  it("always matches for type=always", () => {
    expect(matchesTrigger({ type: "always" }, [])).toBe(true);
    expect(matchesTrigger({ type: "always" }, ["any/file.ts"])).toBe(true);
  });

  it("matches frontend files", () => {
    expect(matchesTrigger({ type: "frontend" }, ["src/App.tsx"])).toBe(true);
    expect(matchesTrigger({ type: "frontend" }, ["src/styles.css"])).toBe(true);
    expect(matchesTrigger({ type: "frontend" }, ["server/api.ts"])).toBe(false);
  });

  it("matches prisma files", () => {
    expect(matchesTrigger({ type: "prisma" }, ["prisma/schema.prisma"])).toBe(true);
    expect(matchesTrigger({ type: "prisma" }, ["src/index.ts"])).toBe(false);
  });

  it("matches custom regex", () => {
    expect(
      matchesTrigger({ type: "custom", pattern: "\\.test\\.ts$" }, ["foo.test.ts"]),
    ).toBe(true);
    expect(
      matchesTrigger({ type: "custom", pattern: "\\.test\\.ts$" }, ["foo.ts"]),
    ).toBe(false);
  });
});
