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
  const points = Math.max(key.rateLimit ?? 120, 1);
  const limiterKey = `${key.id}:${points}`;
  if (!rateLimiters.has(limiterKey)) {
    rateLimiters.set(limiterKey, new RateLimiterMemory({ points, duration: 3600 }));
  }
  return rateLimiters.get(limiterKey)!;
}

function agentAuthError(res: Response, status: number, action: string, message: string) {
  return res.status(status).json({
    success: false,
    action,
    data: null,
    errors: [{ message }],
    meta: { timestamp: new Date().toISOString(), rate_limit_remaining: 0 },
  });
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
  if (!raw) return agentAuthError(res, 401, "auth", "Missing X-Agent-Key header");

  const key = await storage.findAgentApiKeyByHash(hashApiKey(raw));
  if (!key) return agentAuthError(res, 401, "auth", "Invalid or revoked agent API key");

  const limiter = getLimiterForKey(key);
  try {
    const rate = await limiter.consume(key.id);
    req.agentRateLimitRemaining = rate.remainingPoints;
  } catch (rlRes: unknown) {
    const msBeforeNext = (rlRes as { msBeforeNext?: number }).msBeforeNext ?? 3600000;
    const retryAfterSeconds = Math.ceil(msBeforeNext / 1000);
    res.setHeader("Retry-After", String(retryAfterSeconds));
    return agentAuthError(res, 429, "rate_limit", `Rate limit exceeded. Try again in ${retryAfterSeconds} seconds.`);
  }

  storage.touchAgentApiKey(key.id).catch((err: unknown) => {
    console.warn("[agentApiAuth] Failed to update lastUsedAt for key", key.id, err);
  });

  req.agentKey = key;
  req.agentSandbox = key.sandboxMode || key.role === "qa_agent";
  next();
}

export function requireAgentPermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.agentKey) return agentAuthError(res, 401, permission, "Agent API key authentication required");
    if (!hasAgentPermission(req.agentKey, permission)) {
      return agentAuthError(res, 403, permission, `Agent key does not include required permission: ${permission}`);
    }
    next();
  };
}
