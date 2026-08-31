import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "src"),
    },
  },
  // GitHub Pages serves at /ju-picks/ for project pages.
  // Local dev uses "/" (Vite default).
  base: process.env.GITHUB_ACTIONS ? "/ju-picks/" : "/",
  server: {
    port: 5173,
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});
