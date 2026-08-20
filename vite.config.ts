import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

function versionServiceWorkerPlugin() {
  let resolvedOutDir = "dist";
  return {
    name: "version-service-worker",
    apply: "build" as const,
    configResolved(config: { build: { outDir: string }; root: string }) {
      resolvedOutDir = resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      const serviceWorkerPath = resolve(resolvedOutDir, "sw.js");
      if (!existsSync(serviceWorkerPath)) return;

      const source = readFileSync(serviceWorkerPath, "utf8");
      const buildVersion = `${Date.now()}`;
      writeFileSync(
        serviceWorkerPath,
        source.replaceAll("__BUILD_VERSION__", buildVersion),
        "utf8"
      );
    }
  };
}

export default defineConfig(({ command }) => ({
  base: command === "build" ? "/app/" : "/",
  build: {
    chunkSizeWarningLimit: 2500
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true
      }
    }
  },
  plugins: [react(), versionServiceWorkerPlugin()],
  resolve: {
    alias: {
      "@": "/src"
    }
  }
}));
