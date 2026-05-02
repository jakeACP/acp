import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import { createHash } from "crypto";

vi.mock("../storage", () => ({
  storage: {
    findAgentApiKeyByHash: vi.fn(),
    createAgentLog: vi.fn().mockResolvedValue({ id: "log-id" }),
    touchAgentApiKey: vi.fn().mockResolvedValue(undefined),
    listAgentLogs: vi.fn().mockResolvedValue([]),
  },
}));

import {
  agentApiAuth,
  requireAgentPermission,
  hasAgentPermission,
  generateRawAgentKey,
} from "../agentAuth";
import { storage } from "../storage";

function sha256(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

function makeAgentKey(overrides: Record<string, unknown> = {}) {
  return {
    id: "test-key-id",
    name: "Test Agent",
    keyHash: "",
    keyPrefix: "acp_agent_",
    role: "news_agent",
    permissions: { "articles:create": true, "logs:read": true },
    rateLimit: 100,
    sandboxMode: false,
    status: "active",
    createdBy: "user-id",
    createdAt: new Date(),
    lastUsedAt: null,
    revokedAt: null,
    ...overrides,
  };
}

function buildApp(extraRoutes?: (app: express.Express) => void) {
  const app = express();
  app.use(express.json());

  app.post("/api/agent/auth/verify", agentApiAuth, (req, res) => {
    res.json({ success: true, agentKey: (req as any).agentKey?.id });
  });

  app.get(
    "/api/agent/logs",
    agentApiAuth,
    requireAgentPermission("logs:read"),
    (_req, res) => {
      res.json({ success: true, logs: [] });
    }
  );

  app.post(
    "/api/agent/articles/create",
    agentApiAuth,
    requireAgentPermission("articles:create"),
    (_req, res) => {
      res.status(201).json({ success: true });
    }
  );

  app.post(
    "/api/agent/users/ban",
    agentApiAuth,
    requireAgentPermission("users:ban"),
    (_req, res) => {
      res.json({ success: true });
    }
  );

  app.get("/api/v1/posts", (req, res) => {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing Authorization header. Use: Authorization: Bearer <api_key>" });
    }
    res.json({ posts: [] });
  });

  if (extraRoutes) extraRoutes(app);

  return app;
}

describe("generateRawAgentKey", () => {
  it("generates keys with the acp_agent_ prefix followed by 64 hex chars", () => {
    const key = generateRawAgentKey();
    expect(key).toMatch(/^acp_agent_[a-f0-9]{64}$/);
  });

  it("generates unique keys on every call", () => {
    const keys = new Set(Array.from({ length: 10 }, () => generateRawAgentKey()));
    expect(keys.size).toBe(10);
  });
});

describe("hasAgentPermission helper", () => {
  it("returns true when the permission is explicitly granted", () => {
    const key = makeAgentKey({ permissions: { "articles:create": true } }) as any;
    expect(hasAgentPermission(key, "articles:create")).toBe(true);
  });

  it("returns false when the permission is absent", () => {
    const key = makeAgentKey({ permissions: {} }) as any;
    expect(hasAgentPermission(key, "users:ban")).toBe(false);
  });

  it("returns false when the permission is explicitly set to false", () => {
    const key = makeAgentKey({ permissions: { "articles:create": false } }) as any;
    expect(hasAgentPermission(key, "articles:create")).toBe(false);
  });

  it("grants every permission when system:admin is true", () => {
    const key = makeAgentKey({ permissions: { "system:admin": true } }) as any;
    expect(hasAgentPermission(key, "users:ban")).toBe(true);
    expect(hasAgentPermission(key, "elections:write")).toBe(true);
    expect(hasAgentPermission(key, "security:scan")).toBe(true);
  });
});

