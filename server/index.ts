import http from "http";
import express, { type Request, Response, NextFunction } from "express";

// ─── Lightweight logging helper (no heavy imports) ──────────────────────────
function log(msg: string) {
  const time = new Date().toLocaleTimeString("en-US", { hour12: false });
  console.log(`${time} [express] ${msg}`);
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Health check — first thing registered, responds immediately
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((_req, res, next) => {
  res.setHeader('Strict-Transport-Security', 'max-age=31536000');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https: http:; font-src 'self' data: https:; connect-src 'self' wss: https: http:; frame-src https:; frame-ancestors 'none';");
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'same-origin');
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api") || path === "/health") {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse && path !== "/health") {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) logLine = logLine.slice(0, 79) + "…";
      log(logLine);
    }
  });

  next();
});

// ─── Start listening IMMEDIATELY ─────────────────────────────────────────────
// The server accepts connections right away. Heavy route/DB setup runs after.
// This ensures Replit's healthcheck gets a 200 from /health within milliseconds.
const port = parseInt(process.env.PORT || '5000', 10);
const httpServer = http.createServer(app);

httpServer.listen({ port, host: "0.0.0.0", reusePort: true }, () => {
  log(`serving on port ${port}`);
});

httpServer.on('error', (error: any) => {
  log(`Server listen error: ${error.message}`);
});

process.on('SIGTERM', () => {
  log('SIGTERM received, shutting down gracefully');
  httpServer.close(() => { log('Server closed'); process.exit(0); });
});

process.on('SIGINT', () => {
  log('SIGINT received, shutting down gracefully');
  httpServer.close(() => { log('Server closed'); process.exit(0); });
});

process.on('uncaughtException', (error) => {
  log(`Uncaught Exception: ${error.message}`);
});

process.on('unhandledRejection', (reason) => {
  log(`Unhandled Rejection: ${reason}`);
});

// ─── Load routes dynamically AFTER server is listening ───────────────────────
// Using dynamic import() so heavy modules (routes.ts, storage.ts, etc.) are
// NOT loaded before server.listen() — this keeps startup under ~200ms.
async function setupRoutes() {
  try {
    log("Loading routes...");

    const { registerRoutes } = await import("./routes");
    await registerRoutes(app, httpServer);

    // Global error handler
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      log(`Server error: ${status} - ${message}`);
      res.status(status).json({ message });
    });

    if (process.env.NODE_ENV === "development") {
      const { setupVite } = await import("./vite");
      await setupVite(app, httpServer);
    } else {
      const { serveStatic } = await import("./vite");
      serveStatic(app);
    }

    log("Server fully ready");
  } catch (error: any) {
    log(`Setup error: ${error.message} — retrying in 5 seconds`);
    setTimeout(setupRoutes, 5000);
  }
}

setupRoutes();
