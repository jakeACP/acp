import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    modulePreload: {
      resolveDependencies(_filename, deps, _context) {
        return deps.filter(
          (dep) => !dep.includes("chunk-admin") && !dep.includes("chunk-mobile"),
        );
      },
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          // NOTE: Do NOT split node_modules into multiple vendor chunks.
          // Splitting React away from libraries that mutate/extend it at
          // module-init time causes "Cannot set properties of undefined
          // (setting 'Children')" in production builds due to chunk
          // initialization order. Keep all vendor code in one chunk.
          if (!id.includes("node_modules")) {
            if (id.includes("/pages/admin-")) return "chunk-admin";
            if (id.includes("/mobile/")) return "chunk-mobile";
            return undefined;
          }
          return "vendor";
        },
      },
    },
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
    allowedHosts: [
      process.env.REPLIT_DOMAINS?.split(" ")[0] || "888678e3-7e74-47f8-80ca-e096b7841909-00-1zddd18z56jgm.worf.replit.dev",
    ],
  },
});
