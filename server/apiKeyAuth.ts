import { createHash, randomBytes } from "crypto";
import { RateLimiterMemory } from "rate-limiter-flexible";
import { storage } from "./storage";
import { db } from "./db";
import { apiKeys } from "@shared/schema";
import { eq } from "drizzle-orm";
import type { Request, Response, NextFunction } from "express";
import type { User } from "@shared/schema";

declare global {
  namespace Express {
    interface Request {
      apiUser?: User;
    }
  }
}

/** sha-256 hash of a raw API key string */
export function hashApiKey(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/** Generate a cryptographically random API key */
export function generateRawApiKey(): string {
  return "acp_" + randomBytes(32).toString("hex");
}

const rateLimiters = new Map<string, RateLimiterMemory>();

function getLimiterForKey(keyId: string): RateLimiterMemory {
  if (!rateLimiters.has(keyId)) {
    rateLimiters.set(keyId, new RateLimiterMemory({
      points: 12,
      duration: 3600,
    }));
  }
  return rateLimiters.get(keyId)!;
}

/** Express middleware: authenticate via Bearer API key */
export async function apiKeyAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing Authorization header. Use: Authorization: Bearer <api_key>" });
  }

  const raw = authHeader.slice(7).trim();
  if (!raw) {
    return res.status(401).json({ error: "Empty API key" });
  }

  const hash = hashApiKey(raw);
  const apiKey = await storage.findApiKeyByHash(hash);

  if (!apiKey) {
    return res.status(401).json({ error: "Invalid or revoked API key" });
  }

  const limiter = getLimiterForKey(apiKey.id);
  try {
    await limiter.consume(apiKey.id);
  } catch {
    res.setHeader("Retry-After", "300");
    return res.status(429).json({
      error: "Rate limit exceeded. API keys allow 12 requests per hour (approx. 1 per 5 minutes).",
      retryAfterSeconds: 300,
    });
  }

  const user = await storage.getUser(apiKey.userId);
  if (!user) {
    return res.status(401).json({ error: "Associated user account not found" });
  }

  db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, apiKey.id)).catch(() => {});

  req.apiUser = user;
  next();
}

/** Middleware: require apiUser to be admin */
export function requireAdminApiKey(req: Request, res: Response, next: NextFunction) {
  if (!req.apiUser || req.apiUser.role !== "admin") {
    return res.status(403).json({ error: "This endpoint requires an admin-tier API key" });
  }
  next();
}

/** Middleware: require apiUser to be premium or admin */
export function requirePremiumApiKey(req: Request, res: Response, next: NextFunction) {
  if (!req.apiUser) {
    return res.status(401).json({ error: "API key authentication required" });
  }
  if (req.apiUser.subscriptionStatus !== "premium" && req.apiUser.role !== "admin") {
    return res.status(403).json({ error: "This endpoint requires an ACP+ premium subscription" });
  }
  next();
}
