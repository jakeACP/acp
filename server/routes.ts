import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { type VoteRecord } from "./lib/blockchain";
import Anthropic from "@anthropic-ai/sdk";
import { calculateRankedChoiceWinner, type RankedVote } from "./lib/ranked-choice";
import { insertPostSchema, insertPollSchema, insertGroupSchema, insertCommentSchema, insertCandidateSchema, insertMessageSchema, insertChannelSchema, insertChannelMessageSchema, insertFlagSchema, insertCharitySchema, insertCharityDonationSchema, insertInitiativeSchema, insertInitiativeVersionSchema, insertAuditLogSchema, subscriptionRewards, createSubscriptionSchema, insertUserFollowSchema, insertReactionSchema, insertBiasVoteSchema, insertRepresentativeSchema, insertZipCodeLookupSchema, insertPoliticalPositionSchema, insertPoliticianProfileSchema, politicianProfiles, insertLiveStreamSchema, insertNotificationSchema, comments, candidateProfileModules, insertAcePledgeRequestSchema } from "@shared/schema";
import { eq, inArray, or, sql, asc } from "drizzle-orm";
import { createStreamingProvider, generateStreamKey, hashStreamKey, webhookEventSchema } from "./lib/streaming";
import { db } from "./db";
import { findRepresentativesByZipCode, generatePoliticalSeat, generateCandidateProfiles, generateArticleContent, generateArticleBodyFromTitle } from "./openai";
import { z } from "zod";
import { fetchLinkPreview } from "./lib/link-preview";
import multer from "multer";
import { ObjectStorageService, objectStorageClient } from "./objectStorage";
import { randomUUID } from "crypto";

function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?.*v=|youtube\.com\/embed\/|youtube-nocookie\.com\/embed\/|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

// Configure multer for file uploads (memory storage for streaming to object storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept JPEG, PNG, and HEIC images
    const allowedTypes = ['image/jpeg', 'image/png', 'image/heic', 'image/heif'];
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.heic', '.heif'];
    const ext = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));
    
    if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and HEIC images are allowed'));
    }
  }
});

const objectStorageService = new ObjectStorageService();