describe("agentApiAuth middleware — authentication", () => {
  let app: express.Express;
  let rawKey: string;

  beforeEach(() => {
    vi.clearAllMocks();
    (storage.createAgentLog as any).mockResolvedValue({ id: "log-id" });
    (storage.touchAgentApiKey as any).mockResolvedValue(undefined);
    rawKey = generateRawAgentKey();
    app = buildApp();
  });

  it("returns 401 when X-Agent-Key header is missing entirely", async () => {
    const res = await request(app).post("/api/agent/auth/verify").send({});
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.errors[0].message).toMatch(/Missing X-Agent-Key/i);
  });

  it("returns 401 when X-Agent-Key header is an empty string", async () => {
    const res = await request(app)
      .post("/api/agent/auth/verify")
      .set("X-Agent-Key", "   ")
      .send({});
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("returns 401 for an unrecognised (invalid) key", async () => {
    (storage.findAgentApiKeyByHash as any).mockResolvedValue(undefined);
    const res = await request(app)
      .post("/api/agent/auth/verify")
      .set("X-Agent-Key", "acp_agent_notarealkey")
      .send({});
    expect(res.status).toBe(401);
    expect(res.body.errors[0].message).toMatch(/Invalid or revoked/i);
  });

  it("returns 200 and attaches agentKey to the request for a valid key", async () => {
    const key = makeAgentKey({ keyHash: sha256(rawKey) });
    (storage.findAgentApiKeyByHash as any).mockResolvedValue(key);

    const res = await request(app)
      .post("/api/agent/auth/verify")
      .set("X-Agent-Key", rawKey)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.agentKey).toBe("test-key-id");
  });

  it("writes an audit log when authentication fails", async () => {
    (storage.findAgentApiKeyByHash as any).mockResolvedValue(undefined);
    await request(app)
      .post("/api/agent/auth/verify")
      .set("X-Agent-Key", "acp_agent_bad")
      .send({});

    await new Promise((r) => setTimeout(r, 30));
    expect(storage.createAgentLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "auth", success: false, status: "error" })
    );
  });

  it("updates lastUsedAt on every successful authentication", async () => {
    const key = makeAgentKey({ keyHash: sha256(rawKey) });
    (storage.findAgentApiKeyByHash as any).mockResolvedValue(key);

    await request(app)
      .post("/api/agent/auth/verify")
      .set("X-Agent-Key", rawKey)
      .send({});

    await new Promise((r) => setTimeout(r, 30));
    expect(storage.touchAgentApiKey).toHaveBeenCalledWith("test-key-id");
  });

  it("looks up the key by the SHA-256 hash of the raw key, not the raw value", async () => {
    const key = makeAgentKey({ keyHash: sha256(rawKey) });
    (storage.findAgentApiKeyByHash as any).mockResolvedValue(key);

    await request(app)
      .post("/api/agent/auth/verify")
      .set("X-Agent-Key", rawKey)
      .send({});

    expect(storage.findAgentApiKeyByHash).toHaveBeenCalledWith(sha256(rawKey));
  });
});

describe("agentApiAuth middleware — revocation", () => {
  let app: express.Express;
  let rawKey: string;

  beforeEach(() => {
    vi.clearAllMocks();
    (storage.createAgentLog as any).mockResolvedValue({ id: "log-id" });
    (storage.touchAgentApiKey as any).mockResolvedValue(undefined);
    rawKey = generateRawAgentKey();
    app = buildApp();
  });

  it("returns 401 when the key has been revoked (storage returns undefined for revoked keys)", async () => {
    (storage.findAgentApiKeyByHash as any).mockResolvedValue(undefined);

    const res = await request(app)
      .post("/api/agent/auth/verify")
      .set("X-Agent-Key", rawKey)
      .send({});

    expect(res.status).toBe(401);
    expect(res.body.errors[0].message).toMatch(/Invalid or revoked/i);
  });

  it("writes an audit log when a revoked key is used", async () => {
    (storage.findAgentApiKeyByHash as any).mockResolvedValue(undefined);

    await request(app)
      .post("/api/agent/auth/verify")
      .set("X-Agent-Key", rawKey)
      .send({});

    await new Promise((r) => setTimeout(r, 30));
    expect(storage.createAgentLog).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, responseStatus: 401 })
    );
  });
});

