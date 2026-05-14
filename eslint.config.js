import js from "@eslint/js";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

/** @type {import("eslint").Linter.Config[]} */
export default [
  js.configs.recommended,
  {
    files: ["**/*.ts", "**/*.tsx"],
    plugins: { "@typescript-eslint": tsPlugin },
    languageOptions: { parser: tsParser, parserOptions: { project: true } },
    rules: {
      ...tsPlugin.configs["recommended-type-checked"].rules,
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/consistent-type-imports": "error",
    },
  },
  {
    ignores: ["**/dist/**", "**/node_modules/**", "**/.next/**"],
  },
];
