import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Vendored affectUI components, kept as upstream ships them.
  {
    files: [
      "src/components/ui/number-ticker.tsx",
      "src/components/ui/agent-tree.tsx",
      "src/components/ui/compact-breakdown.tsx",
      "src/components/ui/kpi-chart.tsx",
      "src/components/ui/tilt-card.tsx",
    ],
    rules: {
      "react-hooks/refs": "off",
      "react-hooks/purity": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "coverage/**",
  ]),
]);

export default eslintConfig;
