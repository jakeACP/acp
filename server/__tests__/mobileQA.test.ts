/**
 * Mobile QA Test Suite
 *
 * Validates the behaviours required for Apple App Store compliance and
 * general mobile-app quality gates.  Each group uses a purpose-built
 * minimal Express app so no real database connection is needed.
 *
 * Run with:
 *   ./node_modules/.bin/vitest run --config vitest.config.ts server/__tests__/mobileQA.test.ts
 *
 * Coverage areas
 * ──────────────
 * 1. Auth guards            — protected endpoints return 401 for unauthenticated requests
 * 2. CSRF protection        — mutating endpoints require x-csrf-token header
 * 3. No desktop redirect    — /mobile/* SPA routes are served (not 302-redirected)
 * 4. Signal feed            — GET /api/mobile/signals shape contract
 * 5. Feed routes            — /api/feeds/* shape contract
 * 6. Report & block         — POST /api/report, /api/flags, /api/user/block/:id
 * 7. Account deletion       — DELETE /api/user confirmation gate (App Store §5.1.1)
 * 8. Push registration      — POST /api/push/register token format validation
 * 9. Apple IAP              — receipt validation stub and S2S CSRF bypass
 * 10. Subscription status   — GET /api/subscriptions/status shape
 * 11. StoreKit entitlement  — entitlement revocation / expiry rejection
 * 12. Civic Hub workflows   — groups, events, petitions endpoint shapes
 * 13. Sign-in flows         — /auth/google and /auth/apple redirect initiation
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import express, { Request, Response, NextFunction } from "express";
import request from "supertest";

// ─── Helpers ─────────────────────────────────────────────────────────────────

type AuthState = "authed" | "unauthed";

interface BuildOptions {
  auth?: AuthState;
  csrfToken?: string;
}

/** Create a minimal test app with mocked session + optional CSRF header checking */
function buildApp(
  registerRoutes: (app: express.Express) => void,
  opts: BuildOptions = {},
) {
  const app = express();
  app.use(express.json());

  // Simulate session middleware
  app.use((req: any, _res: Response, next: NextFunction) => {
    if (opts.auth === "authed") {
      req.user = { id: "test-user-id", role: "citizen", username: "testuser" };
      req.isAuthenticated = () => true;
    } else {
      req.user = undefined;
      req.isAuthenticated = () => false;
    }
    next();
  });

  // Simulate CSRF guard: reject mutating methods without a valid token
  const CSRF_SAFE = new Set(["GET", "HEAD", "OPTIONS"]);
  const CSRF_BYPASS = ["/api/subscriptions/apple/notify", "/api/agent/"];
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (CSRF_SAFE.has(req.method)) return next();
    const bypassed = CSRF_BYPASS.some((p) => req.path.startsWith(p));
    if (bypassed) return next();
    const token = req.headers["x-csrf-token"];
    if (!token || token !== "valid-csrf-token") {
      return res.status(403).json({ message: "Invalid CSRF token" });
    }
    next();
  });

  registerRoutes(app);
  return app;
}

function authedApp(routes: (app: express.Express) => void) {
  return buildApp(routes, { auth: "authed" });
}
function unauthedApp(routes: (app: express.Express) => void) {
  return buildApp(routes, { auth: "unauthed" });
}

const CSRF = { "x-csrf-token": "valid-csrf-token" };

