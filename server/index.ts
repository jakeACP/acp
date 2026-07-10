import http from "http";
import express, { type Request, Response, NextFunction } from "express";

// ─── Lightweight logging helper (no heavy imports) ──────────────────────────
function log(msg: string) {
  const time = new Date().toLocaleTimeString("en-US", { hour12: false });
  console.log(`${time} [express] ${msg}`);
}

const app = express();
app.disable('x-powered-by');       // Don't leak "Express" in Server header
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: false, limit: "5mb" }));

// Health check — first thing registered, responds immediately regardless of
// whether routes have finished loading.
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Remove unsafe-eval in production (Vite needs it in dev for HMR, but not at runtime).
const _isDev = process.env.NODE_ENV !== 'production';
app.use((_req, res, next) => {
  // HSTS — 2-year max-age, include subdomains
  res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains');

  // CSP — unsafe-eval only in dev; Stripe script allowed; bare http: removed from connect-src/img-src
  const scriptSrc = _isDev
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://www.youtube.com https://s.ytimg.com https://www.tiktok.com"
    : "script-src 'self' 'unsafe-inline' https://js.stripe.com https://www.youtube.com https://s.ytimg.com https://www.tiktok.com";
  res.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",   // https: covers YouTube thumbs, avatars, etc.
    "media-src 'self' blob:",
    "font-src 'self' data: https:",
    "connect-src 'self' wss: https:",      // bare http: removed — all API calls use HTTPS in prod
    "frame-src https:",
    "frame-ancestors 'none'",
    "object-src 'none'",                   // block Flash / legacy plugin execution
    "base-uri 'self'",                     // prevent <base href> hijacking
  ].join('; '));

  // Belt-and-suspenders framing protection (honoured by browsers that ignore CSP frame-ancestors)
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  // Disable unused powerful features; camera/mic allowed (self) for Signal recorder
  res.setHeader(
    'Permissions-Policy',
    'camera=(self), microphone=(self), geolocation=(self), payment=(self), ' +
    'usb=(), bluetooth=(), accelerometer=(), gyroscope=(), magnetometer=()',
  );
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

// ─── Startup guard ────────────────────────────────────────────────────────────
// During the ~4s window between listen() and setupRoutes() completing, return
// 503 with Retry-After so Replit's load balancer waits instead of declaring the
// server dead and returning 502 to users.
let serverReady = false;
app.use((_req, res, next) => {
  if (serverReady) return next();
  res.setHeader('Retry-After', '5');
  res.status(503).json({ message: 'Server is starting, please retry shortly.' });
});

// ─── Start listening IMMEDIATELY ─────────────────────────────────────────────
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
async function setupRoutes() {
  try {
    log("Loading routes...");

    const { registerRoutes } = await import("./routes");
    await registerRoutes(app, httpServer);

    // Seed FY 2024 CBO baseline if not already seeded
    try {
      const { seedFY2024Baseline } = await import("./budget-seed");
      await seedFY2024Baseline();
    } catch (e: any) {
      log(`Budget seed skipped: ${e.message}`);
    }

    // Seed top 35 lobbying organizations if not already seeded
    try {
      const { seedLobbies } = await import("./lobby-seed");
      await seedLobbies();
    } catch (e: any) {
      log(`Lobby seed skipped: ${e.message}`);
    }

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

    // Sync admin password to ADMIN_PASSPHRASE secret on every startup
    if (process.env.ADMIN_PASSPHRASE) {
      try {
        const { storage } = await import("./storage");
        const { hashPassword } = await import("./auth");
        const adminUser = await storage.getUserByUsername("admin");
        if (adminUser) {
          const hashed = await hashPassword(process.env.ADMIN_PASSPHRASE);
          await storage.updateUserPassword(adminUser.id, hashed);
          log("Admin password synced to ADMIN_PASSPHRASE secret");
        }
      } catch (e: any) {
        log(`Admin password sync skipped: ${e.message}`);
      }
    }

    // One-time data migration: fix legacy emails and ensure consistent accounts
    try {
      const { db } = await import("./db");
      const { users } = await import("@shared/schema");
      const { eq, and, ne } = await import("drizzle-orm");

      // 1. Update seeded admin email from old domain to official domain
      await db.update(users)
        .set({ email: "admin@anticorruptionparty.us" })
        .where(and(eq(users.username, "admin"), eq(users.email, "admin@acp.org")));

      // 2. Clear jakeoxendalemn@gmail.com from ANY non-jox account so jox can own it
      await db.update(users)
        .set({ email: "legacy-owner@anticorruptionparty.us" })
        .where(and(eq(users.email, "jakeoxendalemn@gmail.com"), ne(users.username, "jox")));

      // 3. Set jox's canonical email
      const [joxUser] = await db.select({ id: users.id, email: users.email })
        .from(users)
        .where(eq(users.username, "jox"))
        .limit(1);
      if (joxUser && joxUser.email !== "jakeoxendalemn@gmail.com") {
        await db.update(users)
          .set({ email: "jakeoxendalemn@gmail.com" })
          .where(eq(users.username, "jox"));
      }
      log("Account email migration completed");
    } catch (e: any) {
      log(`Account email migration skipped: ${e.message}`);
    }

    // Mark server ready — the 503 startup guard will now pass all requests through
    serverReady = true;
    log("Server fully ready");
  } catch (error: any) {
    log(`Setup error: ${error.message} — retrying in 5 seconds`);
    setTimeout(setupRoutes, 5000);
  }
}

setupRoutes();
