import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    settings: {
      react: { version: "19.2" },
    },
    rules: {
      "@next/next/no-html-link-for-pages": "off",
    },
  },
  globalIgnores([
    "**/.next/**",
    "**/dist/**",
    "**/coverage/**",
    "**/next-env.d.ts",
  ]),
]);
