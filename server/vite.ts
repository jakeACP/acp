import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

// Known client-side SPA routes. Requests matching these patterns receive the
// index.html shell with HTTP 200. Everything else returns 404 so crawlers
// never treat unknown or deleted URLs as valid pages.
const KNOWN_SPA_ROUTES: RegExp[] = [
  /^\/$/,
  /^\/news$/,
  /^\/terms$/,
  /^\/auth$/,
  /^\/forgot-password$/,
  /^\/reset-password$/,
  /^\/political-compass$/,
  /^\/developer$/,
  // Public shareable content
  /^\/read\/[^/]+$/,
  /^\/posts\/[^/]+$/,
  /^\/signals(\/edit|\/[^/]+)?$/,
  // Directories and profiles
  /^\/elections(\/positions|\/race)?$/,
  /^\/politicians(\/handle\/[^/]+|\/[^/]+)?$/,
  /^\/candidates(\/[^/]+)?$/,
  /^\/lobbies(\/[^/]+)?$/,
  /^\/parties(\/[^/]+)?$/,
  // Auth-required routes (SPA still needs to serve shell so it can redirect)
  /^\/groups$/,
  /^\/polls(\/[^/]+)?$/,
  /^\/representatives$/,
  /^\/events$/,
  /^\/live$/,
  /^\/my-streams$/,
  /^\/friends$/,
  /^\/profile(\/[^/]+(\/friends)?)?$/,
  /^\/messages$/,
  /^\/crypto$/,
  /^\/charities(\/[^/]+)?$/,
  /^\/boycotts$/,
  /^\/whistleblowing$/,
  /^\/write(\/[^/]+)?$/,
  /^\/article\/[^/]+$/,
  /^\/initiatives(\/new|\/edit\/[^/]+|\/[^/]+)?$/,
  /^\/run-for-office$/,
  /^\/issues$/,
  /^\/political-profile$/,
  /^\/subscription$/,
  /^\/settings$/,
  /^\/privacy-settings$/,
  /^\/budget-simulator$/,
  /^\/canvassing(\/contacts)?$/,
  // Admin panel (auth-required)
  /^\/admin(\/.*)?$/,
  // Mobile interface
  /^\/mobile(\/.*)?$/,
];

function isKnownSpaRoute(pathname: string): boolean {
  return KNOWN_SPA_ROUTES.some((pattern) => pattern.test(pathname));
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    const pathname = req.path;

    // Return 404 for paths that are not known client-side routes so crawlers
    // never receive a 200 SPA shell for invalid or deleted URLs.
    if (!isKnownSpaRoute(pathname)) {
      return res.status(404).end();
    }

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(import.meta.dirname, "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // Return 404 for missing static asset files instead of serving index.html,
  // which would cause the browser to receive HTML instead of JS/CSS.
  const ASSET_EXT = /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|map|json|webp|avif|txt|xml)$/i;
  app.use("*", (req, res, next) => {
    if (ASSET_EXT.test(req.path)) {
      return res.status(404).end();
    }
    next();
  });

  // Serve index.html only for known SPA routes; return 404 for everything else
  // so crawlers never receive a 200 shell for unknown or deleted URLs.
  app.use("*", (req, res) => {
    if (!isKnownSpaRoute(req.path)) {
      return res.status(404).end();
    }
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
