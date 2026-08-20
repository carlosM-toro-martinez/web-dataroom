import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://minmartesrl.com",
  outDir: "../dist-public",
  publicDir: "./public",
  build: {
    format: "directory"
  }
});
