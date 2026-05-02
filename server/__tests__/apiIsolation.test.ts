/**
 * Integration-style tests proving that the /api/v1 developer API (Bearer token
 * auth via apiKeyAuth) and the /api/agent/* gateway (X-Agent-Key via
 * agentApiAuth) are entirely independent authentication systems that do not
 * interfere with one another.
 *
 * Both real middleware implementations are imported here; storage is mocked so
 * no database or external agent is needed.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import { createHash } from "crypto";

vi.mock("../storage", () => ({
  storage: {
    findAgentApiKeyByHash: vi.fn(),
    findApiKeyByHash: vi.fn(),
    createAgentLog: vi.fn().mockResolvedValue({ id: "log-id" }),
    touchAgentApiKey: vi.fn().mockResolvedValue(undefined),
    getUser: vi.fn(),
  },
}));

const mockWhere = vi.fn().mockResolvedValue(undefined);
const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
const mockUpdate = vi.fn().mockReturnValue({ set: mockSet });

vi.mock("../db", () => ({
  db: {
    update: (...args: unknown[]) => mockUpdate(...args),
  },
  pool: {},
}));

import { agentApiAuth, generateRawAgentKey } from "../agentAuth";
import { apiKeyAuth } from "../apiKeyAuth";
import { storage } from "../storage";

function sha256(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

function makeAgentKey(rawKey: string, overrides: Record<string, unknown> = {}) {
  return {
    id: "agent-key-id",
    name: "Test Agent",
    keyHash: sha256(rawKey),
    keyPrefix: "acp_agent_",
    role: "news_agent",
    permissions: { "articles:create": true },
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

function makeApiKey(userId = "user-id") {
  return {
    id: "api-key-id",
    userId,
    keyHash: sha256("acp_developer_key"),
    keyPrefix: "acp_",
    status: "active",
    createdAt: new Date(),
    lastUsedAt: null,
    revokedAt: null,
  };
}

function makeUser(role = "citizen") {
  return {
    id: "user-id",
    username: "testuser",
    email: "test@example.com",
    password: "hash",
    role,
    subscriptionStatus: "premium",
    createdAt: new Date(),
  };
}

function buildDualAuthApp() {
  const app = express();
  app.use(express.json());

  app.get("/api/v1/posts", apiKeyAuth, (_req, res) => {
    res.json({ source: "v1", posts: [] });
  });

  app.post("/api/agent/auth/verify", agentApiAuth, (req, res) => {
    res.json({ source: "agent", agentKeyId: (req as any).agentKey?.id });
  });

  return app;
}

describe("/api/v1 and /api/agent/* route isolation", () => {
  let app: express.Express;
  let agentRawKey: string;

  beforeEach(() => {
    vi.clearAllMocks();
    mockWhere.mockResolvedValue(undefined);
    mockSet.mockReturnValue({ where: mockWhere });
    mockUpdate.mockReturnValue({ set: mockSet });
    (storage.createAgentLog as any).mockResolvedValue({ id: "log-id" });
    (storage.touchAgentApiKey as any).mockResolvedValue(undefined);
    (storage.findAgentApiKeyByHash as any).mockResolvedValue(undefined);
    (storage.findApiKeyByHash as any).mockResolvedValue(undefined);
    (storage.getUser as any).mockResolvedValue(undefined);
    agentRawKey = generateRawAgentKey();
    app = buildDualAuthApp();
  });

  it("/api/v1 route rejects a request that provides X-Agent-Key instead of Bearer token", async () => {
    const agentKey = makeAgentKey(agentRawKey);
    (storage.findAgentApiKeyByHash as any).mockResolvedValue(agentKey);

    const res = await request(app)
      .get("/api/v1/posts")
      .set("X-Agent-Key", agentRawKey)
      .send();

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/Missing Authorization header/i);
  });

  it("/api/v1 route accepts a valid Bearer token and returns data", async () => {
    (storage.findApiKeyByHash as any).mockResolvedValue(makeApiKey());
    (storage.getUser as any).mockResolvedValue(makeUser());

    const res = await request(app)
      .get("/api/v1/posts")
      .set("Authorization", "Bearer acp_developer_key")
      .send();

    expect(res.status).toBe(200);
    expect(res.body.source).toBe("v1");
  });

  it("/api/agent/* route rejects a request that provides a Bearer token instead of X-Agent-Key", async () => {
    const res = await request(app)
      .post("/api/agent/auth/verify")
      .set("Authorization", "Bearer acp_developer_key")
      .send({});

    expect(res.status).toBe(401);
    expect(res.body.errors[0].message).toMatch(/Missing X-Agent-Key/i);
  });

  it("/api/agent/* route accepts a valid X-Agent-Key and returns data", async () => {
    const agentKey = makeAgentKey(agentRawKey);
    (storage.findAgentApiKeyByHash as any).mockResolvedValue(agentKey);

    const res = await request(app)
      .post("/api/agent/auth/verify")
      .set("X-Agent-Key", agentRawKey)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.source).toBe("agent");
    expect(res.body.agentKeyId).toBe("agent-key-id");
  });

  it("a valid agent key cannot be used to authenticate as a developer API user on /api/v1", async () => {
    const res = await request(app)
      .get("/api/v1/posts")
      .set("X-Agent-Key", agentRawKey)
      .set("Authorization", "Bearer " + agentRawKey)
      .send();

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/Invalid or revoked API key/i);
  });

  it("storage.findAgentApiKeyByHash is never called when a /api/v1 request arrives", async () => {
    (storage.findApiKeyByHash as any).mockResolvedValue(makeApiKey());
    (storage.getUser as any).mockResolvedValue(makeUser());

    await request(app)
      .get("/api/v1/posts")
      .set("Authorization", "Bearer acp_developer_key")
      .send();

    expect(storage.findAgentApiKeyByHash).not.toHaveBeenCalled();
  });

  it("storage.findApiKeyByHash is never called when a /api/agent/* request arrives", async () => {
    const agentKey = makeAgentKey(agentRawKey);
    (storage.findAgentApiKeyByHash as any).mockResolvedValue(agentKey);

    await request(app)
      .post("/api/agent/auth/verify")
      .set("X-Agent-Key", agentRawKey)
      .send({});

    expect(storage.findApiKeyByHash).not.toHaveBeenCalled();
  });

  it("a rejected /api/agent/* request does not expose developer API internals", async () => {
    (storage.findAgentApiKeyByHash as any).mockResolvedValue(undefined);

    const res = await request(app)
      .post("/api/agent/auth/verify")
      .set("X-Agent-Key", "acp_agent_badkey")
      .send({});

    expect(res.status).toBe(401);
    expect(JSON.stringify(res.body)).not.toMatch(/api_key|apiKey|Bearer/i);
  });
});
