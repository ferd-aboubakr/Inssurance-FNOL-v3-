import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(js.configs.recommended, ...tseslint.configs.recommended, {
  ignores: ["node_modules", ".next", "coverage", "next-env.d.ts", "*.tsbuildinfo"],
}, {
  files: ["tests/**/*.ts"],
  rules: { "@typescript-eslint/no-this-alias": "off" }
});
