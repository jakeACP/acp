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
    }
  }
}

export function generateRawAgentKey(): string {
  return "acp_agent_" + randomBytes(32).toString("hex");
}

const rateLimiters = new Map<string, RateLimiterMemory>();

function getLimiterForKey(keyId: string): RateLimiterMemory {
  if (!rateLimiters.has(keyId)) {
    rateLimiters.set(keyId, new RateLimiterMemory({ points: 240, duration: 3600 }));
  }
  return rateLimiters.get(keyId)!;
}

export async function agentApiAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing Authorization header. Use: Authorization: Bearer <agent_api_key>" });
  }

  const raw = authHeader.slice(7).trim();
  if (!raw) return res.status(401).json({ error: "Empty agent API key" });

  const key = await storage.findAgentApiKeyByHash(hashApiKey(raw));
  if (!key) return res.status(401).json({ error: "Invalid or revoked agent API key" });

  const limiter = getLimiterForKey(key.id);
  try {
    await limiter.consume(key.id);
  } catch (rlRes: unknown) {
    const msBeforeNext = (rlRes as { msBeforeNext?: number }).msBeforeNext ?? 3600000;
    const retryAfterSeconds = Math.ceil(msBeforeNext / 1000);
    res.setHeader("Retry-After", String(retryAfterSeconds));
    return res.status(429).json({ error: "Rate limit exceeded. Agent API keys allow 240 requests per hour.", retryAfterSeconds });
  }

  storage.touchAgentApiKey(key.id).catch((err: unknown) => {
    console.warn("[agentApiAuth] Failed to update lastUsedAt for key", key.id, err);
  });

  req.agentKey = key;
  next();
}

export function requireAgentPermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.agentKey) return res.status(401).json({ error: "Agent API key authentication required" });
    if (!req.agentKey.permissions?.includes(permission)) {
      return res.status(403).json({ error: `Agent key does not include required permission: ${permission}` });
    }
    next();
  };
}
