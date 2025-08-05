import { users, posts, polls, pollVotes, groups, groupMembers, comments, likes, candidates, messages, followedRepresentatives, userAddresses, passwordResetTokens, flags, events, eventAttendees, type User, type InsertUser, type Post, type InsertPost, type Poll, type InsertPoll, type Group, type InsertGroup, type Comment, type InsertComment, type Candidate, type InsertCandidate, type Message, type InsertMessage, type FollowedRepresentative, type InsertFollowedRepresentative, type UserAddress, type InsertUserAddress, type PasswordResetToken, type InsertPasswordResetToken, type Flag, type InsertFlag, type Event, type InsertEvent, type EventAttendee, type InsertEventAttendee } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, sql, count } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(userId: string, updateData: Partial<User>): Promise<User>;
  updateUserStripeInfo(userId: string, customerId: string, subscriptionId: string): Promise<User>;
  updateUserPassword(userId: string, hashedPassword: string): Promise<User>;

  // Posts
  getPosts(limit?: number, offset?: number): Promise<Post[]>;
  getPostById(id: string): Promise<Post | undefined>;
  createPost(post: InsertPost): Promise<Post>;
  getPostsByUser(userId: string): Promise<Post[]>;
  getPostsByTag(tag: string): Promise<Post[]>;

  // Polls
  createPoll(poll: InsertPoll): Promise<Poll>;
  getPollById(id: string): Promise<Poll | undefined>;
  getPoll(id: string): Promise<Poll | undefined>;
  getPollByPostId(postId: string): Promise<Poll | undefined>;
  getActivePolls(): Promise<Poll[]>;
  recordVote(pollId: string, userId: string, optionId: string, blockchainHash?: string): Promise<void>;
  recordRankedVote(pollId: string, userId: string, rankedChoices: string[], blockchainHash?: string): Promise<void>;
  getRankedVotes(pollId: string): Promise<any[]>;
  getUserVote(pollId: string, userId: string): Promise<any>;
  votePoll(pollId: string, userId: string, optionId: string): Promise<void>;
  getPollVote(pollId: string, userId: string): Promise<string | undefined>;

  // Groups
  getGroups(): Promise<Group[]>;
  getGroupById(id: string): Promise<Group | undefined>;
  createGroup(group: InsertGroup): Promise<Group>;
  getUserGroups(userId: string): Promise<Group[]>;
  joinGroup(groupId: string, userId: string): Promise<void>;
  leaveGroup(groupId: string, userId: string): Promise<void>;

  // Comments
  getCommentsByPost(postId: string): Promise<Comment[]>;
  createComment(comment: InsertComment): Promise<Comment>;

  // Likes
  toggleLike(userId: string, targetId: string, targetType: string): Promise<boolean>;
  getLikeStatus(userId: string, targetId: string, targetType: string): Promise<boolean>;

  // Candidates
  getCandidates(): Promise<Candidate[]>;
  getCandidateById(id: string): Promise<Candidate | undefined>;
  createCandidate(candidate: InsertCandidate): Promise<Candidate>;
  getCandidateByUserId(userId: string): Promise<Candidate | undefined>;
  supportCandidate(candidateId: string, userId: string): Promise<void>;

  // Messages
  getMessages(userId: string): Promise<Message[]>;
  getConversation(userId1: string, userId2: string): Promise<Message[]>;
  sendMessage(message: InsertMessage): Promise<Message>;
  markMessageRead(messageId: string): Promise<void>;

  // Representatives
  saveUserAddress(userId: string, address: string): Promise<void>;
  followRepresentative(userId: string, repData: { name: string; office: string; party?: string }): Promise<void>;
  getFollowedRepresentatives(userId: string): Promise<FollowedRepresentative[]>;

  // Password Reset
  createPasswordResetToken(email: string, token: string, expiresAt: Date): Promise<PasswordResetToken>;
  getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined>;
  markTokenAsUsed(tokenId: string): Promise<void>;
  cleanupExpiredTokens(): Promise<void>;

  // Flags
  createFlag(flag: InsertFlag): Promise<Flag>;

  // Events
  getEvents(limit?: number, offset?: number, filters?: { city?: string; state?: string; tags?: string[] }): Promise<Event[]>;
  getEventById(id: string): Promise<Event | undefined>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEvent(eventId: string, updateData: Partial<Event>): Promise<Event>;
  deleteEvent(eventId: string): Promise<void>;
  getUserEvents(userId: string): Promise<Event[]>;
  getEventsByLocation(city?: string, state?: string): Promise<Event[]>;
  
  // Event Attendees
  registerForEvent(eventId: string, userId: string, status?: string): Promise<EventAttendee>;
  unregisterFromEvent(eventId: string, userId: string): Promise<void>;
  getEventAttendees(eventId: string): Promise<EventAttendee[]>;
  getUserEventRegistrations(userId: string): Promise<EventAttendee[]>;
  updateEventAttendeeStatus(eventId: string, userId: string, status: string): Promise<EventAttendee>;

  sessionStore: any;
}

