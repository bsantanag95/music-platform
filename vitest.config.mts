import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["src/test/setup.ts"],
    // Los worktrees de agentes en .claude/ contienen copias viejas de los
    // tests que el glob por defecto descubría y ejecutaba contra el alias
    // `@` de este workspace (falsos fallos en `pnpm test`).
    // `e2e/` es de Playwright (`pnpm run test:e2e`), no de vitest.
    exclude: ["**/node_modules/**", "**/dist/**", ".claude/**", "**/.claude/**", "e2e/**"],
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
});
