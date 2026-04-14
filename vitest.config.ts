import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      // Redirect Tauri and Next.js modules to mocks in all test files
      "@tauri-apps/plugin-fs": resolve(__dirname, "src/test/__mocks__/tauriFs.ts"),
      "@tauri-apps/api/core": resolve(__dirname, "src/test/__mocks__/tauriCore.ts"),
      "@tauri-apps/api/path": resolve(__dirname, "src/test/__mocks__/tauriApiPath.ts"),
      "@tauri-apps/plugin-opener": resolve(__dirname, "src/test/__mocks__/tauriOpener.ts"),
      "next/navigation": resolve(__dirname, "src/test/__mocks__/nextNavigation.ts"),
      "pdfmake/build/pdfmake": resolve(__dirname, "src/test/__mocks__/pdfmake.ts"),
      "pdfmake/build/vfs_fonts": resolve(__dirname, "src/test/__mocks__/pdfmakeVfsFonts.ts"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    css: {
      modules: {
        classNameStrategy: "non-scoped",
      },
    },
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/test/**",
        "src/**/*.test.{ts,tsx}",
        "src/**/*.d.ts",
      ],
    },
  },
});
