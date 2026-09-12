import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(js.configs.recommended, ...tseslint.configs.recommended, {
  ignores: ["node_modules", "coverage", ".next", "next-env.d.ts"]
}, {
}, {
  files: ["tests/**/*.ts"],
  rules: { "@typescript-eslint/no-this-alias": "off" }
}, {
  files: ["app/api/copilotkit/route.ts"],
  rules: { "@typescript-eslint/no-unused-vars": "off" }
});
