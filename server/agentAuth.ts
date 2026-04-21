import { randomBytes } from "crypto";
import { RateLimiterMemory } from "rate-limiter-flexible";
import type { Request, Response, NextFunction } from "express";
import type { AgentApiKey } from "@shared/schema";
import { storage } from "./storage";
import { hashApiKey } from "./apiKeyAuth";

declare global {
  namespace Express {
    interface Request {
      agentKey?: AgentApiKey;
      agentRateLimitRemaining?: number;
      agentSandbox?: boolean;
    }
  }
}

export function generateRawAgentKey(): string {
  return "acp_agent_" + randomBytes(32).toString("hex");
}

const rateLimiters = new Map<string, RateLimiterMemory>();

function getLimiterForKey(key: AgentApiKey): RateLimiterMemory {
  const points = Math.max(key.rateLimit ?? 100, 1);
  const limiterKey = `${key.id}:${points}`;
  if (!rateLimiters.has(limiterKey)) {
    rateLimiters.set(limiterKey, new RateLimiterMemory({ points, duration: 3600 }));
  }
  return rateLimiters.get(limiterKey)!;
}

function redactPayload(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.slice(0, 20).map(redactPayload);
  const redacted: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (/key|token|secret|password|authorization/i.test(key)) redacted[key] = "[redacted]";
    else if (typeof item === "string" && item.length > 1000) redacted[key] = item.slice(0, 1000) + "…";
    else redacted[key] = redactPayload(item);
  }
  return redacted;
}

async function writeRejectedAgentLog(req: Request, action: string, responseStatus: number, responseBody: unknown, message: string) {
  try {
    await storage.createAgentLog({
      apiKeyId: req.agentKey?.id ?? null,
      agentName: req.agentKey?.name ?? null,
      role: req.agentKey?.role ?? null,
      endpoint: req.path,
      method: req.method,
      action,
      payload: redactPayload(req.body ?? req.query ?? null) as Record<string, unknown> | null,
      response: redactPayload(responseBody) as Record<string, unknown> | null,
      responseStatus,
      ip: req.ip ?? null,
      sandbox: req.agentSandbox === true || req.path.startsWith("/api/agent/sandbox/"),
      status: "error",
      success: false,
      message,
      metadata: null,
    });
  } catch (err) {
    console.warn("[agentApiAuth] Failed to write rejected agent log", err);
  }
}

async function agentAuthError(req: Request, res: Response, status: number, action: string, message: string) {
  const body = {
    success: false,
    action,
    data: null,
    errors: [{ message }],
    meta: { timestamp: new Date().toISOString(), rate_limit_remaining: req.agentRateLimitRemaining ?? 0, sandbox: req.agentSandbox === true },
  };
  await writeRejectedAgentLog(req, action, status, body, message);
  return res.status(status).json(body);
}

function getAgentKeyHeader(req: Request): string | null {
  const value = req.header("x-agent-key");
  if (!value || !value.trim()) return null;
  return value.trim();
}

export function hasAgentPermission(key: AgentApiKey, permission: string): boolean {
  const permissions = key.permissions ?? {};
  return permissions[permission] === true || permissions["system:admin"] === true;
}

export async function agentApiAuth(req: Request, res: Response, next: NextFunction) {
  const raw = getAgentKeyHeader(req);
  if (!raw) return agentAuthError(req, res, 401, "auth", "Missing X-Agent-Key header");

  const key = await storage.findAgentApiKeyByHash(hashApiKey(raw));
  if (!key) return agentAuthError(req, res, 401, "auth", "Invalid or revoked agent API key");

  req.agentKey = key;
  req.agentSandbox = key.sandboxMode || key.role === "qa_agent" || req.path.startsWith("/api/agent/sandbox/");

  const limiter = getLimiterForKey(key);
  try {
    const rate = await limiter.consume(key.id);
    req.agentRateLimitRemaining = rate.remainingPoints;
  } catch (rlRes: unknown) {
    const msBeforeNext = (rlRes as { msBeforeNext?: number }).msBeforeNext ?? 3600000;
    const retryAfterSeconds = Math.ceil(msBeforeNext / 1000);
    res.setHeader("Retry-After", String(retryAfterSeconds));
    return agentAuthError(req, res, 429, "rate_limit", `Rate limit exceeded. Try again in ${retryAfterSeconds} seconds.`);
  }

  storage.touchAgentApiKey(key.id).catch((err: unknown) => {
    console.warn("[agentApiAuth] Failed to update lastUsedAt for key", key.id, err);
  });

  next();
}

export function requireAgentPermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.agentKey) return agentAuthError(req, res, 401, permission, "Agent API key authentication required");
    if (!hasAgentPermission(req.agentKey, permission)) {
      return agentAuthError(req, res, 403, permission, `Agent key does not include required permission: ${permission}`);
    }
    next();
  };
}
