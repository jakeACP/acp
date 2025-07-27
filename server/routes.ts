import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { blockchainVerifier, type VoteRecord } from "./lib/blockchain";
import { RankedChoiceCalculator, type RankedBallot } from "./lib/ranked-choice";
import { insertPostSchema, insertPollSchema, insertGroupSchema, insertCommentSchema, insertCandidateSchema, insertMessageSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Seed data endpoint (development only)
  app.post("/api/seed", async (req, res) => {
    if (process.env.NODE_ENV !== "development") {
      return res.status(403).json({ message: "Seeding only available in development" });
    }
    
    try {
      const { seedDatabase } = await import("./seed");
      await seedDatabase();
      res.json({ message: "Database seeded successfully!" });
    } catch (error: any) {
      res.status(500).json({ message: "Seeding failed: " + error.message });
    }
  });

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
      const pollData = insertPollSchema.parse(req.body);
      const poll = await storage.createPoll(pollData);
      res.status(201).json(poll);
    } catch (error: any) {
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
      res.status(400).json({ message: error.message });
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

  // Candidates API
  app.get("/api/candidates", async (req, res) => {
    try {
      const candidates = await storage.getCandidates();
      res.json(candidates);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/candidates/:id", async (req, res) => {
    try {
      const candidate = await storage.getCandidateById(req.params.id);
      if (!candidate) {
        return res.status(404).json({ message: "Candidate not found" });
      }
      res.json(candidate);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
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
      // For now, just increment the endorsements count
      // In a real app, you'd track individual endorsements to prevent duplicates
      const candidate = await storage.getCandidateById(req.params.id);
      if (!candidate) {
        return res.status(404).json({ message: "Candidate not found" });
      }

      // Simple endorsement increment (can be enhanced later)
      await storage.supportCandidate(req.params.id, req.user.id);
      res.json({ message: "Support added successfully" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
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
      res.status(500).json({ message: error.message });
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
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/messages", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const messageData = insertMessageSchema.parse({
        ...req.body,
        senderId: req.user.id,
      });
      const message = await storage.sendMessage(messageData);
      res.status(201).json(message);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
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
      res.status(400).json({ message: error.message });
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
    } catch (error: any) {
      console.error('Test endpoint error:', error);
      res.status(500).json({ message: error.message });
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

  const httpServer = createServer(app);
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
