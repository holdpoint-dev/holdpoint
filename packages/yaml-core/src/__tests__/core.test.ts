import { describe, it, expect } from "vitest";
import { parseSentinelYaml, validateConfig, generateYaml } from "../parser.js";
import { matchesWhen } from "../trigger.js";

const MINIMAL_YAML = `
version: 1
context:
  guides: {}
conditions: []
deterministic:
  - id: lint
    label: "Run linter"
    cmd: "pnpm lint"
manual:
  - id: jsdoc
    label: "JSDoc on changed functions"
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

  it("migrates legacy trigger: { type: always } to no when field", () => {
    const yaml = `
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
manual: []
`;
    const config = parseSentinelYaml(yaml);
    expect(config.deterministic[0]?.when).toBeUndefined();
  });

  it("migrates legacy trigger: { type: frontend } to when: frontend", () => {
    const yaml = `
version: 1
context:
  guides: {}
conditions: []
deterministic: []
manual:
  - id: visual
    label: "Visual check"
    trigger:
      type: frontend
    manual: "Check UI"
`;
    const config = parseSentinelYaml(yaml);
    expect(config.manual[0]?.when).toBe("frontend");
  });

  it("migrates legacy trigger: { type: custom, pattern } to when: <pattern>", () => {
    const yaml = `
version: 1
context:
  guides: {}
conditions: []
deterministic:
  - id: e2e
    label: "E2E tests"
    trigger:
      type: custom
      pattern: "^apps/builder/src/"
    cmd: "pnpm test:e2e"
manual: []
`;
    const config = parseSentinelYaml(yaml);
    expect(config.deterministic[0]?.when).toBe("^apps/builder/src/");
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

describe("matchesWhen", () => {
  it("always matches when when is undefined", () => {
    expect(matchesWhen(undefined, [])).toBe(true);
    expect(matchesWhen(undefined, ["any/file.ts"])).toBe(true);
  });

  it("matches frontend files", () => {
    expect(matchesWhen("frontend", ["src/App.tsx"])).toBe(true);
    expect(matchesWhen("frontend", ["src/styles.css"])).toBe(true);
    expect(matchesWhen("frontend", ["server/api.ts"])).toBe(false);
  });

  it("matches prisma files", () => {
    expect(matchesWhen("prisma", ["prisma/schema.prisma"])).toBe(true);
    expect(matchesWhen("prisma", ["src/index.ts"])).toBe(false);
  });

  it("matches custom regex", () => {
    expect(matchesWhen("\\.test\\.ts$", ["foo.test.ts"])).toBe(true);
    expect(matchesWhen("\\.test\\.ts$", ["foo.ts"])).toBe(false);
  });
});
