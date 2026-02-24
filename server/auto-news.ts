import cron from "node-cron";
import { storage } from "./storage";
import { generateArticleBodyFromTitle } from "./openai";
import { hashPassword } from "./auth";
import { randomBytes } from "crypto";

const SYSTEM_ACCOUNT_USERNAME = "ACP-News-Desk";
const SYSTEM_ACCOUNT_EMAIL = "system@acpnewsdesk.internal";

let systemUserId: string | null = null;
let lastJobRun: Date | null = null;
let lastJobStatus: string = "never_run";
let lastJobError: string | null = null;
let lastArticleTitle: string | null = null;

export function getAutoNewsStatus() {
  return {
    systemUserId,
    lastJobRun: lastJobRun?.toISOString() || null,
    lastJobStatus,
    lastJobError,
    lastArticleTitle,
    cronSchedule: "0 8 * * *",
    nextRun: getNextRunTime(),
  };
}

function getNextRunTime(): string | null {
  const now = new Date();
  const next = new Date(now);
  next.setHours(8, 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  return next.toISOString();
}

export async function ensureSystemAccount(): Promise<string> {
  if (systemUserId) return systemUserId;

  try {
    const existing = await storage.getUserByUsername(SYSTEM_ACCOUNT_USERNAME);
    if (existing) {
      systemUserId = existing.id;
      console.log(`System account found: ${SYSTEM_ACCOUNT_USERNAME} (${systemUserId})`);
      return systemUserId;
    }

    const password = randomBytes(32).toString("hex");
    const hashedPassword = await hashPassword(password);

    const user = await storage.createUser({
      username: SYSTEM_ACCOUNT_USERNAME,
      email: SYSTEM_ACCOUNT_EMAIL,
      password: hashedPassword,
      role: "citizen",
      firstName: "ACP",
      lastName: "News Desk",
      bio: "Automated news coverage by the Anti-Corruption Party. Bringing you daily headlines with an anti-corruption perspective.",
    });

    systemUserId = user.id;
    console.log(`System account created: ${SYSTEM_ACCOUNT_USERNAME} (${systemUserId})`);
    return systemUserId;
  } catch (error: any) {
    console.error("Failed to create system account:", error.message);
    throw error;
  }
}

export async function fetchTopHeadline(keywords?: string): Promise<{ title: string; description: string; source: string; url: string } | null> {
  const apiKey = process.env.NEWS_API_KEY;
  if (!apiKey) {
    console.warn("NEWS_API_KEY not set, using OpenAI to generate headline");
    return null;
  }

  try {
    const query = keywords || "politics corruption government accountability";
    const url = `https://newsapi.org/v2/top-headlines?country=us&category=politics&pageSize=5&apiKey=${apiKey}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      const fallbackUrl = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&sortBy=publishedAt&pageSize=5&language=en&apiKey=${apiKey}`;
      const fallbackResponse = await fetch(fallbackUrl);
      if (!fallbackResponse.ok) {
        throw new Error(`NewsAPI error: ${fallbackResponse.status}`);
      }
      const data = await fallbackResponse.json();
      if (!data.articles || data.articles.length === 0) return null;
      const article = data.articles[0];
      return {
        title: article.title,
        description: article.description || "",
        source: article.source?.name || "Unknown",
        url: article.url || "",
      };
    }

    const data = await response.json();
    if (!data.articles || data.articles.length === 0) {
      const fallbackUrl = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&sortBy=publishedAt&pageSize=5&language=en&apiKey=${apiKey}`;
      const fallbackResponse = await fetch(fallbackUrl);
      const fallbackData = await fallbackResponse.json();
      if (!fallbackData.articles || fallbackData.articles.length === 0) return null;
      const article = fallbackData.articles[0];
      return {
        title: article.title,
        description: article.description || "",
        source: article.source?.name || "Unknown",
        url: article.url || "",
      };
    }

    const article = data.articles[0];
    return {
      title: article.title,
      description: article.description || "",
      source: article.source?.name || "Unknown",
      url: article.url || "",
    };
  } catch (error: any) {
    console.error("Error fetching news headlines:", error.message);
    return null;
  }
}

export async function generateAndPostArticle(titleOverride?: string): Promise<{ postId: string; title: string } | null> {
  try {
    const userId = await ensureSystemAccount();

    let title = titleOverride;
    let sourceUrl = "";
    let sourceName = "";

    if (!title) {
      const headline = await fetchTopHeadline();
      if (headline) {
        title = headline.title;
        sourceUrl = headline.url;
        sourceName = headline.source;
      } else {
        console.log("No headline found, skipping auto-article generation");
        return null;
      }
    }

    if (!title) return null;

    console.log(`Auto-generating article: "${title}"`);

    const aiParams = await storage.getAiArticleParameters();
    const result = await generateArticleBodyFromTitle(title, {
      systemPrompt: aiParams?.systemPrompt || "You are a professional journalist writing for a political reform organization.",
      writingStyle: aiParams?.writingStyle || "investigative",
      toneGuidelines: aiParams?.toneGuidelines || "serious, factual, balanced",
      focusAreas: aiParams?.focusAreas || "corruption, accountability, transparency",
      contentLength: aiParams?.contentLength || "medium",
      includeQuotes: aiParams?.includeQuotes ?? true,
      includeSources: aiParams?.includeSources ?? true,
      additionalInstructions: aiParams?.additionalInstructions || null,
    });

    const wordCount = result.articleBody.split(/\s+/).length;
    const readingTime = Math.max(1, Math.ceil(wordCount / 200));

    const post = await storage.createPost({
      authorId: userId,
      content: result.excerpt || title,
      type: "blog",
      title: title,
      articleBody: result.articleBody,
      excerpt: result.excerpt || "",
      readingTime: readingTime,
      tags: ["news", "daily-update", "auto-generated"],
      newsSourceName: sourceName || undefined,
      url: sourceUrl || undefined,
    });

    console.log(`Auto-article posted: "${title}" (${post.id})`);
    
    lastArticleTitle = title;
    
    await triggerSocialMediaCrossPost(post.id, title, result.excerpt || title);

    return { postId: post.id, title };
  } catch (error: any) {
    console.error("Error generating auto-article:", error.message);
    throw error;
  }
}

async function triggerSocialMediaCrossPost(postId: string, title: string, excerpt: string) {
  const platforms = getSocialMediaConfig();
  const results: Record<string, { success: boolean; error?: string }> = {};

  for (const [platform, config] of Object.entries(platforms)) {
    if (!config.enabled || !config.apiKey) continue;

    try {
      switch (platform) {
        case "bluesky":
          await postToBluesky(config, title, excerpt, postId);
          results[platform] = { success: true };
          break;
        case "x":
          await postToX(config, title, excerpt, postId);
          results[platform] = { success: true };
          break;
        case "facebook":
        case "threads":
          results[platform] = { success: false, error: "Not yet configured" };
          break;
      }
    } catch (error: any) {
      console.error(`Failed to cross-post to ${platform}:`, error.message);
      results[platform] = { success: false, error: error.message };
    }
  }

  if (Object.keys(results).length > 0) {
    console.log("Social media cross-post results:", results);
  }
}

interface SocialMediaPlatformConfig {
  enabled: boolean;
  apiKey: string | null;
  apiSecret: string | null;
  handle: string | null;
}

function getSocialMediaConfig(): Record<string, SocialMediaPlatformConfig> {
  return {
    x: {
      enabled: !!process.env.X_API_KEY,
      apiKey: process.env.X_API_KEY || null,
      apiSecret: process.env.X_API_SECRET || null,
      handle: process.env.X_HANDLE || null,
    },
    bluesky: {
      enabled: !!process.env.BLUESKY_HANDLE,
      apiKey: process.env.BLUESKY_APP_PASSWORD || null,
      apiSecret: null,
      handle: process.env.BLUESKY_HANDLE || null,
    },
    facebook: {
      enabled: !!process.env.FACEBOOK_PAGE_TOKEN,
      apiKey: process.env.FACEBOOK_PAGE_TOKEN || null,
      apiSecret: null,
      handle: process.env.FACEBOOK_PAGE_ID || null,
    },
    threads: {
      enabled: !!process.env.THREADS_ACCESS_TOKEN,
      apiKey: process.env.THREADS_ACCESS_TOKEN || null,
      apiSecret: null,
      handle: process.env.THREADS_USER_ID || null,
    },
  };
}

async function postToBluesky(config: SocialMediaPlatformConfig, title: string, excerpt: string, postId: string) {
  if (!config.handle || !config.apiKey) throw new Error("Bluesky credentials not configured");

  const sessionResponse = await fetch("https://bsky.social/xrpc/com.atproto.server.createSession", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      identifier: config.handle,
      password: config.apiKey,
    }),
  });

  if (!sessionResponse.ok) throw new Error(`Bluesky auth failed: ${sessionResponse.status}`);
  const session = await sessionResponse.json();

  const text = `${title}\n\nRead more on ACP: ${process.env.REPLIT_DEPLOYMENT_URL || process.env.REPL_SLUG || ""}/posts/${postId}`;
  const truncatedText = text.length > 300 ? text.substring(0, 297) + "..." : text;

  const postResponse = await fetch("https://bsky.social/xrpc/com.atproto.repo.createRecord", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.accessJwt}`,
    },
    body: JSON.stringify({
      repo: session.did,
      collection: "app.bsky.feed.post",
      record: {
        text: truncatedText,
        createdAt: new Date().toISOString(),
        $type: "app.bsky.feed.post",
      },
    }),
  });

  if (!postResponse.ok) throw new Error(`Bluesky post failed: ${postResponse.status}`);
  console.log("Posted to Bluesky successfully");
}

