import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { offlineBuild } from "./scripts/offline-build";
export default defineConfig({
  plugins: [react(), offlineBuild()],
  test: { include: ["tests/**/*.test.ts"] },
});