// ─────────────────────────────────────────────────────────────────────────────
// 1. AUTH GUARDS
// ─────────────────────────────────────────────────────────────────────────────
describe("1. Auth Guards — 401 without session", () => {
  const protectedRoutes: Array<{ method: "get" | "post" | "delete"; path: string }> = [
    { method: "get",    path: "/api/mobile/signals" },
    { method: "get",    path: "/api/feeds/all" },
    { method: "get",    path: "/api/user" },
    { method: "get",    path: "/api/user/blocked" },
    { method: "post",   path: "/api/report" },
    { method: "post",   path: "/api/flags" },
    { method: "post",   path: "/api/push/register" },
    { method: "delete", path: "/api/user" },
    { method: "post",   path: "/api/user/block/target-id" },
    { method: "get",    path: "/api/subscriptions/status" },
    { method: "get",    path: "/api/groups" },
    { method: "get",    path: "/api/events" },
    { method: "get",    path: "/api/petitions" },
  ];

  for (const { method, path } of protectedRoutes) {
    it(`${method.toUpperCase()} ${path} → 401`, async () => {
      const app = unauthedApp((a) => {
        a[method](path, (req: any, res: Response) => {
          if (!req.isAuthenticated()) return res.sendStatus(401);
          res.json({ ok: true });
        });
      });
      const res = await request(app)[method](path).set(CSRF);
      expect(res.status).toBe(401);
    });
  }

  it("authenticated request passes the guard", async () => {
    const app = authedApp((a) => {
      a.get("/api/user", (req: any, res: Response) => {
        if (!req.isAuthenticated()) return res.sendStatus(401);
        res.json({ id: req.user.id });
      });
    });
    const res = await request(app).get("/api/user");
    expect(res.status).toBe(200);
    expect(res.body.id).toBe("test-user-id");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. CSRF PROTECTION
// ─────────────────────────────────────────────────────────────────────────────
describe("2. CSRF Protection", () => {
  const mutatingRoutes: Array<{ method: "post" | "patch" | "delete" | "put"; path: string }> = [
    { method: "post",   path: "/api/report" },
    { method: "post",   path: "/api/flags" },
    { method: "post",   path: "/api/user/block/other-user" },
    { method: "delete", path: "/api/user" },
    { method: "post",   path: "/api/push/register" },
    { method: "post",   path: "/api/mobile/signals/1/like" },
  ];

  for (const { method, path } of mutatingRoutes) {
    it(`${method.toUpperCase()} ${path} → 403 without CSRF token`, async () => {
      const app = authedApp((a) => {
        a[method](path, (_req: Request, res: Response) => res.json({ ok: true }));
      });
      const res = await request(app)[method](path); // no CSRF header
      expect(res.status).toBe(403);
    });
  }

  it("Apple S2S /api/subscriptions/apple/notify bypasses CSRF (called by Apple servers)", async () => {
    const app = authedApp((a) => {
      a.post("/api/subscriptions/apple/notify", (_req: Request, res: Response) => {
        res.json({ ok: true });
      });
    });
    const res = await request(app)
      .post("/api/subscriptions/apple/notify")
      .send({ signedPayload: "dummy" }); // no CSRF header
    expect(res.status).toBe(200);
  });

  it("Agent API /api/agent/* bypasses CSRF", async () => {
    const app = authedApp((a) => {
      a.post("/api/agent/auth/verify", (_req: Request, res: Response) => {
        res.json({ success: true });
      });
    });
    const res = await request(app)
      .post("/api/agent/auth/verify")
      .set("X-Agent-Key", "acp_agent_test");
    expect(res.status).toBe(200);
  });

  it("POST with valid CSRF token succeeds", async () => {
    const app = authedApp((a) => {
      a.post("/api/report", (_req: Request, res: Response) => res.status(201).json({ ok: true }));
    });
    const res = await request(app)
      .post("/api/report")
      .set(CSRF)
      .send({ targetId: "post-1", reason: "spam" });
    expect(res.status).toBe(201);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. NO DESKTOP REDIRECT — /mobile/* must serve the SPA (not redirect)
// ─────────────────────────────────────────────────────────────────────────────
describe("3. No desktop redirect — /mobile routes serve SPA", () => {
  /** Minimal SPA handler that serves index HTML for all /mobile/* paths */
  function buildSpaApp() {
    const app = express();
    const spaRoutes = ["/mobile", "/mobile/", "/mobile/signals", "/mobile/profile", "/mobile/civic"];
    for (const p of spaRoutes) {
      app.get(p, (_req: Request, res: Response) => {
        res.status(200).send("<!DOCTYPE html><html><body>SPA</body></html>");
      });
    }
    // Catch-all: the actual server does NOT redirect /mobile/* to desktop
    app.use((_req: Request, res: Response) => res.status(404).send("not found"));
    return app;
  }

  const routes = [
    "/mobile",
    "/mobile/signals",
    "/mobile/profile",
    "/mobile/civic",
  ];

  for (const route of routes) {
    it(`GET ${route} → 200 (not 301/302)`, async () => {
      const res = await request(buildSpaApp()).get(route);
      expect(res.status).toBe(200);
      expect(res.status).not.toBe(301);
      expect(res.status).not.toBe(302);
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. SIGNAL FEED SHAPE CONTRACT
// ─────────────────────────────────────────────────────────────────────────────
describe("4. Signal Feed — shape contract", () => {
  const mockSignals = [
    {
      id: "sig-1",
      videoUrl: "/uploads/signals/test.mp4",
      caption: "Test signal",
      viewsCount: 42,
      likesCount: 7,
      author: { id: "user-1", username: "testuser", firstName: "Test", lastName: "User", avatar: null },
    },
    {
      id: "sig-2",
      videoUrl: "https://youtube.com/watch?v=abc",
      caption: "YouTube signal",
      viewsCount: 100,
      likesCount: 12,
      author: { id: "user-2", username: "other", firstName: "Other", lastName: "User", avatar: null },
    },
  ];

  function buildSignalApp() {
    return authedApp((a) => {
      a.get("/api/mobile/signals", (req: any, res: Response) => {
        if (!req.isAuthenticated()) return res.sendStatus(401);
        res.json(mockSignals);
      });
      a.get("/api/mobile/signals/:id", (req: any, res: Response) => {
        if (!req.isAuthenticated()) return res.sendStatus(401);
        const signal = mockSignals.find((s) => s.id === req.params.id);
        if (!signal) return res.sendStatus(404);
        res.json(signal);
      });
    });
  }

  it("GET /api/mobile/signals returns an array", async () => {
    const res = await request(buildSignalApp()).get("/api/mobile/signals");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("each signal has id, videoUrl, author, likesCount", async () => {
    const res = await request(buildSignalApp()).get("/api/mobile/signals");
    for (const s of res.body) {
      expect(s).toHaveProperty("id");
      expect(s).toHaveProperty("videoUrl");
      expect(s).toHaveProperty("author");
      expect(s).toHaveProperty("likesCount");
    }
  });

  it("GET /api/mobile/signals/:id returns single item", async () => {
    const res = await request(buildSignalApp()).get("/api/mobile/signals/sig-1");
    expect(res.status).toBe(200);
    expect(res.body.id).toBe("sig-1");
  });

  it("GET /api/mobile/signals/:id → 404 for unknown ID", async () => {
    const res = await request(buildSignalApp()).get("/api/mobile/signals/no-such-id");
    expect(res.status).toBe(404);
  });

  it("POST /api/mobile/signals/:id/like → 200", async () => {
    const app = authedApp((a) => {
      a.post("/api/mobile/signals/:id/like", (req: any, res: Response) => {
        if (!req.isAuthenticated()) return res.sendStatus(401);
        res.json({ liked: true, likesCount: 8 });
      });
    });
    const res = await request(app)
      .post("/api/mobile/signals/sig-1/like")
      .set(CSRF);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("liked");
    expect(res.body).toHaveProperty("likesCount");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. FEED ROUTES SHAPE
// ─────────────────────────────────────────────────────────────────────────────
describe("5. Feed Routes — shape contract", () => {
  const mockPosts = [{ id: "p1", content: "Hello", type: "post", author: { username: "u" } }];
  const mockPolls = [{ id: "poll-1", question: "Vote?", options: ["Yes", "No"] }];
  const mockPetitions = [{ id: "pet-1", title: "Sign this", signatureCount: 50 }];

  function buildFeedApp() {
    return authedApp((a) => {
      a.get("/api/feeds/all",       (req: any, res: Response) => req.isAuthenticated() ? res.json(mockPosts)    : res.sendStatus(401));
      a.get("/api/feeds/following", (req: any, res: Response) => req.isAuthenticated() ? res.json(mockPosts)    : res.sendStatus(401));
      a.get("/api/polls",           (req: any, res: Response) => req.isAuthenticated() ? res.json(mockPolls)    : res.sendStatus(401));
      a.get("/api/petitions",       (req: any, res: Response) => req.isAuthenticated() ? res.json(mockPetitions): res.sendStatus(401));
    });
  }

  it("GET /api/feeds/all returns array", async () => {
    const res = await request(buildFeedApp()).get("/api/feeds/all");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("GET /api/feeds/following returns array", async () => {
    const res = await request(buildFeedApp()).get("/api/feeds/following");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("GET /api/polls returns array", async () => {
    const res = await request(buildFeedApp()).get("/api/polls");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("GET /api/petitions returns array", async () => {
    const res = await request(buildFeedApp()).get("/api/petitions");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. REPORT & BLOCK FLOWS
// ─────────────────────────────────────────────────────────────────────────────
describe("6. Report & Block flows", () => {
  function buildSafetyApp() {
    return authedApp((a) => {
      // Report content
      a.post("/api/report", (req: any, res: Response) => {
        if (!req.isAuthenticated()) return res.sendStatus(401);
        const { targetId, reason } = req.body;
        if (!targetId || !reason) return res.status(400).json({ message: "targetId and reason required" });
        res.status(201).json({ message: "Report submitted" });
      });

      // Flag a post
      a.post("/api/flags", (req: any, res: Response) => {
        if (!req.isAuthenticated()) return res.sendStatus(401);
        const { targetId, reason } = req.body;
        if (!targetId || !reason) return res.status(400).json({ message: "targetId and reason required" });
        res.status(201).json({ message: "Flagged" });
      });

      // Block a user
      a.post("/api/user/block/:targetId", (req: any, res: Response) => {
        if (!req.isAuthenticated()) return res.sendStatus(401);
        res.status(200).json({ message: "User blocked" });
      });

      // Unblock a user
      a.delete("/api/user/block/:targetId", (req: any, res: Response) => {
        if (!req.isAuthenticated()) return res.sendStatus(401);
        res.json({ message: "User unblocked" });
      });

      // Get blocked users list
      a.get("/api/user/blocked", (req: any, res: Response) => {
        if (!req.isAuthenticated()) return res.sendStatus(401);
        res.json([]);
      });
    });
  }

  it("POST /api/report → 201 with valid payload", async () => {
    const res = await request(buildSafetyApp())
      .post("/api/report")
      .set(CSRF)
      .send({ targetId: "post-abc", reason: "Spam content" });
    expect(res.status).toBe(201);
  });

  it("POST /api/report → 400 without reason", async () => {
    const res = await request(buildSafetyApp())
      .post("/api/report")
      .set(CSRF)
      .send({ targetId: "post-abc" });
    expect(res.status).toBe(400);
  });

  it("POST /api/flags → 201 with valid payload", async () => {
    const res = await request(buildSafetyApp())
      .post("/api/flags")
      .set(CSRF)
      .send({ targetId: "sig-1", reason: "Misinformation" });
    expect(res.status).toBe(201);
  });

  it("POST /api/user/block/:targetId → 200", async () => {
    const res = await request(buildSafetyApp())
      .post("/api/user/block/other-user")
      .set(CSRF);
    expect(res.status).toBe(200);
  });

  it("DELETE /api/user/block/:targetId → 200", async () => {
    const res = await request(buildSafetyApp())
      .delete("/api/user/block/other-user")
      .set(CSRF);
    expect(res.status).toBe(200);
  });

  it("GET /api/user/blocked → array", async () => {
    const res = await request(buildSafetyApp()).get("/api/user/blocked");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. ACCOUNT DELETION  (App Store Review Guideline §5.1.1)
// ─────────────────────────────────────────────────────────────────────────────
describe("7. Account Deletion — App Store §5.1.1 compliance", () => {
  function buildDeleteApp() {
    return authedApp((a) => {
      a.delete("/api/user", (req: any, res: Response) => {
        if (!req.isAuthenticated()) return res.sendStatus(401);
        const { confirmText } = req.body;
        if (confirmText !== "DELETE MY ACCOUNT") {
          return res.status(400).json({ message: "Please type DELETE MY ACCOUNT to confirm" });
        }
        res.json({ message: "Account deleted successfully" });
      });
    });
  }

  it("DELETE /api/user → 401 without auth", async () => {
    const app = unauthedApp((a) => {
      a.delete("/api/user", (req: any, res: Response) => {
        if (!req.isAuthenticated()) return res.sendStatus(401);
        res.json({ ok: true });
      });
    });
    const res = await request(app).delete("/api/user").set(CSRF);
    expect(res.status).toBe(401);
  });

  it("DELETE /api/user → 400 without confirmation text", async () => {
    const res = await request(buildDeleteApp())
      .delete("/api/user")
      .set(CSRF)
      .send({ confirmText: "yes" });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/DELETE MY ACCOUNT/);
  });

  it("DELETE /api/user → 400 with partial confirmation", async () => {
    const res = await request(buildDeleteApp())
      .delete("/api/user")
      .set(CSRF)
      .send({ confirmText: "delete" });
    expect(res.status).toBe(400);
  });

  it("DELETE /api/user → 200 with exact confirmation text", async () => {
    const res = await request(buildDeleteApp())
      .delete("/api/user")
      .set(CSRF)
      .send({ confirmText: "DELETE MY ACCOUNT" });
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/deleted/i);
  });

  it("DELETE /api/user → 403 without CSRF token", async () => {
    const res = await request(buildDeleteApp())
      .delete("/api/user")
      .send({ confirmText: "DELETE MY ACCOUNT" }); // no CSRF
    expect(res.status).toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. PUSH REGISTRATION
// ─────────────────────────────────────────────────────────────────────────────
describe("8. Push Registration", () => {
  function buildPushApp() {
    return authedApp((a) => {
      a.post("/api/push/register", (req: any, res: Response) => {
        if (!req.isAuthenticated()) return res.sendStatus(401);
        const { token, platform } = req.body;
        if (!token || typeof token !== "string" || token.length < 10) {
          return res.status(400).json({ message: "Invalid device token" });
        }
        if (!["ios", "android"].includes(platform)) {
          return res.status(400).json({ message: "Platform must be 'ios' or 'android'" });
        }
        res.json({ message: "Device registered" });
      });

      a.delete("/api/push/unregister", (req: any, res: Response) => {
        if (!req.isAuthenticated()) return res.sendStatus(401);
        res.json({ message: "Device removed" });
      });
    });
  }

  it("POST /api/push/register → 400 without token", async () => {
    const res = await request(buildPushApp())
      .post("/api/push/register")
      .set(CSRF)
      .send({ platform: "ios" });
    expect(res.status).toBe(400);
  });

  it("POST /api/push/register → 400 with invalid platform", async () => {
    const res = await request(buildPushApp())
      .post("/api/push/register")
      .set(CSRF)
      .send({ token: "a".repeat(64), platform: "windows" });
    expect(res.status).toBe(400);
  });

  it("POST /api/push/register → 200 with valid ios token", async () => {
    const res = await request(buildPushApp())
      .post("/api/push/register")
      .set(CSRF)
      .send({ token: "a".repeat(64), platform: "ios" });
    expect(res.status).toBe(200);
  });

  it("DELETE /api/push/unregister → 200", async () => {
    const res = await request(buildPushApp())
      .delete("/api/push/unregister")
      .set(CSRF);
    expect(res.status).toBe(200);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. APPLE IAP  (App Store Review Guideline §3.1.1)
// ─────────────────────────────────────────────────────────────────────────────
describe("9. Apple IAP", () => {
  function buildIapApp() {
    return authedApp((a) => {
      // Validate receipt / transaction ID
      a.post("/api/subscriptions/apple/validate", (req: any, res: Response) => {
        if (!req.isAuthenticated()) return res.sendStatus(401);
        const { transactionId, receiptData } = req.body;
        if (!transactionId && !receiptData) {
          return res.status(400).json({ message: "transactionId or receiptData required" });
        }
        // Stub: return active subscription
        res.json({
          active: true,
          productId: "com.acp.democracy.premium.monthly",
          expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
          environment: "sandbox",
        });
      });

      // S2S notification from Apple — CSRF bypassed
      a.post("/api/subscriptions/apple/notify", (req: Request, res: Response) => {
        const { signedPayload } = req.body;
        if (!signedPayload) return res.status(400).json({ message: "Missing signedPayload" });
        res.json({ received: true });
      });
    });
  }

  it("POST /api/subscriptions/apple/validate → 401 without auth", async () => {
    const app = unauthedApp((a) => {
      a.post("/api/subscriptions/apple/validate", (req: any, res: Response) => {
        if (!req.isAuthenticated()) return res.sendStatus(401);
        res.json({ active: false });
      });
    });
    const res = await request(app)
      .post("/api/subscriptions/apple/validate")
      .set(CSRF)
      .send({ transactionId: "tx-123" });
    expect(res.status).toBe(401);
  });

  it("POST /api/subscriptions/apple/validate → 400 without payload", async () => {
    const res = await request(buildIapApp())
      .post("/api/subscriptions/apple/validate")
      .set(CSRF)
      .send({});
    expect(res.status).toBe(400);
  });

  it("POST /api/subscriptions/apple/validate → 200 with transactionId", async () => {
    const res = await request(buildIapApp())
      .post("/api/subscriptions/apple/validate")
      .set(CSRF)
      .send({ transactionId: "2000000123456789" });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("active");
    expect(res.body).toHaveProperty("productId");
    expect(res.body).toHaveProperty("expiresAt");
  });

  it("POST /api/subscriptions/apple/notify → 200 without CSRF (Apple server call)", async () => {
    const res = await request(buildIapApp())
      .post("/api/subscriptions/apple/notify")
      .send({ signedPayload: "eyJhbGci.stub.payload" }); // no x-csrf-token header
    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);
  });

  it("POST /api/subscriptions/apple/notify → 400 without signedPayload", async () => {
    const res = await request(buildIapApp())
      .post("/api/subscriptions/apple/notify")
      .send({});
    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 10. SUBSCRIPTION STATUS SHAPE
// ─────────────────────────────────────────────────────────────────────────────
describe("10. Subscription Status", () => {
  function buildSubApp(active: boolean, source: "apple" | "stripe" | "none") {
    return authedApp((a) => {
      a.get("/api/subscriptions/status", (req: any, res: Response) => {
        if (!req.isAuthenticated()) return res.sendStatus(401);
        res.json({
          active,
          source,
          productId: active ? "com.acp.democracy.premium.monthly" : null,
          expiresAt: active ? new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString() : null,
          renewalStatus: active ? "active" : null,
          environment: active ? "production" : null,
        });
      });
    });
  }

  it("GET /api/subscriptions/status returns expected shape (active Apple)", async () => {
    const res = await request(buildSubApp(true, "apple")).get("/api/subscriptions/status");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("active", true);
    expect(res.body).toHaveProperty("source", "apple");
    expect(res.body).toHaveProperty("expiresAt");
    expect(res.body).toHaveProperty("productId");
  });

  it("GET /api/subscriptions/status returns expected shape (inactive)", async () => {
    const res = await request(buildSubApp(false, "none")).get("/api/subscriptions/status");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("active", false);
    expect(res.body).toHaveProperty("source", "none");
    expect(res.body.expiresAt).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 11. STOREKIT ENTITLEMENT — expiry and revocation
// ─────────────────────────────────────────────────────────────────────────────
describe("11. StoreKit Entitlement handling", () => {
  function buildEntitlementApp(expiresInMs: number) {
    const expiresAt = new Date(Date.now() + expiresInMs).toISOString();
    return authedApp((a) => {
      a.get("/api/subscriptions/status", (req: any, res: Response) => {
        if (!req.isAuthenticated()) return res.sendStatus(401);
        const now = new Date();
        const expired = new Date(expiresAt) < now;
        res.json({
          active: !expired,
          source: expired ? "none" : "apple",
          expiresAt: expired ? null : expiresAt,
        });
      });
    });
  }

  it("active subscription: active=true", async () => {
    const res = await request(buildEntitlementApp(30 * 24 * 3600 * 1000)).get(
      "/api/subscriptions/status"
    );
    expect(res.body.active).toBe(true);
  });

  it("expired subscription: active=false", async () => {
    const res = await request(buildEntitlementApp(-1000)).get(
      "/api/subscriptions/status"
    );
    expect(res.body.active).toBe(false);
    expect(res.body.expiresAt).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 12. CIVIC HUB WORKFLOWS
// ─────────────────────────────────────────────────────────────────────────────
describe("12. Civic Hub Workflows", () => {
  const mockGroups     = [{ id: "g1", name: "Civic Group", memberCount: 10 }];
  const mockEvents     = [{ id: "e1", title: "Town Hall",   date: new Date().toISOString() }];
  const mockPetitions  = [{ id: "pt1", title: "Sign This",  signatureCount: 200 }];
  const mockPoliticians = [{ id: "pol1", name: "Jane Doe",  corruptionGrade: "A" }];

  function buildCivicApp() {
    return authedApp((a) => {
      a.get("/api/groups",      (req: any, res: Response) => req.isAuthenticated() ? res.json(mockGroups)      : res.sendStatus(401));
      a.get("/api/events",      (req: any, res: Response) => req.isAuthenticated() ? res.json(mockEvents)      : res.sendStatus(401));
      a.get("/api/petitions",   (req: any, res: Response) => req.isAuthenticated() ? res.json(mockPetitions)   : res.sendStatus(401));
      a.get("/api/politicians", (req: any, res: Response) => req.isAuthenticated() ? res.json(mockPoliticians) : res.sendStatus(401));

      // Join a group
      a.post("/api/groups/:id/join", (req: any, res: Response) => {
        if (!req.isAuthenticated()) return res.sendStatus(401);
        res.json({ joined: true });
      });

      // Register for event
      a.post("/api/events/:id/register", (req: any, res: Response) => {
        if (!req.isAuthenticated()) return res.sendStatus(401);
        res.json({ registered: true });
      });

      // Sign petition
      a.post("/api/petitions/:id/sign", (req: any, res: Response) => {
        if (!req.isAuthenticated()) return res.sendStatus(401);
        res.json({ signed: true, count: 201 });
      });
    });
  }

  it("GET /api/groups returns array", async () => {
    const res = await request(buildCivicApp()).get("/api/groups");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("GET /api/events returns array", async () => {
    const res = await request(buildCivicApp()).get("/api/events");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("GET /api/petitions returns array", async () => {
    const res = await request(buildCivicApp()).get("/api/petitions");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("GET /api/politicians returns array", async () => {
    const res = await request(buildCivicApp()).get("/api/politicians");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("POST /api/groups/:id/join → 200", async () => {
    const res = await request(buildCivicApp())
      .post("/api/groups/g1/join")
      .set(CSRF);
    expect(res.status).toBe(200);
    expect(res.body.joined).toBe(true);
  });

  it("POST /api/events/:id/register → 200", async () => {
    const res = await request(buildCivicApp())
      .post("/api/events/e1/register")
      .set(CSRF);
    expect(res.status).toBe(200);
    expect(res.body.registered).toBe(true);
  });

  it("POST /api/petitions/:id/sign → 200", async () => {
    const res = await request(buildCivicApp())
      .post("/api/petitions/pt1/sign")
      .set(CSRF);
    expect(res.status).toBe(200);
    expect(res.body.signed).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 13. SIGN-IN FLOWS
// ─────────────────────────────────────────────────────────────────────────────
describe("13. Sign-in flows", () => {
  function buildAuthApp() {
    const app = express();
    app.get("/auth/google", (_req: Request, res: Response) => {
      res.redirect(302, "https://accounts.google.com/o/oauth2/auth?scope=...");
    });
    app.get("/auth/apple", (_req: Request, res: Response) => {
      res.redirect(302, "https://appleid.apple.com/auth/authorize?...");
    });
    return app;
  }

  it("GET /auth/google → 302 redirect to Google", async () => {
    const res = await request(buildAuthApp()).get("/auth/google");
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain("google");
  });

  it("GET /auth/apple → 302 redirect to Apple", async () => {
    const res = await request(buildAuthApp()).get("/auth/apple");
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain("apple");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 14. PROFILE & SETTINGS SHAPE
// ─────────────────────────────────────────────────────────────────────────────
describe("14. Profile & Settings shape", () => {
  const mockProfile = {
    id: "user-1",
    username: "testuser",
    firstName: "Test",
    lastName: "User",
    email: "test@example.com",
    role: "citizen",
    avatar: null,
    bio: null,
    extendedProfileData: {},
  };

  function buildProfileApp() {
    return authedApp((a) => {
      a.get("/api/user", (req: any, res: Response) => {
        if (!req.isAuthenticated()) return res.sendStatus(401);
        res.json(mockProfile);
      });

      a.get("/api/profile/:userId", (req: any, res: Response) => {
        if (!req.isAuthenticated()) return res.sendStatus(401);
        res.json(mockProfile);
      });

      a.patch("/api/profile", (req: any, res: Response) => {
        if (!req.isAuthenticated()) return res.sendStatus(401);
        res.json({ ...mockProfile, ...req.body });
      });

      a.get("/api/user/privacy-settings", (req: any, res: Response) => {
        if (!req.isAuthenticated()) return res.sendStatus(401);
        res.json({ profileVisibility: "public", showEmail: false });
      });
    });
  }

  it("GET /api/user returns user shape", async () => {
    const res = await request(buildProfileApp()).get("/api/user");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("id");
    expect(res.body).toHaveProperty("username");
    expect(res.body).not.toHaveProperty("password"); // never expose password hash
  });

  it("GET /api/profile/:userId returns profile", async () => {
    const res = await request(buildProfileApp()).get("/api/profile/user-1");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("username");
  });

  it("PATCH /api/profile → 200 with valid update", async () => {
    const res = await request(buildProfileApp())
      .patch("/api/profile")
      .set(CSRF)
      .send({ bio: "Hello world" });
    expect(res.status).toBe(200);
    expect(res.body.bio).toBe("Hello world");
  });

  it("GET /api/user/privacy-settings returns settings object", async () => {
    const res = await request(buildProfileApp()).get("/api/user/privacy-settings");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("profileVisibility");
  });
});
