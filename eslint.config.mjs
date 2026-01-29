import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    files: ["src/domain/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/src/server/**",
                "src/server/**",
                "../server/**",
                "../../server/**",
              ],
              message: "Domain layer must not depend on server layer (Architecture guardrail: Domain ≠ Server).",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/lib/engine/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "warn",
        {
          patterns: [
            {
              group: [
                "@/src/server/**",
                "src/server/**",
                "../server/**",
                "../../server/**",
              ],
              message: "Engine should stay server-agnostic (Phase 1.5 warning: avoid imports from src/server).",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
