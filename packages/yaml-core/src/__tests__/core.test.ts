import { describe, it, expect } from "vitest";
import { parseSentinelYaml, validateConfig, generateYaml } from "../parser.js";
import { matchesWhen } from "../trigger.js";

const MINIMAL_YAML = `
version: 1
context:
  guides: {}
conditions: []
checks:
  - id: lint
    label: "Run linter"
    cmd: "pnpm lint"
  - id: jsdoc
    label: "JSDoc on changed functions"
    prompt: "Ensure all changed public functions have JSDoc."
`;

describe("parseSentinelYaml", () => {
  it("parses a valid config", () => {
    const config = parseSentinelYaml(MINIMAL_YAML);
    expect(config.version).toBe(1);
    expect(config.checks).toHaveLength(2);
    expect(config.checks.filter((c) => c.cmd !== undefined)).toHaveLength(1);
    expect(config.checks.filter((c) => c.prompt !== undefined)).toHaveLength(1);
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
    expect(config.checks[0]?.when).toBeUndefined();
  });

  it("migrates legacy trigger: { type: frontend } and manual: field to checks", () => {
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
    expect(config.checks[0]?.when).toBe("frontend");
    expect(config.checks[0]?.prompt).toBe("Check UI");
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
    expect(config.checks[0]?.when).toBe("^apps/builder/src/");
  });

  it("migrates legacy manual: section and manual: field to checks", () => {
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
    expect(config.checks).toHaveLength(1);
    expect(config.checks[0]?.prompt).toBe("Check the generated file carefully.");
  });

  it("migrates legacy deterministic: section to checks", () => {
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
    expect(config.checks).toHaveLength(1);
    expect(config.checks[0]?.id).toBe("lint");
  });

  it("merges legacy task: + prompt: + existing checks: without losing entries", () => {
    const yaml = `
version: 1
context:
  guides: {}
conditions: []
checks:
  - id: existing
    label: "Existing"
    cmd: "echo existing"
task:
  - id: from-task
    label: "From task"
    cmd: "echo task"
prompt:
  - id: from-prompt
    label: "From prompt"
    prompt: "Act on this"
`;
    const config = parseSentinelYaml(yaml);
    expect(config.checks).toHaveLength(3);
    expect(config.checks.map((c) => c.id)).toEqual(["existing", "from-task", "from-prompt"]);
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
    expect(reparsed.checks[0]?.id).toBe("lint");
  });
});

describe("matchesWhen", () => {
  it("always matches when when is undefined", () => {
    expect(matchesWhen(undefined, [])).toBe(true);
    expect(matchesWhen(undefined, ["any/file.ts"])).toBe(true);
  });

  it("matches __all__ unconditionally", () => {
    expect(matchesWhen("frontend", ["__all__"])).toBe(true);
    expect(matchesWhen("prisma", ["__all__"])).toBe(true);
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

  // ── New scope tests ───────────────────────────────────────────────────────

  it("matches python scope", () => {
    expect(matchesWhen("python", ["src/main.py"])).toBe(true);
    expect(matchesWhen("python", ["pyproject.toml"])).toBe(true);
    expect(matchesWhen("python", ["requirements.txt"])).toBe(true);
    expect(matchesWhen("python", ["src/app.ts"])).toBe(false);
  });

  it("matches go scope", () => {
    expect(matchesWhen("go", ["main.go"])).toBe(true);
    expect(matchesWhen("go", ["go.mod"])).toBe(true);
    expect(matchesWhen("go", ["pkg/server/server.go"])).toBe(true);
    expect(matchesWhen("go", ["src/app.ts"])).toBe(false);
  });

  it("matches rust scope", () => {
    expect(matchesWhen("rust", ["src/lib.rs"])).toBe(true);
    expect(matchesWhen("rust", ["Cargo.toml"])).toBe(true);
    expect(matchesWhen("rust", ["src/app.ts"])).toBe(false);
  });

  it("matches java scope", () => {
    expect(matchesWhen("java", ["src/Main.java"])).toBe(true);
    expect(matchesWhen("java", ["src/App.kt"])).toBe(true);
    expect(matchesWhen("java", ["pom.xml"])).toBe(true);
    expect(matchesWhen("java", ["src/app.ts"])).toBe(false);
  });

  it("matches ruby scope", () => {
    expect(matchesWhen("ruby", ["app/models/user.rb"])).toBe(true);
    expect(matchesWhen("ruby", ["Gemfile"])).toBe(true);
    expect(matchesWhen("ruby", ["src/app.ts"])).toBe(false);
  });

  it("matches database scope — nested and root-level paths", () => {
    expect(matchesWhen("database", ["migrations/001_create_users.sql"])).toBe(true);
    expect(matchesWhen("database", ["db/schema.sql"])).toBe(true);
    expect(matchesWhen("database", ["prisma/schema.prisma"])).toBe(true);
    expect(matchesWhen("database", ["src/database/models.ts"])).toBe(true);
    expect(matchesWhen("database", ["src/app.ts"])).toBe(false);
  });

  it("matches testing scope", () => {
    expect(matchesWhen("testing", ["src/__tests__/util.test.ts"])).toBe(true);
    expect(matchesWhen("testing", ["tests/test_main.py"])).toBe(true);
    expect(matchesWhen("testing", ["spec/models/user_spec.rb"])).toBe(true);
    expect(matchesWhen("testing", ["src/app.ts"])).toBe(false);
  });

  it("matches infra scope", () => {
    expect(matchesWhen("infra", ["Dockerfile"])).toBe(true);
    expect(matchesWhen("infra", ["docker-compose.yml"])).toBe(true);
    expect(matchesWhen("infra", ["infra/main.tf"])).toBe(true);
    expect(matchesWhen("infra", ["k8s/deployment.yaml"])).toBe(true);
    expect(matchesWhen("infra", ["src/app.ts"])).toBe(false);
  });

  it("matches ci scope", () => {
    expect(matchesWhen("ci", [".github/workflows/ci.yml"])).toBe(true);
    expect(matchesWhen("ci", [".circleci/config.yml"])).toBe(true);
    expect(matchesWhen("ci", ["Jenkinsfile"])).toBe(true);
    expect(matchesWhen("ci", [".gitlab-ci.yml"])).toBe(true);
    expect(matchesWhen("ci", ["src/app.ts"])).toBe(false);
  });

  it("matches docs scope", () => {
    expect(matchesWhen("docs", ["docs/getting-started.md"])).toBe(true);
    expect(matchesWhen("docs", ["site/pages/index.mdx"])).toBe(true);
    expect(matchesWhen("docs", ["README.rst"])).toBe(true);
    expect(matchesWhen("docs", ["src/app.ts"])).toBe(false);
  });
});