export class DatabaseStorage implements IStorage {
  sessionStore: any;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUserStripeInfo(userId: string, customerId: string, subscriptionId: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ 
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId 
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateUser(userId: string, updateData: Partial<User>): Promise<User> {
    const [user] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateUserPassword(userId: string, hashedPassword: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async getPosts(limit = 20, offset = 0): Promise<Post[]> {
    return await db
      .select()
      .from(posts)
      .orderBy(desc(posts.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async getPostById(id: string): Promise<Post | undefined> {
    const [post] = await db.select().from(posts).where(eq(posts.id, id));
    return post || undefined;
  }

  async createPost(post: InsertPost): Promise<Post> {
    const [newPost] = await db
      .insert(posts)
      .values(post)
      .returning();
    return newPost;
  }

  async getPostsByUser(userId: string): Promise<Post[]> {
    return await db
      .select()
      .from(posts)
      .where(eq(posts.authorId, userId))
      .orderBy(desc(posts.createdAt));
  }

  async getPostsByTag(tag: string): Promise<Post[]> {
    return await db
      .select()
      .from(posts)
      .where(sql`${tag} = ANY(${posts.tags})`)
      .orderBy(desc(posts.createdAt));
  }

  async createPoll(poll: InsertPoll): Promise<Poll> {
    const [newPoll] = await db
      .insert(polls)
      .values(poll)
      .returning();
    return newPoll;
  }

  async getPollById(id: string): Promise<Poll | undefined> {
    const [poll] = await db.select().from(polls).where(eq(polls.id, id));
    return poll || undefined;
  }

  async getPollByPostId(postId: string): Promise<Poll | undefined> {
    const [poll] = await db.select().from(polls).where(eq(polls.postId, postId));
    return poll || undefined;
  }

  async getActivePolls(): Promise<Poll[]> {
    return await db
      .select()
      .from(polls)
      .where(eq(polls.isActive, true))
      .orderBy(desc(polls.createdAt));
  }

  async votePoll(pollId: string, userId: string, optionId: string): Promise<void> {
    // Check if user already voted
    const existingVote = await db
      .select()
      .from(pollVotes)
      .where(and(eq(pollVotes.pollId, pollId), eq(pollVotes.userId, userId)));

    if (existingVote.length > 0) {
      // Update existing vote
      await db
        .update(pollVotes)
        .set({ optionId })
        .where(and(eq(pollVotes.pollId, pollId), eq(pollVotes.userId, userId)));
    } else {
      // Insert new vote
      await db
        .insert(pollVotes)
        .values({ pollId, userId, optionId });
    }

    // Update poll vote counts
    const poll = await this.getPollById(pollId);
    if (poll) {
      const votes = await db
        .select()
        .from(pollVotes)
        .where(eq(pollVotes.pollId, pollId));

      const updatedOptions = poll.options.map(option => ({
        ...option,
        votes: votes.filter(v => v.optionId === option.id).length
      }));

      await db
        .update(polls)
        .set({ 
          options: updatedOptions,
          totalVotes: votes.length 
        })
        .where(eq(polls.id, pollId));
    }
  }

  async getPollVote(pollId: string, userId: string): Promise<string | undefined> {
    const [vote] = await db
      .select()
      .from(pollVotes)
      .where(and(eq(pollVotes.pollId, pollId), eq(pollVotes.userId, userId)));
    return vote?.optionId;
  }

  async getPoll(id: string): Promise<Poll | undefined> {
    return this.getPollById(id);
  }

  async recordVote(pollId: string, userId: string, optionId: string, blockchainHash?: string): Promise<void> {
    // Check if user already voted
    const existingVote = await db
      .select()
      .from(pollVotes)
      .where(and(eq(pollVotes.pollId, pollId), eq(pollVotes.userId, userId)));

    if (existingVote.length > 0) {
      throw new Error("You have already voted on this poll");
    }

    // Insert new vote
    await db
      .insert(pollVotes)
      .values({ 
        pollId, 
        userId, 
        optionId,
        blockchainHash
      });

    // Update poll vote counts
    await this.updatePollCounts(pollId);
  }

  async recordRankedVote(pollId: string, userId: string, rankedChoices: string[], blockchainHash?: string): Promise<void> {
    // Check if user already voted
    const existingVote = await db
      .select()
      .from(pollVotes)
      .where(and(eq(pollVotes.pollId, pollId), eq(pollVotes.userId, userId)));

    if (existingVote.length > 0) {
      throw new Error("You have already voted on this poll");
    }

    // Insert new ranked vote
    await db
      .insert(pollVotes)
      .values({ 
        pollId, 
        userId, 
        optionId: rankedChoices[0], // First choice for simple compatibility
        rankedChoices,
        blockchainHash
      });

    // Update poll vote counts
    await this.updatePollCounts(pollId);
  }

  async getRankedVotes(pollId: string): Promise<any[]> {
    return await db
      .select()
      .from(pollVotes)
      .where(eq(pollVotes.pollId, pollId));
  }

  async getUserVote(pollId: string, userId: string): Promise<any> {
    const [vote] = await db
      .select()
      .from(pollVotes)
      .where(and(eq(pollVotes.pollId, pollId), eq(pollVotes.userId, userId)));
    return vote || null;
  }

  private async updatePollCounts(pollId: string): Promise<void> {
    const poll = await this.getPollById(pollId);
    if (poll) {
      const votes = await db
        .select()
        .from(pollVotes)
        .where(eq(pollVotes.pollId, pollId));

      const updatedOptions = poll.options.map(option => ({
        ...option,
        votes: votes.filter(v => v.optionId === option.id).length
      }));

      await db
        .update(polls)
        .set({ 
          options: updatedOptions,
          totalVotes: votes.length 
        })
        .where(eq(polls.id, pollId));
    }
  }

  async getGroups(): Promise<Group[]> {
    return await db
      .select()
      .from(groups)
      .orderBy(desc(groups.memberCount));
  }

  async getGroupById(id: string): Promise<Group | undefined> {
    const [group] = await db.select().from(groups).where(eq(groups.id, id));
    return group || undefined;
  }

  async createGroup(group: InsertGroup): Promise<Group> {
    const [newGroup] = await db
      .insert(groups)
      .values(group)
      .returning();

    // Add creator as admin member
    await db
      .insert(groupMembers)
      .values({
        groupId: newGroup.id,
        userId: group.createdBy,
        role: "admin"
      });

    return newGroup;
  }

  async getUserGroups(userId: string): Promise<Group[]> {
    return await db
      .select({
        id: groups.id,
        name: groups.name,
        description: groups.description,
        category: groups.category,
        image: groups.image,
        memberCount: groups.memberCount,
        isPublic: groups.isPublic,
        createdBy: groups.createdBy,
        createdAt: groups.createdAt,
      })
      .from(groups)
      .innerJoin(groupMembers, eq(groups.id, groupMembers.groupId))
      .where(eq(groupMembers.userId, userId));
  }

  async joinGroup(groupId: string, userId: string): Promise<void> {
    await db
      .insert(groupMembers)
      .values({ groupId, userId });

    // Update member count
    await db
      .update(groups)
      .set({ memberCount: sql`${groups.memberCount} + 1` })
      .where(eq(groups.id, groupId));
  }

  async leaveGroup(groupId: string, userId: string): Promise<void> {
    await db
      .delete(groupMembers)
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)));

    // Update member count
    await db
      .update(groups)
      .set({ memberCount: sql`${groups.memberCount} - 1` })
      .where(eq(groups.id, groupId));
  }

  async getCommentsByPost(postId: string): Promise<Comment[]> {
    return await db
      .select()
      .from(comments)
      .where(eq(comments.postId, postId))
      .orderBy(desc(comments.createdAt));
  }

  async createComment(comment: InsertComment): Promise<Comment> {
    const [newComment] = await db
      .insert(comments)
      .values(comment)
      .returning();

    // Update post comment count
    await db
      .update(posts)
      .set({ commentsCount: sql`${posts.commentsCount} + 1` })
      .where(eq(posts.id, comment.postId));

    return newComment;
  }

  async toggleLike(userId: string, targetId: string, targetType: string): Promise<boolean> {
    const existingLike = await db
      .select()
      .from(likes)
      .where(and(
        eq(likes.userId, userId),
        eq(likes.targetId, targetId),
        eq(likes.targetType, targetType)
      ));

    if (existingLike.length > 0) {
      // Remove like
      await db
        .delete(likes)
        .where(and(
          eq(likes.userId, userId),
          eq(likes.targetId, targetId),
          eq(likes.targetType, targetType)
        ));

      // Update count
      if (targetType === "post") {
        await db
          .update(posts)
          .set({ likesCount: sql`${posts.likesCount} - 1` })
          .where(eq(posts.id, targetId));
      } else if (targetType === "comment") {
        await db
          .update(comments)
          .set({ likesCount: sql`${comments.likesCount} - 1` })
          .where(eq(comments.id, targetId));
      }

      return false;
    } else {
      // Add like
      await db
        .insert(likes)
        .values({ userId, targetId, targetType });

      // Update count
      if (targetType === "post") {
        await db
          .update(posts)
          .set({ likesCount: sql`${posts.likesCount} + 1` })
          .where(eq(posts.id, targetId));
      } else if (targetType === "comment") {
        await db
          .update(comments)
          .set({ likesCount: sql`${comments.likesCount} + 1` })
          .where(eq(comments.id, targetId));
      }

      return true;
    }
  }

  async getLikeStatus(userId: string, targetId: string, targetType: string): Promise<boolean> {
    const [like] = await db
      .select()
      .from(likes)
      .where(and(
        eq(likes.userId, userId),
        eq(likes.targetId, targetId),
        eq(likes.targetType, targetType)
      ));
    return !!like;
  }

  async getCandidates(): Promise<Candidate[]> {
    return await db
      .select()
      .from(candidates)
      .where(eq(candidates.isActive, true))
      .orderBy(desc(candidates.endorsements));
  }

  async getCandidateById(id: string): Promise<Candidate | undefined> {
    const [candidate] = await db.select().from(candidates).where(eq(candidates.id, id));
    return candidate || undefined;
  }

  async createCandidate(candidate: InsertCandidate): Promise<Candidate> {
    const [newCandidate] = await db
      .insert(candidates)
      .values(candidate)
      .returning();
    return newCandidate;
  }

  async supportCandidate(candidateId: string, userId: string): Promise<void> {
    // Increment endorsement count
    await db
      .update(candidates)
      .set({ 
        endorsements: sql`${candidates.endorsements} + 1`
      })
      .where(eq(candidates.id, candidateId));
  }

  async getCandidateByUserId(userId: string): Promise<Candidate | undefined> {
    const [candidate] = await db.select().from(candidates).where(eq(candidates.userId, userId));
    return candidate || undefined;
  }

  async getMessages(userId: string): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(or(eq(messages.senderId, userId), eq(messages.recipientId, userId)))
      .orderBy(desc(messages.createdAt));
  }

  async getConversation(userId1: string, userId2: string): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(
        or(
          and(eq(messages.senderId, userId1), eq(messages.recipientId, userId2)),
          and(eq(messages.senderId, userId2), eq(messages.recipientId, userId1))
        )
      )
      .orderBy(desc(messages.createdAt));
  }

  async sendMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db
      .insert(messages)
      .values(message)
      .returning();
    return newMessage;
  }

