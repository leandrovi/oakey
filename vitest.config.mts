import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    coverage: { provider: "v8", include: ["src/lib/**"], exclude: ["src/lib/utils.ts"], thresholds: { lines: 90, functions: 90, branches: 85, statements: 90 } },
  },
});
