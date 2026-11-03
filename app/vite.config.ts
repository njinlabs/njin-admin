import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

// njin serves the build itself under /_admin (same origin), so every asset URL carries that
// prefix. In dev this app is its own server and forwards /api, /img and /uploads to the njin server.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const api = env.VITE_API_URL || "http://localhost:3000";

  return {
    base: "/_admin/",
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { "@": path.resolve(import.meta.dirname, "./src") },
    },
    server: {
      proxy: { "/api": api, "/img": api, "/uploads": api },
    },
  };
});