async function postToX(config: SocialMediaPlatformConfig, title: string, excerpt: string, postId: string) {
  if (!config.apiKey || !config.apiSecret) throw new Error("X/Twitter credentials not configured");

  const text = `${title}\n\nRead more: ${process.env.REPLIT_DEPLOYMENT_URL || ""}/posts/${postId}`;
  const truncatedText = text.length > 280 ? text.substring(0, 277) + "..." : text;

  const response = await fetch("https://api.x.com/2/tweets", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({ text: truncatedText }),
  });

  if (!response.ok) throw new Error(`X post failed: ${response.status}`);
  console.log("Posted to X/Twitter successfully");
}

export function getSocialMediaStatus() {
  const config = getSocialMediaConfig();
  return Object.entries(config).map(([platform, c]) => ({
    platform,
    enabled: c.enabled,
    configured: !!c.apiKey,
    handle: c.handle,
  }));
}

let cronJob: ReturnType<typeof cron.schedule> | null = null;

export function startAutoNewsJob() {
  if (cronJob) {
    console.log("Auto-news job already running");
    return;
  }

  cronJob = cron.schedule("0 8 * * *", async () => {
    console.log("Running daily auto-news job...");
    lastJobRun = new Date();
    lastJobStatus = "running";
    lastJobError = null;

    try {
      const result = await generateAndPostArticle();
      if (result) {
        lastJobStatus = "success";
        console.log(`Daily auto-news completed: "${result.title}"`);
      } else {
        lastJobStatus = "skipped";
        console.log("Daily auto-news skipped (no headline found)");
      }
    } catch (error: any) {
      lastJobStatus = "error";
      lastJobError = error.message;
      console.error("Daily auto-news failed:", error.message);
    }
  }, {
    timezone: "America/New_York",
  });

  console.log("Auto-news cron job started (daily at 8:00 AM ET)");
}

export function stopAutoNewsJob() {
  if (cronJob) {
    cronJob.stop();
    cronJob = null;
    console.log("Auto-news cron job stopped");
  }
}