  async markMessageRead(messageId: string): Promise<void> {
    await db
      .update(messages)
      .set({ isRead: true })
      .where(eq(messages.id, messageId));
  }

  async saveUserAddress(userId: string, address: string): Promise<void> {
    // Check if address already exists for user
    const existingAddress = await db
      .select()
      .from(userAddresses)
      .where(and(eq(userAddresses.userId, userId), eq(userAddresses.address, address)));

    if (existingAddress.length > 0) {
      // Update last used timestamp
      await db
        .update(userAddresses)
        .set({ lastUsed: new Date() })
        .where(eq(userAddresses.id, existingAddress[0].id));
    } else {
      // Insert new address
      await db
        .insert(userAddresses)
        .values({ userId, address });
    }
  }

  async followRepresentative(userId: string, repData: { name: string; office: string; party?: string }): Promise<void> {
    // Check if already following
    const existing = await db
      .select()
      .from(followedRepresentatives)
      .where(and(
        eq(followedRepresentatives.userId, userId),
        eq(followedRepresentatives.name, repData.name),
        eq(followedRepresentatives.office, repData.office)
      ));

    if (existing.length === 0) {
      await db
        .insert(followedRepresentatives)
        .values({
          userId,
          name: repData.name,
          office: repData.office,
          party: repData.party || null,
        });
    }
  }

