import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["**/dist/**", "**/dev-dist/**", "**/node_modules/**", "server/drizzle/**", "web/ios/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "off",
      // 日本語 UI の全角スペースは意図的に使う
      "no-irregular-whitespace": ["error", { skipStrings: true, skipTemplates: true, skipJSXText: true, skipRegExps: true, skipComments: true }],
    },
  },
  {
    // Node 用の補助スクリプト（CommonJS）
    files: ["**/*.cjs"],
    languageOptions: {
      sourceType: "commonjs",
      globals: { require: "readonly", module: "writable", __dirname: "readonly", process: "readonly", console: "readonly" },
    },
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
);
