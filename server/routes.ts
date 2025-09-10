import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { type VoteRecord } from "./lib/blockchain";
import { calculateRankedChoiceWinner, type RankedVote } from "./lib/ranked-choice";
import { insertPostSchema, insertPollSchema, insertGroupSchema, insertCommentSchema, insertCandidateSchema, insertMessageSchema, insertChannelSchema, insertChannelMessageSchema, insertFlagSchema, insertCharitySchema, insertCharityDonationSchema } from "@shared/schema";
import { findRepresentativesByZipCode } from "./openai";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Posts API
  app.get("/api/posts", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      const posts = await storage.getPosts(limit, offset);
      res.json(posts);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/posts/:id", async (req, res) => {
    try {
      const post = await storage.getPostById(req.params.id);
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
      const postData = insertPostSchema.parse({
        ...req.body,
        authorId: req.user.id,
      });
      const post = await storage.createPost(postData);
      res.status(201).json(post);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/posts/user/:userId", async (req, res) => {
    try {
      const posts = await storage.getPostsByUser(req.params.userId);
      res.json(posts);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/posts/tag/:tag", async (req, res) => {
    try {
      const posts = await storage.getPostsByTag(req.params.tag);
      res.json(posts);
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

  // Object Storage API endpoints for profile picture uploads
  const { ObjectStorageService, ObjectNotFoundError, ObjectPermission } = await import("./objectStorage");

  // Endpoint for serving private objects (profile pictures)
  app.get("/objects/:objectPath(*)", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    const userId = req.user.id;
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

  // ACP Cryptocurrency Routes
  app.get("/api/user/balance", async (req, res) => {
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

  const httpServer = createServer(app);
  
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