  async getFollowedRepresentatives(userId: string): Promise<FollowedRepresentative[]> {
    return await db
      .select()
      .from(followedRepresentatives)
      .where(eq(followedRepresentatives.userId, userId))
      .orderBy(desc(followedRepresentatives.followedAt));
  }

  async createPasswordResetToken(email: string, token: string, expiresAt: Date): Promise<PasswordResetToken> {
    const [resetToken] = await db
      .insert(passwordResetTokens)
      .values({
        email,
        token,
        expiresAt,
      })
      .returning();
    return resetToken;
  }

  async getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined> {
    const [resetToken] = await db
      .select()
      .from(passwordResetTokens)
      .where(and(
        eq(passwordResetTokens.token, token),
        eq(passwordResetTokens.used, false),
        sql`${passwordResetTokens.expiresAt} > NOW()`
      ));
    return resetToken || undefined;
  }

  async markTokenAsUsed(tokenId: string): Promise<void> {
    await db
      .update(passwordResetTokens)
      .set({ used: true })
      .where(eq(passwordResetTokens.id, tokenId));
  }

  async cleanupExpiredTokens(): Promise<void> {
    await db
      .delete(passwordResetTokens)
      .where(sql`${passwordResetTokens.expiresAt} < NOW()`);
  }

  async createFlag(flag: InsertFlag): Promise<Flag> {
    const [newFlag] = await db
      .insert(flags)
      .values(flag)
      .returning();
    return newFlag;
  }

