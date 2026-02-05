import { storage } from "./storage";
import { hashPassword } from "./auth";
import type { InsertUser, InsertPost, InsertPoll, InsertGroup, InsertCandidate } from "@shared/schema";

const SEED_PASSWORD = process.env.SEED_USER_PASSWORD || "changeme_" + Math.random().toString(36).slice(2);

export async function seedDatabase() {
  console.log("🌱 Starting database seeding...");

  try {
    const hashedPassword = await hashPassword(SEED_PASSWORD);
    console.log(`📝 Seed users will use password from SEED_USER_PASSWORD env var (or random if not set)`);

    // Create sample users with different roles
    const adminUser = await storage.createUser({
      username: "admin",
      email: "admin@acp.org",
      password: hashedPassword,
      role: "admin",
      firstName: "ACP",
      lastName: "Administrator",
      bio: "Official ACP platform administrator ensuring fair and transparent democratic processes."
    });

    const candidateUser = await storage.createUser({
      username: "sarah_martinez",
      email: "sarah@example.com", 
      password: hashedPassword,
      role: "candidate",
      firstName: "Sarah",
      lastName: "Martinez",
      bio: "Community organizer fighting for affordable housing and climate action."
    });

    const citizenUser = await storage.createUser({
      username: "alex_chen",
      email: "alex@example.com",
      password: hashedPassword,
      role: "citizen", 
      firstName: "Alex",
      lastName: "Chen",
      bio: "Local business owner passionate about education reform and transparency."
    });

    const moderatorUser = await storage.createUser({
      username: "jordan_kim",
      email: "jordan@example.com",
      password: hashedPassword,
      role: "moderator",
      firstName: "Jordan",
      lastName: "Kim", 
      bio: "Community moderator helping maintain respectful political discourse."
    });

    console.log("✅ Users created");

    // Create political groups
    const climateGroup = await storage.createGroup({
      name: "Climate Action Coalition",
      description: "Working together to address climate change through policy and community action. Join us in building a sustainable future for our city.",
      category: "climate",
      createdBy: adminUser.id
    });

    const educationGroup = await storage.createGroup({
      name: "Education Reform Initiative", 
      description: "Advocating for better schools, fair teacher compensation, and accessible education for all students.",
      category: "education",
      createdBy: citizenUser.id
    });

    const corruptionGroup = await storage.createGroup({
      name: "Government Transparency Watch",
      description: "Monitoring government spending, lobbying activities, and ensuring accountability in public office.",
      category: "corruption",
      createdBy: moderatorUser.id
    });

    const healthcareGroup = await storage.createGroup({
      name: "Healthcare for All",
      description: "Building support for universal healthcare and affordable medical services in our community.",
      category: "healthcare", 
      createdBy: candidateUser.id
    });

    console.log("✅ Groups created");

    // Create posts with real political content
    const welcomePost = await storage.createPost({
      content: "Welcome to the Anti-Corruption Party platform! This is where we build transparent, accountable democracy together. Share your ideas, join discussions, and help shape policies that serve the people, not special interests. #Democracy #Transparency #ACP",
      type: "announcement",
      authorId: adminUser.id,
      tags: ["welcome", "democracy", "transparency"]
    });

    const housingPost = await storage.createPost({
      content: "Our city's housing crisis affects everyone. We need rent stabilization, affordable housing development, and protection for tenants. What solutions do you think would work best for our community? Let's discuss practical policies. #Housing #Policy",
      type: "post", 
      authorId: candidateUser.id,
      tags: ["housing", "policy", "community"]
    });

    const budgetPost = await storage.createPost({
      content: "The city budget should be transparent and accessible to all residents. I've created a breakdown of where our tax dollars go. What areas do you think need more funding? What deserves less? Share your priorities. #Budget #Transparency",
      type: "post",
      authorId: citizenUser.id, 
      tags: ["budget", "taxes", "priorities"]
    });

    console.log("✅ Posts created");

    // Create polls on important issues
    const transportationPoll = await storage.createPoll({
      title: "Transportation Infrastructure Priority",
      description: "Our city has limited transportation budget. Which improvement should we prioritize first?",
      options: [
        { id: "1", text: "Expand public transit routes", votes: 67 },
        { id: "2", text: "Fix existing roads and bridges", votes: 45 }, 
        { id: "3", text: "Build bike lanes and pedestrian paths", votes: 38 },
        { id: "4", text: "Improve traffic signal systems", votes: 22 }
      ],
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      isActive: true
    });

    const energyPoll = await storage.createPoll({
      title: "Clean Energy Transition Plan", 
      description: "How should our city transition to renewable energy sources?",
      options: [
        { id: "1", text: "Invest in solar panel installations", votes: 89 },
        { id: "2", text: "Support wind energy projects", votes: 34 },
        { id: "3", text: "Focus on energy efficiency programs", votes: 56 },
        { id: "4", text: "Combine multiple renewable sources", votes: 123 }
      ],
      endDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), // 21 days from now
      isActive: true
    });

    console.log("✅ Polls created");

    // Create candidate profiles
    const candidate = await storage.createCandidate({
      userId: candidateUser.id,
      position: "City Council District 3",
      platform: "Fighting for affordable housing, climate action, and government transparency. My campaign is funded entirely by small donations from community members - no corporate PACs, no special interests. Together we can build a city that works for everyone.",
      proposals: [
        {
          id: "1",
          title: "Affordable Housing Trust Fund",
          description: "Establish a $50M trust fund to build and preserve affordable housing, funded by developer impact fees and a small real estate transfer tax on luxury properties."
        },
        {
          id: "2", 
          title: "Community Climate Resilience",
          description: "Invest in green infrastructure, urban forestry, and renewable energy while creating good-paying union jobs in the clean energy sector."
        },
        {
          id: "3",
          title: "Transparent Government Initiative", 
          description: "Require all city contracts over $50K to be published online, livestream all city meetings, and create a citizen oversight committee for major spending decisions."
        }
      ],
      isActive: true
    });

    console.log("✅ Candidate profile created");

    console.log("🎉 Database seeding completed successfully!");
    
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  }
}