describe("requireAgentPermission middleware — permission enforcement", () => {
  let app: express.Express;
  let rawKey: string;

  beforeEach(() => {
    vi.clearAllMocks();
    (storage.createAgentLog as any).mockResolvedValue({ id: "log-id" });
    (storage.touchAgentApiKey as any).mockResolvedValue(undefined);
    rawKey = generateRawAgentKey();
    app = buildApp();
  });

  it("allows access to an endpoint when the required permission is granted", async () => {
    const key = makeAgentKey({
      keyHash: sha256(rawKey),
      permissions: { "articles:create": true },
    });
    (storage.findAgentApiKeyByHash as any).mockResolvedValue(key);

    const res = await request(app)
      .post("/api/agent/articles/create")
      .set("X-Agent-Key", rawKey)
      .send({});

    expect(res.status).toBe(201);
  });

  it("returns 403 when the required permission is absent", async () => {
    const key = makeAgentKey({
      keyHash: sha256(rawKey),
      permissions: { "articles:create": true },
    });
    (storage.findAgentApiKeyByHash as any).mockResolvedValue(key);

    const res = await request(app)
      .post("/api/agent/users/ban")
      .set("X-Agent-Key", rawKey)
      .send({});

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.errors[0].message).toMatch(/users:ban/);
  });

  it("system:admin bypasses all permission checks", async () => {
    const key = makeAgentKey({
      keyHash: sha256(rawKey),
      permissions: { "system:admin": true },
    });
    (storage.findAgentApiKeyByHash as any).mockResolvedValue(key);

    const res = await request(app)
      .post("/api/agent/users/ban")
      .set("X-Agent-Key", rawKey)
      .send({});

    expect(res.status).toBe(200);
  });

  it("writes an audit log when permission is denied", async () => {
    const key = makeAgentKey({
      keyHash: sha256(rawKey),
      permissions: {},
    });
    (storage.findAgentApiKeyByHash as any).mockResolvedValue(key);

    await request(app)
      .post("/api/agent/users/ban")
      .set("X-Agent-Key", rawKey)
      .send({});

    await new Promise((r) => setTimeout(r, 30));
    expect(storage.createAgentLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "users:ban",
        success: false,
        status: "error",
        responseStatus: 403,
      })
    );
  });

  it("logs:read permission grants access to the logs endpoint", async () => {
    const key = makeAgentKey({
      keyHash: sha256(rawKey),
      permissions: { "logs:read": true },
    });
    (storage.findAgentApiKeyByHash as any).mockResolvedValue(key);

    const res = await request(app)
      .get("/api/agent/logs")
      .set("X-Agent-Key", rawKey)
      .send();

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe("agentApiAuth middleware — rate limiting", () => {
  it("returns 429 with Retry-After header when the per-key rate limit is exceeded", async () => {
    vi.clearAllMocks();
    (storage.createAgentLog as any).mockResolvedValue({ id: "log-id" });
    (storage.touchAgentApiKey as any).mockResolvedValue(undefined);

    const rawKey = generateRawAgentKey();
    const limitedKey = makeAgentKey({
      id: "rate-limited-unique-key-" + Date.now(),
      keyHash: sha256(rawKey),
      rateLimit: 1,
    });
    (storage.findAgentApiKeyByHash as any).mockResolvedValue(limitedKey);

    const app = buildApp();

    const res1 = await request(app)
      .post("/api/agent/auth/verify")
      .set("X-Agent-Key", rawKey)
      .send({});
    expect(res1.status).toBe(200);

    const res2 = await request(app)
      .post("/api/agent/auth/verify")
      .set("X-Agent-Key", rawKey)
      .send({});
    expect(res2.status).toBe(429);
    expect(res2.body.success).toBe(false);
    expect(res2.body.errors[0].message).toMatch(/Rate limit exceeded/i);
    expect(res2.headers["retry-after"]).toBeDefined();
  });
});

describe("audit log content", () => {
  let app: express.Express;
  let rawKey: string;

  beforeEach(() => {
    vi.clearAllMocks();
    (storage.createAgentLog as any).mockResolvedValue({ id: "log-id" });
    (storage.touchAgentApiKey as any).mockResolvedValue(undefined);
    rawKey = generateRawAgentKey();
    app = buildApp();
  });

  it("log entry includes endpoint, method, action, and ip fields on auth failure", async () => {
    (storage.findAgentApiKeyByHash as any).mockResolvedValue(undefined);

    await request(app)
      .get("/api/agent/logs")
      .set("X-Agent-Key", "acp_agent_bad")
      .send();

    await new Promise((r) => setTimeout(r, 30));

    expect(storage.createAgentLog).toHaveBeenCalled();
    const logArg = (storage.createAgentLog as any).mock.calls[0][0];
    expect(logArg.endpoint).toBe("/api/agent/logs");
    expect(logArg.method).toBe("GET");
    expect(logArg.action).toBe("auth");
    expect(logArg.responseStatus).toBe(401);
    expect(logArg.success).toBe(false);
  });

  it("log entry redacts sensitive fields from the payload", async () => {
    (storage.findAgentApiKeyByHash as any).mockResolvedValue(undefined);

    await request(app)
      .post("/api/agent/auth/verify")
      .set("X-Agent-Key", "acp_agent_badkey")
      .send({ password: "s3cr3t", token: "my-token", data: "safe" });

    await new Promise((r) => setTimeout(r, 30));

    const logArg = (storage.createAgentLog as any).mock.calls[0][0];
    if (logArg.payload && typeof logArg.payload === "object") {
      if ("password" in logArg.payload) {
        expect(logArg.payload.password).toBe("[redacted]");
      }
      if ("token" in logArg.payload) {
        expect(logArg.payload.token).toBe("[redacted]");
      }
      if ("data" in logArg.payload) {
        expect(logArg.payload.data).toBe("safe");
      }
    }
  });
});

describe("/api/v1 developer API isolation", () => {
  let app: express.Express;
  let rawKey: string;

  beforeEach(() => {
    vi.clearAllMocks();
    (storage.createAgentLog as any).mockResolvedValue({ id: "log-id" });
    (storage.touchAgentApiKey as any).mockResolvedValue(undefined);
    rawKey = generateRawAgentKey();
    app = buildApp();
  });

  it("sending an X-Agent-Key does not grant access to /api/v1 routes (which require Bearer auth)", async () => {
    const key = makeAgentKey({ keyHash: sha256(rawKey) });
    (storage.findAgentApiKeyByHash as any).mockResolvedValue(key);

    const res = await request(app)
      .get("/api/v1/posts")
      .set("X-Agent-Key", rawKey)
      .send();

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/Missing Authorization header/i);
  });

  it("/api/v1 routes continue to work with a Bearer token (independent of agent auth)", async () => {
    const res = await request(app)
      .get("/api/v1/posts")
      .set("Authorization", "Bearer some-developer-token")
      .send();

    expect(res.status).toBe(200);
    expect(res.body.posts).toBeDefined();
  });

  it("storage.findAgentApiKeyByHash is NOT called when accessing /api/v1 routes", async () => {
    await request(app)
      .get("/api/v1/posts")
      .set("Authorization", "Bearer some-token")
      .send();

    expect(storage.findAgentApiKeyByHash).not.toHaveBeenCalled();
  });
});

describe("sandbox mode detection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (storage.createAgentLog as any).mockResolvedValue({ id: "log-id" });
    (storage.touchAgentApiKey as any).mockResolvedValue(undefined);
  });

  it("sets agentSandbox=true when the key has sandboxMode=true", async () => {
    const rawKey = generateRawAgentKey();
    const sandboxKey = makeAgentKey({ keyHash: sha256(rawKey), sandboxMode: true });
    (storage.findAgentApiKeyByHash as any).mockResolvedValue(sandboxKey);

    const app = buildApp((a) => {
      a.get("/api/agent/sandbox-check", agentApiAuth, (req, res) => {
        res.json({ sandbox: (req as any).agentSandbox });
      });
    });

    const res = await request(app)
      .get("/api/agent/sandbox-check")
      .set("X-Agent-Key", rawKey)
      .send();

    expect(res.status).toBe(200);
    expect(res.body.sandbox).toBe(true);
  });

  it("sets agentSandbox=true when the key role is qa_agent", async () => {
    const rawKey = generateRawAgentKey();
    const qaKey = makeAgentKey({
      keyHash: sha256(rawKey),
      role: "qa_agent",
      sandboxMode: false,
    });
    (storage.findAgentApiKeyByHash as any).mockResolvedValue(qaKey);

    const app = buildApp((a) => {
      a.get("/api/agent/qa-check", agentApiAuth, (req, res) => {
        res.json({ sandbox: (req as any).agentSandbox });
      });
    });

    const res = await request(app)
      .get("/api/agent/qa-check")
      .set("X-Agent-Key", rawKey)
      .send();

    expect(res.status).toBe(200);
    expect(res.body.sandbox).toBe(true);
  });

  it("sets agentSandbox=false for a regular production key", async () => {
    const rawKey = generateRawAgentKey();
    const prodKey = makeAgentKey({
      keyHash: sha256(rawKey),
      role: "news_agent",
      sandboxMode: false,
    });
    (storage.findAgentApiKeyByHash as any).mockResolvedValue(prodKey);

    const app = buildApp((a) => {
      a.get("/api/agent/prod-check", agentApiAuth, (req, res) => {
        res.json({ sandbox: (req as any).agentSandbox });
      });
    });

    const res = await request(app)
      .get("/api/agent/prod-check")
      .set("X-Agent-Key", rawKey)
      .send();

    expect(res.status).toBe(200);
    expect(res.body.sandbox).toBe(false);
  });
});