  // Events
  async getEvents(limit = 50, offset = 0, filters?: { city?: string; state?: string; tags?: string[] }): Promise<Event[]> {
    let query = db.select().from(events).orderBy(desc(events.startDate));
    
    // Apply filters
    if (filters) {
      const conditions = [];
      if (filters.city) {
        conditions.push(eq(events.city, filters.city));
      }
      if (filters.state) {
        conditions.push(eq(events.state, filters.state));
      }
      if (filters.tags && filters.tags.length > 0) {
        // Check if any of the filter tags match any event tags
        conditions.push(
          or(...filters.tags.map(tag => 
            sql`${events.tags} @> ${JSON.stringify([tag])}`
          ))
        );
      }
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
    }
    
    return await query.limit(limit).offset(offset);
  }

  async getEventById(id: string): Promise<Event | undefined> {
    const [event] = await db.select().from(events).where(eq(events.id, id));
    return event || undefined;
  }

  async createEvent(event: InsertEvent): Promise<Event> {
    const [newEvent] = await db
      .insert(events)
      .values(event)
      .returning();
    return newEvent;
  }

  async updateEvent(eventId: string, updateData: Partial<Event>): Promise<Event> {
    const [updatedEvent] = await db
      .update(events)
      .set(updateData)
      .where(eq(events.id, eventId))
      .returning();
    return updatedEvent;
  }