export async function registerRoutes(app: Express, existingServer?: Server): Promise<Server> {
  setupAuth(app);

  (async () => {
    try {
      const rows = await db.select().from(candidateProfileModules)
        .where(eq(candidateProfileModules.moduleType, "youtube"));
      for (const row of rows) {
        const c = typeof row.content === "string" ? JSON.parse(row.content as string) : row.content;
        if (c?.videoUrl) {
          const vid = extractYouTubeVideoId(c.videoUrl);
          if (vid) {
            const cleanUrl = `https://www.youtube.com/watch?v=${vid}`;
            if (c.videoUrl !== cleanUrl) {
              c.videoUrl = cleanUrl;
              await db.execute(sql`UPDATE candidate_profile_modules SET content = ${JSON.stringify(c)} WHERE id = ${row.id}`);
            }
          }
        }
      }
    } catch (err) {
      console.error("YouTube URL normalization error:", err);
    }
  })();

  // Public Articles API (no auth required)
  app.get("/api/public/articles", async (req, res) => {
    try {
      const category = req.query.category as string | undefined;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      
      const articles = await storage.getPublicArticles(category, limit, offset);
      res.json(articles);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/public/articles/:id", async (req, res) => {
    try {
      const article = await storage.getPublicArticle(req.params.id);
      if (!article) {
        return res.status(404).json({ message: "Article not found" });
      }
      res.json(article);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // File Upload API
  app.post("/api/upload", upload.single('file'), async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    try {
      const privateObjectDir = objectStorageService.getPrivateObjectDir();
      const fileId = randomUUID();
      const ext = req.file.originalname.toLowerCase().slice(req.file.originalname.lastIndexOf('.')) || '.jpg';
      const objectName = `uploads/${fileId}${ext}`;
      const fullPath = `${privateObjectDir}/${objectName}`;
      
      // Parse path to get bucket and object name
      const pathParts = fullPath.split('/').filter(p => p);
      const bucketName = pathParts[0];
      const objectPath = pathParts.slice(1).join('/');
      
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(objectPath);
      
      // Determine content type
      let contentType = req.file.mimetype;
      if (ext === '.heic' || ext === '.heif') {
        contentType = 'image/heic';
      }
      
      // Upload file to object storage
      await file.save(req.file.buffer, {
        contentType: contentType,
        metadata: {
          originalName: req.file.originalname,
          uploadedBy: req.user.id.toString(),
          uploadedAt: new Date().toISOString(),
        },
      });
      
      // Set ACL policy to make the file public (for post images)
      const { setObjectAclPolicy } = await import("./objectStorage");
      await setObjectAclPolicy(file, {
        owner: req.user.id.toString(),
        visibility: "public",
      });
      
      // Generate a public URL for the uploaded file
      const publicUrl = `/objects/uploads/${fileId}${ext}`;
      
      res.json({ 
        url: publicUrl,
        id: fileId,
        originalName: req.file.originalname,
      });
    } catch (error: any) {
      console.error("Upload error:", error);
      res.status(500).json({ message: error.message || "Failed to upload file" });
    }
  });

  // Posts API
  app.get("/api/posts", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      const userId = req.isAuthenticated() ? req.user.id : undefined;
      const posts = await storage.getPosts(limit, offset, userId);
      res.json(posts);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/posts/:id", async (req, res) => {
    try {
      const userId = req.isAuthenticated() ? req.user.id : undefined;
      const post = await storage.getPostById(req.params.id, userId);
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }
      res.json(post);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/posts", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const body = { ...req.body };
      // Coerce volunteerSkills from comma-separated string to array
      if (typeof body.volunteerSkills === "string") {
        body.volunteerSkills = body.volunteerSkills
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean);
      }
      // Coerce volunteer date strings to Date objects
      if (body.volunteerStartDate && typeof body.volunteerStartDate === "string") {
        body.volunteerStartDate = new Date(body.volunteerStartDate);
      }
      if (body.volunteerEndDate && typeof body.volunteerEndDate === "string") {
        body.volunteerEndDate = new Date(body.volunteerEndDate);
      }
      const postData = insertPostSchema.parse({
        ...body,
        authorId: req.user.id,
      });
      const post = await storage.createPost(postData);
      res.status(201).json(post);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // AI Article Parameters API (Admin)
  app.get("/api/admin/ai-parameters", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const params = await storage.getAiArticleParameters();
      res.json(params);
    } catch (error: any) {
      console.error("Error fetching AI parameters:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/admin/ai-parameters", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const updated = await storage.updateAiArticleParameters(req.body, req.user.id);
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating AI parameters:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // AI Article Generation endpoint - now uses title + parameters
  app.post("/api/articles/generate", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const { title } = req.body;
      if (!title || typeof title !== 'string' || title.trim().length < 3) {
        return res.status(400).json({ message: "Please provide an article title with at least 3 characters" });
      }

      if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({ message: "AI generation is not configured" });
      }

      // Get AI parameters from storage
      const aiParams = await storage.getAiArticleParameters();
      
      // Generate article body using title and parameters
      const result = await generateArticleBodyFromTitle(title.trim(), {
        systemPrompt: aiParams.systemPrompt,
        writingStyle: aiParams.writingStyle,
        toneGuidelines: aiParams.toneGuidelines,
        focusAreas: aiParams.focusAreas,
        contentLength: aiParams.contentLength,
        includeQuotes: aiParams.includeQuotes,
        includeSources: aiParams.includeSources,
        additionalInstructions: aiParams.additionalInstructions,
      });
      
      res.json(result);
    } catch (error: any) {
      console.error("Error generating article:", error);
      res.status(500).json({ message: "Failed to generate article. Please try again." });
    }
  });

  app.patch("/api/posts/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const post = await storage.getPostById(req.params.id, req.user.id);
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }

      if (post.authorId !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ message: "You can only edit your own posts" });
      }

      const { title, content, excerpt, articleBody, featuredImage, privacy, tags, readingTime } = req.body;
      
      const updateData: Record<string, any> = {};
      if (title !== undefined) updateData.title = title;
      if (content !== undefined) updateData.content = content;
      if (excerpt !== undefined) updateData.excerpt = excerpt;
      if (articleBody !== undefined) updateData.articleBody = articleBody;
      if (featuredImage !== undefined) updateData.featuredImage = featuredImage;
      if (privacy !== undefined) updateData.privacy = privacy;
      if (tags !== undefined) updateData.tags = tags;
      if (readingTime !== undefined) updateData.readingTime = readingTime;
      updateData.updatedAt = new Date();

      const updatedPost = await storage.updatePost(req.params.id, updateData);
      res.json(updatedPost);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/posts/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      // Get the post to check ownership (pass userId to apply privacy filter)
      const post = await storage.getPostById(req.params.id, req.user.id);
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }

      // Check if the user is the author or has admin/moderator privileges
      if (post.authorId !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'moderator') {
        return res.status(403).json({ message: "You can only delete your own posts" });
      }

      await storage.deletePost(req.params.id);
      res.status(200).json({ message: "Post deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/posts/:id/share", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const sharedPost = await storage.sharePost(req.params.id, req.user.id);
      res.status(201).json(sharedPost);
    } catch (error: any) {
      if (error.message === "NOT_AUTHORIZED") {
        return res.status(403).json({ message: "Not authorized to share this post" });
      }
      if (error.message === "CANNOT_SHARE_FRIENDS_ONLY") {
        return res.status(403).json({ message: "Cannot share friends-only posts from other users" });
      }
      if (error.message === "Post not found") {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/posts/user/:userId", async (req, res) => {
    try {
      const viewerId = req.isAuthenticated() ? req.user.id : undefined;
      const posts = await storage.getPostsByUser(req.params.userId, viewerId);
      res.json(posts);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/posts/tag/:tag", async (req, res) => {
    try {
      const userId = req.isAuthenticated() ? req.user.id : undefined;
      const posts = await storage.getPostsByTag(req.params.tag, userId);
      res.json(posts);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/link-preview", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const { url } = req.body;
      
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ message: "URL is required" });
      }

      try {
        new URL(url);
      } catch {
        return res.status(400).json({ message: "Invalid URL format" });
      }

      const preview = await fetchLinkPreview(url);
      res.json(preview);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // TikTok oEmbed API proxy
  app.get("/api/tiktok/oembed", async (req, res) => {
    try {
      const url = req.query.url as string;
      
      if (!url) {
        return res.status(400).json({ message: "URL is required" });
      }

      // Validate it's a TikTok URL
      if (!url.includes('tiktok.com')) {
        return res.status(400).json({ message: "Invalid TikTok URL" });
      }

      const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
      const response = await fetch(oembedUrl);
      
      if (!response.ok) {
        return res.status(response.status).json({ message: "Failed to fetch TikTok embed" });
      }

      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Whistleblowing API
  app.get("/api/whistleblowing", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      const sortBy = (req.query.sortBy as "recent" | "credibility") || "recent";
      const posts = await storage.getWhistleblowingPosts(limit, offset, sortBy);
      res.json(posts);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/whistleblowing/:id", async (req, res) => {
    try {
      const post = await storage.getWhistleblowingPostById(req.params.id);
      if (!post) {
        return res.status(404).json({ message: "Whistleblowing post not found" });
      }
      res.json(post);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/whistleblowing", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const { insertWhistleblowingPostSchema } = await import("@shared/schema");
      const postData = insertWhistleblowingPostSchema.parse({
        ...req.body,
        authorId: req.user.id,
      });
      const post = await storage.createWhistleblowingPost(postData);
      res.status(201).json(post);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/whistleblowing/:id/vote", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const { insertWhistleblowingVoteSchema } = await import("@shared/schema");
      const voteData = insertWhistleblowingVoteSchema.parse({
        postId: req.params.id,
        userId: req.user.id,
        vote: req.body.vote,
      });

      if (voteData.vote !== "credible" && voteData.vote !== "not_credible") {
        return res.status(400).json({ message: "Vote must be 'credible' or 'not_credible'" });
      }

      await storage.voteOnWhistleblowing(req.params.id, req.user.id, voteData.vote);
      res.status(200).json({ message: "Vote recorded successfully" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/whistleblowing/:id/my-vote", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const vote = await storage.getUserWhistleblowingVote(req.params.id, req.user.id);
      res.json(vote || null);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/whistleblowing/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const post = await storage.getWhistleblowingPostById(req.params.id);
      if (!post) {
        return res.status(404).json({ message: "Whistleblowing post not found" });
      }

      // Check if the user is the author or has admin/moderator privileges
      if (post.authorId !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'moderator') {
        return res.status(403).json({ message: "You can only delete your own posts" });
      }

      await storage.deleteWhistleblowingPost(req.params.id);
      res.status(200).json({ message: "Whistleblowing post deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Feed System API
  app.get("/api/feeds/all", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      const userId = req.isAuthenticated() ? req.user.id : undefined;
      const posts = await storage.getAllFeed(limit, offset, userId);
      res.json(posts);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/feeds/following", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      const posts = await storage.getFollowingFeed(req.user.id, limit, offset);
      res.json(posts);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/feeds/news", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      const userId = req.isAuthenticated() ? req.user.id : undefined;
      const posts = await storage.getNewsFeed(limit, offset, userId);
      res.json(posts);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/feeds/my-reps", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const posts = await storage.getMyRepsFeed(req.user.id);
      res.json(posts);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/feeds/my-candidates", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const posts = await storage.getMyCandidatesFeed(req.user.id);
      res.json(posts);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Group feed
  app.get("/api/feeds/group/:groupId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const posts = await storage.getGroupFeed(req.params.groupId);
      res.json(posts);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // User Following API
  app.post("/api/follow", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const followData = insertUserFollowSchema.parse({
        followerId: req.user.id,
        followeeId: req.body.userId,
      });
      await storage.followUser(followData.followerId, followData.followeeId);
      res.status(201).json({ message: "User followed successfully" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/follow/:userId", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      await storage.unfollowUser(req.user.id, req.params.userId);
      res.json({ message: "User unfollowed successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/follow/status/:userId", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const isFollowing = await storage.isFollowing(req.user.id, req.params.userId);
      res.json({ isFollowing });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/users/:userId/followers", async (req, res) => {
    try {
      const followers = await storage.getFollowers(req.params.userId);
      res.json(followers);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/users/:userId/following", async (req, res) => {
    try {
      const following = await storage.getFollowing(req.params.userId);
      res.json(following);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/users/:userId", async (req, res) => {
    try {
      const user = await storage.getUser(req.params.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const followers = await storage.getFollowers(req.params.userId);
      const following = await storage.getFollowing(req.params.userId);
      res.json({
        id: user.id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar,
        bio: user.bio,
        location: user.location,
        createdAt: user.createdAt,
        followersCount: followers.length,
        followingCount: following.length,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Online status and friends
  app.post("/api/user/lastseen", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      await storage.updateLastSeen(req.user.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/user/friends/online", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const onlineFriends = await storage.getOnlineFriends(req.user.id);
      res.json(onlineFriends);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/user/followers", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const followers = await storage.getFollowers(req.user.id);
      res.json(followers);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/user/following", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const following = await storage.getFollowing(req.user.id);
      res.json(following);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/user/friends/count", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      // Use the friendships system (accepted friend requests) for accurate count
      const friends = await storage.getFriends(req.user.id);
      res.json({ friendCount: friends.length });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Contact Upload & Friend Discovery API
  app.post("/api/contacts/upload", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const { contacts } = req.body;
      if (!Array.isArray(contacts)) {
        return res.status(400).json({ message: "Contacts must be an array" });
      }

      // Normalize and hash contacts server-side for security
      const crypto = await import('crypto');
      const processedContacts = contacts.map((c: any) => {
        const processed: any = { name: c.name };
        
        if (c.phone) {
          // Normalize phone: remove non-digits, ensure E.164 format
          const normalizedPhone = c.phone.replace(/\D/g, '').slice(-10);
          processed.phoneHash = crypto.createHash('sha256').update(normalizedPhone).digest('hex');
          processed.phoneLast4 = normalizedPhone.slice(-4);
        }
        
        if (c.email) {
          // Normalize email: lowercase
          const normalizedEmail = c.email.toLowerCase().trim();
          processed.emailHash = crypto.createHash('sha256').update(normalizedEmail).digest('hex');
        }
        
        return processed;
      });

      const result = await storage.uploadUserContacts(req.user.id, processedContacts);
      res.json({
        matched: result.matched,
        matchedCount: result.matched.length,
        unmatchedCount: result.unmatchedCount,
        totalProcessed: contacts.length,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/contacts", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const contacts = await storage.getUserContacts(req.user.id);
      res.json(contacts);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/contacts/matches", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const matches = await storage.getMatchedContacts(req.user.id);
      res.json(matches);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/contacts", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      await storage.deleteUserContacts(req.user.id);
      res.json({ message: "Contacts deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/friends/suggestions", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const limit = parseInt(req.query.limit as string) || 30;
      const suggestions = await storage.getFriendSuggestions(req.user.id, limit);
      res.json(suggestions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/suggestions/:suggestedUserId/dismiss", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      await storage.dismissFriendSuggestion(req.user.id, req.params.suggestedUserId);
      res.json({ message: "Suggestion dismissed" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/friendships/request", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const addresseeId = req.body.addresseeId || req.body.recipientId;
      if (!addresseeId) {
        return res.status(400).json({ message: "addresseeId or recipientId is required" });
      }
      if (addresseeId === req.user.id) {
        return res.status(400).json({ message: "Cannot send friend request to yourself" });
      }
      
      // Check if friendship already exists
      const existingFriendship = await storage.getFriendshipStatus(req.user.id, addresseeId);
      if (existingFriendship) {
        if (existingFriendship.status === 'accepted') {
          return res.status(400).json({ message: "You are already friends with this user" });
        }
        if (existingFriendship.status === 'pending') {
          return res.status(400).json({ message: "A friend request already exists" });
        }
        if (existingFriendship.status === 'blocked') {
          return res.status(400).json({ message: "Cannot send friend request to this user" });
        }
      }
      
      await storage.createFriendshipPending(req.user.id, addresseeId);
      res.status(201).json({ message: "Friend request sent" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/friendships/:friendshipId/accept", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      await storage.acceptFriendship(req.params.friendshipId);
      res.json({ message: "Friend request accepted" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/friendships/:friendshipId/reject", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      await storage.rejectFriendship(req.params.friendshipId);
      res.json({ message: "Friend request rejected" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/friends", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const friends = await storage.getFriends(req.user.id);
      res.json(friends);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/friends/requests", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const requests = await storage.getFriendRequests(req.user.id);
      res.json(requests);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/friends/requests/sent", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const requests = await storage.getSentFriendRequests(req.user.id);
      res.json(requests);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/friendships/status/:userId", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const status = await storage.getFriendshipStatus(req.user.id, req.params.userId);
      res.json(status || { status: 'none' });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/friendships/:friendshipId/cancel", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      await storage.cancelFriendRequest(req.params.friendshipId, req.user.id);
      res.json({ message: "Friend request cancelled" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/friends/:userId", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      await storage.unfriend(req.user.id, req.params.userId);
      res.json({ message: "Friend removed" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/friends/mutual/:userId", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const count = await storage.getMutualFriendsCount(req.user.id, req.params.userId);
      res.json({ mutualCount: count });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // User Search API (search by username, email, or name)
  app.get("/api/users/search", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const query = req.query.q as string;
      if (!query || query.length < 2) {
        return res.status(400).json({ message: "Search query must be at least 2 characters" });
      }

      const users = await storage.searchUsersByEmailOrUsername(query, req.user.id);
      
      // Return safe user data (exclude password and sensitive info)
      const safeUsers = users.map(u => ({
        id: u.id,
        username: u.username,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        avatar: u.avatar,
        role: u.role,
      }));
      
      res.json(safeUsers);
    } catch (error: any) {
      console.error("User search error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Enhanced Reactions API
  app.post("/api/reactions", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const reactionData = insertReactionSchema.parse({
        userId: req.user.id,
        postId: req.body.postId,
        type: req.body.type,
        emoji: req.body.emoji || undefined,
      });
      await storage.addReaction(reactionData.userId, reactionData.postId, reactionData.type, reactionData.emoji || undefined);
      res.status(201).json({ message: "Reaction added successfully" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/reactions/:postId/:type", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      await storage.removeReaction(req.user.id, req.params.postId, req.params.type);
      res.json({ message: "Reaction removed successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/reactions/:postId", async (req, res) => {
    try {
      const reactions = await storage.getPostReactions(req.params.postId);
      res.json(reactions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/reactions/:postId/:type/status", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const hasReaction = await storage.getUserReaction(req.user.id, req.params.postId, req.params.type);
      res.json({ hasReaction });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Bias Voting API
  app.post("/api/bias-votes", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const voteData = insertBiasVoteSchema.parse({
        voterId: req.user.id,
        postId: req.body.postId,
        vote: req.body.vote,
      });
      await storage.voteBias(voteData.voterId, voteData.postId, voteData.vote);
      res.status(201).json({ message: "Bias vote recorded successfully" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/bias-votes/:postId", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      await storage.removeBiasVote(req.user.id, req.params.postId);
      res.json({ message: "Bias vote removed successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/bias-votes/:postId/score", async (req, res) => {
    try {
      const score = await storage.getPostBiasScore(req.params.postId);
      res.json(score);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Polls API
  app.post("/api/polls", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      // Custom validation for poll creation since frontend sends different structure
      const { title, description, options, votingType, isBlockchainVerified, endDate } = req.body;
      
      if (!title || !options || !Array.isArray(options) || options.length < 2) {
        return res.status(400).json({ message: "Poll must have a title and at least 2 options" });
      }

      const pollData = {
        title,
        description: description || null,
        options,
        votingType: votingType || "simple",
        isBlockchainVerified: isBlockchainVerified || false,
        endDate: endDate ? new Date(endDate) : null,
        postId: null,
        blockchainHash: null,
        isActive: true,
      };

      const poll = await storage.createPoll(pollData);
      res.status(201).json(poll);
    } catch (error: any) {
      console.error("Poll creation error:", error);
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/polls", async (req, res) => {
    try {
      const polls = await storage.getActivePolls();
      res.json(polls);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/polls/:id", async (req, res) => {
    try {
      const poll = await storage.getPollById(req.params.id);
      if (!poll) {
        return res.status(404).json({ message: "Poll not found" });
      }
      res.json(poll);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/polls/:id/vote", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const { optionId } = req.body;
      await storage.votePoll(req.params.id, req.user.id, optionId);
      res.json({ message: "Vote cast successfully" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/polls/:id/my-vote", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const vote = await storage.getPollVote(req.params.id, req.user.id);
      res.json({ optionId: vote });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/polls/:id/comments", async (req, res) => {
    try {
      const comments = await storage.getCommentsByPoll(req.params.id);
      res.json(comments);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/polls/:id/comments", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const { content } = req.body;
      const comment = await storage.createPollComment(req.params.id, req.user.id, content);
      res.status(201).json(comment);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/polls/:id/close", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    // Only admins can close polls
    if (req.user.role !== 'admin') {
      return res.sendStatus(403);
    }

    try {
      await storage.closePoll(req.params.id);
      res.json({ message: "Poll closed successfully" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Get featured polls (public endpoint)
  app.get("/api/polls/featured", async (req, res) => {
    try {
      const featuredPolls = await storage.getFeaturedPolls();
      res.json(featuredPolls);
    } catch (error: any) {
      console.error("Get featured polls error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get trending hashtags (public endpoint)
  app.get("/api/trending-hashtags", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const hoursAgo = req.query.hoursAgo ? parseInt(req.query.hoursAgo as string) : 72;
      const trendingHashtags = await storage.getTrendingHashtags(limit, hoursAgo);
      res.json(trendingHashtags);
    } catch (error: any) {
      console.error("Get trending hashtags error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Toggle featured status for a poll (admin only)
  app.patch("/api/admin/polls/:id/featured", ensureAdmin, async (req, res) => {
    try {
      const { featured } = z.object({ featured: z.boolean() }).parse(req.body);
      const poll = await storage.updatePoll(req.params.id, { featured });
      res.json(poll);
    } catch (error: any) {
      console.error("Admin toggle featured poll error:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Validation error: featured must be a boolean" });
      }
      res.status(500).json({ message: error.message });
    }
  });

  // Groups API
  app.get("/api/groups", async (req, res) => {
    try {
      const groups = await storage.getGroups();
      res.json(groups);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/groups/:id", async (req, res) => {
    try {
      const group = await storage.getGroupById(req.params.id);
      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }
      res.json(group);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/groups", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const groupData = insertGroupSchema.parse({
        ...req.body,
        createdBy: req.user.id,
      });
      const group = await storage.createGroup(groupData);
      res.status(201).json(group);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/groups/user/:userId", async (req, res) => {
    try {
      const groups = await storage.getUserGroups(req.params.userId);
      res.json(groups);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/groups/:id/join", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      await storage.joinGroup(req.params.id, req.user.id);
      res.json({ message: "Joined group successfully" });
    } catch (error: any) {
      console.error("Group join error:", error.message);
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/groups/:id/leave", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      await storage.leaveGroup(req.params.id, req.user.id);
      res.json({ message: "Left group successfully" });
    } catch (error: any) {
      console.error("Group leave error:", error.message);
      res.status(400).json({ message: error.message });
    }
  });

  // Check group membership status
  app.get("/api/groups/:id/membership", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const isMember = await storage.isGroupMember(req.params.id, req.user.id);
      const memberCount = await storage.getGroupMemberCount(req.params.id);
      res.json({ 
        isMember, 
        memberCount,
        userId: req.user.id,
        groupId: req.params.id 
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Admin endpoint to recalculate member counts
  app.post("/api/groups/recalculate-counts", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    if (req.user.role !== 'admin') {
      return res.sendStatus(403);
    }

    try {
      await storage.recalculateGroupMemberCounts();
      res.json({ message: "Group member counts recalculated successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Comments API
  app.get("/api/posts/:postId/comments", async (req, res) => {
    try {
      const comments = await storage.getCommentsByPost(req.params.postId);
      res.json(comments);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/comments", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const commentData = insertCommentSchema.parse({
        ...req.body,
        authorId: req.user.id,
      });
      const comment = await storage.createComment(commentData);
      res.status(201).json(comment);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/comments/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      // Get the comment to check ownership - using storage method for consistency
      const comment = await storage.getCommentById(req.params.id);
      if (!comment) {
        return res.status(404).json({ message: "Comment not found" });
      }

      // Check if the user is the author or has admin/moderator privileges
      if (comment.authorId !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'moderator') {
        return res.status(403).json({ message: "You can only delete your own comments" });
      }

      await storage.deleteComment(req.params.id);
      res.status(200).json({ message: "Comment deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Likes API
  app.post("/api/likes", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const { targetId, targetType } = req.body;
      const liked = await storage.toggleLike(req.user.id, targetId, targetType);
      res.json({ liked });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/likes/:targetId/:targetType", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const { targetId, targetType } = req.params;
      const liked = await storage.getLikeStatus(req.user.id, targetId, targetType);
      res.json({ liked });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Flags API
  app.post("/api/flags", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const flagData = insertFlagSchema.parse({
        ...req.body,
        userId: req.user.id,
      });
      const flag = await storage.createFlag(flagData);
      res.status(201).json(flag);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Candidates API
  app.get("/api/candidates", async (req, res) => {
    try {
      const candidates = await storage.getCandidatesWithUserData();
      res.json(candidates);
    } catch (error: any) {
      console.error("Error fetching candidates:", error);
      res.status(500).json({ message: "Failed to fetch candidates" });
    }
  });

  app.get("/api/candidates/:id", async (req, res) => {
    try {
      const candidate = await storage.getCandidateWithUserData(req.params.id);
      if (!candidate) {
        return res.status(404).json({ message: "Candidate not found" });
      }
      res.json(candidate);
    } catch (error: any) {
      console.error("Error fetching candidate:", error);
      res.status(500).json({ message: "Failed to fetch candidate" });
    }
  });

  app.post("/api/candidates", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      // Check if user already has a candidacy
      const existingCandidate = await storage.getCandidateByUserId(req.user.id);
      if (existingCandidate) {
        return res.status(400).json({ message: "You have already declared candidacy" });
      }

      const candidateData = insertCandidateSchema.parse({
        ...req.body,
        userId: req.user.id,
      });
      const candidate = await storage.createCandidate(candidateData);
      res.status(201).json(candidate);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/candidates/user/:userId", async (req, res) => {
    try {
      const candidate = await storage.getCandidateByUserId(req.params.userId);
      if (!candidate) {
        return res.status(404).json({ message: "No candidacy found for this user" });
      }
      res.json(candidate);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/candidates/:id/support", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const candidate = await storage.getCandidateById(req.params.id);
      if (!candidate) {
        return res.status(404).json({ message: "Candidate not found" });
      }

      // Check if user is trying to support their own candidacy
      if (candidate.userId === req.user.id) {
        return res.status(400).json({ message: "You cannot support your own candidacy" });
      }

      const success = await storage.supportCandidate(req.params.id, req.user.id);
      
      if (success) {
        res.json({ message: "Support added successfully", isSupporting: true });
      } else {
        res.status(400).json({ message: "You are already supporting this candidate" });
      }
    } catch (error: any) {
      console.error("Error supporting candidate:", error);
      res.status(500).json({ message: "Failed to support candidate" });
    }
  });

  app.delete("/api/candidates/:id/support", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const candidate = await storage.getCandidateById(req.params.id);
      if (!candidate) {
        return res.status(404).json({ message: "Candidate not found" });
      }

      const success = await storage.unsupportCandidate(req.params.id, req.user.id);
      
      if (success) {
        res.json({ message: "Support removed successfully", isSupporting: false });
      } else {
        res.status(400).json({ message: "You are not supporting this candidate" });
      }
    } catch (error: any) {
      console.error("Error unsupporting candidate:", error);
      res.status(500).json({ message: "Failed to remove support" });
    }
  });

  app.get("/api/candidates/:id/support-status", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const isSupporting = await storage.checkCandidateSupport(req.params.id, req.user.id);
      res.json({ isSupporting });
    } catch (error: any) {
      console.error("Error checking support status:", error);
      res.status(500).json({ message: "Failed to check support status" });
    }
  });

  app.get("/api/candidates/:id/supporters", async (req, res) => {
    try {
      const supporters = await storage.getCandidateSupporters(req.params.id);
      res.json(supporters);
    } catch (error: any) {
      console.error("Error fetching supporters:", error);
      res.status(500).json({ message: "Failed to fetch supporters" });
    }
  });

  // Messages API
  app.get("/api/messages", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const messages = await storage.getMessages(req.user.id);
      res.json(messages);
    } catch (error: any) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.get("/api/conversations", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const conversations = await storage.getConversationsList(req.user.id);
      res.json(conversations);
    } catch (error: any) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  app.get("/api/conversations/:userId", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const messages = await storage.getConversation(req.user.id, req.params.userId);
      res.json(messages);
    } catch (error: any) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({ message: "Failed to fetch conversation" });
    }
  });

  app.get("/api/messages/unread-count", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const count = await storage.getUnreadMessageCount(req.user.id);
      res.json({ count });
    } catch (error: any) {
      console.error("Error fetching unread count:", error);
      res.status(500).json({ message: "Failed to fetch unread count" });
    }
  });

  app.get("/api/users/messaging", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const users = await storage.getUsersForMessaging();
      // Filter out the current user
      const filteredUsers = users.filter(user => user.id !== req.user.id);
      res.json(filteredUsers);
    } catch (error: any) {
      console.error("Error fetching users for messaging:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post("/api/messages", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const { recipientId, content } = req.body;

      if (!recipientId || !content) {
        return res.status(400).json({ message: "Recipient ID and content are required" });
      }

      if (content.trim().length === 0) {
        return res.status(400).json({ message: "Message content cannot be empty" });
      }

      if (content.length > 2000) {
        return res.status(400).json({ message: "Message too long. Maximum 2000 characters." });
      }

      const messageData = insertMessageSchema.parse({
        recipientId,
        content: content.trim(),
        senderId: req.user.id,
      });
      
      const message = await storage.sendMessage(messageData);
      res.status(201).json(message);
    } catch (error: any) {
      console.error("Error sending message:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid message data" });
      }
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  app.patch("/api/messages/:id/read", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      await storage.markMessageRead(req.params.id);
      res.json({ message: "Message marked as read" });
    } catch (error: any) {
      console.error("Error marking message as read:", error);
      res.status(500).json({ message: "Failed to mark message as read" });
    }
  });

  // Channels API
  app.get("/api/channels", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const channels = await storage.getChannels();
      res.json(channels);
    } catch (error: any) {
      console.error("Error fetching channels:", error);
      res.status(500).json({ message: "Failed to fetch channels" });
    }
  });

  app.get("/api/channels/user", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const channels = await storage.getUserChannels(req.user.id);
      res.json(channels);
    } catch (error: any) {
      console.error("Error fetching user channels:", error);
      res.status(500).json({ message: "Failed to fetch user channels" });
    }
  });

  app.get("/api/channels/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const channel = await storage.getChannelById(req.params.id);
      if (!channel) {
        return res.status(404).json({ message: "Channel not found" });
      }

      // Check if user is a member
      const isMember = await storage.isChannelMember(req.params.id, req.user.id);
      if (!isMember && channel.type === "private") {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(channel);
    } catch (error: any) {
      console.error("Error fetching channel:", error);
      res.status(500).json({ message: "Failed to fetch channel" });
    }
  });

  app.post("/api/channels", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const channelData = insertChannelSchema.parse({
        ...req.body,
        createdBy: req.user.id,
      });

      const channel = await storage.createChannel(channelData);
      res.status(201).json(channel);
    } catch (error: any) {
      console.error("Error creating channel:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid channel data" });
      }
      res.status(500).json({ message: "Failed to create channel" });
    }
  });

  app.post("/api/channels/:id/join", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const { role } = req.body;
      await storage.joinChannel(req.params.id, req.user.id, role || "member");
      res.json({ message: "Joined channel successfully" });
    } catch (error: any) {
      console.error("Error joining channel:", error);
      res.status(500).json({ message: "Failed to join channel" });
    }
  });

  app.post("/api/channels/:id/leave", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      await storage.leaveChannel(req.params.id, req.user.id);
      res.json({ message: "Left channel successfully" });
    } catch (error: any) {
      console.error("Error leaving channel:", error);
      res.status(500).json({ message: "Failed to leave channel" });
    }
  });

  app.get("/api/channels/:id/members", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      // Check if user is a member
      const isMember = await storage.isChannelMember(req.params.id, req.user.id);
      if (!isMember) {
        return res.status(403).json({ message: "Access denied" });
      }

      const members = await storage.getChannelMembers(req.params.id);
      res.json(members);
    } catch (error: any) {
      console.error("Error fetching channel members:", error);
      res.status(500).json({ message: "Failed to fetch channel members" });
    }
  });

  // Channel Messages API
  app.get("/api/channels/:id/messages", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      // Check if user is a member
      const isMember = await storage.isChannelMember(req.params.id, req.user.id);
      if (!isMember) {
        return res.status(403).json({ message: "Access denied" });
      }

      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      
      const messages = await storage.getChannelMessages(req.params.id, limit, offset);
      res.json(messages);
    } catch (error: any) {
      console.error("Error fetching channel messages:", error);
      res.status(500).json({ message: "Failed to fetch channel messages" });
    }
  });

  app.post("/api/channels/:id/messages", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      // Check if user is a member
      const isMember = await storage.isChannelMember(req.params.id, req.user.id);
      if (!isMember) {
        return res.status(403).json({ message: "Access denied" });
      }

      const { content, messageType, attachmentUrl, replyToId } = req.body;

      if (!content || content.trim().length === 0) {
        return res.status(400).json({ message: "Message content cannot be empty" });
      }

      if (content.length > 2000) {
        return res.status(400).json({ message: "Message too long. Maximum 2000 characters." });
      }

      const messageData = insertChannelMessageSchema.parse({
        channelId: req.params.id,
        senderId: req.user.id,
        content: content.trim(),
        messageType: messageType || "text",
        attachmentUrl,
        replyToId,
      });

      const message = await storage.sendChannelMessage(messageData);
      res.status(201).json(message);
    } catch (error: any) {
      console.error("Error sending channel message:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid message data" });
      }
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  app.patch("/api/channel-messages/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const { content } = req.body;

      if (!content || content.trim().length === 0) {
        return res.status(400).json({ message: "Message content cannot be empty" });
      }

      // Get the message to check ownership
      const message = await storage.getChannelMessage(req.params.id);
      if (!message) {
        return res.status(404).json({ message: "Message not found" });
      }

      if (message.senderId !== req.user.id) {
        return res.status(403).json({ message: "Can only edit your own messages" });
      }

      const editedMessage = await storage.editChannelMessage(req.params.id, content.trim());
      res.json(editedMessage);
    } catch (error: any) {
      console.error("Error editing channel message:", error);
      res.status(500).json({ message: "Failed to edit message" });
    }
  });

  app.delete("/api/channel-messages/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      // Get the message to check ownership
      const message = await storage.getChannelMessage(req.params.id);
      if (!message) {
        return res.status(404).json({ message: "Message not found" });
      }

      if (message.senderId !== req.user.id) {
        return res.status(403).json({ message: "Can only delete your own messages" });
      }

      await storage.deleteChannelMessage(req.params.id);
      res.json({ message: "Message deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting channel message:", error);
      res.status(500).json({ message: "Failed to delete message" });
    }
  });

  // Get channels by group
  app.get("/api/groups/:id/channels", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      // Check if user is a group member
      const isMember = await storage.isGroupMember(req.params.id, req.user.id);
      if (!isMember) {
        return res.status(403).json({ message: "Access denied" });
      }

      const channels = await storage.getChannelsByGroup(req.params.id);
      res.json(channels);
    } catch (error: any) {
      console.error("Error fetching group channels:", error);
      res.status(500).json({ message: "Failed to fetch group channels" });
    }
  });

  // Test endpoint for API key validation
  app.get("/api/representatives/test", async (req, res) => {
    try {
      const civicApiKey = process.env.GOOGLE_CIVIC_API_KEY;
      if (!civicApiKey) {
        return res.status(500).json({ message: "Civic API key not configured" });
      }

      console.log('Testing Google Civic API...');
      
      // Test with a simple request to validate the API key
      const testUrl = `https://www.googleapis.com/civicinfo/v2/representatives?key=${civicApiKey}&address=1600%20Pennsylvania%20Avenue%20NW,%20Washington,%20DC%2020500`;
      
      const response = await fetch(testUrl);
      const data = await response.json();
      
      console.log('Test API response status:', response.status);
      console.log('Test API response data:', JSON.stringify(data, null, 2));
      
      if (!response.ok) {
        return res.status(response.status).json({ 
          message: `API Test Failed: ${data.error?.message || 'Unknown error'}`,
          details: data 
        });
      }
      
      res.json({ 
        message: "API key is working", 
        sampleData: {
          foundOffices: data.offices?.length || 0,
          foundOfficials: data.officials?.length || 0
        }
      });
    } catch (error: unknown) {
      console.error('Test endpoint error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ message });
    }
  });

  // Representatives API
  app.post("/api/representatives/search", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const { address } = req.body;
      
      if (!address) {
        return res.status(400).json({ message: "Address is required" });
      }

      // Use Google Civic Information API to get representatives
      const civicApiKey = process.env.GOOGLE_CIVIC_API_KEY;
      if (!civicApiKey) {
        return res.status(500).json({ message: "Civic API key not configured" });
      }

      // Google retired the Representatives API, so we use Divisions API + our curated data
      console.log('Using Divisions API (Representatives API retired by Google)');
      const divisionsUrl = `https://www.googleapis.com/civicinfo/v2/divisions?query=${encodeURIComponent(address)}&key=${civicApiKey}`;
      
      console.log('Civic API URL:', divisionsUrl.replace(civicApiKey, 'API_KEY_HIDDEN'));
      
      const response = await fetch(divisionsUrl);
      let civicData;
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Divisions API failed:', response.status, errorText);
        
        // Use our curated representative data
        console.log('Using curated representative data');
        const { createFallbackRepresentativeData } = await import('./lib/representatives-fallback');
        civicData = createFallbackRepresentativeData(address);
      } else {
        const divisionsData = await response.json();
        console.log('Divisions API success, transforming data...');
        civicData = await transformDivisionsToRepresentatives(divisionsData, address);
      }
      
      // Save user's search for future reference
      if (req.user.id) {
        await storage.saveUserAddress(req.user.id, address);
      }
      
      res.json(civicData);
    } catch (error: any) {
      console.error("Representatives search error:", error);
      res.status(500).json({ message: error.message || "Failed to search representatives" });
    }
  });

  app.post("/api/representatives/follow", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const { name, office, party } = req.body;
      
      await storage.followRepresentative(req.user.id, {
        name,
        office,
        party,
      });
      
      res.json({ message: "Representative followed successfully" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/representatives/followed", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const followed = await storage.getFollowedRepresentatives(req.user.id);
      res.json(followed);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Public endpoint: list all current politicians with SIG data, sorted by grade (A first)
  app.get("/api/reps/list", async (req, res) => {
    try {
      const politicians = await storage.listPoliticiansWithSigs();
      res.json(politicians);
    } catch (error: any) {
      console.error("Reps list error:", error);
      res.status(500).json({ message: error.message || "Failed to load representatives" });
    }
  });

  // DB-backed zip code → congressional district → politician profiles lookup
  app.get("/api/representatives/by-zip/:zipCode", async (req, res) => {
    const { zipCode } = req.params;
    const zipRegex = /^\d{5}$/;
    if (!zipRegex.test(zipCode)) {
      return res.status(400).json({ message: "Please enter a valid 5-digit zip code." });
    }

    const STATE_FIPS: Record<string, string> = {
      "01": "Alabama", "02": "Alaska", "04": "Arizona", "05": "Arkansas",
      "06": "California", "08": "Colorado", "09": "Connecticut", "10": "Delaware",
      "11": "Washington D.C.", "12": "Florida", "13": "Georgia", "15": "Hawaii",
      "16": "Idaho", "17": "Illinois", "18": "Indiana", "19": "Iowa",
      "20": "Kansas", "21": "Kentucky", "22": "Louisiana", "23": "Maine",
      "24": "Maryland", "25": "Massachusetts", "26": "Michigan", "27": "Minnesota",
      "28": "Mississippi", "29": "Missouri", "30": "Montana", "31": "Nebraska",
      "32": "Nevada", "33": "New Hampshire", "34": "New Jersey", "35": "New Mexico",
      "36": "New York", "37": "North Carolina", "38": "North Dakota", "39": "Ohio",
      "40": "Oklahoma", "41": "Oregon", "42": "Pennsylvania", "44": "Rhode Island",
      "45": "South Carolina", "46": "South Dakota", "47": "Tennessee", "48": "Texas",
      "49": "Utah", "50": "Vermont", "51": "Virginia", "53": "Washington",
      "54": "West Virginia", "55": "Wisconsin", "56": "Wyoming", "72": "Puerto Rico",
    };

    function toOrdinal(n: number): string {
      const s = ["th", "st", "nd", "rd"];
      const v = n % 100;
      return n + (s[(v - 20) % 10] || s[v] || s[0]);
    }

    try {
      // Step 1: Use zippopotam.us to get lat/lng from zip code (free, no key needed)
      let lat: string, lon: string;
      try {
        const zipController = new AbortController();
        const zipTimeout = setTimeout(() => zipController.abort(), 8000);
        const zipRes = await fetch(`https://api.zippopotam.us/us/${zipCode}`, { signal: zipController.signal });
        clearTimeout(zipTimeout);
        if (!zipRes.ok) {
          return res.status(404).json({ message: `Zip code ${zipCode} not found. Please check and try again.` });
        }
        const zipData: any = await zipRes.json();
        const place = zipData?.places?.[0];
        if (!place) {
          return res.status(404).json({ message: `No location data for zip code ${zipCode}.` });
        }
        lat = place.latitude;
        lon = place.longitude;
      } catch {
        return res.status(503).json({ message: "Unable to reach the zip code lookup service. Please try again in a moment." });
      }

      // Step 2: Use Census coordinates API to get congressional district from lat/lng
      let districts: any[] = [];
      try {
        const censusUrl = `https://geocoding.geo.census.gov/geocoder/geographies/coordinates?x=${lon}&y=${lat}&benchmark=Public_AR_Current&vintage=Current_Current&layers=54&format=json`;
        const censusController = new AbortController();
        const censusTimeout = setTimeout(() => censusController.abort(), 8000);
        const censusRes = await fetch(censusUrl, { signal: censusController.signal });
        clearTimeout(censusTimeout);
        const censusData: any = await censusRes.json();
        // Layer name includes the Congress session number (e.g. "119th Congressional Districts")
        const geos = censusData?.result?.geographies ?? {};
        const layerKey = Object.keys(geos).find(k => k.toLowerCase().includes("congressional districts"));
        districts = layerKey ? (geos[layerKey] ?? []) : [];
      } catch {
        return res.status(503).json({ message: "Unable to reach the district lookup service. Please try again in a moment." });
      }

      if (districts.length === 0) {
        return res.status(404).json({ message: `Congressional district not found for zip code ${zipCode}.` });
      }

      // Collect all unique (stateName, districtLabel) pairs for this zip
      const locationSet = new Set<string>();
      const locations: Array<{ stateName: string; districtNum: number; isAtLarge: boolean }> = [];
      for (const d of districts) {
        const stateFips: string = d.STATE ?? "";
        const districtCode: string = d.CD119 ?? d.CD118 ?? d.BASENAME ?? "";
        const stateName = STATE_FIPS[stateFips];
        if (!stateName) continue;
        const districtNum = parseInt(districtCode, 10);
        const isAtLarge = districtNum === 0;
        const key = `${stateName}|${districtNum}`;
        if (!locationSet.has(key)) {
          locationSet.add(key);
          locations.push({ stateName, districtNum, isAtLarge });
        }
      }

      if (locations.length === 0) {
        return res.status(404).json({ message: `Could not determine state for zip code ${zipCode}.` });
      }

      // Build position titles to query
      const primaryState = locations[0].stateName;
      const positionTitles: string[] = [];

      // Both senators for each unique state
      const statesFound = [...new Set(locations.map(l => l.stateName))];
      for (const state of statesFound) {
        positionTitles.push(`U.S. Senator from ${state}`);
      }

      // House rep(s) for each district
      for (const { stateName, districtNum, isAtLarge } of locations) {
        if (isAtLarge) {
          positionTitles.push(`U.S. Representative from ${stateName} (At-Large)`);
        } else {
          const ordinal = toOrdinal(districtNum);
          positionTitles.push(`U.S. Representative, ${stateName}'s ${ordinal} Congressional District`);
        }
      }

      // Use the broader query: match all federal Senate/House politicians by state,
      // including both incumbents (is_current=true) and candidates/challengers.
      const politicians = await storage.getPoliticiansByStateAndDistrict(
        primaryState,
        locations.map(l => l.districtNum)
      );

      const politiciansWithSponsors = await Promise.all(politicians.map(async (p) => {
        const sponsors = await storage.listPoliticianSponsors(p.id);
        const totalAmount = sponsors.reduce((sum: number, s: any) => sum + (s.reportedAmount ?? 0), 0);
        const sigAcronyms = sponsors
          .filter((s: any) => s.sig?.acronym && s.relationshipType !== 'pledged_against')
          .map((s: any) => s.sig.acronym as string);
        const rejectsAIPAC = sponsors.some((s: any) => s.relationshipType === 'pledged_against');
        const demeritsRaw = await storage.getDemeritsByPolitician(p.id);
        const demerits = demeritsRaw.map(d => ({ label: d.label, type: d.type }));
        return { ...p, totalLobbyAmount: totalAmount, sigAcronyms, rejectsAIPAC, demerits };
      }));

      const primaryDistrict = locations[0];
      const districtLabel = primaryDistrict.isAtLarge
        ? "At-Large"
        : `${toOrdinal(primaryDistrict.districtNum)} Congressional District`;

      res.json({
        state: primaryState,
        districtLabel,
        zipCode,
        politicians: politiciansWithSponsors,
      });
    } catch (error: any) {
      console.error("ZIP district lookup error:", error);
      res.status(500).json({ message: error.message || "Lookup failed" });
    }
  });

  // ChatGPT-powered representatives lookup by zip code (regular endpoint)
  app.post("/api/representatives/zip-lookup", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const { zipCode } = req.body;
      
      if (!zipCode) {
        return res.status(400).json({ message: "Zip code is required" });
      }

      // Validate zip code format (5 digits or 5+4 format)
      const zipRegex = /^\d{5}(-\d{4})?$/;
      if (!zipRegex.test(zipCode)) {
        return res.status(400).json({ message: "Invalid zip code format" });
      }

      // Check if we already have representatives for this zip code
      const hasBeenSearched = await storage.hasZipCodeBeenSearched(zipCode);
      
      if (hasBeenSearched) {
        // Return cached results
        const cachedRepresentatives = await storage.getRepresentativesByZipCode(zipCode);
        return res.json({
          representatives: cachedRepresentatives,
          fromCache: true,
          message: "Representatives loaded from database"
        });
      }

      // Check if OpenAI API key is available
      if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({ message: "OpenAI API key not configured" });
      }

      // Use ChatGPT to find representatives
      const representativesData = await findRepresentativesByZipCode(zipCode);
      
      if (representativesData.length === 0) {
        return res.json({
          representatives: [],
          fromCache: false,
          message: "No representatives found for this zip code"
        });
      }

      // Save representatives to database
      const savedRepresentatives = await storage.saveRepresentatives(representativesData);
      const representativeIds = savedRepresentatives.map(rep => rep.id);
      
      // Mark zip code as searched
      await storage.markZipCodeAsSearched(zipCode, representativeIds);

      res.json({
        representatives: savedRepresentatives,
        fromCache: false,
        message: `Found ${savedRepresentatives.length} representatives via ChatGPT`
      });

    } catch (error: any) {
      console.error("ChatGPT representatives lookup error:", error);
      res.status(500).json({ 
        message: error.message || "Failed to find representatives",
        error: "ChatGPT lookup failed"
      });
    }
  });

  // Streaming ChatGPT representatives lookup with progress updates
  app.get("/api/representatives/zip-lookup-stream/:zipCode", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    const { zipCode } = req.params;
    
    // Validate zip code format
    const zipRegex = /^\d{5}(-\d{4})?$/;
    if (!zipRegex.test(zipCode)) {
      return res.status(400).json({ message: "Invalid zip code format" });
    }

    // Setup Server-Sent Events
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    const sendUpdate = (data: any) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    try {
      // Check if already cached
      const hasBeenSearched = await storage.hasZipCodeBeenSearched(zipCode);
      
      if (hasBeenSearched) {
        sendUpdate({ type: 'progress', step: 'cache', message: 'Loading from database...', progress: 0 });
        await new Promise(resolve => setTimeout(resolve, 500)); // Brief delay for UX
        
        const cachedRepresentatives = await storage.getRepresentativesByZipCode(zipCode);
        sendUpdate({ type: 'progress', step: 'complete', message: 'Loaded from cache', progress: 100 });
        sendUpdate({ type: 'complete', representatives: cachedRepresentatives, fromCache: true });
        return res.end();
      }

      // Check OpenAI API key
      if (!process.env.OPENAI_API_KEY) {
        sendUpdate({ type: 'error', message: 'OpenAI API key not configured' });
        return res.end();
      }

      // Start ChatGPT search with progress updates
      sendUpdate({ type: 'progress', step: 'searching', message: 'Asking ChatGPT to find representatives...', progress: 10 });
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      sendUpdate({ type: 'progress', step: 'analyzing', message: 'Analyzing zip code location...', progress: 25 });
      
      await new Promise(resolve => setTimeout(resolve, 800));
      sendUpdate({ type: 'progress', step: 'federal', message: 'Finding federal representatives...', progress: 40 });
      
      await new Promise(resolve => setTimeout(resolve, 600));
      sendUpdate({ type: 'progress', step: 'state', message: 'Finding state officials...', progress: 60 });
      
      await new Promise(resolve => setTimeout(resolve, 500));
      sendUpdate({ type: 'progress', step: 'local', message: 'Finding local officials...', progress: 80 });

      // Actually call ChatGPT
      const representativesData = await findRepresentativesByZipCode(zipCode);
      
      if (representativesData.length === 0) {
        sendUpdate({ type: 'complete', representatives: [], fromCache: false, message: 'No representatives found' });
        return res.end();
      }

      sendUpdate({ type: 'progress', step: 'saving', message: `Found ${representativesData.length} representatives! Loading them...`, progress: 85 });
      
      // Lazy load: Save and send each representative individually as they're found
      const savedRepresentatives: any[] = [];
      const progressStep = 10 / representativesData.length; // Remaining 10% split across all reps
      
      for (let i = 0; i < representativesData.length; i++) {
        const rep = representativesData[i];
        
        try {
          // Save individual representative to database
          const [savedRep] = await storage.saveRepresentatives([rep]);
          savedRepresentatives.push(savedRep);
          
          // Send immediately to frontend for lazy loading
          sendUpdate({ 
            type: 'candidate_found', 
            representative: savedRep,
            name: savedRep.name, 
            office: savedRep.office,
            level: savedRep.level,
            party: savedRep.party,
            message: `Found: ${savedRep.name} - ${savedRep.office}`,
            progress: 85 + ((i + 1) * progressStep)
          });
          
          // Small delay for smooth UX
          await new Promise(resolve => setTimeout(resolve, 300));
          
        } catch (error) {
          console.error(`Error saving representative ${rep.name}:`, error);
          // Continue with next representative
        }
      }

      // Mark zip code as searched with all found representative IDs
      const representativeIds = savedRepresentatives.map(rep => rep.id);
      await storage.markZipCodeAsSearched(zipCode, representativeIds);

      sendUpdate({ type: 'progress', step: 'complete', message: 'Search complete!', progress: 100 });
      sendUpdate({ type: 'complete', representatives: savedRepresentatives, fromCache: false, totalFound: savedRepresentatives.length });
      
    } catch (error: any) {
      console.error("Streaming representatives lookup error:", error);
      sendUpdate({ type: 'error', message: error.message || 'Failed to find representatives' });
    }
    
    res.end();
  });

  // Representative Auto-Refresh Endpoint
  app.get("/api/representatives/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const { id } = req.params;
      
      // Auto-refresh representative if term has expired
      const refreshedRepresentative = await storage.refreshRepresentativeIfExpired(id);
      
      if (!refreshedRepresentative) {
        return res.status(404).json({ message: "Representative not found" });
      }

      res.json(refreshedRepresentative);
    } catch (error: any) {
      console.error("Error getting representative:", error);
      res.status(500).json({ message: error.message || "Failed to get representative" });
    }
  });

  // Boycott API endpoints
  app.get("/api/boycotts", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const tag = req.query.tag as string;

      let boycotts;
      if (tag) {
        boycotts = await storage.getBoycottsByTag(tag);
      } else {
        boycotts = await storage.getBoycotts(limit, offset);
      }

      res.json(boycotts);
    } catch (error: any) {
      console.error("Error fetching boycotts:", error);
      res.status(500).json({ message: "Failed to fetch boycotts" });
    }
  });

  app.get("/api/boycotts/:id", async (req, res) => {
    try {
      const boycott = await storage.getBoycottById(req.params.id);
      if (!boycott) {
        return res.status(404).json({ message: "Boycott not found" });
      }
      res.json(boycott);
    } catch (error: any) {
      console.error("Error fetching boycott:", error);
      res.status(500).json({ message: "Failed to fetch boycott" });
    }
  });

  app.post("/api/boycotts", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const { insertBoycottSchema } = await import("@shared/schema");
      const validatedData = insertBoycottSchema.parse({
        ...req.body,
        creatorId: req.user.id,
      });

      const newBoycott = await storage.createBoycott(validatedData);
      res.status(201).json(newBoycott);
    } catch (error: any) {
      console.error("Error creating boycott:", error);
      if (error.name === 'ZodError') {
        res.status(400).json({ message: "Invalid boycott data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create boycott" });
      }
    }
  });

  app.put("/api/boycotts/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const boycott = await storage.getBoycottById(req.params.id);
      if (!boycott) {
        return res.status(404).json({ message: "Boycott not found" });
      }

      if (boycott.creatorId !== req.user.id && req.user.role !== "admin") {
        return res.status(403).json({ message: "Not authorized to update this boycott" });
      }

      const updatedBoycott = await storage.updateBoycott(req.params.id, req.body);
      res.json(updatedBoycott);
    } catch (error: any) {
      console.error("Error updating boycott:", error);
      res.status(500).json({ message: "Failed to update boycott" });
    }
  });

  app.delete("/api/boycotts/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const boycott = await storage.getBoycottById(req.params.id);
      if (!boycott) {
        return res.status(404).json({ message: "Boycott not found" });
      }

      if (boycott.creatorId !== req.user.id && req.user.role !== "admin") {
        return res.status(403).json({ message: "Not authorized to delete this boycott" });
      }

      await storage.deleteBoycott(req.params.id);
      res.json({ message: "Boycott deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting boycott:", error);
      res.status(500).json({ message: "Failed to delete boycott" });
    }
  });

  // Boycott subscription endpoints
  app.post("/api/boycotts/:id/subscribe", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const success = await storage.subscribeToBoycott(req.params.id, req.user.id);
      if (success) {
        res.json({ message: "Subscribed to boycott successfully" });
      } else {
        res.status(400).json({ message: "Already subscribed to this boycott" });
      }
    } catch (error: any) {
      console.error("Error subscribing to boycott:", error);
      res.status(500).json({ message: "Failed to subscribe to boycott" });
    }
  });

  app.delete("/api/boycotts/:id/subscribe", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const success = await storage.unsubscribeFromBoycott(req.params.id, req.user.id);
      if (success) {
        res.json({ message: "Unsubscribed from boycott successfully" });
      } else {
        res.status(400).json({ message: "Not subscribed to this boycott" });
      }
    } catch (error: any) {
      console.error("Error unsubscribing from boycott:", error);
      res.status(500).json({ message: "Failed to unsubscribe from boycott" });
    }
  });

  app.get("/api/boycotts/:id/subscription", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const isSubscribed = await storage.isSubscribedToBoycott(req.params.id, req.user.id);
      res.json({ isSubscribed });
    } catch (error: any) {
      console.error("Error checking boycott subscription:", error);
      res.status(500).json({ message: "Failed to check subscription" });
    }
  });

  app.get("/api/boycotts/:id/subscribers", async (req, res) => {
    try {
      const subscribers = await storage.getBoycottSubscribers(req.params.id);
      res.json(subscribers);
    } catch (error: any) {
      console.error("Error fetching boycott subscribers:", error);
      res.status(500).json({ message: "Failed to fetch subscribers" });
    }
  });

  app.get("/api/user/boycotts", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const boycotts = await storage.getUserBoycottSubscriptions(req.user.id);
      res.json(boycotts);
    } catch (error: any) {
      console.error("Error fetching user boycotts:", error);
      res.status(500).json({ message: "Failed to fetch user boycotts" });
    }
  });

  // Social Petitions API endpoints (different from initiative petitions)
  app.get("/api/petitions", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const petitions = await storage.getSocialPetitions(limit, offset);
      res.json(petitions);
    } catch (error: any) {
      console.error("Error fetching petitions:", error);
      res.status(500).json({ message: "Failed to fetch petitions" });
    }
  });

  app.post("/api/petitions", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const petitionData = {
        ...req.body,
        creatorId: req.user.id,
      };
      const petition = await storage.createSocialPetition(petitionData);
      res.status(201).json(petition);
    } catch (error: any) {
      console.error("Error creating petition:", error);
      res.status(500).json({ message: "Failed to create petition" });
    }
  });

  app.post("/api/petitions/:id/sign", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const { isAnonymous = false } = req.body;
      
      // Check if user already signed
      const existingSignature = await storage.getUserSocialPetitionSignature(req.params.id, req.user.id);
      if (existingSignature) {
        return res.status(400).json({ message: "You have already signed this petition" });
      }

      await storage.signSocialPetition(req.params.id, req.user.id, isAnonymous);
      res.json({ message: "Petition signed successfully" });
    } catch (error: any) {
      console.error("Error signing petition:", error);
      res.status(500).json({ message: "Failed to sign petition" });
    }
  });

  app.get("/api/petitions/:id/signature", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const signature = await storage.getUserSocialPetitionSignature(req.params.id, req.user.id);
      res.json({ hasSigned: !!signature });
    } catch (error: any) {
      console.error("Error checking petition signature:", error);
      res.status(500).json({ message: "Failed to check signature" });
    }
  });

  // Unions API endpoints
  app.get("/api/unions", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const unions = await storage.getUnions(limit, offset);
      res.json(unions);
    } catch (error: any) {
      console.error("Error fetching unions:", error);
      res.status(500).json({ message: "Failed to fetch unions" });
    }
  });

  app.get("/api/unions/:id", async (req, res) => {
    try {
      const union = await storage.getUnionById(req.params.id);
      if (!union) {
        return res.status(404).json({ message: "Union not found" });
      }
      res.json(union);
    } catch (error: any) {
      console.error("Error fetching union:", error);
      res.status(500).json({ message: "Failed to fetch union" });
    }
  });

  app.post("/api/unions", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const union = await storage.createUnion(req.body);
      res.status(201).json(union);
    } catch (error: any) {
      console.error("Error creating union:", error);
      res.status(500).json({ message: "Failed to create union" });
    }
  });

  app.post("/api/unions/:id/join", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const isMember = await storage.isUnionMember(req.params.id, req.user.id);
      if (isMember) {
        return res.status(400).json({ message: "You are already a member of this union" });
      }

      await storage.joinUnion(req.params.id, req.user.id);
      res.json({ message: "Joined union successfully" });
    } catch (error: any) {
      console.error("Error joining union:", error);
      res.status(500).json({ message: "Failed to join union" });
    }
  });

  app.post("/api/unions/:id/leave", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const isMember = await storage.isUnionMember(req.params.id, req.user.id);
      if (!isMember) {
        return res.status(400).json({ message: "You are not a member of this union" });
      }

      await storage.leaveUnion(req.params.id, req.user.id);
      res.json({ message: "Left union successfully" });
    } catch (error: any) {
      console.error("Error leaving union:", error);
      res.status(500).json({ message: "Failed to leave union" });
    }
  });

  app.get("/api/unions/:id/membership", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const isMember = await storage.isUnionMember(req.params.id, req.user.id);
      res.json({ isMember });
    } catch (error: any) {
      console.error("Error checking union membership:", error);
      res.status(500).json({ message: "Failed to check membership" });
    }
  });

  // Object Storage API endpoints for profile picture uploads
  const { ObjectStorageService, ObjectNotFoundError, ObjectPermission } = await import("./objectStorage");

  // Endpoint for serving objects (supports both authenticated and public access)
  app.get("/objects/:objectPath(*)", async (req, res) => {
    // Get user ID if authenticated (optional for public objects)
    const userId = req.isAuthenticated() ? req.user.id.toString() : undefined;
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: userId,
        requestedPermission: ObjectPermission.READ,
      });
      if (!canAccess) {
        return res.sendStatus(401);
      }
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error checking object access:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // Endpoint for getting upload URL for profile pictures
  app.post("/api/objects/upload", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      console.log("Generated upload URL:", uploadURL);
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error generating upload URL:", error);
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  });

  // Endpoint for updating user profile picture after upload
  app.put("/api/profile-picture", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    if (!req.body.profilePictureURL) {
      return res.status(400).json({ error: "profilePictureURL is required" });
    }

    const userId = req.user.id;

    try {
      const objectStorageService = new ObjectStorageService();
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        req.body.profilePictureURL,
        {
          owner: userId,
          visibility: "public", // Profile pictures should be publicly viewable
        },
      );

      // Update user avatar in database
      await storage.updateUser(userId, { avatar: objectPath });

      res.status(200).json({
        objectPath: objectPath,
      });
    } catch (error) {
      console.error("Error setting profile picture:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Endpoint for updating user bio
  app.put("/api/profile/bio", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    const { bio } = req.body;
    
    if (typeof bio !== "string") {
      return res.status(400).json({ error: "Bio must be a string" });
    }

    const userId = req.user.id;

    try {
      await storage.updateUser(userId, { bio });
      res.status(200).json({ success: true, bio });
    } catch (error) {
      console.error("Error updating bio:", error);
      res.status(500).json({ error: "Failed to update bio" });
    }
  });

  app.get("/api/user/volunteer-signups", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const signups = await storage.getUserVolunteerSignups(req.user.id);
      res.json(signups);
    } catch (error) {
      console.error("Error fetching user volunteer signups:", error);
      res.status(500).json({ message: "Failed to fetch volunteer signups" });
    }
  });

  app.get("/api/user/vote-count", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const voteCount = await storage.getUserVoteCount(req.user.id);
      res.json({ voteCount });
    } catch (error) {
      console.error("Error getting user vote count:", error);
      res.status(500).json({ message: "Failed to get vote count" });
    }
  });

  app.get("/api/user/donations", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const donations = await storage.getUserDonations(req.user.id);
      res.json(donations);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get user profile by ID
  app.get("/api/user/:id", async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Return user profile data without sensitive information
      const {
        id,
        username,
        firstName,
        lastName,
        bio,
        avatar,
        subscriptionStatus,
        profileTheme,
        profileBackground,
        favoriteSong,
        profileLayout,
        createdAt
      } = user;
      
      res.json({
        id,
        username,
        firstName,
        lastName,
        bio,
        avatar,
        subscriptionStatus,
        profileTheme,
        profileBackground,
        favoriteSong,
        profileLayout,
        createdAt
      });
    } catch (error: any) {
      console.error("Error fetching user profile:", error);
      res.status(500).json({ message: "Failed to fetch user profile" });
    }
  });

  // Events API endpoints
  app.get("/api/events", async (req, res) => {
    try {
      const { limit, offset, city, state, tags } = req.query;
      const filters = {
        city: city as string,
        state: state as string,
        tags: tags ? (tags as string).split(',') : undefined
      };
      
      const events = await storage.getEvents(
        limit ? parseInt(limit as string) : undefined,
        offset ? parseInt(offset as string) : undefined,
        filters
      );
      res.json(events);
    } catch (error) {
      console.error("Error fetching events:", error);
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });

  app.get("/api/events/:id", async (req, res) => {
    try {
      const event = await storage.getEventById(req.params.id);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      res.json(event);
    } catch (error) {
      console.error("Error fetching event:", error);
      res.status(500).json({ message: "Failed to fetch event" });
    }
  });

  app.post("/api/events", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const { insertEventSchema } = await import("@shared/schema");
      const eventData = insertEventSchema.parse({
        ...req.body,
        organizerId: req.user.id
      });
      
      const event = await storage.createEvent(eventData);
      res.status(201).json(event);
    } catch (error: any) {
      console.error("Error creating event:", error);
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/events/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const event = await storage.getEventById(req.params.id);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      // Check if the user is the organizer
      if (event.organizerId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to edit this event" });
      }

      const updatedEvent = await storage.updateEvent(req.params.id, req.body);
      res.json(updatedEvent);
    } catch (error) {
      console.error("Error updating event:", error);
      res.status(500).json({ message: "Failed to update event" });
    }
  });

  app.delete("/api/events/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const event = await storage.getEventById(req.params.id);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      // Check if the user is the organizer
      if (event.organizerId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to delete this event" });
      }

      await storage.deleteEvent(req.params.id);
      res.sendStatus(204);
    } catch (error) {
      console.error("Error deleting event:", error);
      res.status(500).json({ message: "Failed to delete event" });
    }
  });

  // Event registration endpoints
  app.post("/api/events/:id/register", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const { status = "attending" } = req.body;
      const attendee = await storage.registerForEvent(req.params.id, req.user.id, status);
      res.status(201).json(attendee);
    } catch (error) {
      console.error("Error registering for event:", error);
      res.status(500).json({ message: "Failed to register for event" });
    }
  });

  app.delete("/api/events/:id/register", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      await storage.unregisterFromEvent(req.params.id, req.user.id);
      res.sendStatus(204);
    } catch (error) {
      console.error("Error unregistering from event:", error);
      res.status(500).json({ message: "Failed to unregister from event" });
    }
  });

  app.get("/api/events/:id/attendees", async (req, res) => {
    try {
      const attendees = await storage.getEventAttendees(req.params.id);
      res.json(attendees);
    } catch (error) {
      console.error("Error fetching event attendees:", error);
      res.status(500).json({ message: "Failed to fetch attendees" });
    }
  });

  // Volunteer Signup Routes
  app.post("/api/volunteer/:postId/signup", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const { message, phone, email, availability, experience } = req.body;
      const signup = await storage.signUpForVolunteer(req.params.postId, req.user.id, {
        message,
        phone,
        email,
        availability,
        experience
      });
      res.status(201).json(signup);
    } catch (error: any) {
      console.error("Error signing up for volunteer:", error);
      if (error.message === "Already signed up for this volunteer opportunity") {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to sign up for volunteer opportunity" });
    }
  });

  app.delete("/api/volunteer/:postId/signup", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      await storage.withdrawVolunteerSignup(req.params.postId, req.user.id);
      res.sendStatus(204);
    } catch (error) {
      console.error("Error withdrawing from volunteer:", error);
      res.status(500).json({ message: "Failed to withdraw from volunteer opportunity" });
    }
  });

  app.get("/api/volunteer/:postId/signups", async (req, res) => {
    try {
      const signups = await storage.getVolunteerSignups(req.params.postId);
      res.json(signups);
    } catch (error) {
      console.error("Error fetching volunteer signups:", error);
      res.status(500).json({ message: "Failed to fetch volunteer signups" });
    }
  });

  app.get("/api/volunteer/:postId/my-signup", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const signup = await storage.getVolunteerSignupStatus(req.params.postId, req.user.id);
      res.json(signup || null);
    } catch (error) {
      console.error("Error fetching volunteer signup status:", error);
      res.status(500).json({ message: "Failed to fetch signup status" });
    }
  });


  app.patch("/api/volunteer/signups/:signupId/status", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const { status } = req.body;
      if (!status || !["pending", "approved", "declined", "completed", "cancelled"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      const updated = await storage.updateVolunteerSignupStatus(req.params.signupId, status);
      res.json(updated);
    } catch (error) {
      console.error("Error updating volunteer signup status:", error);
      res.status(500).json({ message: "Failed to update signup status" });
    }
  });

  // ACP Cryptocurrency Routes
  app.get("/api/acp/balance", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const balance = await storage.getUserBalance(req.user.id);
      res.json({ balance });
    } catch (error) {
      console.error("Error getting user balance:", error);
      res.status(500).json({ message: "Failed to get balance" });
    }
  });


  app.get("/api/transactions/history", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const transactions = await storage.getTransactionHistory(req.user.id, limit);
      res.json(transactions);
    } catch (error) {
      console.error("Error getting transaction history:", error);
      res.status(500).json({ message: "Failed to get transactions" });
    }
  });

  // Subscription Management Routes
  app.post("/api/subscription/create", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      // Check if user already has active subscription
      const user = await storage.getUser(req.user.id);
      if (user?.subscriptionStatus === "premium" && user?.subscriptionEndDate && new Date(user.subscriptionEndDate) > new Date()) {
        return res.status(400).json({ message: "You already have an active subscription" });
      }
      
      // Validate request data using Zod schema
      const validatedData = createSubscriptionSchema.parse(req.body);
      const { plan, amount, tipAmount } = validatedData;
      
      // Validate plan pricing
      const validPlans = { monthly: 8.99, annual: 79.99 };
      const expectedBaseAmount = validPlans[plan];
      const expectedTotalAmount = expectedBaseAmount + tipAmount;
      
      if (Math.abs(amount - expectedTotalAmount) > 0.01) {
        return res.status(400).json({ message: "Invalid amount for selected plan" });
      }

      // Calculate subscription duration
      const startDate = new Date();
      const endDate = new Date();
      if (plan === "annual") {
        endDate.setFullYear(endDate.getFullYear() + 1);
      } else {
        endDate.setMonth(endDate.getMonth() + 1);
      }

      // Update subscription status
      await storage.updateSubscriptionStatus(req.user.id, "premium", startDate, endDate);
      
      // Award base subscription coins based on plan
      const baseCredits = plan === "annual" ? 108 : 9; // 9 per month, 108 for full year
      let reward;
      
      if (plan === "annual") {
        // Award full year of credits immediately for annual plan
        const transaction = await storage.createTransaction({
          toUserId: req.user.id,
          amount: "108.00000000",
          transactionType: "subscription_reward",
          description: `Annual ACP+ subscription reward for ${startDate.toISOString().split('T')[0]} (108 credits)`,
        });
        
        // Update user balance
        const currentBalance = await storage.getUserBalance(req.user.id);
        const newBalance = (parseFloat(currentBalance) + 108).toFixed(8);
        await storage.updateUserBalance(req.user.id, newBalance);
        
        // Record annual subscription reward
        const [annualReward] = await db.insert(subscriptionRewards).values({
          userId: req.user.id,
          subscriptionMonth: startDate,
          coinsAwarded: "108.00000000",
          transactionId: transaction.id
        }).returning();
        
        reward = annualReward;
      } else {
        // Award monthly credits for monthly plan
        reward = await storage.awardSubscriptionCoins(req.user.id, startDate);
      }
      
      // Award tip credits if any (dollar-for-dollar)
      let tipCredits = 0;
      if (tipAmount > 0) {
        const tipTransaction = await storage.createTransaction({
          toUserId: req.user.id,
          amount: tipAmount.toFixed(8),
          transactionType: "tip_reward",
          description: `Voluntary tip credits: $${tipAmount}`,
        });
        
        // Update user balance with tip credits
        const currentBalance = await storage.getUserBalance(req.user.id);
        const newBalance = (parseFloat(currentBalance) + tipAmount).toFixed(8);
        await storage.updateUserBalance(req.user.id, newBalance);
        tipCredits = tipAmount;
      }
      
      const totalCredits = baseCredits + tipCredits;
      
      res.json({ 
        message: "Subscription created successfully",
        plan,
        amount,
        totalCredits,
        baseCredits,
        tipCredits,
        startDate,
        subscriptionEndDate: endDate
      });
    } catch (error) {
      console.error("Error creating subscription:", error);
      res.status(500).json({ message: "Failed to create subscription" });
    }
  });

  app.post("/api/subscription/activate", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      // Update subscription status
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1);

      await storage.updateSubscriptionStatus(req.user.id, "premium", startDate, endDate);
      
      // Award monthly coins
      const reward = await storage.awardSubscriptionCoins(req.user.id, startDate);
      
      res.json({ 
        message: "Subscription activated successfully",
        coinsAwarded: reward.coinsAwarded,
        subscriptionEndDate: endDate
      });
    } catch (error) {
      console.error("Error activating subscription:", error);
      res.status(500).json({ message: "Failed to activate subscription" });
    }
  });

  // Store and Marketplace Routes
  app.get("/api/store/items", async (req, res) => {
    try {
      const { category, type } = req.query;
      const items = await storage.getStoreItems(
        category as string, 
        type as string
      );
      res.json(items);
    } catch (error) {
      console.error("Error getting store items:", error);
      res.status(500).json({ message: "Failed to get store items" });
    }
  });

  app.post("/api/store/items", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const itemData = {
        ...req.body,
        creatorId: req.user.id
      };
      
      const newItem = await storage.createStoreItem(itemData);
      res.status(201).json(newItem);
    } catch (error) {
      console.error("Error creating store item:", error);
      res.status(500).json({ message: "Failed to create store item" });
    }
  });

  app.post("/api/store/purchase/:itemId", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const { itemId } = req.params;
      const purchase = await storage.purchaseStoreItem(req.user.id, itemId);
      
      res.json({ 
        message: "Item purchased successfully",
        purchase
      });
    } catch (error: any) {
      console.error("Error purchasing item:", error);
      if (error.message === "Insufficient ACP coins" || error.message === "Item already purchased") {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to purchase item" });
    }
  });

  // Profile Customization Routes
  app.put("/api/profile/customize", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const { profileTheme, profileBackground, favoriteSong, profileLayout } = req.body;
      
      const updatedUser = await storage.updateUser(req.user.id, {
        profileTheme,
        profileBackground,
        favoriteSong,
        profileLayout
      });

      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating profile customization:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Charity API Endpoints
  app.get("/api/charities", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      const category = req.query.category as string;
      const isActive = req.query.isActive ? req.query.isActive === "true" : undefined;
      
      const filters = { category, isActive };
      const charities = await storage.getCharities(limit, offset, filters);
      res.json(charities);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/charities/:id", async (req, res) => {
    try {
      const charity = await storage.getCharityById(req.params.id);
      if (!charity) {
        return res.status(404).json({ message: "Charity not found" });
      }
      res.json(charity);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/charities", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const charityData = insertCharitySchema.parse({
        ...req.body,
        creatorId: req.user.id,
      });
      const charity = await storage.createCharity(charityData);
      res.status(201).json(charity);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/charities/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const charity = await storage.getCharityById(req.params.id);
      if (!charity) {
        return res.status(404).json({ message: "Charity not found" });
      }

      // Only charity creator or admin can edit
      if (charity.creatorId !== req.user.id && req.user.role !== "admin") {
        return res.status(403).json({ message: "Not authorized to edit this charity" });
      }

      const updatedCharity = await storage.updateCharity(req.params.id, req.body);
      res.json(updatedCharity);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/charities/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const charity = await storage.getCharityById(req.params.id);
      if (!charity) {
        return res.status(404).json({ message: "Charity not found" });
      }

      // Only charity creator or admin can delete
      if (charity.creatorId !== req.user.id && req.user.role !== "admin") {
        return res.status(403).json({ message: "Not authorized to delete this charity" });
      }

      await storage.deleteCharity(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/charities/user/:userId", async (req, res) => {
    try {
      const charities = await storage.getUserCharities(req.params.userId);
      res.json(charities);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/charities/category/:category", async (req, res) => {
    try {
      const charities = await storage.getCharitiesByCategory(req.params.category);
      res.json(charities);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Charity Donation Endpoints
  app.post("/api/charities/:id/donate", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const { amount, currencyType, isAnonymous, message } = req.body;
      const charityId = req.params.id;
      const userId = req.user.id;

      // Validate charity exists
      const charity = await storage.getCharityById(charityId);
      if (!charity) {
        return res.status(404).json({ message: "Charity not found" });
      }

      if (!charity.isActive) {
        return res.status(400).json({ message: "This charity is no longer accepting donations" });
      }

      let transactionId = null;

      // Handle ACP coin donations
      if (currencyType === "acp_coin") {
        const userBalance = parseFloat(await storage.getUserBalance(userId));
        const donationAmount = parseFloat(amount);

        if (userBalance < donationAmount) {
          return res.status(400).json({ message: "Insufficient ACP coins" });
        }

        // Create transaction for ACP coin donation
        const transaction = await storage.createTransaction({
          fromUserId: userId,
          toUserId: charity.creatorId,
          amount: amount,
          transactionType: "charity_donation",
          description: `Donation to ${charity.name}`,
          relatedItemId: charityId
        });

        transactionId = transaction.id;

        // Update user balance
        const newBalance = (userBalance - donationAmount).toFixed(8);
        await storage.updateUserBalance(userId, newBalance);
      }

      // Create donation record
      const donation = await storage.donateToCharity({
        charityId,
        userId,
        amount,
        currencyType,
        transactionId,
        isAnonymous: isAnonymous || false,
        message: message || null,
        status: "completed"
      });

      // Create donation post to news feed (if not anonymous)
      if (!isAnonymous) {
        await storage.createDonationPost(userId, charityId, amount, currencyType, false);
      }

      res.status(201).json(donation);
    } catch (error: any) {
      console.error("Donation error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/charities/:id/donations", async (req, res) => {
    try {
      const donations = await storage.getCharityDonations(req.params.id);
      res.json(donations);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/charities/:id/top-donors", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const topDonors = await storage.getTopDonors(req.params.id, limit);
      res.json(topDonors);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });


  // Admin Security Middleware - for admin and moderator access
  function ensureAdmin(req: any, res: any, next: any) {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    // Check if user is admin or moderator
    if (req.user.role !== "admin" && req.user.role !== "moderator") {
      return res.status(403).json({ message: "Admin or moderator access required" });
    }

    next();
  }

  // State Admin Middleware - allows admin, state_admin, or moderator
  function ensureStateAdmin(req: any, res: any, next: any) {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }
    const role = req.user.role;
    if (role !== "admin" && role !== "state_admin" && role !== "moderator") {
      return res.status(403).json({ message: "State admin access required" });
    }
    next();
  }

  // Owner Admin Security Middleware - only for the original admin user
  function ensureOwnerAdmin(req: any, res: any, next: any) {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    // Check if user is admin
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    // Check if user is the owner admin
    storage.getAdminUserId().then(adminUserId => {
      if (!adminUserId || req.user.id !== adminUserId) {
        return res.status(403).json({ message: "Owner admin access required" });
      }
      next();
    }).catch(error => {
      console.error("Error checking admin user:", error);
      return res.status(500).json({ message: "Authentication error" });
    });
  }

  // Admin Representatives Management API
  app.get("/api/admin/representatives", ensureOwnerAdmin, async (req, res) => {
    try {
      const filters = {
        officeLevel: req.query.officeLevel as string,
        active: req.query.active === "true" ? true : req.query.active === "false" ? false : undefined,
        search: req.query.search as string
      };
      const pagination = {
        limit: parseInt(req.query.limit as string) || 50,
        offset: parseInt(req.query.offset as string) || 0
      };

      const result = await storage.listRepresentatives(filters, pagination);
      res.json(result);
    } catch (error: any) {
      console.error("Admin list representatives error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/representatives/:id", ensureOwnerAdmin, async (req, res) => {
    try {
      const representative = await storage.getRepresentative(req.params.id);
      if (!representative) {
        return res.status(404).json({ message: "Representative not found" });
      }
      res.json(representative);
    } catch (error: any) {
      console.error("Admin get representative error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/representatives", ensureOwnerAdmin, async (req, res) => {
    try {
      const repData = insertRepresentativeSchema.parse(req.body);
      const representative = await storage.createRepresentative(repData);
      res.status(201).json(representative);
    } catch (error: any) {
      console.error("Admin create representative error:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/admin/representatives/:id", ensureOwnerAdmin, async (req, res) => {
    try {
      const updateData = insertRepresentativeSchema.partial().parse(req.body);
      const representative = await storage.updateRepresentativeAdmin(req.params.id, updateData);
      res.json(representative);
    } catch (error: any) {
      console.error("Admin update representative error:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      if (error.message === "Representative not found") {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/admin/representatives/:id", ensureOwnerAdmin, async (req, res) => {
    try {
      await storage.deleteRepresentative(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      console.error("Admin delete representative error:", error);
      if (error.message === "Representative not found") {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: error.message });
    }
  });

  // Admin Zip Code Mappings Management API
  app.get("/api/admin/zip-mappings", ensureOwnerAdmin, async (req, res) => {
    try {
      const zipCode = req.query.zipCode as string;
      const mappings = await storage.listZipMappings(zipCode);
      res.json(mappings);
    } catch (error: any) {
      console.error("Admin list zip mappings error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/zip-mappings", ensureOwnerAdmin, async (req, res) => {
    try {
      const mappingData = insertZipCodeLookupSchema.parse(req.body);
      const mapping = await storage.upsertZipMapping(mappingData);
      res.status(201).json(mapping);
    } catch (error: any) {
      console.error("Admin create zip mapping error:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/admin/zip-mappings/:id", ensureOwnerAdmin, async (req, res) => {
    try {
      await storage.deleteZipMapping(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      console.error("Admin delete zip mapping error:", error);
      if (error.message === "Zip mapping not found") {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: error.message });
    }
  });

  // Admin Import/Export Operations
  app.get("/api/admin/representatives/export", ensureOwnerAdmin, async (req, res) => {
    try {
      const representatives = await storage.exportRepresentatives();
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="representatives.json"');
      res.json(representatives);
    } catch (error: any) {
      console.error("Admin export representatives error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/representatives/import", ensureOwnerAdmin, async (req, res) => {
    try {
      const { items } = req.body;
      if (!Array.isArray(items)) {
        return res.status(400).json({ message: "Items must be an array" });
      }

      // Validate each item
      const validatedItems = items.map(item => insertRepresentativeSchema.parse(item));
      
      const result = await storage.importRepresentatives(validatedItems, req.user!.id);
      res.json(result);
    } catch (error: any) {
      console.error("Admin import representatives error:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/zip-mappings/export", ensureOwnerAdmin, async (req, res) => {
    try {
      const mappings = await storage.exportZipMappings();
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="zip-mappings.json"');
      res.json(mappings);
    } catch (error: any) {
      console.error("Admin export zip mappings error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/zip-mappings/import", ensureOwnerAdmin, async (req, res) => {
    try {
      const { items } = req.body;
      if (!Array.isArray(items)) {
        return res.status(400).json({ message: "Items must be an array" });
      }

      // Validate each item
      const validatedItems = items.map(item => insertZipCodeLookupSchema.parse(item));
      
      const result = await storage.importZipMappings(validatedItems, req.user!.id);
      res.json(result);
    } catch (error: any) {
      console.error("Admin import zip mappings error:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: error.message });
    }
  });

  // Admin Political Positions Management API
  app.get("/api/admin/political-positions", ensureAdmin, async (req, res) => {
    try {
      const filters = {
        level: req.query.level as string,
        jurisdiction: req.query.jurisdiction as string,
        isActive: req.query.isActive === "true" ? true : req.query.isActive === "false" ? false : undefined,
      };

      const positions = await storage.listPoliticalPositions(filters);
      res.json(positions);
    } catch (error: any) {
      console.error("Admin list political positions error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/political-positions/:id", ensureAdmin, async (req, res) => {
    try {
      const position = await storage.getPoliticalPosition(req.params.id);
      if (!position) {
        return res.status(404).json({ message: "Position not found" });
      }
      res.json(position);
    } catch (error: any) {
      console.error("Admin get political position error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/political-positions", ensureAdmin, async (req, res) => {
    try {
      const positionData = insertPoliticalPositionSchema.parse(req.body);
      const position = await storage.createPoliticalPosition(positionData);
      res.status(201).json(position);
    } catch (error: any) {
      console.error("Admin create political position error:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/admin/political-positions/:id", ensureAdmin, async (req, res) => {
    try {
      const updateData = insertPoliticalPositionSchema.partial().parse(req.body);
      const position = await storage.updatePoliticalPosition(req.params.id, updateData);
      res.json(position);
    } catch (error: any) {
      console.error("Admin update political position error:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/admin/political-positions/:id", ensureAdmin, async (req, res) => {
    try {
      await storage.deletePoliticalPosition(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      console.error("Admin delete political position error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Public endpoint to get featured politicians
  app.get("/api/politician-profiles/featured", async (req, res) => {
    try {
      const profiles = await storage.listPoliticianProfiles({ isCurrent: true });
      const featured = profiles.filter(p => p.featured);
      res.json(featured);
    } catch (error: any) {
      console.error("Get featured politician profiles error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Admin Politician Profiles Management API
  app.get("/api/admin/politician-profiles", ensureAdmin, async (req, res) => {
    try {
      const filters = {
        positionId: req.query.positionId as string,
        isCurrent: req.query.isCurrent === "true" ? true : req.query.isCurrent === "false" ? false : undefined,
      };

      const profiles = await storage.listPoliticianProfiles(filters);

      // Aggregate total lobby amounts in one query and merge into profiles
      const totalsResult = await db.execute(
        sql`SELECT politician_id, SUM(reported_amount) AS total FROM politician_sig_sponsorships GROUP BY politician_id`
      );
      const totalsMap: Record<string, number> = {};
      for (const row of totalsResult.rows as any[]) {
        totalsMap[row.politician_id] = Number(row.total ?? 0);
      }
      const profilesWithTotals = profiles.map(p => ({
        ...p,
        totalLobbyAmount: totalsMap[p.id] ?? 0,
      }));

      res.json(profilesWithTotals);
    } catch (error: any) {
      console.error("Admin list politician profiles error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/politician-profiles/claim-requests", ensureAdmin, async (req, res) => {
    try {
      const requests = await storage.getPendingClaimRequests();
      res.json(requests);
    } catch (error: any) {
      console.error("Get pending claim requests error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/politician-profiles/:id", ensureAdmin, async (req, res) => {
    try {
      const profile = await storage.getPoliticianProfile(req.params.id);
      if (!profile) {
        return res.status(404).json({ message: "Politician profile not found" });
      }
      res.json(profile);
    } catch (error: any) {
      console.error("Admin get politician profile error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/politician-profiles", ensureAdmin, async (req, res) => {
    try {
      const profileData = insertPoliticianProfileSchema.parse(req.body);
      const profile = await storage.createPoliticianProfile(profileData);
      res.status(201).json(profile);
    } catch (error: any) {
      console.error("Admin create politician profile error:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/admin/politician-profiles/:id", ensureAdmin, async (req, res) => {
    try {
      const updateData = insertPoliticianProfileSchema.partial().parse(req.body);
      const profile = await storage.updatePoliticianProfile(req.params.id, updateData);
      res.json(profile);
    } catch (error: any) {
      console.error("Admin update politician profile error:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/admin/politician-profiles/:id", ensureAdmin, async (req, res) => {
    try {
      await storage.deletePoliticianProfile(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      console.error("Admin delete politician profile error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/politician-profiles/:id/assign", ensureAdmin, async (req, res) => {
    try {
      const { positionId } = req.body;
      await storage.assignPoliticianToPosition(req.params.id, positionId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Admin assign politician error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/admin/politician-profiles/:id/featured", ensureAdmin, async (req, res) => {
    try {
      const { featured } = req.body;
      const profile = await storage.updatePoliticianProfile(req.params.id, { featured });
      res.json(profile);
    } catch (error: any) {
      console.error("Admin toggle featured politician error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/admin/politician-profiles/:id/corruption-grade", ensureAdmin, async (req, res) => {
    try {
      const { corruptionGrade } = req.body;
      if (corruptionGrade && !['A', 'B', 'C', 'D', 'F'].includes(corruptionGrade)) {
        return res.status(400).json({ message: "Corruption grade must be A, B, C, D, or F" });
      }
      const profile = await storage.updatePoliticianProfile(req.params.id, { corruptionGrade });
      res.json(profile);
    } catch (error: any) {
      console.error("Admin update corruption grade error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Recalculate a politician's grade based on SIG weights and ranks
  app.post("/api/admin/politician-profiles/:id/recalculate-grade", ensureAdmin, async (req, res) => {
    try {
      const grade = await storage.recalculateGradeFromSigs(req.params.id);
      res.json({ grade, message: `Grade recalculated: ${grade}` });
    } catch (error: any) {
      console.error("Recalculate grade error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Bulk regrade all profiles using the new configurable algorithm
  app.post("/api/admin/politician-profiles/regrade", ensureAdmin, async (req, res) => {
    try {
      const result = await storage.regradeAllProfiles();
      res.json(result);
    } catch (error: any) {
      console.error("Regrade all profiles error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Set community adjustment on a single profile
  app.patch("/api/admin/politician-profiles/:id/community-adj", ensureAdmin, async (req, res) => {
    try {
      const { communityAdj } = req.body;
      if (typeof communityAdj !== "number") return res.status(400).json({ message: "communityAdj must be a number" });
      await storage.setCommunityAdj(req.params.id, communityAdj);
      res.json({ ok: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Grading algorithm settings
  app.get("/api/admin/grading-settings", ensureAdmin, async (req, res) => {
    try {
      const config = await storage.getGradingConfig();
      res.json(config);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/grading-settings", ensureAdmin, async (req, res) => {
    try {
      const updated = await storage.updateGradingConfig(req.body);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Bulk import all Congress members from the XLSX file
  const STATE_NAME_TO_ABBR: Record<string, string> = {
    "Alabama": "AL", "Alaska": "AK", "Arizona": "AZ", "Arkansas": "AR", "California": "CA",
    "Colorado": "CO", "Connecticut": "CT", "Delaware": "DE", "Washington D.C.": "DC", "Florida": "FL",
    "Georgia": "GA", "Hawaii": "HI", "Idaho": "ID", "Illinois": "IL", "Indiana": "IN",
    "Iowa": "IA", "Kansas": "KS", "Kentucky": "KY", "Louisiana": "LA", "Maine": "ME",
    "Maryland": "MD", "Massachusetts": "MA", "Michigan": "MI", "Minnesota": "MN",
    "Mississippi": "MS", "Missouri": "MO", "Montana": "MT", "Nebraska": "NE", "Nevada": "NV",
    "New Hampshire": "NH", "New Jersey": "NJ", "New Mexico": "NM", "New York": "NY",
    "North Carolina": "NC", "North Dakota": "ND", "Ohio": "OH", "Oklahoma": "OK", "Oregon": "OR",
    "Pennsylvania": "PA", "Rhode Island": "RI", "South Carolina": "SC", "South Dakota": "SD",
    "Tennessee": "TN", "Texas": "TX", "Utah": "UT", "Vermont": "VT", "Virginia": "VA",
    "Washington": "WA", "West Virginia": "WV", "Wisconsin": "WI", "Wyoming": "WY", "Puerto Rico": "PR",
    "United States": "US",
  };

  function generateHandle(fullName: string, state: string | null): string {
    const nameParts = fullName.toLowerCase()
      .replace(/[^a-z\s]/g, '')
      .trim()
      .split(/\s+/);
    const base = nameParts.length > 1
      ? nameParts[0][0] + nameParts[nameParts.length - 1]
      : nameParts[0];
    const stateSuffix = state ? '_' + state.toLowerCase() : '';
    return base + stateSuffix;
  }

  function getStateAbbrFromJurisdiction(jurisdiction: string | null | undefined): string | null {
    if (!jurisdiction) return null;
    const trimmed = jurisdiction.trim();
    if (STATE_NAME_TO_ABBR[trimmed]) return STATE_NAME_TO_ABBR[trimmed];
    for (const [name, abbr] of Object.entries(STATE_NAME_TO_ABBR)) {
      if (trimmed.toLowerCase().includes(name.toLowerCase())) return abbr;
    }
    const twoLetter = trimmed.match(/\b([A-Z]{2})\b/);
    if (twoLetter && Object.values(STATE_NAME_TO_ABBR).includes(twoLetter[1])) return twoLetter[1];
    return null;
  }

  app.post("/api/admin/politicians/generate-handles", ensureAdmin, async (req, res) => {
    try {
      const allProfiles = await storage.listPoliticianProfiles();
      let updated = 0;
      let skipped = 0;
      const existingHandles = await db.select({ handle: politicianProfiles.handle }).from(politicianProfiles);
      const usedHandles = new Set<string>(existingHandles.map(h => (h.handle ?? '').toLowerCase()).filter(Boolean));

      for (const profile of allProfiles) {
        const jurisdiction = profile.position?.jurisdiction ?? null;
        const stateAbbr = getStateAbbrFromJurisdiction(jurisdiction);
        let handle = generateHandle(profile.fullName, stateAbbr);
        if (!handle) { skipped++; continue; }

        let finalHandle = handle;
        let suffix = 2;
        while (usedHandles.has(finalHandle.toLowerCase())) {
          finalHandle = handle + '_' + suffix;
          suffix++;
        }
        usedHandles.add(finalHandle.toLowerCase());

        await storage.updatePoliticianProfile(profile.id, { handle: finalHandle } as any);
        updated++;
      }

      res.json({ success: true, updated, skipped });
    } catch (error: any) {
      console.error("Generate handles error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/politicians/backfill-handles", ensureAdmin, async (req, res) => {
    try {
      const rows = await db.execute(sql`
        SELECT pol.id, pol.full_name, pol.handle, pos.jurisdiction
        FROM politician_profiles pol
        LEFT JOIN political_positions pos ON pol.position_id = pos.id
        WHERE pol.handle IS NULL OR pol.handle = ''
      `);
      const profiles = rows.rows as any[];
      const existingHandlesResult = await db.execute(sql`SELECT handle FROM politician_profiles WHERE handle IS NOT NULL AND handle != ''`);
      const usedHandles = new Set<string>((existingHandlesResult.rows as any[]).map((h: any) => (h.handle ?? '').toLowerCase()).filter(Boolean));
      let updated = 0;

      for (const profile of profiles) {
        const stateAbbr = getStateAbbrFromJurisdiction(profile.jurisdiction);
        let handle = generateHandle(profile.full_name, stateAbbr);
        if (!handle) continue;

        let finalHandle = handle;
        let suffix = 2;
        while (usedHandles.has(finalHandle.toLowerCase())) {
          finalHandle = handle + '_' + suffix;
          suffix++;
        }
        usedHandles.add(finalHandle.toLowerCase());
        await db.execute(sql`UPDATE politician_profiles SET handle = ${finalHandle} WHERE id = ${profile.id}`);
        updated++;
      }
      res.json({ success: true, updated, total: profiles.length });
    } catch (error: any) {
      console.error("Backfill handles error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Politician search by name/handle (authenticated)
  app.get("/api/politicians/search", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const q = (req.query.q as string || "").trim();
    if (!q || q.length < 2) return res.json([]);
    try {
      const results = await storage.searchPoliticians(q);
      res.json(results);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/politicians/search-handle", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const q = (req.query.q as string || "").trim();
    if (!q || q.length < 1) return res.json([]);
    try {
      const rows = await db.execute(sql`
        SELECT pol.id, pol.handle, pol.full_name, pol.photo_url, pol.party,
               pos.title as office, pos.jurisdiction as state
        FROM politician_profiles pol
        LEFT JOIN political_positions pos ON pol.position_id = pos.id
        WHERE pol.handle ILIKE ${'%' + q + '%'}
           OR pol.full_name ILIKE ${'%' + q + '%'}
        ORDER BY
          CASE WHEN pol.handle ILIKE ${q + '%'} THEN 0 ELSE 1 END,
          pol.full_name
        LIMIT 10
      `);
      res.json((rows.rows as any[]).map(r => ({
        id: r.id,
        handle: r.handle,
        fullName: r.full_name,
        photoUrl: r.photo_url,
        party: r.party,
        office: r.office,
        state: r.state,
      })));
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/missing-info", ensureAdmin, async (req, res) => {
    try {
      const rows = await db.execute(sql`
        SELECT pol.id, pol.full_name, pol.handle, pol.party, pol.corruption_grade,
               pol.profile_type, pol.photo_url, pol.email, pol.phone, pol.biography,
               pos.title as office, pos.jurisdiction as state, pos.level, pos.district
        FROM politician_profiles pol
        LEFT JOIN political_positions pos ON pol.position_id = pos.id
        WHERE pos.jurisdiction IS NULL OR pos.jurisdiction = ''
           OR pol.corruption_grade IS NULL OR pol.corruption_grade = ''
        ORDER BY pol.full_name
      `);
      res.json((rows.rows as any[]).map(r => ({
        id: r.id,
        fullName: r.full_name,
        handle: r.handle,
        party: r.party,
        corruptionGrade: r.corruption_grade,
        profileType: r.profile_type,
        photoUrl: r.photo_url,
        email: r.email,
        phone: r.phone,
        biography: r.biography,
        office: r.office,
        state: r.state,
        level: r.level,
        district: r.district,
        missingFields: [
          ...((!r.state || r.state === '') ? ['State'] : []),
          ...((!r.corruption_grade || r.corruption_grade === '') ? ['Grade'] : []),
        ],
      })));
    } catch (error: any) {
      console.error("Missing info error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/merge-candidates", ensureAdmin, async (req, res) => {
    try {
      const rows = await db.execute(sql`
        SELECT mc.id, mc.reason, mc.status, mc.created_at,
               a.id as a_id, a.full_name as a_name, a.handle as a_handle, a.party as a_party,
               a.corruption_grade as a_grade, a.profile_type as a_type, a.photo_url as a_photo,
               pa.jurisdiction as a_state, pa.district as a_district,
               b.id as b_id, b.full_name as b_name, b.handle as b_handle, b.party as b_party,
               b.corruption_grade as b_grade, b.profile_type as b_type, b.photo_url as b_photo,
               pb.jurisdiction as b_state, pb.district as b_district
        FROM merge_candidates mc
        JOIN politician_profiles a ON mc.politician_a_id = a.id
        JOIN politician_profiles b ON mc.politician_b_id = b.id
        LEFT JOIN political_positions pa ON a.position_id = pa.id
        LEFT JOIN political_positions pb ON b.position_id = pb.id
        WHERE mc.status = 'pending'
        ORDER BY mc.created_at DESC
      `);
      res.json(rows.rows);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/merge-candidates/:id/dismiss", ensureAdmin, async (req, res) => {
    try {
      await db.execute(sql`UPDATE merge_candidates SET status = 'dismissed' WHERE id = ${req.params.id}`);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/merge-candidates/:id/merge", ensureAdmin, async (req, res) => {
    const { keepId } = req.body;
    try {
      const mcRows = await db.execute(sql`SELECT * FROM merge_candidates WHERE id = ${req.params.id}`);
      const mc = (mcRows.rows as any[])[0];
      if (!mc) return res.status(404).json({ message: "Merge candidate not found" });

      const removeId = mc.politician_a_id === keepId ? mc.politician_b_id : mc.politician_a_id;

      const keepRows = await db.execute(sql`SELECT * FROM politician_profiles WHERE id = ${keepId}`);
      const removeRows = await db.execute(sql`SELECT * FROM politician_profiles WHERE id = ${removeId}`);
      const keep = (keepRows.rows as any[])[0];
      const remove = (removeRows.rows as any[])[0];
      if (!keep || !remove) return res.status(404).json({ message: "Profile not found" });

      const fieldsToMerge = ['party', 'email', 'phone', 'website', 'photo_url', 'biography',
        'corruption_grade', 'fec_candidate_id', 'ballotpedia_url'];
      const updates: Record<string, any> = {};
      for (const f of fieldsToMerge) {
        if (!keep[f] && remove[f]) updates[f] = remove[f];
      }
      if (Object.keys(updates).length > 0) {
        const setClauses = Object.entries(updates).map(([k, v]) => sql`${sql.raw(k)} = ${v}`);
        for (const clause of setClauses) {
          await db.execute(sql`UPDATE politician_profiles SET ${clause} WHERE id = ${keepId}`);
        }
      }

      await db.execute(sql`UPDATE posts SET politician_id = ${keepId} WHERE politician_id = ${removeId}`);
      await db.execute(sql`UPDATE politician_sig_sponsorships SET politician_id = ${keepId} WHERE politician_id = ${removeId}`);
      await db.execute(sql`DELETE FROM politician_profiles WHERE id = ${removeId}`);
      await db.execute(sql`UPDATE merge_candidates SET status = 'merged' WHERE id = ${req.params.id}`);

      res.json({ success: true, keptId: keepId, removedId: removeId });
    } catch (error: any) {
      console.error("Merge error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/politicians/:id/flag-merge", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { otherPoliticianId } = req.body;
    if (!otherPoliticianId) return res.status(400).json({ message: "otherPoliticianId required" });
    try {
      await db.execute(sql`
        INSERT INTO merge_candidates (politician_a_id, politician_b_id, reason, status)
        VALUES (${req.params.id}, ${otherPoliticianId}, 'manual', 'pending')
      `);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/politicians/:id/correction", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { fieldName, currentValue, suggestedValue, reason } = req.body;
    try {
      await db.execute(sql`
        INSERT INTO correction_requests (politician_id, submitted_by_user_id, field_name, current_value, suggested_value, reason)
        VALUES (${req.params.id}, ${(req.user as any).id}, ${fieldName}, ${currentValue}, ${suggestedValue}, ${reason})
      `);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/correction-requests", ensureAdmin, async (req, res) => {
    try {
      const rows = await db.execute(sql`
        SELECT cr.*, pol.full_name, u.username as submitted_by
        FROM correction_requests cr
        JOIN politician_profiles pol ON cr.politician_id = pol.id
        LEFT JOIN users u ON cr.submitted_by_user_id = u.id
        WHERE cr.status = 'pending'
        ORDER BY cr.created_at DESC
      `);
      res.json(rows.rows);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/candidate-profile/:politicianId/modules", async (req, res) => {
    try {
      const rows = await db.select().from(candidateProfileModules)
        .where(eq(candidateProfileModules.politicianId, req.params.politicianId))
        .orderBy(asc(candidateProfileModules.position));
      const normalized = rows.map((row) => {
        if (row.moduleType === "youtube" && row.content) {
          try {
            const c = typeof row.content === "string" ? JSON.parse(row.content) : row.content;
            if (c.videoUrl) {
              const vid = extractYouTubeVideoId(c.videoUrl);
              if (vid) {
                c.videoUrl = `https://www.youtube.com/watch?v=${vid}`;
                return { ...row, content: typeof row.content === "string" ? JSON.stringify(c) : c };
              }
            }
          } catch {}
        }
        return row;
      });
      res.json(normalized);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/candidate-profile/:politicianId/modules", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const profile = await db.execute(sql`SELECT claimed_by_user_id FROM politician_profiles WHERE id = ${req.params.politicianId}`);
      const owner = (profile.rows as any[])[0]?.claimed_by_user_id;
      if (owner !== (req.user as any).id && (req.user as any).role !== 'admin') {
        return res.status(403).json({ message: "Not authorized to edit this profile" });
      }
      const { modules } = req.body;
      if (!Array.isArray(modules)) {
        return res.status(400).json({ message: "modules must be an array" });
      }
      const validTypes = ["bio","photos","feed","friends","following","music","background","youtube","badges","issues","civic-tracker","pinned-post","debate-history","events","political-compass","analytics","campaign-hub","verified-badge","civic-scorecard","media-hub","widgets","supporter-wall","democracy-wrapped","legacy-timeline","custom"];
      await db.execute(sql`DELETE FROM candidate_profile_modules WHERE politician_id = ${req.params.politicianId}`);
      for (let i = 0; i < modules.length; i++) {
        const m = modules[i];
        const modType = m.moduleType || m.module_type;
        if (!modType || !validTypes.includes(modType)) continue;
        const contentStr = JSON.stringify(m.content && typeof m.content === "object" ? m.content : {});
        await db.execute(sql`
          INSERT INTO candidate_profile_modules (politician_id, module_type, content, position)
          VALUES (${req.params.politicianId}, ${modType}, ${contentStr}, ${i})
        `);
      }
      const updated = await db.select().from(candidateProfileModules)
        .where(eq(candidateProfileModules.politicianId, req.params.politicianId))
        .orderBy(asc(candidateProfileModules.position));
      res.json(updated);
    } catch (error: any) {
      console.error("Save candidate profile modules error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // STATE CODE → NAME mapping used by elections lookup
  const STATE_CODE_TO_NAME: Record<string, string> = {
    al: 'Alabama', ak: 'Alaska', az: 'Arizona', ar: 'Arkansas', ca: 'California',
    co: 'Colorado', ct: 'Connecticut', de: 'Delaware', fl: 'Florida', ga: 'Georgia',
    hi: 'Hawaii', id: 'Idaho', il: 'Illinois', in: 'Indiana', ia: 'Iowa',
    ks: 'Kansas', ky: 'Kentucky', la: 'Louisiana', me: 'Maine', md: 'Maryland',
    ma: 'Massachusetts', mi: 'Michigan', mn: 'Minnesota', ms: 'Mississippi', mo: 'Missouri',
    mt: 'Montana', ne: 'Nebraska', nv: 'Nevada', nh: 'New Hampshire', nj: 'New Jersey',
    nm: 'New Mexico', ny: 'New York', nc: 'North Carolina', nd: 'North Dakota', oh: 'Ohio',
    ok: 'Oklahoma', or: 'Oregon', pa: 'Pennsylvania', ri: 'Rhode Island', sc: 'South Carolina',
    sd: 'South Dakota', tn: 'Tennessee', tx: 'Texas', ut: 'Utah', vt: 'Vermont',
    va: 'Virginia', wa: 'Washington', wv: 'West Virginia', wi: 'Wisconsin', wy: 'Wyoming',
    dc: 'District of Columbia',
  };

  // Public: return Google Maps API key for frontend Places Autocomplete
  app.get("/api/config/google-maps-key", (req, res) => {
    const key = process.env.GOOGLE_MAPS_API_KEY;
    if (!key) return res.status(503).json({ message: "Google Maps not configured" });
    res.json({ key });
  });

  // Elections — Address lookup: queries politician_profiles DB grouped by position
  app.get("/api/elections/lookup", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const address = (req.query.address as string || "").trim();
    if (!address) return res.status(400).json({ message: "address is required" });

    try {
      // Step 1: Get state code + district info via Google Civic Divisions API
      const civicApiKey = process.env.GOOGLE_CIVIC_API_KEY;
      let stateCode: string | null = null;
      let cdDistrict: string | null = null;   // congressional district number e.g. "6"
      let slduDistrict: string | null = null; // state senate district
      let sldsDistrict: string | null = null; // state house district

      if (civicApiKey) {
        try {
          const divisionsUrl = `https://www.googleapis.com/civicinfo/v2/divisions?query=${encodeURIComponent(address)}&key=${civicApiKey}`;
          const response = await fetch(divisionsUrl);
          if (response.ok) {
            const data = await response.json();
            for (const division of (data.results || [])) {
              const ocd: string = division.ocdId ?? '';
              // state
              if (!stateCode && ocd.includes('/state:')) {
                stateCode = ocd.split('/state:')[1].split('/')[0].toLowerCase();
              }
              // congressional district: ocd-division/country:us/state:mn/cd:6
              if (!cdDistrict) {
                const cdMatch = ocd.match(/\/cd:(\d+)/);
                if (cdMatch) cdDistrict = cdMatch[1];
              }
              // state senate (upper)
              if (!slduDistrict) {
                const slduMatch = ocd.match(/\/sldu:(\w+)/);
                if (slduMatch) slduDistrict = slduMatch[1];
              }
              // state house (lower)
              if (!sldsDistrict) {
                const sldsMatch = ocd.match(/\/sldl:(\w+)/);
                if (sldsMatch) sldsDistrict = sldsMatch[1];
              }
            }
          }
        } catch (_) { /* ignore */ }
      }

      // Fallback 1: scan address string for a 2-letter state abbreviation
      if (!stateCode) {
        const m = address.toUpperCase().match(/\b(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC)\b/);
        if (m) stateCode = m[1].toLowerCase();
      }

      // Fallback 2: if input looks like a ZIP code, map via known ZIP ranges
      if (!stateCode) {
        const zipMatch = address.match(/\b(\d{5})\b/);
        if (zipMatch) {
          const ZIP_RANGES: [number, number, string][] = [
            [1001, 2791, 'ma'], [2801, 2940, 'ri'], [3031, 3897, 'nh'],
            [3901, 4992, 'me'], [5001, 5907, 'vt'], [6001, 6928, 'ct'],
            [7001, 8989, 'nj'], [10001, 14975, 'ny'], [15001, 19640, 'pa'],
            [19701, 19980, 'de'], [20001, 20599, 'dc'], [20601, 21930, 'md'],
            [22001, 24658, 'va'], [24701, 26886, 'wv'], [27006, 28909, 'nc'],
            [29001, 29948, 'sc'], [30001, 31999, 'ga'], [32004, 34997, 'fl'],
            [35004, 36925, 'al'], [37010, 38589, 'tn'], [38601, 39776, 'ms'],
            [39800, 39901, 'ga'], [40003, 42788, 'ky'], [43001, 45999, 'oh'],
            [46001, 47997, 'in'], [48001, 49971, 'mi'], [50001, 52809, 'ia'],
            [53001, 54990, 'wi'], [55001, 56763, 'mn'], [57001, 57799, 'sd'],
            [58001, 58856, 'nd'], [59001, 59937, 'mt'], [60001, 62999, 'il'],
            [63001, 65899, 'mo'], [66002, 67954, 'ks'], [68001, 69367, 'ne'],
            [70001, 71497, 'la'], [71601, 72959, 'ar'], [73001, 74966, 'ok'],
            [75001, 79999, 'tx'], [80001, 81658, 'co'], [82001, 83128, 'wy'],
            [83200, 83876, 'id'], [84001, 84784, 'ut'], [85001, 86556, 'az'],
            [87001, 88441, 'nm'], [88901, 89883, 'nv'], [90001, 96162, 'ca'],
            [96701, 96898, 'hi'], [97001, 97920, 'or'], [98001, 99403, 'wa'],
            [99501, 99950, 'ak'],
          ];
          const zipNum = parseInt(zipMatch[1], 10);
          for (const [min, max, code] of ZIP_RANGES) {
            if (zipNum >= min && zipNum <= max) { stateCode = code; break; }
          }
        }
      }

      const stateName = stateCode ? STATE_CODE_TO_NAME[stateCode] : null;
      if (!stateName) {
        return res.status(400).json({
          message: "Could not determine state from address. Try including a state abbreviation (e.g. \"55376 MN\" or \"Minneapolis, Minnesota\").",
        });
      }

      // Step 2: Query politician_profiles for this state (+ national positions)
      // When cdDistrict is known, filter House seats to that specific district only.
      // State-wide races (Senate, Governor) and national races (President, VP) are always shown.
      const ordinalMap: Record<string, string> = {
        '1':'1st','2':'2nd','3':'3rd','4':'4th','5':'5th','6':'6th','7':'7th',
        '8':'8th','9':'9th','10':'10th','11':'11th','12':'12th','13':'13th',
        '14':'14th','15':'15th','16':'16th',
      };
      const cdOrdinal = cdDistrict ? (ordinalMap[cdDistrict] ?? `${cdDistrict}th`) : null;

      const rows = await db.execute(sql`
        SELECT pol.id, pol.full_name, pol.party, pol.is_current, pol.profile_type,
               pol.photo_url, pol.handle, pol.corruption_grade, pol.total_contributions, pol.is_verified,
               pos.id as pos_id, pos.title as pos_title, pos.office_type,
               pos.level, pos.jurisdiction, pos.district, pos.display_order,
               COALESCE((
                 SELECT SUM(ss.reported_amount)
                 FROM politician_sig_sponsorships ss
                 WHERE ss.politician_id = pol.id
               ), 0) as superpac_total
        FROM politician_profiles pol
        JOIN political_positions pos ON (
          pol.position_id = pos.id 
          OR pol.target_position_id = pos.id
        )
        WHERE (
          -- National/country-wide races (President, VP): jurisdiction = 'United States'
          pos.jurisdiction ILIKE 'United States'
          OR pos.jurisdiction ILIKE '%United States%'
          OR (
            -- State-scoped races
            (pos.jurisdiction ILIKE ${stateName} OR pos.jurisdiction ILIKE ${'%' + stateName + '%'})
            AND (
              -- Always show state-wide seats (Senate, Governor, etc. — no district)
              -- For legislative/house seats: only show if district matches when we know it
              pos.office_type NOT ILIKE '%legislat%'
              OR pos.district IS NULL
              OR pos.district = ''
              OR ${cdOrdinal === null ? sql`TRUE` : sql`pos.district ILIKE ${'%' + cdOrdinal + '%'} OR pos.district ILIKE ${'%' + (cdDistrict ?? '') + '%'}`}
            )
          )
        )
        ORDER BY pos.display_order NULLS LAST, pol.is_current DESC, pos.title, pol.full_name
      `);

      // Step 3: Group rows into seats keyed by position id
      const seatsMap = new Map<string, any>();
      for (const row of (rows.rows as any[])) {
        const posId = row.pos_id;
        if (!seatsMap.has(posId)) {
          seatsMap.set(posId, {
            positionId: posId,
            title: row.pos_title,
            officeType: row.office_type,
            level: row.level,
            jurisdiction: row.jurisdiction,
            district: row.district,
            displayOrder: row.display_order,
            incumbents: [],
            candidates: [],
          });
        }
        const seat = seatsMap.get(posId)!;
        const politician = {
          id: row.id,
          fullName: row.full_name,
          party: row.party,
          isCurrent: row.is_current,
          profileType: row.profile_type,
          photoUrl: row.photo_url,
          handle: row.handle,
          corruptionGrade: row.corruption_grade,
          totalContributions: row.total_contributions,
          isVerified: row.is_verified,
          superpacTotal: Number(row.superpac_total ?? 0),
        };
        if (row.is_current) seat.incumbents.push(politician);
        else seat.candidates.push(politician);
      }

      // Sort: national first, then by displayOrder
      const seats = Array.from(seatsMap.values()).sort((a, b) => {
        const aIsNational = ['country', 'national'].includes(a.level);
        const bIsNational = ['country', 'national'].includes(b.level);
        if (aIsNational && !bIsNational) return -1;
        if (bIsNational && !aIsNational) return 1;
        return (a.displayOrder ?? 999) - (b.displayOrder ?? 999);
      });

      res.json({
        stateName,
        stateCode: stateCode!.toUpperCase(),
        cdDistrict,
        slduDistrict,
        sldsDistrict,
        districtKnown: cdDistrict !== null,
        seats,
      });
    } catch (error: any) {
      console.error("Elections lookup error:", error);
      res.status(500).json({ message: error.message || "Failed to lookup elections" });
    }
  });

  // Elections — Race lookup: all politicians for a given position (positionId-first)
  app.get("/api/elections/race", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const positionId = (req.query.positionId as string || "").trim();
    const state = (req.query.state as string || "").trim();
    const office = (req.query.office as string || "").trim();

    try {
      let politicians: any[] = [];

      if (positionId) {
        // Primary lookup: all politicians with this exact position
        // + related politicians (same district number + same office type in same state)
        const rows = await db.execute(sql`
          SELECT pol.id, pol.full_name, pol.party, pol.is_current, pol.profile_type,
                 pol.photo_url, pol.handle, pol.corruption_grade, pol.total_contributions, pol.is_verified,
                 pos.id as pos_id, pos.title as pos_title, pos.office_type,
                 pos.level, pos.jurisdiction, pos.district
          FROM politician_profiles pol
          JOIN political_positions pos ON pol.position_id = pos.id
          WHERE pol.position_id = ${positionId}
        `);

        // Get the anchor position details to find related candidates
        const anchorRows = await db.execute(sql`
          SELECT title, office_type, jurisdiction, district, level
          FROM political_positions WHERE id = ${positionId}
        `);
        const anchor = (anchorRows.rows as any[])[0];

        let relatedRows: any[] = [];
        if (anchor) {
          // Extract the district number from the district field
          const districtNumMatch = (anchor.district ?? '').match(/(\d+)/);
          const districtNum = districtNumMatch ? districtNumMatch[1] : null;
          const stateName = state;
          const officeType = anchor.office_type;

          if (districtNum && stateName) {
            // Find candidates in related positions (same state, same district number, same office type)
            const related = await db.execute(sql`
              SELECT pol.id, pol.full_name, pol.party, pol.is_current, pol.profile_type,
                     pol.photo_url, pol.handle, pol.corruption_grade, pol.total_contributions, pol.is_verified,
                     pos.id as pos_id, pos.title as pos_title, pos.office_type,
                     pos.level, pos.jurisdiction, pos.district
              FROM politician_profiles pol
              JOIN political_positions pos ON pol.position_id = pos.id
              WHERE pol.position_id != ${positionId}
                AND pos.office_type = ${officeType}
                AND pos.level = ${anchor.level}
                AND pos.district ~ ${`\\m${districtNum}\\M`}
              ORDER BY pol.is_current DESC, pol.full_name
            `);
            relatedRows = related.rows as any[];
          } else if (stateName && !districtNum) {
            // No district: match by state jurisdiction + office type (e.g. senate race)
            const related = await db.execute(sql`
              SELECT pol.id, pol.full_name, pol.party, pol.is_current, pol.profile_type,
                     pol.photo_url, pol.handle, pol.corruption_grade, pol.total_contributions, pol.is_verified,
                     pos.id as pos_id, pos.title as pos_title, pos.office_type,
                     pos.level, pos.jurisdiction, pos.district
              FROM politician_profiles pol
              JOIN political_positions pos ON pol.position_id = pos.id
              WHERE pol.position_id != ${positionId}
                AND pos.office_type = ${officeType}
                AND (pos.jurisdiction ILIKE ${stateName} OR pos.jurisdiction ILIKE ${'%' + stateName + '%'})
              ORDER BY pol.is_current DESC, pol.full_name
            `);
            relatedRows = related.rows as any[];
          }
        }

        const mapRow = (row: any) => ({
          id: row.id,
          fullName: row.full_name,
          party: row.party,
          isCurrent: row.is_current,
          profileType: row.profile_type,
          photoUrl: row.photo_url,
          handle: row.handle,
          corruptionGrade: row.corruption_grade,
          totalContributions: row.total_contributions,
          isVerified: row.is_verified,
        });

        const seen = new Set<string>();
        politicians = [...(rows.rows as any[]), ...relatedRows]
          .filter(r => { if (seen.has(r.id)) return false; seen.add(r.id); return true; })
          .map(mapRow);
      } else if (office) {
        // Fallback: match by office name (legacy)
        politicians = await storage.getPoliticiansByStateAndDistrict(state || '', []);
      }

      res.json({ office: office || '', state, politicians });
    } catch (error: any) {
      console.error("Elections race lookup error:", error);
      res.status(500).json({ message: error.message || "Failed to load race data" });
    }
  });

  // Lookup politician by handle (public)
  app.get("/api/politicians/by-handle/:handle", async (req, res) => {
    try {
      const profile = await storage.getPoliticianByHandle(req.params.handle);
      if (!profile) return res.status(404).json({ message: "Politician not found" });
      res.json(profile);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/politicians/import-congress", ensureAdmin, async (req, res) => {
    try {
      const result = await storage.importCongress();
      res.json({ success: true, ...result });
    } catch (error: any) {
      console.error("Congress import error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/politicians/import-candidates", ensureAdmin, async (req, res) => {
    try {
      const { candidates } = req.body;
      if (!Array.isArray(candidates) || candidates.length === 0) {
        return res.status(400).json({ message: "candidates array is required" });
      }
      const result = await storage.importCandidates(candidates);
      res.json({ success: true, ...result });
    } catch (error: any) {
      console.error("Candidate import error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/politicians/import-profiles-csv", ensureAdmin, async (req, res) => {
    try {
      const { profiles } = req.body;
      if (!Array.isArray(profiles) || profiles.length === 0) {
        return res.status(400).json({ message: "profiles array is required" });
      }
      const result = await storage.importProfilesCsv(profiles);
      res.json({ success: true, ...result });
    } catch (error: any) {
      console.error("Profile CSV import error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/politicians/import-positions-csv", ensureAdmin, async (req, res) => {
    try {
      const { positions } = req.body;
      if (!Array.isArray(positions) || positions.length === 0) {
        return res.status(400).json({ message: "positions array is required" });
      }
      const result = await storage.importPositionsCsv(positions);
      res.json({ success: true, ...result });
    } catch (error: any) {
      console.error("Positions CSV import error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/politicians/export-csv", ensureAdmin, async (req, res) => {
    try {
      const rows = await db.execute(sql`
        SELECT
          pol.full_name        AS "FULL_NAME",
          COALESCE(pol.profile_type, 'candidate') AS "PROFILE_TYPE",
          COALESCE(pos.title, '')                 AS "OFFICE",
          COALESCE(pos.level, '')                 AS "OFFICE_LEVEL",
          COALESCE(pos.jurisdiction, '')          AS "STATE",
          COALESCE(pos.district, '')              AS "DISTRICT",
          COALESCE(pol.party, '')                 AS "PARTY",
          CASE WHEN pol.is_current THEN 'Yes' ELSE 'No' END AS "INCUMBENT",
          COALESCE(pol.notes, '')                 AS "STATUS",
          COALESCE(pol.term_start, '')            AS "PRIMARY_DATE",
          COALESCE(pol.term_end, '')              AS "GENERAL_DATE",
          COALESCE(pol.fec_candidate_id, '')      AS "FEC_CANDIDATE_ID",
          COALESCE(pol.ballotpedia_url, '')       AS "BALLOTPEDIA_URL",
          COALESCE(pol.website, '')               AS "WEBSITE",
          COALESCE(pol.email, '')                 AS "EMAIL",
          COALESCE(pol.phone, '')                 AS "PHONE",
          COALESCE(pol.biography, '')             AS "BIOGRAPHY",
          COALESCE(pol.photo_url, '')             AS "PHOTO_URL",
          ''                                      AS "NOTES"
        FROM politician_profiles pol
        LEFT JOIN political_positions pos ON pol.position_id = pos.id
        ORDER BY pol.full_name
      `);
      res.json(rows.rows);
    } catch (error: any) {
      console.error("Export CSV error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/politicians/fetch-photos", ensureAdmin, async (req, res) => {
    try {
      const allProfiles = await storage.listPoliticianProfiles();
      let fetched = 0;
      let alreadyHad = 0;
      let notFound = 0;

      for (const profile of allProfiles) {
        if (profile.photoUrl) {
          alreadyHad++;
          continue;
        }
        try {
          const wikiName = profile.fullName.replace(/ /g, "_");
          const wikiRes = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikiName)}`, {
            headers: { "User-Agent": "ACPPoliticalPlatform/1.0 (contact@anticorruptionparty.us)" },
          });
          if (wikiRes.ok) {
            const wikiData: any = await wikiRes.json();
            if (wikiData.type === "standard" && wikiData.thumbnail?.source) {
              await storage.updatePoliticianPhoto(profile.id, wikiData.thumbnail.source);
              fetched++;
            } else {
              notFound++;
            }
          } else {
            notFound++;
          }
        } catch {
          notFound++;
        }
        await new Promise(r => setTimeout(r, 100));
      }

      res.json({ success: true, fetched, alreadyHad, notFound, total: allProfiles.length });
    } catch (error: any) {
      console.error("Fetch photos error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Verify email claim token (clicked from email link) — must be BEFORE /:id
  app.get("/api/politician-profiles/verify-claim/:token", async (req, res) => {
    try {
      const profile = await storage.verifyClaimToken(req.params.token);
      if (!profile) {
        return res.redirect(`/politicians?claim_error=invalid_or_expired`);
      }
      await storage.approveClaimRequest(profile.id);
      await storage.setPoliticianClaimToken(profile.id, "", new Date(0));
      res.redirect(`/politicians/${profile.id}?claimed=true`);
    } catch (error: any) {
      console.error("Verify claim token error:", error);
      res.redirect(`/politicians?claim_error=server_error`);
    }
  });

  // Public politician profile page route
  app.get("/api/politician-profiles/:id", async (req, res) => {
    try {
      const profile = await storage.getPoliticianProfile(req.params.id);
      if (!profile) {
        return res.status(404).json({ message: "Politician profile not found" });
      }
      res.json(profile);
    } catch (error: any) {
      console.error("Get politician profile error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Admin: Refresh BallotPedia/Wikipedia data for all profiles (or one)
  app.post("/api/admin/politician-profiles/refresh-data", ensureAdmin, async (req, res) => {
    try {
      const { id } = req.body;
      if (id) {
        const result = await storage.refreshProfileData(id as string);
        return res.json(result);
      }
      const result = await storage.refreshAllProfilesData();
      res.json(result);
    } catch (error: any) {
      console.error("Refresh profile data error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Submit email-based page claim request
  app.post("/api/politician-profiles/:id/claim-by-email", async (req, res) => {
    try {
      const profile = await storage.getPoliticianProfile(req.params.id);
      if (!profile) return res.status(404).json({ message: "Profile not found" });
      if (!profile.email) return res.status(400).json({ message: "This profile has no public email on file" });
      if (profile.isVerified) return res.status(400).json({ message: "This profile is already claimed" });

      const { randomBytes } = await import("crypto");
      const token = randomBytes(32).toString("hex");
      const expiry = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours

      await storage.setPoliticianClaimToken(req.params.id, token, expiry);

      const verifyUrl = `${req.protocol}://${req.get("host")}/api/politician-profiles/verify-claim/${token}`;
      const { sendClaimVerificationEmail } = await import("./email");
      await sendClaimVerificationEmail(profile.email, profile.fullName, verifyUrl);

      res.json({ sent: true, email: profile.email });
    } catch (error: any) {
      console.error("Claim by email error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Verify email claim token (clicked from email link)
  app.get("/api/politician-profiles/verify-claim/:token", async (req, res) => {
    try {
      const profile = await storage.verifyClaimToken(req.params.token);
      if (!profile) {
        return res.redirect(`/politicians?claim_error=invalid_or_expired`);
      }
      await storage.approveClaimRequest(profile.id);
      // Clear the token
      await storage.setPoliticianClaimToken(profile.id, "", new Date(0));
      res.redirect(`/politicians/${profile.id}?claimed=true`);
    } catch (error: any) {
      console.error("Verify claim token error:", error);
      res.redirect(`/politicians?claim_error=server_error`);
    }
  });

  // Submit page claim request
  app.post("/api/politician-profiles/:id/claim", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { email, phone } = z.object({ 
        email: z.string().email(), 
        phone: z.string().min(10) 
      }).parse(req.body);

      const existing = await storage.getPoliticianProfile(req.params.id);
      if (existing && (!existing.handle || existing.handle === '')) {
        const jurisdiction = (existing as any).position?.jurisdiction ?? null;
        const stateAbbr = getStateAbbrFromJurisdiction(jurisdiction);
        let handle = generateHandle(existing.fullName, stateAbbr);
        const allHandles = await db.select({ handle: politicianProfiles.handle }).from(politicianProfiles);
        const used = new Set(allHandles.map(h => (h.handle ?? '').toLowerCase()).filter(Boolean));
        let final = handle;
        let s = 2;
        while (used.has(final.toLowerCase())) { final = handle + '_' + s; s++; }
        await db.update(politicianProfiles).set({ handle: final } as any).where(eq(politicianProfiles.id, req.params.id));
      }

      const claimUserId = req.user!.id;
      console.log(`[CLAIM] Submitted for politician_id=${req.params.id} by user_id=${claimUserId}`);
      const profile = await storage.submitPageClaimRequest(req.params.id, email, phone, String(claimUserId));
      res.json({ success: true, message: "Claim request submitted successfully", profile });
    } catch (error: any) {
      console.error("Submit claim request error:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Validation error: Email and phone are required" });
      }
      res.status(500).json({ message: error.message });
    }
  });

  // Admin: Approve claim request
  app.patch("/api/admin/politician-profiles/:id/claim-approve", ensureAdmin, async (req, res) => {
    try {
      const profile = await storage.approveClaimRequest(req.params.id);
      // Use stored claimRequestUserId first, fall back to email lookup for older claims
      let userId = profile.claimRequestUserId;
      if (!userId && profile.claimRequestEmail) {
        const claimingUser = await db.execute(sql`SELECT id FROM users WHERE email = ${profile.claimRequestEmail} LIMIT 1`);
        userId = (claimingUser.rows as { id: string }[])[0]?.id ?? null;
      }
      if (userId) {
        await db.execute(sql`UPDATE users SET role = 'candidate' WHERE id = ${userId}`);
        await db.execute(sql`UPDATE politician_profiles SET claimed_by_user_id = ${userId} WHERE id = ${req.params.id}`);
        console.log(`[CLAIM] Approved: politician_id=${req.params.id}, user_id=${userId} elevated to candidate role`);
      } else {
        console.warn(`[CLAIM] Approved politician_id=${req.params.id} but no user could be linked (no userId or matching email)`);
      }
      res.json(profile);
    } catch (error: any) {
      console.error("Approve claim request error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/admin/politician-profiles/:id/claim-reject", ensureAdmin, async (req, res) => {
    try {
      const { reason } = req.body || {};
      const profile = await storage.rejectClaimRequest(req.params.id);
      if (reason) {
        await db.execute(sql`UPDATE politician_profiles SET notes = COALESCE(notes, '') || ${'\nRejection reason: ' + reason} WHERE id = ${req.params.id}`);
      }
      res.json(profile);
    } catch (error: any) {
      console.error("Reject claim request error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Admin: directly link a user account to a politician profile by username or email
  app.post("/api/admin/politician-profiles/:id/link-user", ensureAdmin, async (req, res) => {
    try {
      const { usernameOrEmail } = req.body;
      if (!usernameOrEmail) return res.status(400).json({ message: "usernameOrEmail is required" });
      const result = await db.execute(
        sql`SELECT id, username, email FROM users WHERE username = ${usernameOrEmail} OR email = ${usernameOrEmail} LIMIT 1`
      );
      const user = (result.rows as { id: number; username: string; email: string }[])[0];
      if (!user) return res.status(404).json({ message: "No user found with that username or email" });
      await db.execute(sql`UPDATE politician_profiles SET claimed_by_user_id = ${user.id}, is_verified = true WHERE id = ${req.params.id}`);
      await db.execute(sql`UPDATE users SET role = 'candidate' WHERE id = ${user.id}`);
      console.log(`[LINK] Admin linked user_id=${user.id} (${user.username}) to politician_id=${req.params.id}`);
      res.json({ message: "User linked successfully", userId: user.id, username: user.username });
    } catch (error: any) {
      console.error("Link user error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Admin: remove user account link from a politician profile
  app.delete("/api/admin/politician-profiles/:id/link-user", ensureAdmin, async (req, res) => {
    try {
      await db.execute(sql`UPDATE politician_profiles SET claimed_by_user_id = NULL WHERE id = ${req.params.id}`);
      res.json({ message: "User unlinked successfully" });
    } catch (error: any) {
      console.error("Unlink user error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Politician Corruption Rating APIs
  // Submit or update a corruption rating for a politician
  app.post("/api/politician-profiles/:id/rate", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const { grade, reasoning } = z.object({
        grade: z.enum(['A', 'B', 'C', 'D', 'F']),
        reasoning: z.string().optional(),
      }).parse(req.body);
      
      const rating = await storage.submitCorruptionRating(
        req.params.id,
        req.user!.id,
        grade,
        reasoning
      );
      res.json(rating);
    } catch (error: any) {
      console.error("Submit corruption rating error:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid rating data" });
      }
      res.status(500).json({ message: error.message });
    }
  });

  // Get current user's rating for a politician
  app.get("/api/politician-profiles/:id/rating/me", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const rating = await storage.getUserCorruptionRating(req.params.id, req.user!.id);
      res.json(rating || null);
    } catch (error: any) {
      console.error("Get user corruption rating error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get aggregated corruption rating statistics for a politician
  app.get("/api/politician-profiles/:id/rating/stats", async (req, res) => {
    try {
      const stats = await storage.getCorruptionRatingStats(req.params.id);
      res.json(stats);
    } catch (error: any) {
      console.error("Get corruption rating stats error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // ==========================================
  // Public SIG routes (must be before /api/admin/sigs)
  app.get("/api/sigs", async (req, res) => {
    try {
      const filters: { category?: string; sentiment?: string } = {};
      if (req.query.category) filters.category = req.query.category as string;
      if (req.query.sentiment) filters.sentiment = req.query.sentiment as string;
      const sigs = await storage.getPublicSigs(filters);
      res.json(sigs);
    } catch (e) {
      console.error("Error fetching public SIGs:", e);
      res.status(500).json({ message: "Failed to fetch SIGs" });
    }
  });

  app.get("/api/sigs/:tag", async (req, res) => {
    try {
      const userId = (req.user as any)?.id as string | undefined;
      const result = await storage.getPublicSigByTag(req.params.tag, userId);
      if (!result) return res.status(404).json({ message: "SIG not found" });
      res.json(result);
    } catch (e) {
      console.error("Error fetching SIG by tag:", e);
      res.status(500).json({ message: "Failed to fetch SIG" });
    }
  });

  app.patch("/api/admin/sigs/:id/influence", ensureAdmin, async (req, res) => {
    try {
      const { influenceScore, letterGrade } = req.body;
      const score = influenceScore !== undefined ? Math.max(-50, Math.min(50, Math.round(Number(influenceScore)))) : null;
      const grade = letterGrade || null;
      await storage.updateSigInfluence(req.params.id, score, grade);
      res.json({ success: true });
    } catch (e: any) {
      console.error("Update SIG influence error:", e);
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/sigs/:tag/community-vote", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Login required to vote" });
      const userId = (req.user as any)?.id as string;
      const { vote } = req.body;
      if (typeof vote !== "number" || vote < -50 || vote > 50) {
        return res.status(400).json({ message: "Vote must be an integer between -50 and 50" });
      }
      const sigResult = await storage.getPublicSigByTag(req.params.tag);
      if (!sigResult) return res.status(404).json({ message: "SIG not found" });
      const record = await storage.submitSigCommunityVote(sigResult.sig.id, userId, vote);
      res.json(record);
    } catch (e) {
      console.error("Error submitting SIG community vote:", e);
      res.status(500).json({ message: "Failed to submit vote" });
    }
  });

  // Special Interest Groups (SIGs) Admin API
  // ==========================================

  // List all SIGs with optional filters
  app.get("/api/admin/sigs", ensureAdmin, async (req, res) => {
    try {
      const filters = {
        category: req.query.category as string | undefined,
        industry: req.query.industry as string | undefined,
        search: req.query.search as string | undefined,
        isActive: req.query.isActive ? req.query.isActive === 'true' : undefined,
      };
      const sigs = await storage.listSpecialInterestGroups(filters);
      res.json(sigs);
    } catch (error: any) {
      console.error("List SIGs error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Seed 62 SIGs from XLSX data (admin only)
  app.post("/api/admin/sigs/seed-xlsx", ensureStateAdmin, async (req, res) => {
    const SIG_SEED_DATA = [
      { name: "AIPAC", tag: "AIPAC", description: "American Israel Public Affairs Committee — major pro-Israel lobbying group with a super PAC arm (United Democracy Project) that spends heavily in primaries.", category: "Special Interest", sentiment: "negative", dataSourceName: "TrackAIPAC / OpenSecrets", dataSourceUrl: "https://trackaipac.com", disclosureNotes: "FEC committee ID: C00797878 (United Democracy Project)" },
      { name: "Make America Great Again Inc.", tag: "MAGA_PAC", description: "Trump-aligned super PAC, the largest single pro-Republican presidential super PAC of the 2024 cycle. Top donor: Timothy Mellon ($151.5M).", category: "Super PAC", sentiment: "negative", dataSourceName: "OpenSecrets / FEC", dataSourceUrl: "https://www.opensecrets.org/outside-spending/super_pacs", disclosureNotes: "FEC ID: C00618371" },
      { name: "Future Forward USA PAC", tag: "FUTURE_FORWARD_PAC", description: "Largest Democratic-aligned hybrid PAC of the 2024 cycle, supporting the Harris presidential campaign. Heavily funded by the dark money group Future Forward USA Action.", category: "Super PAC", sentiment: "negative", dataSourceName: "OpenSecrets", dataSourceUrl: "https://www.opensecrets.org/outside-spending/super_pacs", disclosureNotes: "FEC ID: C00769919" },
      { name: "America PAC", tag: "AMERICA_PAC", description: "Elon Musk-backed super PAC supporting Trump in 2024. Ran large-scale voter registration and canvassing operations in swing states.", category: "Super PAC", sentiment: "negative", dataSourceName: "OpenSecrets / FEC", dataSourceUrl: "https://www.opensecrets.org/outside-spending/super_pacs", disclosureNotes: "FEC ID: C00835959" },
      { name: "Preserve America PAC", tag: "PRESERVE_AMERICA_PAC", description: "Pro-Trump super PAC funded largely by Timothy Mellon ($40M). Focused on anti-immigration messaging.", category: "Super PAC", sentiment: "negative", dataSourceName: "OpenSecrets", dataSourceUrl: "https://www.opensecrets.org/outside-spending/super_pacs", disclosureNotes: "" },
      { name: "Senate Leadership Fund", tag: "SLF", description: "McConnell-aligned super PAC focused on electing Senate Republicans. Backed by major corporate donors.", category: "Super PAC", sentiment: "negative", dataSourceName: "OpenSecrets", dataSourceUrl: "https://www.opensecrets.org/outside-spending/super_pacs", disclosureNotes: "" },
      { name: "Senate Majority PAC", tag: "SENATE_MAJORITY_PAC", description: "Democratic super PAC focused on winning Senate seats. Coordinated with Schumer leadership.", category: "Super PAC", sentiment: "negative", dataSourceName: "OpenSecrets", dataSourceUrl: "https://www.opensecrets.org/outside-spending/super_pacs", disclosureNotes: "" },
      { name: "House Majority PAC", tag: "HOUSE_MAJORITY_PAC", description: "Democratic super PAC focused on House races. Aligned with Pelosi/Jeffries leadership.", category: "Super PAC", sentiment: "negative", dataSourceName: "OpenSecrets", dataSourceUrl: "https://www.opensecrets.org/outside-spending/super_pacs", disclosureNotes: "" },
      { name: "Congressional Leadership Fund", tag: "CLF", description: "Republican super PAC affiliated with House Republican leadership. Major corporate donor base.", category: "Super PAC", sentiment: "negative", dataSourceName: "OpenSecrets", dataSourceUrl: "https://www.opensecrets.org/outside-spending/super_pacs", disclosureNotes: "" },
      { name: "American Values 2024", tag: "AMERICAN_VALUES_2024", description: "Conservative dark-money aligned super PAC with significant spending in the 2024 cycle.", category: "Super PAC", sentiment: "negative", dataSourceName: "OpenSecrets", dataSourceUrl: "https://www.opensecrets.org/outside-spending/super_pacs", disclosureNotes: "" },
      { name: "United Democracy Project", tag: "UDP", description: "AIPAC's super PAC arm. Spent over $30M in Democratic primaries targeting progressive incumbents who opposed Israeli government policies.", category: "Super PAC", sentiment: "negative", dataSourceName: "TrackAIPAC", dataSourceUrl: "https://trackaipac.com", disclosureNotes: "FEC ID: C00797878" },
      { name: "DMFI PAC", tag: "DMFI_PAC", description: "Democratic Majority for Israel PAC. Targets progressive Democrats critical of Israeli government. Works alongside AIPAC in primaries.", category: "Super PAC", sentiment: "negative", dataSourceName: "OpenSecrets", dataSourceUrl: "https://www.opensecrets.org/outside-spending/super_pacs", disclosureNotes: "" },
      { name: "Future Forward USA Action", tag: "FUTURE_FORWARD_ACTION", description: "Dark money 501(c)(4) behind Future Forward USA PAC. One of the largest dark money groups in 2024, backing Harris campaign.", category: "Dark Money", sentiment: "negative", dataSourceName: "OpenSecrets", dataSourceUrl: "https://www.opensecrets.org/outside-spending/nonprofits", disclosureNotes: "" },
      { name: "Majority Forward", tag: "MAJORITY_FORWARD", description: "Dark money arm of Senate Majority PAC. Funded Democratic Senate campaigns without full donor disclosure.", category: "Dark Money", sentiment: "negative", dataSourceName: "OpenSecrets", dataSourceUrl: "https://www.opensecrets.org/outside-spending/nonprofits", disclosureNotes: "" },
      { name: "Building America's Future", tag: "BLDG_AMERICA_FUTURE", description: "Conservative dark money 501(c)(4) supporting Republican candidates without donor disclosure.", category: "Dark Money", sentiment: "negative", dataSourceName: "OpenSecrets", dataSourceUrl: "https://www.opensecrets.org/outside-spending/nonprofits", disclosureNotes: "" },
      { name: "Securing American Greatness", tag: "SECURING_AMER_GREATNESS", description: "Trump-aligned dark money group funneling undisclosed funds to pro-MAGA causes.", category: "Dark Money", sentiment: "negative", dataSourceName: "OpenSecrets", dataSourceUrl: "https://www.opensecrets.org/outside-spending/nonprofits", disclosureNotes: "" },
      { name: "One Nation", tag: "ONE_NATION", description: "McConnell-linked dark money 501(c)(4) that funds the Senate Leadership Fund ecosystem.", category: "Dark Money", sentiment: "negative", dataSourceName: "OpenSecrets", dataSourceUrl: "https://www.opensecrets.org/outside-spending/nonprofits", disclosureNotes: "" },
      { name: "NRA Political Victory Fund", tag: "NRA_PVF", description: "PAC arm of the National Rifle Association. Endorses and funds candidates opposing gun control legislation.", category: "Industry PAC", sentiment: "negative", dataSourceName: "OpenSecrets", dataSourceUrl: "https://www.opensecrets.org/orgs/national-rifle-assn/summary", disclosureNotes: "" },
      { name: "Koch Industries PAC", tag: "KOCH_PAC", description: "Koch Industries' corporate PAC. Funds free-market, anti-regulation candidates. Part of the broader Koch network (Americans for Prosperity).", category: "Industry PAC", sentiment: "negative", dataSourceName: "OpenSecrets", dataSourceUrl: "https://www.opensecrets.org/orgs/koch-industries/summary", disclosureNotes: "" },
      { name: "American Petroleum Institute", tag: "API_PAC", description: "Fossil fuel industry's main lobbying arm. Funds climate-skeptic and anti-regulation candidates.", category: "Industry PAC", sentiment: "negative", dataSourceName: "OpenSecrets", dataSourceUrl: "https://www.opensecrets.org/orgs/american-petroleum-institute/summary", disclosureNotes: "" },
      { name: "PhRMA (Pharmaceutical Research & Manufacturers)", tag: "PHRMA", description: "Big Pharma's main lobby. Opposes Medicare drug price negotiation, generic drug reforms, and international drug pricing.", category: "Industry PAC", sentiment: "negative", dataSourceName: "OpenSecrets", dataSourceUrl: "https://www.opensecrets.org/orgs/pharmaceutical-rsrch-mfrs-of-america/summary", disclosureNotes: "" },
      { name: "Blue Cross Blue Shield Association", tag: "BCBS_PAC", description: "Health insurance industry PAC. Lobbies against public options and Medicare expansion.", category: "Industry PAC", sentiment: "negative", dataSourceName: "OpenSecrets", dataSourceUrl: "https://www.opensecrets.org/orgs/blue-cross-blue-shield/summary", disclosureNotes: "" },
      { name: "Goldman Sachs PAC", tag: "GOLDMAN_PAC", description: "Wall Street mega-bank PAC. Funds candidates on both sides of the aisle; opposes financial regulation (Dodd-Frank rollbacks).", category: "Industry PAC", sentiment: "negative", dataSourceName: "OpenSecrets", dataSourceUrl: "https://www.opensecrets.org/orgs/goldman-sachs/summary", disclosureNotes: "" },
      { name: "Blackstone Group PAC", tag: "BLACKSTONE_PAC", description: "Private equity giant's PAC. Opposes carried interest tax reform and financial regulation.", category: "Industry PAC", sentiment: "negative", dataSourceName: "OpenSecrets", dataSourceUrl: "https://www.opensecrets.org/orgs/blackstone-group/summary", disclosureNotes: "" },
      { name: "National Association of Realtors PAC", tag: "NAR_PAC", description: "One of the largest industry PACs in the U.S. Funds candidates supporting real estate tax breaks and opposing housing regulations.", category: "Industry PAC", sentiment: "negative", dataSourceName: "OpenSecrets", dataSourceUrl: "https://www.opensecrets.org/orgs/national-assn-of-realtors/summary", disclosureNotes: "" },
      { name: "American Bankers Association PAC", tag: "ABA_PAC", description: "Banking industry lobby. Opposes consumer financial protections, student loan relief, and CFPB enforcement.", category: "Industry PAC", sentiment: "negative", dataSourceName: "OpenSecrets", dataSourceUrl: "https://www.opensecrets.org/orgs/american-bankers-assn/summary", disclosureNotes: "" },
      { name: "Chamber of Commerce", tag: "US_CHAMBER", description: "The U.S. Chamber of Commerce is the largest lobbying organization in America. Opposes labor rights, environmental regulations, and corporate tax increases.", category: "Industry PAC", sentiment: "negative", dataSourceName: "OpenSecrets", dataSourceUrl: "https://www.opensecrets.org/orgs/us-chamber-of-commerce/summary", disclosureNotes: "" },
      { name: "American Farm Bureau Federation", tag: "AFBF_PAC", description: "Agribusiness lobby. Opposes climate and pesticide regulations; supports farm subsidy programs benefiting large agricultural corporations.", category: "Industry PAC", sentiment: "negative", dataSourceName: "OpenSecrets", dataSourceUrl: "https://www.opensecrets.org/orgs/american-farm-bureau/summary", disclosureNotes: "" },
      { name: "National Association of Home Builders PAC", tag: "NAHB_PAC", description: "Real estate development PAC. Opposes zoning reform, environmental building standards, and affordable housing mandates.", category: "Industry PAC", sentiment: "negative", dataSourceName: "OpenSecrets", dataSourceUrl: "https://www.opensecrets.org/orgs/national-assn-of-home-builders/summary", disclosureNotes: "" },
      { name: "Cryptocurrency / Fairshake PAC", tag: "CRYPTO_FAIRSHAKE", description: "Crypto industry super PAC. Spent $130M+ in 2024 cycle targeting candidates who support crypto regulation. Backed by Coinbase, Andreessen Horowitz, Ripple.", category: "Industry PAC", sentiment: "negative", dataSourceName: "OpenSecrets / FEC", dataSourceUrl: "https://www.opensecrets.org/outside-spending/super_pacs", disclosureNotes: "FEC ID: C00835082" },
      { name: "EMILY's List", tag: "EMILYS_LIST", description: "Supports pro-choice Democratic women candidates. One of the largest donor networks for Democratic women running for office.", category: "Endorsement Org", sentiment: "positive", dataSourceName: "EMILY's List", dataSourceUrl: "https://www.emilyslist.org/endorsements", disclosureNotes: "" },
      { name: "End Citizens United", tag: "PLEDGE_END_CU", description: "Candidate pledges to support overturning Citizens United and reducing dark money in politics.", category: "Pledge", sentiment: "positive", dataSourceName: "End Citizens United", dataSourceUrl: "https://endcitizensunited.org", disclosureNotes: "" },
      { name: "No Corporate PAC Money Pledge", tag: "PLEDGE_NO_CORP_PAC", description: "Candidate commits to refusing donations from corporate PACs. Popularized by progressive challengers against establishment Democrats.", category: "Pledge", sentiment: "positive", dataSourceName: "End Citizens United / Issue One", dataSourceUrl: "https://endcitizensunited.org/no-pac-pledge", disclosureNotes: "" },
      { name: "No Fossil Fuel Money Pledge", tag: "PLEDGE_NO_FOSSIL_FUEL", description: "Candidate commits to refusing contributions from fossil fuel companies, their executives, and PACs.", category: "Pledge", sentiment: "positive", dataSourceName: "Oil Change International", dataSourceUrl: "https://nofossilfuelmoney.org", disclosureNotes: "" },
      { name: "No Super PAC Pledge", tag: "PLEDGE_NO_SUPER_PAC", description: "Candidate commits to not benefiting from outside spending by super PACs on their behalf.", category: "Pledge", sentiment: "positive", dataSourceName: "Issue One / End Citizens United", dataSourceUrl: "https://endcitizensunited.org", disclosureNotes: "" },
      { name: "No Lobbyist Money Pledge", tag: "PLEDGE_NO_LOBBYIST", description: "Candidate commits to refusing donations from registered federal lobbyists.", category: "Pledge", sentiment: "positive", dataSourceName: "Various campaign disclosures", dataSourceUrl: "https://www.fec.gov", disclosureNotes: "" },
      { name: "No PAC Money Pledge (All PACs)", tag: "PLEDGE_NO_PAC", description: "Stricter version: candidate refuses money from all PACs, not just corporate ones. Used by some progressive and libertarian candidates.", category: "Pledge", sentiment: "positive", dataSourceName: "Candidate disclosures", dataSourceUrl: "https://www.fec.gov", disclosureNotes: "" },
      { name: "Bundler Disclosure Pledge", tag: "PLEDGE_BUNDLER_DISCLOSURE", description: "Candidate commits to publicly disclosing the identities of all bundlers who raise $10,000+ for their campaign.", category: "Pledge", sentiment: "positive", dataSourceName: "Issue One", dataSourceUrl: "https://issueone.org", disclosureNotes: "" },
      { name: "No Closed-Door Fundraiser Pledge", tag: "PLEDGE_NO_CLOSED_FUNDRAISER", description: "Candidate commits to not holding private fundraisers closed to the press and public.", category: "Pledge", sentiment: "positive", dataSourceName: "Candidate disclosures", dataSourceUrl: "https://www.fec.gov", disclosureNotes: "" },
      { name: "No NRA Money Pledge", tag: "PLEDGE_NO_NRA", description: "Candidate commits to refusing donations from the NRA and affiliated gun lobby groups.", category: "Pledge", sentiment: "positive", dataSourceName: "Giffords / Everytown", dataSourceUrl: "https://giffords.org/elections", disclosureNotes: "" },
      { name: "No AIPAC Money Pledge", tag: "PLEDGE_NO_AIPAC", description: "Candidate commits to refusing contributions from AIPAC, United Democracy Project, and DMFI PAC.", category: "Pledge", sentiment: "positive", dataSourceName: "TrackAIPAC", dataSourceUrl: "https://trackaipac.com", disclosureNotes: "" },
      { name: "Medicare for All Pledge", tag: "PLEDGE_M4A", description: "Candidate commits to supporting Medicare for All (single-payer) legislation.", category: "Pledge", sentiment: "positive", dataSourceName: "Medicare for All Caucus", dataSourceUrl: "https://jayapal.house.gov/medicare-for-all", disclosureNotes: "" },
      { name: "Green New Deal Pledge", tag: "PLEDGE_GND", description: "Candidate commits to supporting the Green New Deal framework for climate and economic transition.", category: "Pledge", sentiment: "positive", dataSourceName: "Sunrise Movement", dataSourceUrl: "https://sunrisemovement.org", disclosureNotes: "" },
      { name: "AFL-CIO", tag: "ENDORSE_AFLCIO", description: "The largest federation of labor unions in the U.S. Its endorsement signals strong labor union support.", category: "Labor Union", sentiment: "positive", dataSourceName: "AFL-CIO", dataSourceUrl: "https://aflcio.org/political", disclosureNotes: "Endorsement data available on AFL-CIO website" },
      { name: "SEIU (Service Employees International Union)", tag: "ENDORSE_SEIU", description: "One of the fastest-growing unions; represents healthcare, janitorial, and public sector workers.", category: "Labor Union", sentiment: "positive", dataSourceName: "SEIU", dataSourceUrl: "https://www.seiu.org/elections", disclosureNotes: "" },
      { name: "UAW (United Auto Workers)", tag: "ENDORSE_UAW", description: "Major industrial union representing auto, aerospace workers. Key endorsement in Midwest swing states.", category: "Labor Union", sentiment: "positive", dataSourceName: "UAW", dataSourceUrl: "https://uaw.org/political-action", disclosureNotes: "" },
      { name: "AFSCME", tag: "ENDORSE_AFSCME", description: "American Federation of State, County and Municipal Employees. Major public sector union endorser.", category: "Labor Union", sentiment: "positive", dataSourceName: "AFSCME", dataSourceUrl: "https://www.afscme.org/politics", disclosureNotes: "" },
      { name: "NEA (National Education Association)", tag: "ENDORSE_NEA", description: "Largest teachers union in the U.S. Endorses candidates supporting public education funding.", category: "Labor Union", sentiment: "positive", dataSourceName: "NEA", dataSourceUrl: "https://www.nea.org/advocating-for-change/political-action", disclosureNotes: "" },
      { name: "Planned Parenthood Action Fund", tag: "ENDORSE_PPAF", description: "Endorses candidates who support reproductive rights and access to healthcare.", category: "Endorsement Org", sentiment: "positive", dataSourceName: "Planned Parenthood Action Fund", dataSourceUrl: "https://www.plannedparenthoodaction.org", disclosureNotes: "" },
      { name: "Sierra Club", tag: "ENDORSE_SIERRA_CLUB", description: "Major environmental organization; endorses candidates with strong environmental and climate records.", category: "Endorsement Org", sentiment: "positive", dataSourceName: "Sierra Club", dataSourceUrl: "https://www.sierraclub.org/political", disclosureNotes: "" },
      { name: "Sunrise Movement", tag: "ENDORSE_SUNRISE", description: "Youth-led climate justice organization; endorses candidates backing the Green New Deal and No Fossil Fuel pledge.", category: "Endorsement Org", sentiment: "positive", dataSourceName: "Sunrise Movement", dataSourceUrl: "https://www.sunrisemovement.org/electoral", disclosureNotes: "" },
      { name: "Justice Democrats", tag: "ENDORSE_JUSTICE_DEMS", description: "Progressive PAC endorsing candidates who take no corporate PAC money and back progressive policies.", category: "Endorsement Org", sentiment: "positive", dataSourceName: "Justice Democrats", dataSourceUrl: "https://justicedemocrats.com", disclosureNotes: "" },
      { name: "Giffords (Gun Safety)", tag: "ENDORSE_GIFFORDS", description: "Gun safety organization founded by former Rep. Gabby Giffords. Endorses pro-gun-safety candidates.", category: "Endorsement Org", sentiment: "positive", dataSourceName: "Giffords", dataSourceUrl: "https://giffords.org/elections", disclosureNotes: "" },
      { name: "Everytown for Gun Safety", tag: "ENDORSE_EVERYTOWN", description: "Bloomberg-backed gun safety organization. Endorses and funds candidates supporting gun reform.", category: "Endorsement Org", sentiment: "positive", dataSourceName: "Everytown", dataSourceUrl: "https://everytown.org/elections", disclosureNotes: "" },
      { name: "NARAL Pro-Choice America", tag: "ENDORSE_NARAL", description: "Endorses pro-choice candidates; tracks and scores reproductive rights voting records.", category: "Endorsement Org", sentiment: "positive", dataSourceName: "NARAL", dataSourceUrl: "https://www.prochoiceamerica.org/elections", disclosureNotes: "" },
      { name: "NAACP", tag: "ENDORSE_NAACP", description: "Endorses candidates with strong civil rights and racial equity records.", category: "Endorsement Org", sentiment: "positive", dataSourceName: "NAACP", dataSourceUrl: "https://naacp.org/political-action", disclosureNotes: "" },
      { name: "Human Rights Campaign (HRC)", tag: "ENDORSE_HRC", description: "Leading LGBTQ+ rights organization that endorses pro-equality candidates.", category: "Endorsement Org", sentiment: "positive", dataSourceName: "Human Rights Campaign", dataSourceUrl: "https://www.hrc.org/hrc-story/hrc-political-action-committee", disclosureNotes: "" },
      { name: "League of Conservation Voters (LCV)", tag: "ENDORSE_LCV", description: "Endorses candidates based on environmental scorecard. Publishes annual National Environmental Scorecard.", category: "Endorsement Org", sentiment: "positive", dataSourceName: "League of Conservation Voters", dataSourceUrl: "https://www.lcv.org/elections", disclosureNotes: "Annual scorecard at scorecard.lcv.org" },
      { name: "Democracy for America", tag: "ENDORSE_DFA", description: "Progressive grassroots organization endorsing candidates challenging the political establishment.", category: "Endorsement Org", sentiment: "positive", dataSourceName: "Democracy for America", dataSourceUrl: "https://democracyforamerica.com", disclosureNotes: "" },
      { name: "Our Revolution", tag: "ENDORSE_OUR_REVOLUTION", description: "Organization founded from Bernie Sanders 2016 campaign. Endorses progressive, small-dollar-funded candidates.", category: "Endorsement Org", sentiment: "positive", dataSourceName: "Our Revolution", dataSourceUrl: "https://ourrevolution.com", disclosureNotes: "" },
      { name: "Working Families Party", tag: "ENDORSE_WFP", description: "Progressive third party that cross-endorses candidates in Democratic primaries; labor-union coalition backed.", category: "Endorsement Org", sentiment: "positive", dataSourceName: "Working Families Party", dataSourceUrl: "https://workingfamilies.org", disclosureNotes: "" },
      { name: "Brand New Congress", tag: "ENDORSE_BNC", description: "Recruits and endorses candidates from working-class backgrounds to challenge establishment politicians.", category: "Endorsement Org", sentiment: "positive", dataSourceName: "Brand New Congress", dataSourceUrl: "https://brandnewcongress.org", disclosureNotes: "" },
    ];
    try {
      const count = await storage.seedSigsXlsx(SIG_SEED_DATA);
      res.json({ message: `${count} SIGs seeded successfully`, count });
    } catch (e: any) {
      console.error("Seed SIGs error:", e);
      res.status(500).json({ message: e.message });
    }
  });

  // Get SIG categories for filtering
  app.get("/api/admin/sigs/categories", ensureAdmin, async (req, res) => {
    try {
      const categories = await storage.getSigCategories();
      res.json(categories);
    } catch (error: any) {
      console.error("Get SIG categories error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get SIG industries for filtering
  app.get("/api/admin/sigs/industries", ensureAdmin, async (req, res) => {
    try {
      const industries = await storage.getSigIndustries();
      res.json(industries);
    } catch (error: any) {
      console.error("Get SIG industries error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Update all SIGs that have a fecId with fresh data from the FEC API
  app.post("/api/admin/sigs/update-from-fec", ensureAdmin, async (req, res) => {
    try {
      const fecKey = process.env.FEC_API_KEY;
      if (!fecKey) return res.status(400).json({ message: "FEC_API_KEY not configured" });

      const allSigs = await storage.listSpecialInterestGroups({});
      const withFecId = allSigs.filter(s => s.fecId);

      let updated = 0;
      let skipped = 0;

      function makeAcronym(name: string): string {
        return name.split(/\s+/).map(w => w[0]?.toUpperCase() ?? "").join("");
      }

      for (const sig of withFecId) {
        await new Promise(r => setTimeout(r, 250));
        try {
          const fecId = sig.fecId!.trim().toUpperCase();

          // Fetch committee details
          const commRes = await fetch(
            `https://api.open.fec.gov/v1/committee/${encodeURIComponent(fecId)}/?api_key=${fecKey}`,
            { headers: { Accept: "application/json" } }
          );
          if (!commRes.ok) { skipped++; continue; }
          const commData = await commRes.json();
          const comm = commData.results?.[0] ?? commData.result ?? {};

          // Fetch financial totals (latest cycle)
          const totalsRes = await fetch(
            `https://api.open.fec.gov/v1/committee/${encodeURIComponent(fecId)}/totals/?api_key=${fecKey}&per_page=1&sort=-cycle`,
            { headers: { Accept: "application/json" } }
          );
          let totalReceipts: number | null = null;
          if (totalsRes.ok) {
            const totalsData = await totalsRes.json();
            const latest = totalsData.results?.[0];
            if (latest) {
              const raw = latest.receipts ?? latest.total_receipts ?? latest.total_contributions ?? null;
              if (raw !== null) totalReceipts = Math.round(raw);
            }
          }

          const patch: Record<string, any> = {
            dataSourceName: "FEC",
            dataSourceUrl: `https://www.fec.gov/data/committee/${fecId}/`,
          };

          if (comm.name) {
            patch.name = comm.name;
            patch.acronym = makeAcronym(comm.name);
          }
          if (comm.website) {
            patch.website = comm.website.startsWith("http") ? comm.website : `https://${comm.website}`;
          }

          // Mailing address (street + city + state + zip)
          const addrParts: string[] = [];
          if (comm.street_1) addrParts.push(comm.street_1);
          if (comm.street_2) addrParts.push(comm.street_2);
          if (comm.city) addrParts.push(comm.city);
          if (comm.state) addrParts.push(comm.state);
          if (comm.zip) addrParts.push(comm.zip);
          if (addrParts.length > 0) patch.headquarters = addrParts.join(", ");

          // Founded year from first_file_date
          if (comm.first_file_date) {
            const year = parseInt(comm.first_file_date.substring(0, 4), 10);
            if (!isNaN(year)) patch.foundedYear = year;
          }

          // Contact info
          if (comm.treasurer_phone) patch.contactPhone = comm.treasurer_phone;
          if (comm.email) patch.contactEmail = comm.email;

          // Total contributions
          if (totalReceipts !== null) patch.totalContributions = totalReceipts;

          await storage.updateSpecialInterestGroup(sig.id, patch);
          updated++;
        } catch {
          skipped++;
        }
      }

      res.json({
        total: withFecId.length,
        updated,
        skipped,
        message: `Updated ${updated} of ${withFecId.length} SIGs from FEC data.`,
      });
    } catch (error: any) {
      console.error("Update SIGs from FEC error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // AI-grade all SIGs using OpenAI (influence score -50 to +50)
  app.post("/api/admin/sigs/ai-grade", ensureAdmin, async (req, res) => {
    try {
      if (!process.env.OPENAI_API_KEY) return res.status(400).json({ message: "OPENAI_API_KEY not configured" });

      const allSigs = await storage.listSpecialInterestGroups({});
      // Only grade SIGs that don't already have a score (unless force=true)
      const force = req.body?.force === true;
      const toGrade = force ? allSigs : allSigs.filter(s => s.influenceScore === null || s.influenceScore === undefined);

      const OpenAI = (await import("openai")).default;
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      function scoreToGrade(score: number): string {
        if (score >= 40) return "A+";
        if (score >= 25) return "A";
        if (score >= 10) return "B";
        if (score >= 1) return "B-";
        if (score === 0) return "C";
        if (score >= -9) return "D+";
        if (score >= -24) return "D";
        if (score >= -39) return "F+";
        return "F";
      }

      let graded = 0;
      let errors = 0;

      // Process in batches of 10
      for (let i = 0; i < toGrade.length; i += 10) {
        const batch = toGrade.slice(i, i + 10);
        const items = batch.map(s => ({ id: s.id, name: s.name, category: s.category, description: s.description ?? "" }));

        try {
          const resp = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            temperature: 0.3,
            messages: [
              {
                role: "system",
                content: `You are an objective political analyst rating organizations from the perspective of a neutral, uninterested American voter who values fairness, democracy, and anti-corruption. Score each organization on a scale from -50 (severely corrupting to democracy, self-serving, opaque) to +50 (very positive for democracy, transparent, pro-citizen). Score 0 for truly neutral groups. Return ONLY a JSON array: [{"id":"...","score":0}]`,
              },
              {
                role: "user",
                content: `Rate these organizations:\n${JSON.stringify(items, null, 2)}`,
              },
            ],
          });

          const raw = resp.choices[0]?.message?.content?.trim() ?? "[]";
          const jsonStr = raw.replace(/^```[a-z]*\n?/, "").replace(/\n?```$/, "");
          const ratings: { id: string; score: number }[] = JSON.parse(jsonStr);

          for (const r of ratings) {
            const score = Math.max(-50, Math.min(50, Math.round(r.score)));
            await storage.updateSpecialInterestGroup(r.id, {
              influenceScore: score,
              letterGrade: scoreToGrade(score),
            });
            graded++;
          }
        } catch (batchErr: any) {
          console.error("AI grade batch error:", batchErr.message);
          errors += batch.length;
        }

        await new Promise(r => setTimeout(r, 500)); // rate limit
      }

      res.json({
        total: toGrade.length,
        graded,
        errors,
        message: `AI-graded ${graded} of ${toGrade.length} organizations.`,
      });
    } catch (error: any) {
      console.error("AI grade SIGs error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Find and assign missing FEC committee IDs by searching FEC API by name
  app.post("/api/admin/sigs/find-missing-fec-ids", ensureAdmin, async (req, res) => {
    try {
      const fecKey = process.env.FEC_API_KEY;
      if (!fecKey) return res.status(400).json({ message: "FEC_API_KEY not configured" });

      const allSigs = await storage.listSpecialInterestGroups({ isActive: true });
      const missing = allSigs.filter(s => !s.fecId);

      let found = 0;
      let skipped = 0;
      const results: { name: string; fecId: string }[] = [];

      for (const sig of missing) {
        await new Promise(r => setTimeout(r, 250)); // rate-limit FEC requests
        try {
          const searchUrl = `https://api.open.fec.gov/v1/committees/?q=${encodeURIComponent(sig.name)}&api_key=${fecKey}&per_page=5&sort=-receipts`;
          const searchRes = await fetch(searchUrl, { headers: { Accept: "application/json" } });
          if (!searchRes.ok) { skipped++; continue; }
          const searchData = await searchRes.json();
          const candidates: any[] = searchData.results ?? [];

          // Pick best match: prefer exact name match (case-insensitive), else first result
          const sigNameNorm = sig.name.toLowerCase().trim();
          const exact = candidates.find((c: any) => c.name?.toLowerCase().trim() === sigNameNorm);
          const best = exact ?? (candidates.length > 0 ? candidates[0] : null);

          if (best?.committee_id) {
            await storage.updateSpecialInterestGroup(sig.id, { fecId: best.committee_id });
            results.push({ name: sig.name, fecId: best.committee_id });
            found++;
          } else {
            skipped++;
          }
        } catch {
          skipped++;
        }
      }

      res.json({
        total: missing.length,
        found,
        skipped,
        results,
        message: `Scanned ${missing.length} SIGs without an FEC ID — assigned ${found}, no match for ${skipped}.`,
      });
    } catch (error: any) {
      console.error("Find missing FEC IDs error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Upload CSV to bulk-create/update SIGs
  app.post("/api/admin/sigs/upload-csv", ensureAdmin, upload.single("file"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });

      const text = req.file.buffer.toString("utf-8").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
      const lines = text.split("\n").filter(l => l.trim());
      if (lines.length < 2) return res.status(400).json({ message: "CSV must have a header row and at least one data row" });

      // Parse CSV (handles quoted fields)
      function parseCsvRow(line: string): string[] {
        const fields: string[] = [];
        let cur = "";
        let inQuote = false;
        for (let i = 0; i < line.length; i++) {
          const ch = line[i];
          if (ch === '"') {
            if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
            else inQuote = !inQuote;
          } else if (ch === "," && !inQuote) {
            fields.push(cur.trim()); cur = "";
          } else {
            cur += ch;
          }
        }
        fields.push(cur.trim());
        return fields;
      }

      const headers = parseCsvRow(lines[0]).map(h => h.toUpperCase().replace(/\s+/g, "_"));
      const col = (name: string) => headers.indexOf(name);

      const existingSigs = await storage.listSpecialInterestGroups({});
      const sigsByName: Record<string, string> = {};
      for (const s of existingSigs) sigsByName[s.name.toLowerCase().trim()] = s.id;

      let created = 0;
      let updated = 0;
      let errors = 0;
      const errorDetails: string[] = [];

      for (let i = 1; i < lines.length; i++) {
        const vals = parseCsvRow(lines[i]);
        if (vals.every(v => !v)) continue; // skip blank rows
        const get = (header: string) => {
          const idx = col(header);
          return idx >= 0 ? (vals[idx] ?? "").trim() : "";
        };

        const name = get("NAME");
        if (!name) { errors++; errorDetails.push(`Row ${i + 1}: NAME is required`); continue; }

        const influenceRaw = get("INFLUENCE_SCORE");
        const influenceScore = influenceRaw !== "" ? parseFloat(influenceRaw) : undefined;
        const foundedRaw = get("FOUNDED_YEAR");
        const foundedYear = foundedRaw ? parseInt(foundedRaw, 10) : undefined;
        const contribRaw = get("TOTAL_CONTRIBUTIONS");
        const totalContributions = contribRaw ? parseInt(contribRaw.replace(/[^0-9]/g, ""), 10) : undefined;
        const gradeWeightRaw = get("GRADE_WEIGHT");
        const gradeWeight = gradeWeightRaw ? parseFloat(gradeWeightRaw) : undefined;
        const isActiveRaw = get("IS_ACTIVE").toLowerCase();
        const isActive = isActiveRaw === "" ? true : isActiveRaw !== "false" && isActiveRaw !== "0" && isActiveRaw !== "no";

        function computeAutoGrade(score?: number): string {
          if (score === undefined) return "";
          if (score >= 40) return "A+";
          if (score >= 25) return "A";
          if (score >= 10) return "B";
          if (score >= 1) return "B-";
          if (score === 0) return "C";
          if (score >= -9) return "D+";
          if (score >= -24) return "D";
          if (score >= -39) return "F+";
          return "F";
        }

        const letterGradeRaw = get("LETTER_GRADE");
        const letterGrade = letterGradeRaw || (influenceScore !== undefined ? computeAutoGrade(influenceScore) : undefined);

        const patch: Record<string, any> = {
          name,
          acronym: get("ACRONYM") || undefined,
          description: get("DESCRIPTION") || undefined,
          category: get("CATEGORY") || "other",
          industry: get("INTEREST") || undefined,
          website: get("WEBSITE") || undefined,
          contactEmail: get("CONTACT_EMAIL") || undefined,
          contactPhone: get("CONTACT_PHONE") || undefined,
          headquarters: get("HEADQUARTERS") || undefined,
          foundedYear: !isNaN(foundedYear!) ? foundedYear : undefined,
          logoUrl: get("LOGO_URL") || undefined,
          fecId: get("FEC_ID") || undefined,
          totalContributions: !isNaN(totalContributions!) ? totalContributions : undefined,
          influenceScore: !isNaN(influenceScore!) ? influenceScore : undefined,
          letterGrade: letterGrade || undefined,
          gradeWeight: !isNaN(gradeWeight!) ? gradeWeight : undefined,
          isActive,
          disclosureNotes: get("DISCLOSURE_NOTES") || undefined,
          dataSourceName: get("DATA_SOURCE_NAME") || undefined,
          dataSourceUrl: get("DATA_SOURCE_URL") || undefined,
        };

        try {
          const existingId = sigsByName[name.toLowerCase().trim()];
          if (existingId) {
            await storage.updateSpecialInterestGroup(existingId, patch);
            updated++;
          } else {
            await storage.createSpecialInterestGroup(patch as any);
            created++;
            sigsByName[name.toLowerCase().trim()] = "new";
          }
        } catch (rowErr: any) {
          errors++;
          errorDetails.push(`Row ${i + 1} (${name}): ${rowErr.message}`);
        }
      }

      res.json({
        created,
        updated,
        errors,
        errorDetails: errorDetails.slice(0, 10),
        message: `Imported ${created + updated} SIG(s) — ${created} created, ${updated} updated${errors > 0 ? `, ${errors} errors` : ""}.`,
      });
    } catch (error: any) {
      console.error("CSV upload error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Bulk update multiple SIGs
  app.patch("/api/admin/sigs/bulk", ensureAdmin, async (req, res) => {
    try {
      const { ids, patch } = req.body as { ids: string[]; patch: Record<string, any> };
      if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ message: "No SIG IDs provided" });
      if (!patch || Object.keys(patch).length === 0) return res.status(400).json({ message: "No fields to update" });
      let updated = 0;
      for (const id of ids) {
        try {
          await storage.updateSpecialInterestGroup(id, patch);
          updated++;
        } catch { /* skip individual failures */ }
      }
      res.json({ updated, total: ids.length, message: `Updated ${updated} of ${ids.length} SIG(s).` });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Fix C-number names: if a SIG's name looks like a FEC committee ID (C + 8 digits),
  // copy it to fecId and clear it from name so Update SIGs can fill in the real name.
  app.post("/api/admin/sigs/fix-c-numbers", ensureAdmin, async (req, res) => {
    try {
      const allSigs = await storage.listSpecialInterestGroups({});
      const FEC_ID_RE = /^C\d{8}$/i;
      let fixed = 0;
      const fixedNames: string[] = [];

      for (const sig of allSigs) {
        const trimmed = sig.name?.trim() ?? "";
        if (FEC_ID_RE.test(trimmed)) {
          const committeeId = trimmed.toUpperCase();
          const patch: Record<string, any> = { fecId: committeeId };
          // Only overwrite name if it still looks like a raw ID (don't overwrite a real name)
          if (!sig.fecId) {
            // name is the raw ID — leave name as-is so Update SIGs will replace it
          }
          await storage.updateSpecialInterestGroup(sig.id, patch);
          fixedNames.push(committeeId);
          fixed++;
        }
      }

      res.json({
        fixed,
        ids: fixedNames,
        message: `Found ${fixed} SIG(s) with a raw FEC committee ID as their name — FEC ID field populated. Run "Update SIGs" to fetch their real names.`,
      });
    } catch (error: any) {
      console.error("Fix C-numbers error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get a single SIG
  app.get("/api/admin/sigs/:id", ensureAdmin, async (req, res) => {
    try {
      const sig = await storage.getSpecialInterestGroup(req.params.id);
      if (!sig) {
        return res.status(404).json({ message: "Special Interest Group not found" });
      }
      res.json(sig);
    } catch (error: any) {
      console.error("Get SIG error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Fetch FEC data for a SIG by its stored fecId
  app.post("/api/admin/sigs/:id/fetch-fec", ensureAdmin, async (req, res) => {
    try {
      const fecKey = process.env.FEC_API_KEY;
      if (!fecKey) return res.status(400).json({ message: "FEC_API_KEY not configured" });

      const sig = await storage.getSpecialInterestGroup(req.params.id);
      if (!sig) return res.status(404).json({ message: "Special Interest Group not found" });
      if (!sig.fecId) return res.status(400).json({ message: "This SIG has no FEC Committee ID set. Add one first." });

      const fecId = sig.fecId.trim().toUpperCase();

      // Fetch committee info
      const commRes = await fetch(`https://api.open.fec.gov/v1/committee/${encodeURIComponent(fecId)}/?api_key=${fecKey}`, {
        headers: { Accept: "application/json" },
      });
      if (!commRes.ok) {
        return res.status(502).json({ message: `FEC API returned ${commRes.status} for committee ${fecId}` });
      }
      const commData = await commRes.json();
      const comm = commData.results?.[0] ?? commData.result ?? {};

      // Fetch financial totals (latest cycle)
      const totalsRes = await fetch(
        `https://api.open.fec.gov/v1/committee/${encodeURIComponent(fecId)}/totals/?api_key=${fecKey}&per_page=1&sort=-cycle`,
        { headers: { Accept: "application/json" } }
      );
      let totalReceipts: number | null = null;
      if (totalsRes.ok) {
        const totalsData = await totalsRes.json();
        const latest = totalsData.results?.[0];
        if (latest) {
          const raw = latest.receipts ?? latest.total_receipts ?? latest.total_contributions ?? null;
          if (raw !== null) totalReceipts = Math.round(raw);
        }
      }

      // Build update patch from FEC data
      const patch: Partial<typeof sig> = {
        dataSourceName: "FEC",
        dataSourceUrl: `https://www.fec.gov/data/committee/${fecId}/`,
      };
      if (comm.name) patch.name = comm.name;
      if (comm.website) patch.website = comm.website.startsWith("http") ? comm.website : `https://${comm.website}`;
      // Address: street + city + state + zip
      const addrParts: string[] = [];
      if (comm.street_1) addrParts.push(comm.street_1);
      if (comm.street_2) addrParts.push(comm.street_2);
      if (comm.city) addrParts.push(comm.city);
      if (comm.state) addrParts.push(comm.state);
      if (comm.zip) addrParts.push(comm.zip);
      if (addrParts.length > 0) patch.headquarters = addrParts.join(", ");
      if (comm.treasurer_phone) patch.contactPhone = comm.treasurer_phone;
      if (comm.email) patch.contactEmail = comm.email;
      if (totalReceipts !== null) patch.totalContributions = totalReceipts;

      const updated = await storage.updateSpecialInterestGroup(sig.id, patch);

      const fetched: string[] = [];
      if (comm.name) fetched.push("name");
      if (comm.website) fetched.push("website");
      if (patch.headquarters) fetched.push("headquarters");
      if (totalReceipts !== null) fetched.push("total contributions");

      res.json({ sig: updated, fetched, message: fetched.length > 0 ? `Updated: ${fetched.join(", ")}` : "No new data found on FEC for this committee." });
    } catch (error: any) {
      console.error("FEC fetch error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Create a new SIG
  app.post("/api/admin/sigs", ensureAdmin, async (req, res) => {
    try {
      const rawData = z.object({
        name: z.string().min(1),
        acronym: z.string().optional(),
        description: z.string().optional(),
        category: z.string().min(1),
        website: z.string().url().optional().or(z.literal('')),
        logoUrl: z.string().optional(),
        contactEmail: z.string().email().optional().or(z.literal('')),
        headquarters: z.string().optional(),
        foundedYear: z.number().int().min(1800).max(new Date().getFullYear()).optional(),
        industry: z.string().optional(),
        disclosureNotes: z.string().optional(),
        gradeWeight: z.number().min(0).max(10).optional(),
        isActive: z.boolean().optional(),
        totalContributions: z.number().int().nonnegative().optional().nullable(),
        fecId: z.string().optional().nullable(),
        contactPhone: z.string().optional().nullable(),
      }).parse(req.body);
      const data = { ...rawData, isAce: rawData.category === 'ace_endorsement' };

      const sig = await storage.createSpecialInterestGroup(data);
      res.status(201).json(sig);
    } catch (error: any) {
      console.error("Create SIG error:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: error.message });
    }
  });

  // Update a SIG
  app.patch("/api/admin/sigs/:id", ensureAdmin, async (req, res) => {
    try {
      const rawData = z.object({
        name: z.string().min(1).optional(),
        acronym: z.string().optional(),
        description: z.string().optional(),
        category: z.string().min(1).optional(),
        website: z.string().url().optional().or(z.literal('')),
        logoUrl: z.string().optional(),
        contactEmail: z.string().email().optional().or(z.literal('')),
        headquarters: z.string().optional(),
        foundedYear: z.number().int().min(1800).max(new Date().getFullYear()).optional(),
        industry: z.string().optional(),
        disclosureNotes: z.string().optional(),
        gradeWeight: z.number().min(0).max(10).optional(),
        influenceScore: z.number().int().min(-50).max(50).optional().nullable(),
        letterGrade: z.string().optional().nullable(),
        isActive: z.boolean().optional(),
        totalContributions: z.number().int().nonnegative().optional().nullable(),
        fecId: z.string().optional().nullable(),
        contactPhone: z.string().optional().nullable(),
      }).parse(req.body);
      const data = {
        ...rawData,
        ...(rawData.category !== undefined ? { isAce: rawData.category === 'ace_endorsement' } : {}),
      };

      const sig = await storage.updateSpecialInterestGroup(req.params.id, data);
      res.json(sig);
    } catch (error: any) {
      console.error("Update SIG error:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: error.message });
    }
  });

  // Delete a SIG
  app.delete("/api/admin/sigs/:id", ensureAdmin, async (req, res) => {
    try {
      await storage.deleteSpecialInterestGroup(req.params.id);
      res.sendStatus(204);
    } catch (error: any) {
      console.error("Delete SIG error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get politicians sponsored by a SIG
  app.get("/api/admin/sigs/:id/politicians", ensureAdmin, async (req, res) => {
    try {
      const politicians = await storage.getPoliticiansBySig(req.params.id);
      res.json(politicians);
    } catch (error: any) {
      console.error("Get SIG politicians error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // ==========================================
  // Politician SIG Sponsorships API
  // ==========================================

  // Get sponsors for a politician (public endpoint)
  app.get("/api/politician-profiles/:id/sponsors", async (req, res) => {
    try {
      const sponsors = await storage.listPoliticianSponsors(req.params.id);
      res.json(sponsors);
    } catch (error: any) {
      console.error("Get politician sponsors error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Admin: Get sponsors for a politician
  app.get("/api/admin/politician-profiles/:id/sponsors", ensureAdmin, async (req, res) => {
    try {
      const sponsors = await storage.listPoliticianSponsors(req.params.id);
      res.json(sponsors);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Admin: Link a sponsor to a politician
  app.post("/api/admin/politician-profiles/:politicianId/sponsors", ensureAdmin, async (req, res) => {
    try {
      const data = z.object({
        sigId: z.string().min(1),
        relationshipType: z.enum(['primary_sponsor', 'sponsor', 'donor', 'affiliated', 'endorsed']).optional(),
        reportedAmount: z.number().int().optional(),
        amountCurrency: z.string().optional(),
        contributionPeriod: z.string().optional(),
        firstContributionDate: z.string().datetime().optional(),
        lastContributionDate: z.string().datetime().optional(),
        disclosureSource: z.string().optional(),
        disclosureUrl: z.string().url().optional().or(z.literal('')),
        notes: z.string().optional(),
        isVerified: z.boolean().optional(),
      }).parse(req.body);

      const sponsorship = await storage.linkSponsorToPolitician({
        politicianId: req.params.politicianId,
        sigId: data.sigId,
        relationshipType: data.relationshipType || 'donor',
        reportedAmount: data.reportedAmount,
        amountCurrency: data.amountCurrency,
        contributionPeriod: data.contributionPeriod,
        firstContributionDate: data.firstContributionDate ? new Date(data.firstContributionDate) : undefined,
        lastContributionDate: data.lastContributionDate ? new Date(data.lastContributionDate) : undefined,
        disclosureSource: data.disclosureSource,
        disclosureUrl: data.disclosureUrl,
        notes: data.notes,
        isVerified: data.isVerified,
      });
      res.status(201).json(sponsorship);
    } catch (error: any) {
      console.error("Link sponsor error:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      if (error.code === '23505') {
        return res.status(409).json({ message: "This sponsor is already linked to this politician" });
      }
      res.status(500).json({ message: error.message });
    }
  });

  // Admin: Update a sponsorship (including sigRank)
  app.patch("/api/admin/politician-sponsorships/:id", ensureAdmin, async (req, res) => {
    try {
      const data = z.object({
        relationshipType: z.enum(['primary_sponsor', 'sponsor', 'donor', 'affiliated', 'endorsed', 'pledged_against']).optional(),
        reportedAmount: z.number().int().optional(),
        amountCurrency: z.string().optional(),
        contributionPeriod: z.string().optional(),
        firstContributionDate: z.string().datetime().optional(),
        lastContributionDate: z.string().datetime().optional(),
        disclosureSource: z.string().optional(),
        disclosureUrl: z.string().url().optional().or(z.literal('')),
        notes: z.string().optional(),
        isVerified: z.boolean().optional(),
        sigRank: z.number().int().min(1).nullable().optional(),
      }).parse(req.body);

      const sponsorship = await storage.updatePoliticianSponsorship(req.params.id, {
        ...data,
        firstContributionDate: data.firstContributionDate ? new Date(data.firstContributionDate) : undefined,
        lastContributionDate: data.lastContributionDate ? new Date(data.lastContributionDate) : undefined,
      });
      res.json(sponsorship);
    } catch (error: any) {
      console.error("Update sponsorship error:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: error.message });
    }
  });

  // Admin: Unlink a sponsor from a politician
  app.delete("/api/admin/politician-profiles/:politicianId/sponsors/:sigId", ensureAdmin, async (req, res) => {
    try {
      await storage.unlinkSponsorFromPolitician(req.params.politicianId, req.params.sigId);
      res.sendStatus(204);
    } catch (error: any) {
      console.error("Unlink sponsor error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // ── Trading (Quiver API proxy) ──────────────────────────────
  const tradeCache = new Map<string, { data: any[]; ts: number }>();
  const TRADE_CACHE_TTL = 30 * 60 * 1000;

  app.get("/api/politician-profiles/:id/trades", async (req, res) => {
    try {
      const profile = await storage.getPoliticianProfile(req.params.id);
      if (!profile) return res.status(404).json({ message: "Politician not found" });

      const apiToken = process.env.QUIVER_INSIDER_TRADING;
      if (!apiToken) return res.status(503).json({ message: "Trade data temporarily unavailable" });

      const name = profile.fullName?.trim();
      if (!name) return res.json([]);

      const cacheKey = name.toLowerCase();
      const cached = tradeCache.get(cacheKey);
      if (cached && Date.now() - cached.ts < TRADE_CACHE_TTL) {
        return res.json(cached.data);
      }

      const headers = { Authorization: `Bearer ${apiToken}`, Accept: "application/json" };
      const results: any[] = [];

      const nameParts = name.split(/\s+/);
      const lastName = nameParts[nameParts.length - 1];

      const fetchWithTimeout = async (url: string, timeoutMs: number): Promise<any[]> => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
          const resp = await fetch(url, { headers, signal: controller.signal });
          clearTimeout(timer);
          if (resp.ok) {
            const data = await resp.json();
            return Array.isArray(data) ? data : [];
          }
          return [];
        } catch {
          clearTimeout(timer);
          return [];
        }
      };

      let liveData = await fetchWithTimeout(
        `https://api.quiverquant.com/beta/live/congresstrading`,
        15000
      );
      if (liveData.length === 0) {
        console.log(`[trades] Live endpoint returned 0 trades, retrying...`);
        liveData = await fetchWithTimeout(
          `https://api.quiverquant.com/beta/live/congresstrading`,
          15000
        );
      }
      console.log(`[trades] Live endpoint returned ${liveData.length} total trades`);
      const nameNorm = name.toLowerCase();
      const lastNameNorm = lastName.toLowerCase();
      const matchingLive = liveData.filter((t: any) => {
        const rep = (t.Representative || "").toLowerCase();
        return rep === nameNorm || rep.includes(lastNameNorm);
      });
      console.log(`[trades] ${matchingLive.length} matching live trades for "${name}"`);
      results.push(...matchingLive);

      const nameForApi = name.replace(/\s+/g, " ");
      const encodedName = encodeURIComponent(nameForApi);
      const historicalEndpoints = [
        `https://api.quiverquant.com/beta/historical/congresstrading/${encodedName}`,
        `https://api.quiverquant.com/beta/historical/senatetrading/${encodedName}`,
      ];

      const historicalResults = await Promise.allSettled(
        historicalEndpoints.map(url => fetchWithTimeout(url, 12000))
      );
      for (let i = 0; i < historicalResults.length; i++) {
        const result = historicalResults[i];
        console.log(`[trades] Historical endpoint ${i} status: ${result.status}${result.status === 'fulfilled' ? ` (${result.value.length} trades)` : ''}`);
        if (result.status === "fulfilled" && result.value.length > 0) {
          const existingKeys = new Set(results.map((t: any) =>
            `${t.Ticker}-${t.TransactionDate}-${t.Transaction}-${t.Range}`
          ));
          for (const trade of result.value) {
            const key = `${trade.Ticker}-${trade.TransactionDate}-${trade.Transaction}-${trade.Range}`;
            if (!existingKeys.has(key)) {
              results.push(trade);
              existingKeys.add(key);
            }
          }
        }
      }

      if (results.length > 0) {
        tradeCache.set(cacheKey, { data: results, ts: Date.now() });
      }

      console.log(`[trades] Final result: ${results.length} trades for "${name}"`);
      res.json(results);
    } catch (error: any) {
      console.error("Trades fetch error:", error);
      res.status(500).json({ message: "Trade data temporarily unavailable" });
    }
  });

  // ── Trading Flags ──────────────────────────────────────────
  app.post("/api/politician-profiles/:id/trades/flag", async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Login required" });

      const { tradeId, ticker, transactionDate, tradeType, amount, reason, evidenceUrl } = req.body;
      if (!tradeId || !ticker || !transactionDate || !reason) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      if (typeof reason !== 'string' || reason.length < 10) {
        return res.status(400).json({ message: "Reason must be at least 10 characters" });
      }

      let sanitizedUrl: string | null = null;
      if (evidenceUrl && typeof evidenceUrl === 'string' && evidenceUrl.trim()) {
        try {
          const parsed = new URL(evidenceUrl.trim());
          if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
            sanitizedUrl = parsed.href;
          }
        } catch { }
      }

      const flag = await storage.createTradingFlag({
        politicianId: req.params.id,
        tradeId,
        ticker,
        transactionDate,
        tradeType: tradeType ?? null,
        amount: amount ?? null,
        reason,
        evidenceUrl: sanitizedUrl,
        flaggedBy: (req.user as any).id,
      });
      res.json(flag);
    } catch (error: any) {
      console.error("Flag trade error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/politician-profiles/:id/trades/flags", async (req, res) => {
    try {
      const flags = await storage.getTradingFlagsByPolitician(req.params.id);
      const sanitized = flags.map(f => ({
        id: f.id,
        ticker: f.ticker,
        transactionDate: f.transactionDate,
        tradeType: f.tradeType,
        status: f.status,
        createdAt: f.createdAt,
      }));
      res.json(sanitized);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ── Politician Demerits (public) ──────────────────────────
  app.get("/api/politician-profiles/:id/demerits", async (req, res) => {
    try {
      const demerits = await storage.getDemeritsByPolitician(req.params.id);
      res.json(demerits);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ── Admin Trading Flags Review ────────────────────────────
  app.get("/api/admin/trading-flags", ensureAdmin, async (req, res) => {
    try {
      const status = req.query.status as string | undefined;
      const flags = await storage.getAllTradingFlags(status);
      const enriched = await Promise.all(flags.map(async (f) => {
        const profile = await storage.getPoliticianProfile(f.politicianId);
        return { ...f, politicianName: profile?.fullName ?? "Unknown" };
      }));
      res.json(enriched);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/trading-flags/:flagId/review", ensureAdmin, async (req, res) => {
    try {
      const { status, reviewNote } = req.body;
      if (!status || !["approved", "rejected"].includes(status)) {
        return res.status(400).json({ message: "Status must be 'approved' or 'rejected'" });
      }
      const flag = await storage.reviewTradingFlag(
        req.params.flagId, status, (req.user as any).id, reviewNote
      );
      res.json(flag);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ── Admin Demerits ─────────────────────────────────────────
  app.post("/api/admin/politician-profiles/:politicianId/demerits", ensureAdmin, async (req, res) => {
    try {
      const { type, label, description, flagId } = req.body;
      if (!type || !label || !description) {
        return res.status(400).json({ message: "type, label, and description are required" });
      }
      const demerit = await storage.createDemerit({
        politicianId: req.params.politicianId,
        type,
        label,
        description,
        flagId: flagId ?? null,
        assignedBy: (req.user as any).id,
      });
      res.json(demerit);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/admin/demerits/:demeritId", ensureAdmin, async (req, res) => {
    try {
      await storage.deleteDemerit(req.params.demeritId);
      res.sendStatus(204);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ── ACE Pledge Requests ────────────────────────────────────
  // Submit a new pledge (any authenticated candidate)
  app.post("/api/ace-pledges", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const user = req.user as any;
      const politicianId = user.claimedPoliticianId || null;
      const parsed = insertAcePledgeRequestSchema.safeParse({
        politicianId,
        sigId: req.body.sigId,
        videoUrl: req.body.videoUrl,
      });
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
      }
      // Prevent duplicate pending/approved pledges for same user+SIG
      if (politicianId) {
        const existing = await storage.getAcePledgesByPolitician(politicianId);
        const dup = existing.find(p => p.sigId === req.body.sigId && (p.status === "pending" || p.status === "approved"));
        if (dup) {
          return res.status(409).json({ message: dup.status === "approved" ? "You already hold this ACE badge" : "A pending pledge for this ACE already exists" });
        }
      }
      const pledge = await storage.createAcePledgeRequest(parsed.data);
      res.json(pledge);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get pledges for the authenticated candidate's profile
  app.get("/api/ace-pledges/my", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const user = req.user as any;
      if (!user.claimedPoliticianId) return res.json([]);
      const pledges = await storage.getAcePledgesByPolitician(user.claimedPoliticianId);
      res.json(pledges);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get all ACE pledges for a politician (public view)
  app.get("/api/ace-pledges/politician/:politicianId", async (req, res) => {
    try {
      const pledges = await storage.getAcePledgesByPolitician(req.params.politicianId);
      res.json(pledges.filter(p => p.status === "approved"));
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Admin: list all ACE pledge requests
  app.get("/api/admin/ace-pledges", ensureAdmin, async (req, res) => {
    try {
      const status = req.query.status as string | undefined;
      const pledges = await storage.getAllAcePledgeRequests(status);
      res.json(pledges);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Admin: approve or reject an ACE pledge
  app.post("/api/admin/ace-pledges/:id/review", ensureAdmin, async (req, res) => {
    try {
      const { status, reviewNote } = req.body;
      if (!status || !["approved", "rejected"].includes(status)) {
        return res.status(400).json({ message: "Status must be 'approved' or 'rejected'" });
      }
      const pledge = await storage.reviewAcePledgeRequest(
        req.params.id, status, (req.user as any).id, reviewNote
      );
      // On approval: create the SIG sponsorship so it affects grade
      if (status === "approved") {
        const existing = await storage.listPoliticianSponsors(pledge.politicianId);
        const alreadyLinked = existing.find((s: any) => s.sigId === pledge.sigId);
        if (!alreadyLinked) {
          await storage.linkSponsorToPolitician({
            politicianId: pledge.politicianId,
            sigId: pledge.sigId,
            reportedAmount: 0,
            relationshipType: "ace_pledge",
          });
        }
      }
      res.json(pledge);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Admin Audit Logs API
  app.get("/api/admin/audit-logs", ensureOwnerAdmin, async (req, res) => {
    try {
      const entityType = req.query.entityType as string;
      const entityId = req.query.entityId as string;
      const limit = parseInt(req.query.limit as string) || 50;

      if (!entityType || !entityId) {
        return res.status(400).json({ message: "entityType and entityId are required" });
      }

      const logs = await storage.getAuditLogsByEntity(entityType, entityId, limit);
      res.json(logs);
    } catch (error: any) {
      console.error("Admin get audit logs error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Voter Verification APIs
  // Get current user's verification request
  app.get("/api/voter-verification/me", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const request = await storage.getMyVerificationRequest(req.user!.id);
      res.json(request || null);
    } catch (error: any) {
      console.error("Get verification request error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Submit voter verification request
  app.post("/api/voter-verification/submit", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const data = z.object({
        fullLegalName: z.string().min(1),
        address: z.string().min(1),
        dateOfBirth: z.string().min(1),
        stateIdPhotoUrl: z.string().url(),
        selfiePhotoUrl: z.string().url(),
        phoneNumber: z.string().min(1),
        emailAddress: z.string().email(),
        hasFelonyOrIneligibility: z.boolean(),
        ineligibilityExplanation: z.string().optional(),
      }).parse(req.body);

      const request = await storage.submitVerificationRequest({
        ...data,
        userId: req.user!.id,
        dateOfBirth: new Date(data.dateOfBirth),
      });

      res.json(request);
    } catch (error: any) {
      console.error("Submit verification error:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid verification data" });
      }
      res.status(500).json({ message: error.message });
    }
  });

  // Admin: List all verification requests
  app.get("/api/admin/voter-verification/requests", ensureAdmin, async (req, res) => {
    try {
      const status = req.query.status as string | undefined;
      const requests = await storage.listVerificationRequests(status);
      res.json(requests);
    } catch (error: any) {
      console.error("List verification requests error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Admin: Review verification request
  app.patch("/api/admin/voter-verification/:id/review", ensureAdmin, async (req, res) => {
    try {
      const { decision, rejectionReason } = z.object({
        decision: z.enum(['verified', 'rejected']),
        rejectionReason: z.string().optional(),
      }).parse(req.body);

      await storage.reviewVerificationRequest(
        req.params.id,
        req.user!.id,
        decision,
        rejectionReason
      );

      res.json({ success: true });
    } catch (error: any) {
      console.error("Review verification error:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid review data" });
      }
      res.status(500).json({ message: error.message });
    }
  });

  // Friend Suggestions APIs
  app.get("/api/friend-suggestions", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const suggestions = await storage.getFriendSuggestions(req.user.id, limit);
      res.json(suggestions);
    } catch (error: any) {
      console.error("Get friend suggestions error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/friend-suggestions/:id/dismiss", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      await storage.dismissFriendSuggestion(req.user.id, req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Dismiss friend suggestion error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/user/discoverability", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const { phoneNumber, discoverableByPhone, discoverableByEmail } = z.object({
        phoneNumber: z.string(),
        discoverableByPhone: z.boolean(),
        discoverableByEmail: z.boolean(),
      }).parse(req.body);

      const updatedUser = await storage.updateUserDiscoverability(
        req.user.id,
        phoneNumber,
        discoverableByPhone,
        discoverableByEmail
      );

      res.json(updatedUser);
    } catch (error: any) {
      console.error("Update discoverability error:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid discoverability data" });
      }
      res.status(500).json({ message: error.message });
    }
  });

  // Admin Analytics APIs
  app.get("/api/admin/analytics", ensureAdmin, async (req, res) => {
    try {
      const [userCount, postCount, pollCount, groupCount, eventCount, charityCount] = await Promise.all([
        storage.getUserCount(),
        storage.getPostCount(),
        storage.getPollCount(),
        storage.getGroupCount(),
        storage.getEventCount(),
        storage.getCharityCount(),
      ]);

      res.json({
        userCount,
        postCount,
        pollCount,
        groupCount,
        eventCount,
        charityCount,
      });
    } catch (error: any) {
      console.error("Admin analytics error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Admin Users List API
  app.get("/api/admin/users", ensureAdmin, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const search = (req.query.search as string || "").trim();
      const allUsers = await storage.getAllUsers(limit, offset, search);
      const totalCount = await storage.getUserCount(search);
      
      res.json({
        users: allUsers,
        total: totalCount,
        limit,
        offset,
      });
    } catch (error: any) {
      console.error("Admin users list error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Update user role and managed state (owner admin only)
  app.patch("/api/admin/users/:id/role", ensureOwnerAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { role, managedState } = req.body;
      const validRoles = ["admin", "state_admin", "moderator", "citizen", "candidate"];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }
      const updatedUser = await storage.updateUser(id, {
        role,
        managedState: role === "state_admin" ? (managedState || null) : null,
      });
      res.json(updatedUser);
    } catch (error: any) {
      console.error("Update user role error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Delete a user
  app.delete("/api/admin/users/:id", ensureOwnerAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const target = await storage.getUser(id);
      if (!target) return res.status(404).json({ message: "User not found" });
      if (target.role === "admin") return res.status(403).json({ message: "Cannot delete admin accounts" });
      await storage.deleteUser(id);
      res.json({ message: "User deleted successfully" });
    } catch (error: any) {
      console.error("Delete user error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Content Moderation APIs
  app.get("/api/admin/flagged-content", ensureAdmin, async (req, res) => {
    try {
      const status = req.query.status as string | undefined;
      const flaggedContent = await storage.getFlaggedContent(status);
      res.json(flaggedContent);
    } catch (error: any) {
      console.error("Admin get flagged content error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/flagged-content", ensureAdmin, async (req, res) => {
    try {
      const flagged = await storage.createFlaggedContent({
        ...req.body,
        flaggedBy: req.user!.id,
      });
      res.json(flagged);
    } catch (error: any) {
      console.error("Admin create flagged content error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/posts/:postId/mark-safe", ensureAdmin, async (req, res) => {
    try {
      const { postId } = req.params;
      
      // Mark all flags for this post as dismissed
      await storage.dismissPostFlags(postId, req.user!.id);
      
      res.json({ success: true });
    } catch (error: any) {
      console.error("Admin mark post safe error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/admin/flagged-content/:id/review", ensureAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { status, actionTaken, reviewNote } = req.body;
      
      await storage.reviewFlaggedContent(
        id,
        req.user!.id,
        status,
        actionTaken,
        reviewNote
      );
      res.json({ message: "Flagged content reviewed successfully" });
    } catch (error: any) {
      console.error("Admin review flagged content error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Representative Flags APIs
  app.get("/api/admin/representative-flags", ensureAdmin, async (req, res) => {
    try {
      const repFlags = await storage.getRepresentativeFlags();
      res.json(repFlags);
    } catch (error: any) {
      console.error("Admin get representative flags error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/representative-flags/:id/dismiss", ensureAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.dismissRepresentativeFlag(id, req.user!.id);
      res.json({ message: "Flag dismissed successfully" });
    } catch (error: any) {
      console.error("Admin dismiss representative flag error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // User Ban Management APIs
  app.get("/api/admin/banned-users", ensureAdmin, async (req, res) => {
    try {
      const activeOnly = req.query.activeOnly !== 'false';
      const bannedUsers = await storage.getBannedUsers(activeOnly);
      res.json(bannedUsers);
    } catch (error: any) {
      console.error("Admin get banned users error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/ban-user", ensureAdmin, async (req, res) => {
    try {
      const { userId, reason, duration, expiresAt } = req.body;
      
      if (!userId || !reason) {
        return res.status(400).json({ message: "userId and reason are required" });
      }

      await storage.banUser(
        userId,
        req.user!.id,
        reason,
        duration,
        expiresAt ? new Date(expiresAt) : undefined
      );
      res.json({ message: "User banned successfully" });
    } catch (error: any) {
      console.error("Admin ban user error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/unban-user/:banId", ensureAdmin, async (req, res) => {
    try {
      const { banId } = req.params;
      await storage.unbanUser(banId, req.user!.id);
      res.json({ message: "User unbanned successfully" });
    } catch (error: any) {
      console.error("Admin unban user error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/user-ban-status/:userId", ensureAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const banStatus = await storage.getUserBanStatus(userId);
      res.json(banStatus || { banned: false });
    } catch (error: any) {
      console.error("Admin get user ban status error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // IP Blocking APIs
  app.get("/api/admin/blocked-ips", ensureAdmin, async (req, res) => {
    try {
      const activeOnly = req.query.activeOnly !== 'false';
      const blockedIps = await storage.getBlockedIps(activeOnly);
      res.json(blockedIps);
    } catch (error: any) {
      console.error("Admin get blocked IPs error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/block-ip", ensureAdmin, async (req, res) => {
    try {
      const { ipAddress, reason } = req.body;
      
      if (!ipAddress || !reason) {
        return res.status(400).json({ message: "ipAddress and reason are required" });
      }

      await storage.blockIp(ipAddress, req.user!.id, reason);
      res.json({ message: "IP address blocked successfully" });
    } catch (error: any) {
      console.error("Admin block IP error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/unblock-ip/:id", ensureAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.unblockIp(id, req.user!.id);
      res.json({ message: "IP address unblocked successfully" });
    } catch (error: any) {
      console.error("Admin unblock IP error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Algorithm Settings APIs
  app.get("/api/admin/algorithm-settings", ensureAdmin, async (req, res) => {
    try {
      const settings = await storage.getAlgorithmSettings();
      res.json(settings);
    } catch (error: any) {
      console.error("Admin get algorithm settings error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/admin/algorithm-settings", ensureAdmin, async (req, res) => {
    try {
      const settings = await storage.updateAlgorithmSettings(req.body, req.user!.id);
      res.json(settings);
    } catch (error: any) {
      console.error("Admin update algorithm settings error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Mobile App - Signals API (TikTok-style short videos)
  app.get("/api/mobile/signals", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      const signals = await storage.getSignals(limit, offset);
      res.json(signals);
    } catch (error: any) {
      console.error("Get signals error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/mobile/signals/user/:userId", async (req, res) => {
    try {
      const signals = await storage.getSignalsByUser(req.params.userId);
      res.json(signals);
    } catch (error: any) {
      console.error("Get user signals error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/mobile/signals/:id", async (req, res) => {
    try {
      const signal = await storage.getSignalById(req.params.id);
      if (!signal) {
        return res.status(404).json({ message: "Signal not found" });
      }
      res.json(signal);
    } catch (error: any) {
      console.error("Get signal error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/mobile/signals", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      // For now, handle as JSON - video upload will be handled separately
      const signalData = {
        authorId: req.user.id,
        title: req.body.title || '',
        description: req.body.description || '',
        videoUrl: req.body.videoUrl || '',
        thumbnailUrl: req.body.thumbnailUrl,
        duration: parseInt(req.body.duration) || 0,
        maxDuration: req.user.subscriptionStatus === 'premium' ? 300 : 60,
        filter: req.body.filter || 'none',
        overlays: req.body.overlays,
        tags: req.body.tags || [],
        isPublic: true,
      };
      
      const signal = await storage.createSignal(signalData);
      res.status(201).json(signal);
    } catch (error: any) {
      console.error("Create signal error:", error);
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/mobile/signals/:id/like", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      await storage.likeSignal(req.params.id, req.user.id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Like signal error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/mobile/signals/:id/like", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      await storage.unlikeSignal(req.params.id, req.user.id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Unlike signal error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/mobile/signals/:id/view", async (req, res) => {
    try {
      await storage.incrementSignalViewCount(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Increment view count error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  const httpServer = existingServer ?? createServer(app);
  
  // WebSocket setup for real-time messaging
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Store active connections by user ID
  const userConnections = new Map<string, Set<WebSocket>>();
  const channelConnections = new Map<string, Set<WebSocket>>();
  
  wss.on('connection', (ws: WebSocket, req) => {
    console.log('WebSocket connection established');
    
    // Handle authentication and setup
    let userId: string | null = null;
    let userChannels: string[] = [];
    
    ws.on('message', async (message: Buffer) => {
      try {
        const data = JSON.parse(message.toString());
        
        switch (data.type) {
          case 'auth':
            // Authenticate user
            userId = data.userId;
            if (userId) {
              // Add to user connections
              if (!userConnections.has(userId)) {
                userConnections.set(userId, new Set());
              }
              userConnections.get(userId)!.add(ws);
              
              // Get user channels and subscribe to them
              try {
                const channels = await storage.getUserChannels(userId);
                userChannels = channels.map(c => c.id);
                
                // Subscribe to all user channels
                for (const channelId of userChannels) {
                  if (!channelConnections.has(channelId)) {
                    channelConnections.set(channelId, new Set());
                  }
                  channelConnections.get(channelId)!.add(ws);
                }
                
                ws.send(JSON.stringify({ 
                  type: 'auth_success', 
                  channels: userChannels 
                }));
              } catch (error) {
                console.error('Error getting user channels:', error);
                ws.send(JSON.stringify({ type: 'auth_error', message: 'Failed to authenticate' }));
              }
            }
            break;
            
          case 'join_channel':
            if (userId && data.channelId) {
              // Check if user is member of the channel
              try {
                const isMember = await storage.isChannelMember(data.channelId, userId);
                if (isMember) {
                  if (!channelConnections.has(data.channelId)) {
                    channelConnections.set(data.channelId, new Set());
                  }
                  channelConnections.get(data.channelId)!.add(ws);
                  userChannels.push(data.channelId);
                  
                  ws.send(JSON.stringify({ 
                    type: 'channel_joined', 
                    channelId: data.channelId 
                  }));
                }
              } catch (error) {
                console.error('Error joining channel:', error);
              }
            }
            break;
            
          case 'leave_channel':
            if (data.channelId && channelConnections.has(data.channelId)) {
              channelConnections.get(data.channelId)!.delete(ws);
              userChannels = userChannels.filter(id => id !== data.channelId);
              
              ws.send(JSON.stringify({ 
                type: 'channel_left', 
                channelId: data.channelId 
              }));
            }
            break;
            
          case 'channel_message':
            // Broadcast new channel message to all channel members
            if (data.channelId && channelConnections.has(data.channelId)) {
              const channelWs = channelConnections.get(data.channelId)!;
              const messageData = JSON.stringify({
                type: 'new_channel_message',
                channelId: data.channelId,
                message: data.message,
                timestamp: new Date().toISOString()
              });
              
              channelWs.forEach((clientWs) => {
                if (clientWs.readyState === WebSocket.OPEN) {
                  clientWs.send(messageData);
                }
              });
            }
            break;
            
          case 'direct_message':
            // Send direct message to specific user
            if (data.recipientId && userConnections.has(data.recipientId)) {
              const recipientWs = userConnections.get(data.recipientId)!;
              const messageData = JSON.stringify({
                type: 'new_direct_message',
                message: data.message,
                senderId: userId,
                timestamp: new Date().toISOString()
              });
              
              recipientWs.forEach((clientWs) => {
                if (clientWs.readyState === WebSocket.OPEN) {
                  clientWs.send(messageData);
                }
              });
            }
            break;
            
          case 'typing':
            // Broadcast typing indicator
            if (data.channelId && channelConnections.has(data.channelId)) {
              const channelWs = channelConnections.get(data.channelId)!;
              const typingData = JSON.stringify({
                type: 'user_typing',
                channelId: data.channelId,
                userId: userId,
                isTyping: data.isTyping,
                timestamp: new Date().toISOString()
              });
              
              channelWs.forEach((clientWs) => {
                if (clientWs !== ws && clientWs.readyState === WebSocket.OPEN) {
                  clientWs.send(typingData);
                }
              });
            }
            break;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
      }
    });
    
    ws.on('close', () => {
      console.log('WebSocket connection closed');
      
      // Clean up connections
      if (userId && userConnections.has(userId)) {
        userConnections.get(userId)!.delete(ws);
        if (userConnections.get(userId)!.size === 0) {
          userConnections.delete(userId);
        }
      }
      
      // Clean up channel connections
      for (const channelId of userChannels) {
        if (channelConnections.has(channelId)) {
          channelConnections.get(channelId)!.delete(ws);
          if (channelConnections.get(channelId)!.size === 0) {
            channelConnections.delete(channelId);
          }
        }
      }
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });

  // Citizen Initiative Routes
  // Get available jurisdictions
  app.get("/api/jurisdictions", async (req, res) => {
    try {
      const jurisdictions = await storage.getJurisdictions();
      res.json(jurisdictions);
    } catch (error) {
      console.error("Error fetching jurisdictions:", error);
      res.status(500).json({ error: "Failed to fetch jurisdictions" });
    }
  });

  // Get initiatives with optional filters
  app.get("/api/initiatives", async (req, res) => {
    try {
      // Validate query parameters
      const querySchema = z.object({
        limit: z.string().optional().default("50"),
        offset: z.string().optional().default("0"),
        status: z.enum(["draft", "in_review", "collecting", "submitted", "qualified", "failed", "withdrawn"]).optional(),
        jurisdictionId: z.string().uuid().optional(),
      });

      const validatedQuery = querySchema.parse(req.query);
      
      // Parse and validate numeric parameters with limits
      const limit = Math.min(parseInt(validatedQuery.limit), 100); // Max 100 for security
      const offset = Math.max(parseInt(validatedQuery.offset), 0);
      
      if (isNaN(limit) || isNaN(offset)) {
        return res.status(400).json({ error: "Invalid limit or offset parameter" });
      }

      // Build secure filter object
      const filters: { status?: string; jurisdictionId?: string } = {};
      if (validatedQuery.status) filters.status = validatedQuery.status;
      if (validatedQuery.jurisdictionId) filters.jurisdictionId = validatedQuery.jurisdictionId;
      
      const initiatives = await storage.getInitiatives(limit, offset, filters);
      res.json(initiatives);
    } catch (error: any) {
      console.error("Error fetching initiatives:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          error: "Invalid query parameters",
          details: error.issues
        });
      }
      res.status(500).json({ error: "Failed to fetch initiatives" });
    }
  });

  // Get specific initiative by ID
  app.get("/api/initiatives/:id", async (req, res) => {
    try {
      // Validate ID parameter
      const idSchema = z.string().uuid();
      const validatedId = idSchema.parse(req.params.id);
      
      const initiative = await storage.getInitiativeById(validatedId);
      if (!initiative) {
        return res.status(404).json({ error: "Initiative not found" });
      }
      res.json(initiative);
    } catch (error: any) {
      console.error("Error fetching initiative:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          error: "Invalid initiative ID format",
          details: error.issues
        });
      }
      res.status(500).json({ error: "Failed to fetch initiative" });
    }
  });

  // Create new initiative
  app.post("/api/initiatives", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const user = req.user as { id: string };
      
      // Validate input using Zod schema
      const validatedData = insertInitiativeSchema.parse({
        ...req.body,
        createdBy: user.id,
        status: "draft"
      });
      
      const initiative = await storage.createInitiative(validatedData);
      
      // Log audit trail with proper schema validation
      const auditData = insertAuditLogSchema.parse({
        entityType: "initiative",
        entityId: initiative.id,
        action: "created",
        actorId: user.id,
        diffJson: { status: "draft" }
      });
      await storage.createAuditLog(auditData);
      
      res.status(201).json(initiative);
    } catch (error: any) {
      console.error("Error creating initiative:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          error: "Invalid initiative data",
          details: error.issues
        });
      }
      res.status(500).json({ error: "Failed to create initiative" });
    }
  });

  // Update initiative (PATCH for security - only allow specific fields)
  app.patch("/api/initiatives/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const user = req.user as { id: string };
      const initiativeId = req.params.id;
      
      // Check if initiative exists and user has permission
      const existingInitiative = await storage.getInitiativeById(initiativeId);
      if (!existingInitiative) {
        return res.status(404).json({ error: "Initiative not found" });
      }
      
      if (existingInitiative.createdBy !== user.id && req.user.role !== 'admin') {
        return res.status(403).json({ error: "Not authorized to update this initiative" });
      }

      // Create a strict schema for updates - only allow safe fields
      const updateSchema = z.object({
        title: z.string().optional(),
        summary: z.string().optional(),
        fullTextMd: z.string().optional(),
        tags: z.array(z.string()).optional(),
      }).strict();

      // Validate that only allowed fields are being updated
      const validatedUpdate = updateSchema.parse(req.body);
      
      // Add updatedAt timestamp
      const updateData = {
        ...validatedUpdate,
        updatedAt: new Date()
      };

      const updatedInitiative = await storage.updateInitiative(initiativeId, updateData);

      // Log audit trail
      const auditData = insertAuditLogSchema.parse({
        entityType: "initiative",
        entityId: initiativeId,
        action: "updated",
        actorId: user.id,
        diffJson: validatedUpdate
      });
      await storage.createAuditLog(auditData);

      res.json(updatedInitiative);
    } catch (error: any) {
      console.error("Error updating initiative:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          error: "Invalid update data",
          details: error.issues
        });
      }
      res.status(500).json({ error: "Failed to update initiative" });
    }
  });

  // Get initiative versions
  app.get("/api/initiatives/:id/versions", async (req, res) => {
    try {
      // Validate ID parameter
      const idSchema = z.string().uuid();
      const validatedId = idSchema.parse(req.params.id);
      
      const versions = await storage.getInitiativeVersions(validatedId);
      res.json(versions);
    } catch (error: any) {
      console.error("Error fetching initiative versions:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          error: "Invalid initiative ID format",
          details: error.issues
        });
      }
      res.status(500).json({ error: "Failed to fetch versions" });
    }
  });

  // Get user's initiatives
  app.get("/api/users/:userId/initiatives", async (req, res) => {
    try {
      // Validate user ID parameter
      const userIdSchema = z.string().uuid();
      const validatedUserId = userIdSchema.parse(req.params.userId);
      
      const initiatives = await storage.getUserInitiatives(validatedUserId);
      res.json(initiatives);
    } catch (error: any) {
      console.error("Error fetching user initiatives:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          error: "Invalid user ID format",
          details: error.issues
        });
      }
      res.status(500).json({ error: "Failed to fetch user initiatives" });
    }
  });

  // Live Streaming API Routes
  const streamProvider = createStreamingProvider();

  // Create a new live stream
  app.post("/api/live/streams", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const streamData = insertLiveStreamSchema.parse({
        ...req.body,
        ownerId: req.user.id,
      });

      // Create stream input with provider
      const streamInput = await streamProvider.createInput(streamData.title);
      const streamKey = generateStreamKey();

      // Create stream in database with stream key hash
      const streamWithKeyHash = {
        ...streamData,
        providerInputId: streamInput.inputId,
        providerPlaybackId: streamInput.playbackId,
        providerPlaybackUrl: streamInput.playbackUrl,
        rtmpServerUrl: streamInput.rtmpUrl,
        streamKeyHash: hashStreamKey(streamKey),
      };
      
      const stream = await storage.createLiveStream(streamWithKeyHash);

      // Return stream info with plain text stream key (only on creation)
      res.status(201).json({
        ...stream,
        streamKey: streamKey, // Only returned once
        rtmpServerUrl: streamInput.rtmpUrl,
        playbackUrl: streamInput.playbackUrl,
      });
    } catch (error: any) {
      console.error("Create stream error:", error);
      res.status(400).json({ message: error.message });
    }
  });

  // Get live streams with optional filtering
  app.get("/api/live/streams", async (req, res) => {
    try {
      const status = req.query.status as string;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const streams = await storage.listLiveStreams({ status, limit, offset });
      res.json(streams);
    } catch (error: any) {
      console.error("List streams error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get a specific live stream
  app.get("/api/live/streams/:id", async (req, res) => {
    try {
      const stream = await storage.getLiveStream(req.params.id);
      if (!stream) {
        return res.status(404).json({ message: "Stream not found" });
      }
      res.json(stream);
    } catch (error: any) {
      console.error("Get stream error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Update live stream (title, description, etc.)
  app.patch("/api/live/streams/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const stream = await storage.getLiveStream(req.params.id);
      if (!stream) {
        return res.status(404).json({ message: "Stream not found" });
      }

      // Check ownership
      if (stream.ownerId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized" });
      }

      // Only allow updating certain fields
      const allowedUpdates = ['title', 'description', 'visibility', 'scheduledStart', 'status'];
      const updateData: any = {};
      
      for (const field of allowedUpdates) {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      }

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: "No valid fields to update" });
      }

      const updatedStream = await storage.updateLiveStreamStatus(
        req.params.id,
        updateData.status || stream.status,
        updateData.status === 'live' ? new Date() : undefined,
        updateData.status === 'ended' ? new Date() : undefined
      );

      res.json(updatedStream);
    } catch (error: any) {
      console.error("Update stream error:", error);
      res.status(400).json({ message: error.message });
    }
  });

  // Regenerate stream key
  app.post("/api/live/streams/:id/regenerate-key", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const stream = await storage.getLiveStream(req.params.id);
      if (!stream) {
        return res.status(404).json({ message: "Stream not found" });
      }

      // Check ownership
      if (stream.ownerId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized" });
      }

      const newStreamKey = generateStreamKey();
      const updatedStream = await storage.updateLiveStreamStatus(req.params.id, stream.status);

      res.json({
        streamKey: newStreamKey,
        rtmpServerUrl: stream.rtmpServerUrl,
      });
    } catch (error: any) {
      console.error("Regenerate key error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get user's live streams
  app.get("/api/live/streams/user/:userId", async (req, res) => {
    try {
      const streams = await storage.listUserStreams(req.params.userId);
      res.json(streams);
    } catch (error: any) {
      console.error("Get user streams error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Provider webhook handler
  app.post("/api/live/webhooks/provider", async (req, res) => {
    try {
      const signature = req.headers['x-signature'] as string;
      const body = JSON.stringify(req.body);

      // Verify webhook signature
      if (!streamProvider.verifyWebhook(body, signature || '')) {
        return res.status(401).json({ message: "Invalid signature" });
      }

      const event = webhookEventSchema.parse(req.body);
      
      // Update stream status based on provider event
      switch (event.type) {
        case 'stream.live':
          await storage.updateLiveStreamStatus(event.streamId, 'live', new Date());
          
          // Broadcast live event via WebSocket
          const liveStream = await storage.getLiveStream(event.streamId);
          if (liveStream) {
            // Notify users via WebSocket (implementation would be added to WebSocket handler)
            console.log(`Stream ${event.streamId} went live`);
          }
          break;

        case 'stream.ended':
          await storage.updateLiveStreamStatus(event.streamId, 'ended', undefined, new Date());
          break;

        case 'stream.error':
          console.error(`Stream ${event.streamId} error:`, event);
          break;
      }

      res.status(200).json({ received: true });
    } catch (error: any) {
      console.error("Webhook error:", error);
      res.status(400).json({ message: error.message });
    }
  });

  // Notification API Routes
  app.get("/api/notifications", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const notifications = await storage.listUserNotifications(req.user.id, limit, offset);
      res.json(notifications);
    } catch (error: any) {
      console.error("Get notifications error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Mark notification as read
  app.patch("/api/notifications/:id/read", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      await storage.markNotificationRead(req.params.id);
      res.status(200).json({ success: true });
    } catch (error: any) {
      console.error("Mark notification read error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Mark all notifications as read
  app.patch("/api/notifications/read-all", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      await storage.markAllNotificationsRead(req.user.id);
      res.status(200).json({ success: true });
    } catch (error: any) {
      console.error("Mark all notifications read error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get unread notification count
  app.get("/api/notifications/unread-count", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const count = await storage.getUnreadNotificationCount(req.user.id);
      res.json({ count });
    } catch (error: any) {
      console.error("Get unread count error:", error);
      res.status(500).json({ message: error.message });
    }
  });
  
  // ── SuperPAC Scan ──────────────────────────────────────────────────────────
  app.post("/api/admin/politicians/scan-superpacs", ensureAdmin, async (req, res) => {
    try {
      const fecKey = process.env.FEC_API_KEY;
      if (!fecKey) return res.status(400).json({ message: "FEC_API_KEY not configured" });

      const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

      const profilesResult = await db.execute(sql`
        SELECT id, full_name, fec_candidate_id
        FROM politician_profiles
        WHERE fec_candidate_id IS NOT NULL AND fec_candidate_id != ''
      `);
      const profiles = profilesResult.rows as any[];

      let candidatesScanned = 0;
      let newSigs = 0;
      let updatedSigs = 0;
      let skipped = 0;
      const errors: string[] = [];

      for (const profile of profiles) {
        if (!profile.fec_candidate_id) { skipped++; continue; }
        try {
          // Paginate through all independent expenditures for this candidate
          let page = 1;
          let hasMore = true;
          const committeeAmounts: Record<string, { forAmt: number; againstAmt: number; name: string }> = {};

          while (hasMore) {
            await delay(200);
            const url = `https://api.open.fec.gov/v1/schedules/schedule_e/?candidate_id=${encodeURIComponent(profile.fec_candidate_id)}&api_key=${fecKey}&per_page=100&page=${page}`;
            const fecRes = await fetch(url, { headers: { "Accept": "application/json" } });
            if (!fecRes.ok) { hasMore = false; break; }
            const fecData = await fecRes.json();
            const results: any[] = fecData.results || [];

            for (const exp of results) {
              const cid = exp.committee_id;
              if (!cid) continue;
              if (!committeeAmounts[cid]) committeeAmounts[cid] = { forAmt: 0, againstAmt: 0, name: exp.committee_name || cid };
              const amt = Number(exp.expenditure_amount) || 0;
              if (exp.support_oppose_indicator === "S") committeeAmounts[cid].forAmt += amt;
              else if (exp.support_oppose_indicator === "O") committeeAmounts[cid].againstAmt += amt;
            }

            const pagination = fecData.pagination || {};
            hasMore = results.length > 0 && page < (pagination.pages || 1);
            page++;
          }

          // Upsert SIG + sponsorship for each committee found
          for (const [committeeId, amounts] of Object.entries(committeeAmounts)) {
            // Check if SIG exists by FEC committee tag
            const existingSig = await db.execute(sql`
              SELECT id FROM special_interest_groups WHERE tag = ${committeeId} LIMIT 1
            `);

            let sigId: string;
            if (existingSig.rows.length > 0) {
              sigId = (existingSig.rows[0] as any).id;
              updatedSigs++;
            } else {
              // Fetch committee details from FEC
              await delay(200);
              let sigDescription = `SuperPAC — FEC Committee ${committeeId}`;
              let sigIndustry = "politics";
              try {
                const commRes = await fetch(`https://api.open.fec.gov/v1/committee/${committeeId}/?api_key=${fecKey}`);
                if (commRes.ok) {
                  const commData = await commRes.json();
                  const comm = commData.result || {};
                  if (comm.description) sigDescription = comm.description;
                  if (comm.organization_type_full) sigIndustry = comm.organization_type_full.toLowerCase();
                }
              } catch {}

              const newSig = await storage.createSpecialInterestGroup({
                name: amounts.name || committeeId,
                tag: committeeId,
                category: "pac",
                industry: sigIndustry.slice(0, 50),
                description: sigDescription,
                dataSourceName: "FEC",
                dataSourceUrl: `https://www.fec.gov/data/committee/${committeeId}/`,
                isActive: true,
              });
              sigId = newSig.id;
              newSigs++;
              console.log(`[superpac-scan] New SIG: ${amounts.name} (${committeeId})`);
            }

            // Upsert sponsorship with ON CONFLICT update
            const totalCents = Math.round((amounts.forAmt + amounts.againstAmt) * 100);
            const notes = `FOR: $${amounts.forAmt.toFixed(2)} | AGAINST: $${amounts.againstAmt.toFixed(2)}`;
            await db.execute(sql`
              INSERT INTO politician_sig_sponsorships
                (politician_id, sig_id, relationship_type, reported_amount, notes, disclosure_source, disclosure_url, is_verified)
              VALUES
                (${profile.id}, ${sigId}, 'donor', ${totalCents}, ${notes}, 'FEC',
                 ${'https://www.fec.gov/data/candidate/' + profile.fec_candidate_id + '/'}, false)
              ON CONFLICT (politician_id, sig_id)
              DO UPDATE SET
                reported_amount = EXCLUDED.reported_amount,
                notes = EXCLUDED.notes,
                updated_at = NOW()
            `);
          }

          candidatesScanned++;
        } catch (err: any) {
          console.error(`[superpac-scan] Error for ${profile.full_name}:`, err.message);
          errors.push(`${profile.full_name}: ${err.message}`);
        }
      }

      res.json({ success: true, candidatesScanned, newSigs, updatedSigs, skipped, errors: errors.slice(0, 10) });
    } catch (error: any) {
      console.error("SuperPAC scan error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // ── AI State Scan ──────────────────────────────────────────────────────────
  const US_STATES: Record<string, string> = {
    AL:"Alabama",AK:"Alaska",AZ:"Arizona",AR:"Arkansas",CA:"California",
    CO:"Colorado",CT:"Connecticut",DE:"Delaware",FL:"Florida",GA:"Georgia",
    HI:"Hawaii",ID:"Idaho",IL:"Illinois",IN:"Indiana",IA:"Iowa",KS:"Kansas",
    KY:"Kentucky",LA:"Louisiana",ME:"Maine",MD:"Maryland",MA:"Massachusetts",
    MI:"Michigan",MN:"Minnesota",MS:"Mississippi",MO:"Missouri",MT:"Montana",
    NE:"Nebraska",NV:"Nevada",NH:"New Hampshire",NJ:"New Jersey",NM:"New Mexico",
    NY:"New York",NC:"North Carolina",ND:"North Dakota",OH:"Ohio",OK:"Oklahoma",
    OR:"Oregon",PA:"Pennsylvania",RI:"Rhode Island",SC:"South Carolina",
    SD:"South Dakota",TN:"Tennessee",TX:"Texas",UT:"Utah",VT:"Vermont",
    VA:"Virginia",WA:"Washington",WV:"West Virginia",WI:"Wisconsin",WY:"Wyoming",
    DC:"District of Columbia",
  };

  app.post("/api/admin/politicians/state-scan/preview", ensureAdmin, async (req, res) => {
    try {
      const { state } = req.body;
      const code = String(state || "").toUpperCase().trim();
      const stateName = US_STATES[code];
      if (!stateName) return res.status(400).json({ message: `Unknown state code: ${code}` });

      const likePattern = `%${stateName}%`;

      const missingResult = await db.execute(sql`
        SELECT pp.id, pp.full_name
        FROM politician_profiles pp
        LEFT JOIN political_positions pos ON pp.position_id = pos.id
        WHERE (LOWER(pos.jurisdiction) LIKE LOWER(${likePattern}) OR UPPER(pos.jurisdiction) = ${code})
          AND (
            pp.biography IS NULL OR pp.biography = ''
            OR pp.photo_url IS NULL OR pp.photo_url = ''
            OR pp.website IS NULL OR pp.website = ''
            OR pp.party IS NULL OR pp.party = ''
          )
      `);

      const emptyPosResult = await db.execute(sql`
        SELECT pos.id, pos.title, pos.level, pos.district
        FROM political_positions pos
        WHERE (LOWER(pos.jurisdiction) LIKE LOWER(${likePattern}) OR UPPER(pos.jurisdiction) = ${code})
          AND pos.is_active = true
          AND NOT EXISTS (
            SELECT 1 FROM politician_profiles pp
            WHERE pp.position_id = pos.id AND pp.is_current = true
          )
      `);

      const profileCount = missingResult.rows.length;
      const positionCount = emptyPosResult.rows.length;
      const profileBatches = Math.ceil(profileCount / 5);
      const positionBatches = Math.ceil(positionCount / 3);
      const estimatedSeconds = profileBatches * 6 + positionBatches * 10;

      res.json({
        state: code,
        stateName,
        profilesWithMissingData: profileCount,
        positionsWithoutIncumbents: positionCount,
        totalItems: profileCount + positionCount,
        estimatedSeconds,
        sampleProfiles: missingResult.rows.slice(0, 6).map((r: any) => r.full_name),
        samplePositions: emptyPosResult.rows.slice(0, 6).map((r: any) =>
          r.title + (r.district ? ` — ${r.district}` : "")
        ),
      });
    } catch (error: any) {
      console.error("State scan preview error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/politicians/state-scan/run", ensureAdmin, async (req, res) => {
    try {
      const { state } = req.body;
      const code = String(state || "").toUpperCase().trim();
      const stateName = US_STATES[code];
      if (!stateName) return res.status(400).json({ message: `Unknown state code: ${code}` });

      const OpenAI = (await import("openai")).default;
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const likePattern = `%${stateName}%`;

      // 1. Profiles with missing data (limit 50)
      const missingResult = await db.execute(sql`
        SELECT pp.id, pp.full_name, pp.party, pp.biography, pp.photo_url, pp.website,
               pos.title AS position_title, pos.level AS position_level
        FROM politician_profiles pp
        LEFT JOIN political_positions pos ON pp.position_id = pos.id
        WHERE (LOWER(pos.jurisdiction) LIKE LOWER(${likePattern}) OR UPPER(pos.jurisdiction) = ${code})
          AND (
            pp.biography IS NULL OR pp.biography = ''
            OR pp.photo_url IS NULL OR pp.photo_url = ''
            OR pp.website IS NULL OR pp.website = ''
            OR pp.party IS NULL OR pp.party = ''
          )
        LIMIT 50
      `);

      // 2. Positions without incumbents (limit 20)
      const emptyPosResult = await db.execute(sql`
        SELECT pos.id, pos.title, pos.level, pos.district, pos.jurisdiction, pos.office_type
        FROM political_positions pos
        WHERE (LOWER(pos.jurisdiction) LIKE LOWER(${likePattern}) OR UPPER(pos.jurisdiction) = ${code})
          AND pos.is_active = true
          AND NOT EXISTS (
            SELECT 1 FROM politician_profiles pp
            WHERE pp.position_id = pos.id AND pp.is_current = true
          )
        LIMIT 20
      `);

      const profiles = missingResult.rows as any[];
      const emptyPositions = emptyPosResult.rows as any[];
      let updatedProfiles = 0;
      let createdProfiles = 0;
      const errors: string[] = [];

      // Fill missing profile data in batches of 5
      for (let i = 0; i < profiles.length; i += 5) {
        const batch = profiles.slice(i, i + 5);
        const needsInfo = batch.map(p => ({
          id: p.id,
          name: p.full_name,
          position: p.position_title || "Unknown",
          missing: [
            (!p.biography || p.biography === "") && "biography",
            (!p.photo_url || p.photo_url === "") && "photo_url",
            (!p.website || p.website === "") && "website",
            (!p.party || p.party === "") && "party",
          ].filter(Boolean),
        }));

        try {
          const resp = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            max_tokens: 2000,
            messages: [{
              role: "user",
              content: `You are a US political data assistant. For each politician below from ${stateName}, provide only the MISSING fields listed. Return ONLY a valid JSON array.

${JSON.stringify(needsInfo, null, 2)}

Rules:
- biography: 2–3 factual sentences about their career and current role. Do not invent — if unknown, omit.
- party: Full name e.g. "Republican", "Democrat", "Independent". If unknown, omit.
- website: Official government or campaign URL. If unknown, use null.
- photo_url: Reliable image URL (Wikipedia preferred). If unknown, use null.

Return ONLY a JSON array. Example: [{"id":"abc","party":"Republican","biography":"...","website":null,"photo_url":null}]`
            }],
          });

          const text = resp.choices[0].message.content || "";
          const jsonMatch = text.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            const results: any[] = JSON.parse(jsonMatch[0]);
            for (const r of results) {
              const original = batch.find(p => p.id === r.id);
              if (!original) continue;
              const patch: Record<string, any> = {};
              if (r.biography && (!original.biography || original.biography === "")) patch.biography = r.biography;
              if (r.party && (!original.party || original.party === "")) patch.party = r.party;
              if (r.website && (!original.website || original.website === "")) patch.website = r.website;
              if (r.photo_url && (!original.photo_url || original.photo_url === "")) patch.photoUrl = r.photo_url;
              if (Object.keys(patch).length > 0) {
                await storage.updatePoliticianProfile(r.id, patch);
                updatedProfiles++;
              }
            }
          }
        } catch (err: any) {
          console.error(`[state-scan] Profile batch ${i}–${i + 5} error:`, err.message);
          errors.push(`Profile batch ${i}–${i + 5}: ${err.message}`);
        }
      }

      // Find incumbents for empty positions in batches of 3
      for (let i = 0; i < emptyPositions.length; i += 3) {
        const batch = emptyPositions.slice(i, i + 3);
        try {
          const resp = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            max_tokens: 2000,
            messages: [{
              role: "user",
              content: `You are a US political data assistant. For each political position below in ${stateName}, identify who currently holds it (incumbent) AND up to 2 candidates running for it in 2025–2026.

Positions:
${JSON.stringify(batch.map(p => ({ id: p.id, title: p.title, level: p.level, district: p.district })), null, 2)}

Return ONLY a JSON array. For each position include:
{
  "position_id": "<id from above>",
  "incumbent": { "full_name": "...", "party": "Republican|Democrat|Independent|...", "biography": "2-3 sentence bio", "website": "url or null" } or null,
  "candidates": [ { "full_name": "...", "party": "...", "biography": "..." } ]
}

Only include people you are confident about. Return empty arrays/null if unknown. Return ONLY valid JSON.`
            }],
          });

          const text = resp.choices[0].message.content || "";
          const jsonMatch = text.match(/\[[\s\S]*\]/);
          if (!jsonMatch) continue;
          const results: any[] = JSON.parse(jsonMatch[0]);

          for (const r of results) {
            // Create incumbent profile
            if (r.incumbent?.full_name) {
              const existing = await db.execute(sql`
                SELECT id FROM politician_profiles
                WHERE LOWER(full_name) = LOWER(${r.incumbent.full_name})
                  AND position_id = ${r.position_id}
                LIMIT 1
              `);
              if (existing.rows.length === 0) {
                await storage.createPoliticianProfile({
                  fullName: r.incumbent.full_name,
                  party: r.incumbent.party || null,
                  biography: r.incumbent.biography || null,
                  website: r.incumbent.website || null,
                  positionId: r.position_id,
                  profileType: "representative",
                  isCurrent: true,
                });
                createdProfiles++;
              }
            }

            // Create candidate profiles
            if (Array.isArray(r.candidates)) {
              for (const cand of r.candidates) {
                if (!cand.full_name) continue;
                const existing = await db.execute(sql`
                  SELECT id FROM politician_profiles
                  WHERE LOWER(full_name) = LOWER(${cand.full_name})
                    AND position_id = ${r.position_id}
                  LIMIT 1
                `);
                if (existing.rows.length === 0) {
                  await storage.createPoliticianProfile({
                    fullName: cand.full_name,
                    party: cand.party || null,
                    biography: cand.biography || null,
                    positionId: r.position_id,
                    profileType: "candidate",
                    isCurrent: false,
                  });
                  createdProfiles++;
                }
              }
            }
          }
        } catch (err: any) {
          console.error(`[state-scan] Position batch ${i}–${i + 3} error:`, err.message);
          errors.push(`Position batch ${i}–${i + 3}: ${err.message}`);
        }
      }

      res.json({
        success: true,
        state: code,
        stateName,
        updatedProfiles,
        createdProfiles,
        totalProcessed: updatedProfiles + createdProfiles,
        errors,
      });
    } catch (error: any) {
      console.error("State scan run error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // ─── Corruption News Scanner — Webhook Ingest ────────────────────────────
  app.post("/api/webhooks/corruption-scan", async (req, res) => {
    try {
      const secret = req.headers["x-webhook-secret"];
      if (!secret || secret !== process.env.ACP_WEBHOOK_SECRET) {
        return res.status(401).json({ message: "Unauthorized: invalid or missing x-webhook-secret" });
      }

      const { scanFindings } = await import("@shared/schema");

      const raw = req.body;
      const items: any[] = Array.isArray(raw) ? raw : [raw];

      const rows = items
        .filter((item: any) => typeof item["Headline"] === "string" && item["Headline"].trim().length > 0)
        .map((item: any) => ({
          headline: item["Headline"].trim(),
          category: item["Category"] ?? null,
          summary: item["Summary"] ?? null,
          sourceUrl: item["Source URL"] ?? null,
          entitiesInvolved: Array.isArray(item["Entities involved"])
            ? JSON.stringify(item["Entities involved"])
            : (item["Entities involved"] ?? null),
          relevanceScore: Math.min(10, Math.max(0, parseInt(item["ACP Relevance Score"] ?? "0", 10) || 0)),
          suggestedAction: item["Suggested Action"] ?? null,
          status: "approved",
          scannedAt: new Date(),
        }));

      if (rows.length > 0) {
        await db.insert(scanFindings).values(rows);
      }

      const adminUserId = await storage.getAdminUserId();
      if (!adminUserId) {
        return res.status(500).json({ message: "ACP Administrator account not found — cannot post to feed" });
      }

      const postsCreated: string[] = [];
      for (const row of rows) {
        const post = await storage.createPost({
          authorId: adminUserId,
          type: "news",
          title: row.headline,
          content: row.summary ?? row.headline,
          url: row.sourceUrl ?? null,
          newsSourceName: "ACP Corruption Scanner",
          tags: row.category ? [row.category] : [],
        });
        postsCreated.push(post.id);
      }

      const highPriority = rows.filter((r) => r.relevanceScore >= 7).length;
      return res.json({
        received: rows.length,
        highPriority,
        postsCreated: postsCreated.length,
        message: "Scan results ingested and posted to News Feed",
      });
    } catch (error: any) {
      console.error("Corruption scan webhook error:", error);
      return res.status(500).json({ message: error.message });
    }
  });

  // ─── Admin: Scan Findings ─────────────────────────────────────────────────
  app.get("/api/admin/scan-findings", ensureAdmin, async (req, res) => {
    try {
      const { scanFindings } = await import("@shared/schema");
      const { and, desc, ilike, gte, or } = await import("drizzle-orm");

      const status = (req.query.status as string) || "";
      const category = (req.query.category as string) || "";
      const minScore = parseInt(req.query.minScore as string, 10) || 0;
      const search = (req.query.search as string) || "";
      const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 25));
      const offset = (page - 1) * limit;

      const conditions: any[] = [];
      if (status) conditions.push(eq(scanFindings.status, status));
      if (category) conditions.push(eq(scanFindings.category, category));
      if (minScore > 0) conditions.push(gte(scanFindings.relevanceScore, minScore));
      if (search) {
        conditions.push(
          or(
            ilike(scanFindings.headline, `%${search}%`),
            ilike(scanFindings.summary, `%${search}%`)
          )
        );
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [findings, countResult] = await Promise.all([
        db.select().from(scanFindings)
          .where(where)
          .orderBy(desc(scanFindings.scannedAt))
          .limit(limit)
          .offset(offset),
        db.select({ count: sql<number>`count(*)::int` }).from(scanFindings).where(where),
      ]);

      return res.json({
        findings,
        total: countResult[0]?.count ?? 0,
        page,
      });
    } catch (error: any) {
      console.error("Admin scan findings error:", error);
      return res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/admin/scan-findings/:id", ensureAdmin, async (req, res) => {
    try {
      const { scanFindings } = await import("@shared/schema");
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });

      const { status, adminNotes, reviewedBy } = req.body;
      const updateData: Record<string, any> = { reviewedAt: new Date() };
      if (status !== undefined) updateData.status = status;
      if (adminNotes !== undefined) updateData.adminNotes = adminNotes;
      updateData.reviewedBy = reviewedBy ?? req.user?.username ?? req.user?.id ?? "admin";

      const [updated] = await db.update(scanFindings)
        .set(updateData)
        .where(eq(scanFindings.id, id))
        .returning();

      if (!updated) return res.status(404).json({ message: "Finding not found" });
      return res.json(updated);
    } catch (error: any) {
      console.error("Admin scan finding update error:", error);
      return res.status(500).json({ message: error.message });
    }
  });

  // ─── Admin: Scan Findings Stats ──────────────────────────────────────────
  app.get("/api/admin/scan-findings/stats", ensureAdmin, async (req, res) => {
    try {
      const { scanFindings } = await import("@shared/schema");
      const { gte: gteOp, and: andOp } = await import("drizzle-orm");

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const [total, pending, highPriority, approvedToday] = await Promise.all([
        db.select({ count: sql<number>`count(*)::int` }).from(scanFindings),
        db.select({ count: sql<number>`count(*)::int` }).from(scanFindings).where(eq(scanFindings.status, "pending")),
        db.select({ count: sql<number>`count(*)::int` }).from(scanFindings).where(
          andOp(gteOp(scanFindings.relevanceScore, 7), eq(scanFindings.status, "pending"))
        ),
        db.select({ count: sql<number>`count(*)::int` }).from(scanFindings).where(
          andOp(eq(scanFindings.status, "approved"), gteOp(scanFindings.reviewedAt, todayStart))
        ),
      ]);

      return res.json({
        total: total[0]?.count ?? 0,
        pending: pending[0]?.count ?? 0,
        highPriority: highPriority[0]?.count ?? 0,
        approvedToday: approvedToday[0]?.count ?? 0,
      });
    } catch (error: any) {
      console.error("Scan findings stats error:", error);
      return res.status(500).json({ message: error.message });
    }
  });

  return httpServer;
}

// Create standardized representative structure using divisions data
async function transformDivisionsToRepresentatives(divisionsData: any, address: string) {
  const offices = [];
  const officials = [];
  
  // Standard federal representatives (everyone has these)
  offices.push({
    name: 'President of the United States',
    officialIndices: [0],
    levels: ['country'],
    roles: ['headOfState', 'headOfGovernment']
  });
  officials.push({
    name: 'Joe Biden',
    party: 'Democratic Party',
    phones: ['202-456-1414'],
    urls: ['https://www.whitehouse.gov'],
    address: [{
      line1: '1600 Pennsylvania Avenue NW',
      city: 'Washington',
      state: 'DC',
      zip: '20500'
    }]
  });

  offices.push({
    name: 'Vice President of the United States',
    officialIndices: [1],
    levels: ['country'],
    roles: ['deputyHeadOfGovernment']
  });
  officials.push({
    name: 'Kamala Harris',
    party: 'Democratic Party',
    phones: ['202-456-1414'],
    urls: ['https://www.whitehouse.gov/administration/vice-president-harris/']
  });

  // Extract state information from divisions
  let stateCode = null;
  if (divisionsData.results) {
    for (const division of divisionsData.results) {
      if (division.ocdId?.includes('state:')) {
        stateCode = division.ocdId.split('state:')[1]?.split('/')[0];
        break;
      }
    }
  }

  // Add state-specific representatives
  if (stateCode) {
    offices.push({
      name: 'U.S. Senator',
      officialIndices: [2, 3],
      levels: ['country'],
      roles: ['legislatorUpperBody']
    });
    officials.push({
      name: `U.S. Senator from ${stateCode.toUpperCase()}`,
      party: 'Visit senate.gov for current information',
      urls: ['https://www.senate.gov/senators/senators-contact.htm'],
      phones: ['Contact Senate office']
    });
    officials.push({
      name: `U.S. Senator from ${stateCode.toUpperCase()}`,
      party: 'Visit senate.gov for current information', 
      urls: ['https://www.senate.gov/senators/senators-contact.htm'],
      phones: ['Contact Senate office']
    });

    offices.push({
      name: 'U.S. Representative',
      officialIndices: [4],
      levels: ['country'],
      roles: ['legislatorLowerBody']
    });
    officials.push({
      name: `U.S. Representative from ${stateCode.toUpperCase()}`,
      party: 'Visit house.gov for current information',
      urls: ['https://www.house.gov/representatives/find-your-representative'],
      phones: ['Contact House office']
    });

    offices.push({
      name: 'Governor',
      officialIndices: [5],
      levels: ['administrativeArea1'],
      roles: ['headOfGovernment']
    });
    officials.push({
      name: `Governor of ${stateCode.toUpperCase()}`,
      party: 'Visit your state website for current information',
      urls: [`https://www.usa.gov/state-government/${stateCode.toLowerCase()}`],
      phones: ['Contact Governor office']
    });
  }

  // Add helpful guidance
  offices.push({
    name: 'Find All Your Representatives',
    officialIndices: [officials.length],
    levels: ['all']
  });
  officials.push({
    name: 'Complete Representative Directory',
    party: 'All Parties',
    urls: [
      'https://www.usa.gov/elected-officials',
      'https://ballotpedia.org/Who_represents_me',
      'https://www.govtrack.us/congress/members'
    ],
    phones: ['Use the websites above'],
    address: [{
      line1: 'For complete, current contact information',
      city: 'visit the official government websites',
      state: 'All States',
      zip: 'All ZIP codes'
    }]
  });

  return {
    offices,
    officials,
    kind: 'civicinfo#representativeInfoResponse',
    normalizedInput: {
      locationName: address
    },
    fallbackMode: false,
    message: 'Showing federal representatives + guidance for state/local officials'
  };
}
