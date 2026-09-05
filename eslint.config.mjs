import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["**/dist/**", "**/dev-dist/**", "**/node_modules/**", "server/drizzle/**"] },
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
);
