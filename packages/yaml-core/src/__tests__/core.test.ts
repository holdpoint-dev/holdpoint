import { describe, it, expect } from "vitest";
import { parseSentinelYaml, validateConfig, generateYaml } from "../parser.js";
import { matchesWhen } from "../trigger.js";

const MINIMAL_YAML = `
version: 1
context:
  guides: {}
conditions: []
task:
  - id: lint
    label: "Run linter"
    cmd: "pnpm lint"
prompt:
  - id: jsdoc
    label: "JSDoc on changed functions"
    prompt: "Ensure all changed public functions have JSDoc."
`;

describe("parseSentinelYaml", () => {
  it("parses a valid config", () => {
    const config = parseSentinelYaml(MINIMAL_YAML);
    expect(config.version).toBe(1);
    expect(config.task).toHaveLength(1);
    expect(config.prompt).toHaveLength(1);
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
task:
  - id: lint
    label: "Run linter"
    trigger:
      type: always
    cmd: "pnpm lint"
prompt: []
`;
    const config = parseSentinelYaml(yaml);
    expect(config.task[0]?.when).toBeUndefined();
  });

  it("migrates legacy trigger: { type: frontend } to when: frontend", () => {
    const yaml = `
version: 1
context:
  guides: {}
conditions: []
task: []
manual:
  - id: visual
    label: "Visual check"
    trigger:
      type: frontend
    manual: "Check UI"
`;
    const config = parseSentinelYaml(yaml);
    // old manual: → migrated to prompt:, old trigger: → migrated to when:
    expect(config.prompt[0]?.when).toBe("frontend");
  });

  it("migrates legacy trigger: { type: custom, pattern } to when: <pattern>", () => {
    const yaml = `
version: 1
context:
  guides: {}
conditions: []
task:
  - id: e2e
    label: "E2E tests"
    trigger:
      type: custom
      pattern: "^apps/builder/src/"
    cmd: "pnpm test:e2e"
prompt: []
`;
    const config = parseSentinelYaml(yaml);
    expect(config.task[0]?.when).toBe("^apps/builder/src/");
  });

  it("migrates legacy manual: section and manual: field to prompt:", () => {
    const yaml = `
version: 1
context:
  guides: {}
conditions: []
task: []
manual:
  - id: review
    label: "Review output"
    manual: "Check the generated file carefully."
`;
    const config = parseSentinelYaml(yaml);
    expect(config.prompt).toHaveLength(1);
    expect(config.prompt[0]?.prompt).toBe("Check the generated file carefully.");
  });

  it("migrates legacy deterministic: section to task:", () => {
    const yaml = `
version: 1
context:
  guides: {}
conditions: []
deterministic:
  - id: lint
    label: "Lint"
    cmd: "pnpm lint"
prompt: []
`;
    const config = parseSentinelYaml(yaml);
    expect(config.task).toHaveLength(1);
    expect(config.task[0]?.id).toBe("lint");
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
    expect(reparsed.task[0]?.id).toBe("lint");
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