  async deleteEvent(eventId: string): Promise<void> {
    // First delete all attendee records
    await db.delete(eventAttendees).where(eq(eventAttendees.eventId, eventId));
    // Then delete the event
    await db.delete(events).where(eq(events.id, eventId));
  }

  async getUserEvents(userId: string): Promise<Event[]> {
    return await db
      .select()
      .from(events)
      .where(eq(events.organizerId, userId))
      .orderBy(desc(events.startDate));
  }

  async getEventsByLocation(city?: string, state?: string): Promise<Event[]> {
    const conditions = [];
    if (city) conditions.push(eq(events.city, city));
    if (state) conditions.push(eq(events.state, state));
    
    if (conditions.length === 0) return [];
    
    return await db
      .select()
      .from(events)
      .where(and(...conditions))
      .orderBy(desc(events.startDate));
  }

  // Event Attendees
  async registerForEvent(eventId: string, userId: string, status = "attending"): Promise<EventAttendee> {
    // Check if already registered
    const existing = await db
      .select()
      .from(eventAttendees)
      .where(and(eq(eventAttendees.eventId, eventId), eq(eventAttendees.userId, userId)));
    
    if (existing.length > 0) {
      // Update existing registration
      return await this.updateEventAttendeeStatus(eventId, userId, status);
    }
    
    const [attendee] = await db
      .insert(eventAttendees)
      .values({ eventId, userId, status })
      .returning();
    
    // Update event attendee count
    await db
      .update(events)
      .set({ 
        currentAttendees: sql`${events.currentAttendees} + 1` 
      })
      .where(eq(events.id, eventId));
    
    return attendee;
  }

  async unregisterFromEvent(eventId: string, userId: string): Promise<void> {
    const result = await db
      .delete(eventAttendees)
      .where(and(eq(eventAttendees.eventId, eventId), eq(eventAttendees.userId, userId)));
    
    // Update event attendee count
    await db
      .update(events)
      .set({ 
        currentAttendees: sql`GREATEST(${events.currentAttendees} - 1, 0)` 
      })
      .where(eq(events.id, eventId));
  }

  async getEventAttendees(eventId: string): Promise<EventAttendee[]> {
    return await db
      .select()
      .from(eventAttendees)
      .where(eq(eventAttendees.eventId, eventId))
      .orderBy(desc(eventAttendees.registeredAt));
  }

  async getUserEventRegistrations(userId: string): Promise<EventAttendee[]> {
    return await db
      .select()
      .from(eventAttendees)
      .where(eq(eventAttendees.userId, userId))
      .orderBy(desc(eventAttendees.registeredAt));
  }

  async updateEventAttendeeStatus(eventId: string, userId: string, status: string): Promise<EventAttendee> {
    const [updatedAttendee] = await db
      .update(eventAttendees)
      .set({ status })
      .where(and(eq(eventAttendees.eventId, eventId), eq(eventAttendees.userId, userId)))
      .returning();
    return updatedAttendee;
  }
}

export const storage = new DatabaseStorage();
