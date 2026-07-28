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
          if (!id.includes("node_modules")) {
            if (id.includes("/pages/admin-")) return "chunk-admin";
            if (id.includes("/mobile/")) return "chunk-mobile";
            return undefined;
          }

          if (
            id.includes("react-dom") ||
            id.includes("/react/") ||
            id.includes("/react.") ||
            id.includes("scheduler") ||
            id.includes("react-is")
          ) {
            return "vendor-react";
          }
          if (id.includes("lucide-react")) {
            return "vendor-icons";
          }
          if (id.includes("framer-motion")) {
            return "vendor-motion";
          }
          if (id.includes("leaflet")) {
            return "vendor-maps";
          }
          if (
            id.includes("prosemirror") ||
            id.includes("@tiptap") ||
            id.includes("@codemirror")
          ) {
            return "vendor-editor";
          }
          if (id.includes("date-fns") || id.includes("dayjs") || id.includes("moment")) {
            return "vendor-dates";
          }
          if (id.includes("lodash")) {
            return "vendor-lodash";
          }
          if (
            id.includes("@radix-ui") ||
            id.includes("class-variance-authority") ||
            id.includes("clsx") ||
            id.includes("tailwind-merge") ||
            id.includes("cmdk") ||
            id.includes("vaul") ||
            id.includes("sonner") ||
            id.includes("embla")
          ) {
            return "vendor-ui";
          }
          if (
            id.includes("@hookform") ||
            id.includes("react-hook-form") ||
            id.includes("zod")
          ) {
            return "vendor-forms";
          }
          if (id.includes("@tanstack") || id.includes("react-query")) {
            return "vendor-query";
          }
          if (
            id.includes("recharts") ||
            id.includes("d3-") ||
            id.includes("victory")
          ) {
            return "vendor-charts";
          }
          if (id.includes("@stripe") || id.includes("/stripe/")) {
            return "vendor-stripe";
          }
          if (id.includes("@capacitor")) {
            return "vendor-capacitor";
          }

          return "vendor-misc";
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
