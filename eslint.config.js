import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

/** Shared rule set for Node-oriented TS packages (backend, shared, mcp-server). */
const typeScriptNodePackageRules = {
  "@typescript-eslint/no-explicit-any": "warn",
  "@typescript-eslint/explicit-function-return-type": "off",
  "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
  "@typescript-eslint/no-require-imports": "warn",
  "@typescript-eslint/triple-slash-reference": "warn",
};

const typeScriptNodePackageConfigs = [
  ["backend/src/**/*.ts", "./backend/tsconfig.json"],
  ["shared/src/**/*.ts", "./shared/tsconfig.json"],
  ["mcp-server/src/**/*.ts", "./mcp-server/tsconfig.json"],
].map(([files, project]) => ({
  files: [files],
  languageOptions: {
    parserOptions: { project },
  },
  rules: typeScriptNodePackageRules,
}));

export default [
  {
    ignores: [
      "dist",
      "node_modules",
      "*.config.js",
      "coverage",
      "frontend/src/test/**",
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...typeScriptNodePackageConfigs,
  {
    files: ["frontend/src/**/*.ts", "frontend/src/**/*.tsx"],
    plugins: { "react-hooks": reactHooks },
    languageOptions: {
      parserOptions: {
        project: "./frontend/tsconfig.eslint.json",
      },
    },
    rules: {
      // Classic hooks only — avoid recommended preset’s React Compiler rules (v7+) on this codebase until adopted intentionally.
      "react-hooks/rules-of-hooks": "warn",
      "react-hooks/exhaustive-deps": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/ban-ts-comment": "warn",
      "@typescript-eslint/no-require-imports": "warn",
      "@typescript-eslint/triple-slash-reference": "warn",
    },
  },
  {
    files: [
      "**/__tests__/**/*.ts",
      "**/__tests__/**/*.tsx",
      "**/*.test.ts",
      "**/*.test.tsx",
    ],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  // Downgrade core rules that are noisy on this codebase; keep CI/pre-commit green while tightening over time.
  {
    files: [
      "backend/src/**/*.ts",
      "shared/src/**/*.ts",
      "mcp-server/src/**/*.ts",
    ],
    rules: {
      "no-case-declarations": "warn",
      "prefer-const": "warn",
      "no-useless-escape": "warn",
    },
  },
  {
    files: ["frontend/src/**/*.ts", "frontend/src/**/*.tsx"],
    plugins: { "react-hooks": reactHooks },
    rules: {
      "no-case-declarations": "warn",
      "prefer-const": "warn",
      "no-useless-escape": "warn",
      "react-hooks/rules-of-hooks": "warn",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
];
