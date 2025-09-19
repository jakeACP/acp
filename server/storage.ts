import { users, posts, polls, pollVotes, groups, groupMembers, comments, likes, candidates, candidateSupports, messages, channels, channelMembers, channelMessages, followedRepresentatives, userAddresses, passwordResetTokens, flags, events, eventAttendees, charities, charityDonations, acpTransactions, acpBlocks, storeItems, userPurchases, subscriptionRewards, representatives, zipCodeLookups, boycotts, boycottSubscriptions, jurisdictions, rulesets, initiatives, initiativeVersions, petitions, signatures, validationEvents, sponsors, auditLogs, userFollows, reactions, biasVotes, type User, type InsertUser, type Post, type InsertPost, type PostWithAuthor, type Poll, type InsertPoll, type Group, type InsertGroup, type Comment, type InsertComment, type Candidate, type InsertCandidate, type CandidateSupport, type InsertCandidateSupport, type Message, type InsertMessage, type Channel, type InsertChannel, type ChannelMember, type InsertChannelMember, type ChannelMessage, type InsertChannelMessage, type FollowedRepresentative, type InsertFollowedRepresentative, type UserAddress, type InsertUserAddress, type PasswordResetToken, type InsertPasswordResetToken, type Flag, type InsertFlag, type Event, type InsertEvent, type EventAttendee, type InsertEventAttendee, type Charity, type InsertCharity, type CharityDonation, type InsertCharityDonation, type ACPTransaction, type InsertACPTransaction, type StoreItem, type InsertStoreItem, type UserPurchase, type SubscriptionReward, type InsertSubscriptionReward, type ACPBlock, type Representative, type InsertRepresentative, type ZipCodeLookup, type InsertZipCodeLookup, type Boycott, type InsertBoycott, type BoycottSubscription, type InsertBoycottSubscription, type Jurisdiction, type InsertJurisdiction, type Ruleset, type InsertRuleset, type Initiative, type InsertInitiative, type InitiativeVersion, type InsertInitiativeVersion, type Petition, type InsertPetition, type Signature, type InsertSignature, type ValidationEvent, type InsertValidationEvent, type Sponsor, type InsertSponsor, type AuditLog, type InsertAuditLog, insertUserFollowSchema, insertReactionSchema, insertBiasVoteSchema } from "@shared/schema";
import { FEED_CONFIG } from "@shared/feed-config";
import { db } from "./db";
import { eq, desc, and, or, sql, count, inArray } from "drizzle-orm";
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
  getPosts(limit?: number, offset?: number): Promise<PostWithAuthor[]>;
  getPostById(id: string): Promise<Post | undefined>;
  createPost(post: InsertPost): Promise<Post>;
  getPostsByUser(userId: string): Promise<Post[]>;
  getPostsByTag(tag: string): Promise<Post[]>;

  // Feed System
  getAllFeed(limit?: number, offset?: number): Promise<PostWithAuthor[]>;
  getFollowingFeed(userId: string, limit?: number, offset?: number): Promise<PostWithAuthor[]>;
  getNewsFeed(limit?: number, offset?: number): Promise<PostWithAuthor[]>;
  
  // User Following
  followUser(followerId: string, followeeId: string): Promise<void>;
  unfollowUser(followerId: string, followeeId: string): Promise<void>;
  isFollowing(followerId: string, followeeId: string): Promise<boolean>;
  getFollowers(userId: string): Promise<User[]>;
  getFollowing(userId: string): Promise<User[]>;

  // Enhanced Reactions
  addReaction(userId: string, postId: string, type: string, emoji?: string): Promise<void>;
  removeReaction(userId: string, postId: string, type: string): Promise<void>;
  getPostReactions(postId: string): Promise<any[]>;
  getUserReaction(userId: string, postId: string, type: string): Promise<boolean>;

  // Bias Voting
  voteBias(userId: string, postId: string, vote: string): Promise<void>;
  removeBiasVote(userId: string, postId: string): Promise<void>;
  getPostBiasScore(postId: string): Promise<{ neutrality: number; bias: number; confidence: number }>;

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
  getUserVoteCount(userId: string): Promise<number>;
  closePoll(pollId: string): Promise<void>;

  // Groups
  getGroups(): Promise<Group[]>;
  getGroupById(id: string): Promise<Group | undefined>;
  createGroup(group: InsertGroup): Promise<Group>;
  getUserGroups(userId: string): Promise<Group[]>;
  joinGroup(groupId: string, userId: string): Promise<void>;
  leaveGroup(groupId: string, userId: string): Promise<void>;
  isGroupMember(groupId: string, userId: string): Promise<boolean>;
  getGroupMemberCount(groupId: string): Promise<number>;
  recalculateGroupMemberCounts(): Promise<void>;

  // Comments
  getCommentsByPost(postId: string): Promise<Comment[]>;
  getCommentsByPoll(pollId: string): Promise<Comment[]>;
  createComment(comment: InsertComment): Promise<Comment>;
  createPollComment(pollId: string, authorId: string, content: string): Promise<Comment>;

  // Likes
  toggleLike(userId: string, targetId: string, targetType: string): Promise<boolean>;
  getLikeStatus(userId: string, targetId: string, targetType: string): Promise<boolean>;

  // Candidates
  getCandidates(): Promise<Candidate[]>;
  getCandidatesWithUserData(): Promise<any[]>;
  getCandidateById(id: string): Promise<Candidate | undefined>;
  getCandidateWithUserData(id: string): Promise<any>;
  createCandidate(candidate: InsertCandidate): Promise<Candidate>;
  getCandidateByUserId(userId: string): Promise<Candidate | undefined>;
  supportCandidate(candidateId: string, userId: string): Promise<boolean>;
  unsupportCandidate(candidateId: string, userId: string): Promise<boolean>;
  checkCandidateSupport(candidateId: string, userId: string): Promise<boolean>;
  getCandidateSupporters(candidateId: string): Promise<User[]>;

  // Messages
  getMessages(userId: string): Promise<Message[]>;
  getConversation(userId1: string, userId2: string): Promise<Message[]>;
  sendMessage(message: InsertMessage): Promise<Message>;
  markMessageRead(messageId: string): Promise<void>;
  getConversationsList(userId: string): Promise<any[]>;
  getUnreadMessageCount(userId: string): Promise<number>;
  getUsersForMessaging(): Promise<User[]>;

  // Channels
  getChannels(): Promise<Channel[]>;
  getUserChannels(userId: string): Promise<Channel[]>;
  getChannelById(id: string): Promise<Channel | undefined>;
  createChannel(channel: InsertChannel): Promise<Channel>;
  updateChannel(channelId: string, updateData: Partial<Channel>): Promise<Channel>;
  deleteChannel(channelId: string): Promise<void>;
  getChannelsByGroup(groupId: string): Promise<Channel[]>;
  
  // Channel Members
  joinChannel(channelId: string, userId: string, role?: string): Promise<void>;
  leaveChannel(channelId: string, userId: string): Promise<void>;
  isChannelMember(channelId: string, userId: string): Promise<boolean>;
  getChannelMembers(channelId: string): Promise<ChannelMember[]>;
  updateChannelMemberRole(channelId: string, userId: string, role: string): Promise<void>;
  
  // Channel Messages  
  getChannelMessages(channelId: string, limit?: number, offset?: number): Promise<ChannelMessage[]>;
  sendChannelMessage(message: InsertChannelMessage): Promise<ChannelMessage>;
  editChannelMessage(messageId: string, content: string): Promise<ChannelMessage>;
  deleteChannelMessage(messageId: string): Promise<void>;
  getChannelMessage(messageId: string): Promise<ChannelMessage | undefined>;

  // Representatives
  saveUserAddress(userId: string, address: string): Promise<void>;
  followRepresentative(userId: string, repData: { name: string; office: string; party?: string }): Promise<void>;
  getFollowedRepresentatives(userId: string): Promise<FollowedRepresentative[]>;
  
  // Representatives ChatGPT Integration
  getRepresentativesByZipCode(zipCode: string): Promise<any[]>;
  saveRepresentatives(representatives: any[]): Promise<any[]>;
  markZipCodeAsSearched(zipCode: string, representativeIds: string[]): Promise<void>;
  hasZipCodeBeenSearched(zipCode: string): Promise<boolean>;
  
  // Representative Auto-Refresh System
  getRepresentativeById(id: string): Promise<Representative | undefined>;
  updateRepresentative(id: string, updateData: Partial<Representative>): Promise<Representative>;
  markRepresentativeAsInactive(id: string): Promise<void>;
  refreshRepresentativeIfExpired(id: string): Promise<Representative | null>;

  // Boycotts
  getBoycotts(limit?: number, offset?: number): Promise<Boycott[]>;
  getBoycottById(id: string): Promise<Boycott | undefined>;
  createBoycott(boycott: InsertBoycott): Promise<Boycott>;
  updateBoycott(boycottId: string, updateData: Partial<Boycott>): Promise<Boycott>;
  deleteBoycott(boycottId: string): Promise<void>;
  getUserBoycotts(userId: string): Promise<Boycott[]>;
  getBoycottsByTag(tag: string): Promise<Boycott[]>;
  
  // Boycott Subscriptions
  subscribeToBoycott(boycottId: string, userId: string): Promise<boolean>;
  unsubscribeFromBoycott(boycottId: string, userId: string): Promise<boolean>;
  isSubscribedToBoycott(boycottId: string, userId: string): Promise<boolean>;
  getBoycottSubscribers(boycottId: string): Promise<User[]>;
  getUserBoycottSubscriptions(userId: string): Promise<Boycott[]>;

  // Citizen Initiative System
  // Jurisdictions
  getJurisdictions(): Promise<Jurisdiction[]>;
  getJurisdictionById(id: string): Promise<Jurisdiction | undefined>;
  getJurisdictionByCode(code: string): Promise<Jurisdiction | undefined>;
  createJurisdiction(jurisdiction: InsertJurisdiction): Promise<Jurisdiction>;
  
  // Rulesets
  getRulesetByJurisdiction(jurisdictionId: string): Promise<Ruleset | undefined>;
  createRuleset(ruleset: InsertRuleset): Promise<Ruleset>;
  
  // Initiatives
  getInitiatives(limit?: number, offset?: number, filters?: { status?: string; jurisdictionId?: string }): Promise<Initiative[]>;
  getInitiativeById(id: string): Promise<Initiative | undefined>;
  getInitiativeBySlug(slug: string): Promise<Initiative | undefined>;
  createInitiative(initiative: InsertInitiative): Promise<Initiative>;
  updateInitiative(initiativeId: string, updateData: Partial<Initiative>): Promise<Initiative>;
  deleteInitiative(initiativeId: string): Promise<void>;
  getUserInitiatives(userId: string): Promise<Initiative[]>;
  
  // Initiative Versions
  getInitiativeVersions(initiativeId: string): Promise<InitiativeVersion[]>;
  createInitiativeVersion(version: InsertInitiativeVersion): Promise<InitiativeVersion>;
  getInitiativeVersionById(versionId: string): Promise<InitiativeVersion | undefined>;
  
  // Petitions
  getPetitionsByInitiative(initiativeId: string): Promise<Petition[]>;
  createPetition(petition: InsertPetition): Promise<Petition>;
  getPetitionById(petitionId: string): Promise<Petition | undefined>;
  updatePetitionSignatureCount(petitionId: string, count: number): Promise<void>;
  
  // Signatures
  createSignature(signature: InsertSignature): Promise<Signature>;
  getSignaturesByPetition(petitionId: string, limit?: number, offset?: number): Promise<Signature[]>;
  updateSignatureVerification(signatureId: string, status: string, failureReason?: string): Promise<void>;
  getSignatureById(signatureId: string): Promise<Signature | undefined>;
  checkDuplicateSignature(petitionId: string, emailHash: string): Promise<boolean>;
  
  // Validation Events
  createValidationEvent(event: InsertValidationEvent): Promise<ValidationEvent>;
  getValidationEventsBySignature(signatureId: string): Promise<ValidationEvent[]>;
  
  // Sponsors
  getInitiativeSponsors(initiativeId: string): Promise<Sponsor[]>;
  createSponsor(sponsor: InsertSponsor): Promise<Sponsor>;
  deleteSponsor(sponsorId: string): Promise<void>;
  
  // Audit Logs
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogsByEntity(entityType: string, entityId: string, limit?: number): Promise<AuditLog[]>;

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

  // ACP Cryptocurrency System
  getUserBalance(userId: string): Promise<string>;
  updateUserBalance(userId: string, newBalance: string): Promise<void>;
  createTransaction(transaction: InsertACPTransaction): Promise<ACPTransaction>;
  getTransactionHistory(userId: string, limit?: number): Promise<ACPTransaction[]>;
  createBlockchainBlock(transactions: ACPTransaction[]): Promise<ACPBlock>;
  getLatestBlock(): Promise<ACPBlock | undefined>;
  awardSubscriptionCoins(userId: string, month: Date): Promise<SubscriptionReward>;
  
  // Store and Marketplace
  getStoreItems(category?: string, type?: string): Promise<StoreItem[]>;
  getStoreItemById(id: string): Promise<StoreItem | undefined>;
  createStoreItem(item: InsertStoreItem): Promise<StoreItem>;
  purchaseStoreItem(userId: string, storeItemId: string): Promise<UserPurchase>;
  getUserPurchases(userId: string): Promise<UserPurchase[]>;
  checkUserPurchase(userId: string, storeItemId: string): Promise<boolean>;
  updateSubscriptionStatus(userId: string, status: string, startDate?: Date, endDate?: Date): Promise<void>;
  
  // Charity Management
  getCharities(limit?: number, offset?: number, filters?: { category?: string; isActive?: boolean }): Promise<Charity[]>;
  getCharityById(id: string): Promise<Charity | undefined>;
  createCharity(charity: InsertCharity): Promise<Charity>;
  updateCharity(charityId: string, updateData: Partial<Charity>): Promise<Charity>;
  deleteCharity(charityId: string): Promise<void>;
  getUserCharities(userId: string): Promise<Charity[]>;
  getCharitiesByCategory(category: string): Promise<Charity[]>;
  
  // Charity Donations
  donateToCharity(donation: InsertCharityDonation): Promise<CharityDonation>;
  getCharityDonations(charityId: string): Promise<CharityDonation[]>;
  getUserDonations(userId: string): Promise<CharityDonation[]>;
  updateCharityProgress(charityId: string): Promise<void>;
  getTopDonors(charityId: string, limit?: number): Promise<{ user: User; totalDonated: string; donationCount: number }[]>;
  createDonationPost(userId: string, charityId: string, donationAmount: string, currencyType: string, isAnonymous?: boolean): Promise<Post>;
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

  async getPosts(limit = 20, offset = 0): Promise<PostWithAuthor[]> {
    return await db
      .select({
        id: posts.id,
        authorId: posts.authorId,
        content: posts.content,
        type: posts.type,
        tags: posts.tags,
        image: posts.image,
        likesCount: posts.likesCount,
        commentsCount: posts.commentsCount,
        // News fields
        url: posts.url,
        title: posts.title,
        newsSourceName: posts.newsSourceName,
        // Enhanced engagement fields
        sharesCount: posts.sharesCount,
        emojiReactionsCount: posts.emojiReactionsCount,
        gifReactionsCount: posts.gifReactionsCount,
        bookmarksCount: posts.bookmarksCount,
        flagsCount: posts.flagsCount,
        isDeleted: posts.isDeleted,
        createdAt: posts.createdAt,
        author: {
          username: users.username,
          firstName: users.firstName,
          lastName: users.lastName,
        },
      })
      .from(posts)
      .leftJoin(users, eq(posts.authorId, users.id))
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

  // Feed System Implementation
  async getAllFeed(limit = 20, offset = 0): Promise<PostWithAuthor[]> {
    const decayHours = FEED_CONFIG.all.decayHours;
    const weights = FEED_CONFIG.all.weights;
    
    // Engagement-based ranking with time decay
    return await db
      .select({
        id: posts.id,
        authorId: posts.authorId,
        content: posts.content,
        type: posts.type,
        tags: posts.tags,
        image: posts.image,
        likesCount: posts.likesCount,
        commentsCount: posts.commentsCount,
        url: posts.url,
        title: posts.title,
        newsSourceName: posts.newsSourceName,
        sharesCount: posts.sharesCount,
        emojiReactionsCount: posts.emojiReactionsCount,
        gifReactionsCount: posts.gifReactionsCount,
        bookmarksCount: posts.bookmarksCount,
        flagsCount: posts.flagsCount,
        isDeleted: posts.isDeleted,
        createdAt: posts.createdAt,
        author: {
          username: users.username,
          firstName: users.firstName,
          lastName: users.lastName,
        },
      })
      .from(posts)
      .leftJoin(users, eq(posts.authorId, users.id))
      .where(and(
        eq(posts.isDeleted, false),
        sql`${posts.createdAt} > NOW() - INTERVAL '72 hours'`
      ))
      .orderBy(sql`
        (
          COALESCE(${posts.likesCount}, 0) * ${weights.like.toString()} +
          COALESCE(${posts.commentsCount}, 0) * ${weights.comment.toString()} +
          COALESCE(${posts.sharesCount}, 0) * ${weights.share.toString()} +
          COALESCE(${posts.emojiReactionsCount}, 0) * ${weights.emoji.toString()} +
          COALESCE(${posts.gifReactionsCount}, 0) * ${weights.gif.toString()} +
          COALESCE(${posts.bookmarksCount}, 0) * ${weights.bookmark.toString()} -
          COALESCE(${posts.flagsCount}, 0) * ${weights.flagPenalty.unreviewed.toString()}
        ) * EXP(-EXTRACT(EPOCH FROM (NOW() - ${posts.createdAt})) / 3600.0 / ${decayHours.toString()}) DESC
      `)
      .limit(limit)
      .offset(offset);
  }

  async getFollowingFeed(userId: string, limit = 20, offset = 0): Promise<PostWithAuthor[]> {
    // Chronological posts from followed users
    return await db
      .select({
        id: posts.id,
        authorId: posts.authorId,
        content: posts.content,
        type: posts.type,
        tags: posts.tags,
        image: posts.image,
        likesCount: posts.likesCount,
        commentsCount: posts.commentsCount,
        url: posts.url,
        title: posts.title,
        newsSourceName: posts.newsSourceName,
        sharesCount: posts.sharesCount,
        emojiReactionsCount: posts.emojiReactionsCount,
        gifReactionsCount: posts.gifReactionsCount,
        bookmarksCount: posts.bookmarksCount,
        flagsCount: posts.flagsCount,
        isDeleted: posts.isDeleted,
        createdAt: posts.createdAt,
        author: {
          username: users.username,
          firstName: users.firstName,
          lastName: users.lastName,
        },
      })
      .from(posts)
      .leftJoin(users, eq(posts.authorId, users.id))
      .innerJoin(userFollows, eq(userFollows.followeeId, posts.authorId))
      .where(and(
        eq(userFollows.followerId, userId),
        eq(posts.isDeleted, false)
      ))
      .orderBy(desc(posts.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async getNewsFeed(limit = 20, offset = 0): Promise<PostWithAuthor[]> {
    const { minVotesForConfidence, decayHours } = FEED_CONFIG.news;
    
    // Calculate cutoff timestamp in TypeScript to avoid parameter binding issues
    const cutoffTimestamp = new Date(Date.now() - decayHours * 3600 * 1000);
    
    // News posts ranked by bias score and neutrality with aggregated scoring
    return await db
      .select({
        id: posts.id,
        authorId: posts.authorId,
        content: posts.content,
        type: posts.type,
        tags: posts.tags,
        image: posts.image,
        likesCount: posts.likesCount,
        commentsCount: posts.commentsCount,
        url: posts.url,
        title: posts.title,
        newsSourceName: posts.newsSourceName,
        sharesCount: posts.sharesCount,
        emojiReactionsCount: posts.emojiReactionsCount,
        gifReactionsCount: posts.gifReactionsCount,
        bookmarksCount: posts.bookmarksCount,
        flagsCount: posts.flagsCount,
        isDeleted: posts.isDeleted,
        createdAt: posts.createdAt,
        author: {
          username: users.username,
          firstName: users.firstName,
          lastName: users.lastName,
        },
      })
      .from(posts)
      .leftJoin(users, eq(posts.authorId, users.id))
      .leftJoin(biasVotes, eq(biasVotes.postId, posts.id))
      .where(and(
        eq(posts.type, 'news'),
        eq(posts.isDeleted, false),
        gte(posts.createdAt, cutoffTimestamp)
      ))
      .groupBy(posts.id, users.id)
      .orderBy(sql`
        COUNT(CASE WHEN ${biasVotes.vote} = 'Neutral' THEN 1 END) DESC,
        COUNT(${biasVotes.vote}) DESC,
        ${posts.createdAt} DESC
      `)
      .limit(limit)
      .offset(offset);
  }

  // User Following Methods
  async followUser(followerId: string, followeeId: string): Promise<void> {
    await db.insert(userFollows).values({
      followerId,
      followeeId,
    }).onConflictDoNothing();
  }

  async unfollowUser(followerId: string, followeeId: string): Promise<void> {
    await db.delete(userFollows)
      .where(and(
        eq(userFollows.followerId, followerId),
        eq(userFollows.followeeId, followeeId)
      ));
  }

  async isFollowing(followerId: string, followeeId: string): Promise<boolean> {
    const [result] = await db.select()
      .from(userFollows)
      .where(and(
        eq(userFollows.followerId, followerId),
        eq(userFollows.followeeId, followeeId)
      ))
      .limit(1);
    return !!result;
  }

  async getFollowers(userId: string): Promise<User[]> {
    return await db.select({
      id: users.id,
      username: users.username,
      email: users.email,
      password: users.password,
      role: users.role,
      firstName: users.firstName,
      lastName: users.lastName,
      location: users.location,
      bio: users.bio,
      avatar: users.avatar,
      subscriptionStatus: users.subscriptionStatus,
      subscriptionStartDate: users.subscriptionStartDate,
      subscriptionEndDate: users.subscriptionEndDate,
      stripeCustomerId: users.stripeCustomerId,
      stripeSubscriptionId: users.stripeSubscriptionId,
      acpCoinBalance: users.acpCoinBalance,
      profileBackground: users.profileBackground,
      favoriteSong: users.favoriteSong,
      profileLayout: users.profileLayout,
      createdAt: users.createdAt,
      isNewsOrganization: users.isNewsOrganization,
      organizationName: users.organizationName,
      politicalLean: users.politicalLean,
      trustScore: users.trustScore,
    })
      .from(users)
      .innerJoin(userFollows, eq(userFollows.followerId, users.id))
      .where(eq(userFollows.followeeId, userId));
  }

  async getFollowing(userId: string): Promise<User[]> {
    return await db.select({
      id: users.id,
      username: users.username,
      email: users.email,
      password: users.password,
      role: users.role,
      firstName: users.firstName,
      lastName: users.lastName,
      location: users.location,
      bio: users.bio,
      avatar: users.avatar,
      subscriptionStatus: users.subscriptionStatus,
      subscriptionStartDate: users.subscriptionStartDate,
      subscriptionEndDate: users.subscriptionEndDate,
      stripeCustomerId: users.stripeCustomerId,
      stripeSubscriptionId: users.stripeSubscriptionId,
      acpCoinBalance: users.acpCoinBalance,
      profileBackground: users.profileBackground,
      favoriteSong: users.favoriteSong,
      profileLayout: users.profileLayout,
      createdAt: users.createdAt,
      isNewsOrganization: users.isNewsOrganization,
      organizationName: users.organizationName,
      politicalLean: users.politicalLean,
      trustScore: users.trustScore,
    })
      .from(users)
      .innerJoin(userFollows, eq(userFollows.followeeId, users.id))
      .where(eq(userFollows.followerId, userId));
  }

  // Enhanced Reactions Methods
  async addReaction(userId: string, postId: string, type: string, emoji?: string): Promise<void> {
    await db.transaction(async (tx) => {
      const result = await tx.insert(reactions).values({
        userId,
        postId,
        type,
        emoji,
      }).onConflictDoNothing().returning({ id: reactions.id });
      
      // Only increment counter if reaction was actually inserted
      if (result.length > 0) {
        const field = type === 'emoji' ? 'emojiReactionsCount' : 
                      type === 'gif' ? 'gifReactionsCount' :
                      type === 'share' ? 'sharesCount' : 'bookmarksCount';
        
        await tx.update(posts)
          .set({ [field]: sql`COALESCE(${posts[field]}, 0) + 1` })
          .where(eq(posts.id, postId));
      }
    });
  }

  async removeReaction(userId: string, postId: string, type: string): Promise<void> {
    await db.transaction(async (tx) => {
      const result = await tx.delete(reactions)
        .where(and(
          eq(reactions.userId, userId),
          eq(reactions.postId, postId),
          eq(reactions.type, type)
        )).returning({ id: reactions.id });
      
      // Only decrement counter if reaction was actually deleted
      if (result.length > 0) {
        const field = type === 'emoji' ? 'emojiReactionsCount' : 
                      type === 'gif' ? 'gifReactionsCount' :
                      type === 'share' ? 'sharesCount' : 'bookmarksCount';
        
        await tx.update(posts)
          .set({ [field]: sql`GREATEST(COALESCE(${posts[field]}, 0) - 1, 0)` })
          .where(eq(posts.id, postId));
      }
    });
  }

  async getPostReactions(postId: string): Promise<any[]> {
    return await db.select()
      .from(reactions)
      .where(eq(reactions.postId, postId))
      .orderBy(desc(reactions.createdAt));
  }

  async getUserReaction(userId: string, postId: string, type: string): Promise<boolean> {
    const [result] = await db.select()
      .from(reactions)
      .where(and(
        eq(reactions.userId, userId),
        eq(reactions.postId, postId),
        eq(reactions.type, type)
      ))
      .limit(1);
    return !!result;
  }

  // Bias Voting Methods
  async voteBias(userId: string, postId: string, vote: string): Promise<void> {
    await db.insert(biasVotes).values({
      voterId: userId,
      postId,
      vote,
    }).onConflictDoUpdate({
      target: [biasVotes.voterId, biasVotes.postId],
      set: { vote }
    });
  }

  async removeBiasVote(userId: string, postId: string): Promise<void> {
    await db.delete(biasVotes)
      .where(and(
        eq(biasVotes.voterId, userId),
        eq(biasVotes.postId, postId)
      ));
  }

  async getPostBiasScore(postId: string): Promise<{ neutrality: number; bias: number; confidence: number }> {
    const [result] = await db.select({
      totalVotes: sql<number>`COUNT(*)`,
      neutralVotes: sql<number>`COUNT(*) FILTER (WHERE ${biasVotes.vote} = 'Neutral')`,
      leftVotes: sql<number>`COUNT(*) FILTER (WHERE ${biasVotes.vote} = 'LeftBias')`,
      rightVotes: sql<number>`COUNT(*) FILTER (WHERE ${biasVotes.vote} = 'RightBias')`,
    })
      .from(biasVotes)
      .where(eq(biasVotes.postId, postId));

    if (!result || result.totalVotes === 0) {
      return { neutrality: 0, bias: 0, confidence: 0 };
    }

    const neutrality = result.neutralVotes / result.totalVotes;
    const bias = (result.rightVotes - result.leftVotes) / result.totalVotes;
    const confidence = Math.min(result.totalVotes / 20, 1); // Max confidence at 20+ votes

    return { neutrality, bias, confidence };
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
      throw new Error("You have already voted on this poll");
    }

    // Insert new vote
    await db
      .insert(pollVotes)
      .values({ pollId, userId, optionId });

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

  async closePoll(pollId: string): Promise<void> {
    await db
      .update(polls)
      .set({ isActive: false })
      .where(eq(polls.id, pollId));
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

  async getUserVoteCount(userId: string): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(pollVotes)
      .where(eq(pollVotes.userId, userId));
    return result?.count || 0;
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
      .values({ ...group, memberCount: 1 }) // Initialize with 1 member (creator)
      .returning();

    // Add creator as admin member
    await db
      .insert(groupMembers)
      .values({
        groupId: newGroup.id,
        userId: group.createdBy,
        role: "admin"
      });

    // Automatically create a chat channel for the group
    const [groupChannel] = await db
      .insert(channels)
      .values({
        name: `${newGroup.name} Chat`,
        type: newGroup.isPublic ? "public" : "private",
        groupId: newGroup.id,
        createdBy: group.createdBy,
      })
      .returning();

    // Add creator as channel member
    await db
      .insert(channelMembers)
      .values({
        channelId: groupChannel.id,
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
    // Check if user is already a member
    const existingMembership = await db
      .select()
      .from(groupMembers)
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)));

    if (existingMembership.length > 0) {
      throw new Error("You are already a member of this group");
    }

    // Check if group exists
    const group = await this.getGroupById(groupId);
    if (!group) {
      throw new Error("Group not found");
    }

    // Add user as member
    await db
      .insert(groupMembers)
      .values({ groupId, userId, role: "member" });

    // Auto-create and add user to the group's chat channel
    let groupChannel = await db
      .select()
      .from(channels)
      .where(eq(channels.groupId, groupId))
      .limit(1);

    // If no channel exists for the group, create one
    if (groupChannel.length === 0) {
      const [newChannel] = await db
        .insert(channels)
        .values({
          name: `${group.name.toLowerCase().replace(/\s+/g, '-')}-general`,
          type: group.isPublic ? "public" : "private",
          groupId: groupId,
          createdBy: userId,
        })
        .returning();
      
      groupChannel = [newChannel];
    }

    // Add user to the channel
    if (groupChannel.length > 0) {
      // Check if user is already a channel member
      const existingChannelMembership = await db
        .select()
        .from(channelMembers)
        .where(and(
          eq(channelMembers.channelId, groupChannel[0].id), 
          eq(channelMembers.userId, userId)
        ));

      if (existingChannelMembership.length === 0) {
        await db
          .insert(channelMembers)
          .values({
            channelId: groupChannel[0].id,
            userId,
            role: "member"
          });
      }
    }

    // Get actual member count and update
    const memberCount = await db
      .select({ count: count() })
      .from(groupMembers)
      .where(eq(groupMembers.groupId, groupId));

    await db
      .update(groups)
      .set({ memberCount: memberCount[0].count })
      .where(eq(groups.id, groupId));
  }

  async leaveGroup(groupId: string, userId: string): Promise<void> {
    // Check if user is a member
    const existingMembership = await db
      .select()
      .from(groupMembers)
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)));

    if (existingMembership.length === 0) {
      throw new Error("You are not a member of this group");
    }

    // Check if group exists
    const group = await this.getGroupById(groupId);
    if (!group) {
      throw new Error("Group not found");
    }

    // Prevent group creator from leaving (they can only transfer ownership)
    if (group.createdBy === userId) {
      throw new Error("Group creators cannot leave their own group. Transfer ownership first.");
    }

    // Remove user from group
    const deleteResult = await db
      .delete(groupMembers)
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)));

    // Remove user from the group's chat channel
    const groupChannel = await db
      .select()
      .from(channels)
      .where(eq(channels.groupId, groupId))
      .limit(1);

    if (groupChannel.length > 0) {
      await db
        .delete(channelMembers)
        .where(and(
          eq(channelMembers.channelId, groupChannel[0].id), 
          eq(channelMembers.userId, userId)
        ));
    }

    // Get actual member count and update
    const memberCount = await db
      .select({ count: count() })
      .from(groupMembers)
      .where(eq(groupMembers.groupId, groupId));

    await db
      .update(groups)
      .set({ memberCount: memberCount[0].count })
      .where(eq(groups.id, groupId));
  }

  async isGroupMember(groupId: string, userId: string): Promise<boolean> {
    const membership = await db
      .select()
      .from(groupMembers)
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)));
    
    return membership.length > 0;
  }

  async getGroupMemberCount(groupId: string): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(groupMembers)
      .where(eq(groupMembers.groupId, groupId));
    
    return result[0].count;
  }

  async recalculateGroupMemberCounts(): Promise<void> {
    // Get all groups with their actual member counts
    const groupMemberCounts = await db
      .select({
        groupId: groupMembers.groupId,
        memberCount: count()
      })
      .from(groupMembers)
      .groupBy(groupMembers.groupId);

    // Update each group's member count
    for (const { groupId, memberCount } of groupMemberCounts) {
      await db
        .update(groups)
        .set({ memberCount })
        .where(eq(groups.id, groupId));
    }

    // Set member count to 0 for groups with no members
    await db
      .update(groups)
      .set({ memberCount: 0 })
      .where(sql`${groups.id} NOT IN (SELECT DISTINCT ${groupMembers.groupId} FROM ${groupMembers})`);
  }

  async getCommentsByPost(postId: string): Promise<Comment[]> {
    return await db
      .select()
      .from(comments)
      .where(eq(comments.postId, postId))
      .orderBy(desc(comments.createdAt));
  }

  async getCommentsByPoll(pollId: string): Promise<any[]> {
    return await db
      .select({
        id: comments.id,
        pollId: comments.pollId,
        authorId: comments.authorId,
        content: comments.content,
        createdAt: comments.createdAt,
        author: {
          id: users.id,
          username: users.username,
          firstName: users.firstName,
          lastName: users.lastName,
        }
      })
      .from(comments)
      .innerJoin(users, eq(comments.authorId, users.id))
      .where(eq(comments.pollId, pollId))
      .orderBy(desc(comments.createdAt));
  }

  async createComment(comment: InsertComment): Promise<Comment> {
    const [newComment] = await db
      .insert(comments)
      .values(comment)
      .returning();

    // Update post comment count if it's a post comment
    if (comment.postId) {
      await db
        .update(posts)
        .set({ commentsCount: sql`${posts.commentsCount} + 1` })
        .where(eq(posts.id, comment.postId));
    }

    return newComment;
  }

  async createPollComment(pollId: string, authorId: string, content: string): Promise<Comment> {
    const [newComment] = await db
      .insert(comments)
      .values({ pollId, authorId, content })
      .returning();

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

  async getCandidatesWithUserData(): Promise<any[]> {
    return await db
      .select({
        id: candidates.id,
        userId: candidates.userId,
        position: candidates.position,
        platform: candidates.platform,
        proposals: candidates.proposals,
        endorsements: candidates.endorsements,
        isActive: candidates.isActive,
        createdAt: candidates.createdAt,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(candidates)
      .innerJoin(users, eq(candidates.userId, users.id))
      .where(eq(candidates.isActive, true))
      .orderBy(desc(candidates.endorsements));
  }

  async getCandidateById(id: string): Promise<Candidate | undefined> {
    const [candidate] = await db.select().from(candidates).where(eq(candidates.id, id));
    return candidate || undefined;
  }

  async getCandidateWithUserData(id: string): Promise<any> {
    const [candidate] = await db
      .select({
        id: candidates.id,
        userId: candidates.userId,
        position: candidates.position,
        platform: candidates.platform,
        proposals: candidates.proposals,
        endorsements: candidates.endorsements,
        isActive: candidates.isActive,
        createdAt: candidates.createdAt,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(candidates)
      .innerJoin(users, eq(candidates.userId, users.id))
      .where(eq(candidates.id, id));
    
    return candidate || undefined;
  }

  async createCandidate(candidate: InsertCandidate): Promise<Candidate> {
    const [newCandidate] = await db
      .insert(candidates)
      .values(candidate)
      .returning();
    return newCandidate;
  }

  async supportCandidate(candidateId: string, userId: string): Promise<boolean> {
    try {
      // Check if support already exists
      const existingSupport = await this.checkCandidateSupport(candidateId, userId);
      if (existingSupport) {
        return false; // Already supporting
      }

      // Add support record
      await db.insert(candidateSupports).values({
        candidateId,
        userId,
      });

      // Increment endorsement count
      await db
        .update(candidates)
        .set({ 
          endorsements: sql`${candidates.endorsements} + 1`
        })
        .where(eq(candidates.id, candidateId));

      return true;
    } catch (error: any) {
      // Handle duplicate support attempt
      if (error.code === '23505' || error.message.includes('duplicate key')) {
        return false;
      }
      throw error;
    }
  }

  async unsupportCandidate(candidateId: string, userId: string): Promise<boolean> {
    // Check if support exists
    const existingSupport = await this.checkCandidateSupport(candidateId, userId);
    if (!existingSupport) {
      return false; // Not supporting
    }

    // Remove support record
    await db
      .delete(candidateSupports)
      .where(and(
        eq(candidateSupports.candidateId, candidateId),
        eq(candidateSupports.userId, userId)
      ));

    // Decrement endorsement count
    await db
      .update(candidates)
      .set({ 
        endorsements: sql`${candidates.endorsements} - 1`
      })
      .where(eq(candidates.id, candidateId));

    return true;
  }

  async checkCandidateSupport(candidateId: string, userId: string): Promise<boolean> {
    const [support] = await db
      .select()
      .from(candidateSupports)
      .where(and(
        eq(candidateSupports.candidateId, candidateId),
        eq(candidateSupports.userId, userId)
      ));
    
    return !!support;
  }

  async getCandidateSupporters(candidateId: string): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .innerJoin(candidateSupports, eq(users.id, candidateSupports.userId))
      .where(eq(candidateSupports.candidateId, candidateId))
      .orderBy(desc(candidateSupports.createdAt))
      .then(results => results.map(result => result.users));
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

  async getConversationsList(userId: string): Promise<any[]> {
    // Get latest message for each conversation
    const conversations = await db
      .select({
        partnerId: sql<string>`CASE 
          WHEN ${messages.senderId} = ${userId} THEN ${messages.recipientId}
          ELSE ${messages.senderId}
        END`,
        lastMessageId: messages.id,
        lastMessageContent: messages.content,
        lastMessageTime: messages.createdAt,
        isRead: messages.isRead,
        lastSenderId: messages.senderId
      })
      .from(messages)
      .where(or(eq(messages.senderId, userId), eq(messages.recipientId, userId)))
      .orderBy(desc(messages.createdAt));

    // Group by partner and get latest message for each conversation
    const conversationMap = new Map();
    
    conversations.forEach(conv => {
      if (!conversationMap.has(conv.partnerId)) {
        conversationMap.set(conv.partnerId, conv);
      }
    });

    // Get user details for each conversation partner
    const partnerIds = Array.from(conversationMap.keys());
    if (partnerIds.length === 0) return [];

    const partners = await db
      .select({
        id: users.id,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName
      })
      .from(users)
      .where(inArray(users.id, partnerIds));

    // Combine conversation data with partner details
    return Array.from(conversationMap.values()).map(conv => {
      const partner = partners.find(p => p.id === conv.partnerId);
      return {
        ...conv,
        partner
      };
    }).sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime());
  }

  async getUnreadMessageCount(userId: string): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(messages)
      .where(and(eq(messages.recipientId, userId), eq(messages.isRead, false)));
    
    return result[0].count;
  }

  async getUsersForMessaging(): Promise<User[]> {
    return await db
      .select({
        id: users.id,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName
      })
      .from(users)
      .orderBy(users.username);
  }

  // Channels
  async getChannels(): Promise<Channel[]> {
    return await db
      .select()
      .from(channels)
      .where(eq(channels.isArchived, false))
      .orderBy(desc(channels.lastMessageAt), desc(channels.createdAt));
  }

  async getUserChannels(userId: string): Promise<Channel[]> {
    return await db
      .select({
        id: channels.id,
        name: channels.name,
        description: channels.description,
        type: channels.type,
        groupId: channels.groupId,
        createdBy: channels.createdBy,
        memberCount: channels.memberCount,
        lastMessageAt: channels.lastMessageAt,
        isArchived: channels.isArchived,
        createdAt: channels.createdAt,
      })
      .from(channels)
      .innerJoin(channelMembers, eq(channelMembers.channelId, channels.id))
      .where(and(eq(channelMembers.userId, userId), eq(channels.isArchived, false)))
      .orderBy(desc(channels.lastMessageAt), desc(channels.createdAt));
  }

  async getChannelById(id: string): Promise<Channel | undefined> {
    const [channel] = await db
      .select()
      .from(channels)
      .where(eq(channels.id, id));
    return channel;
  }

  async createChannel(channel: InsertChannel): Promise<Channel> {
    const [newChannel] = await db
      .insert(channels)
      .values(channel)
      .returning();
    
    // Add creator as admin
    await db
      .insert(channelMembers)
      .values({
        channelId: newChannel.id,
        userId: newChannel.createdBy,
        role: "admin"
      });

    // Update member count
    await db
      .update(channels)
      .set({ memberCount: 1 })
      .where(eq(channels.id, newChannel.id));

    return newChannel;
  }

  async updateChannel(channelId: string, updateData: Partial<Channel>): Promise<Channel> {
    const [updatedChannel] = await db
      .update(channels)
      .set(updateData)
      .where(eq(channels.id, channelId))
      .returning();
    return updatedChannel;
  }

  async deleteChannel(channelId: string): Promise<void> {
    // Delete channel messages first
    await db.delete(channelMessages).where(eq(channelMessages.channelId, channelId));
    // Delete channel members
    await db.delete(channelMembers).where(eq(channelMembers.channelId, channelId));
    // Delete channel
    await db.delete(channels).where(eq(channels.id, channelId));
  }

  async getChannelsByGroup(groupId: string): Promise<Channel[]> {
    return await db
      .select()
      .from(channels)
      .where(and(eq(channels.groupId, groupId), eq(channels.isArchived, false)))
      .orderBy(desc(channels.createdAt));
  }

  // Channel Members
  async joinChannel(channelId: string, userId: string, role: string = "member"): Promise<void> {
    // Check if already a member
    const existingMember = await db
      .select()
      .from(channelMembers)
      .where(and(eq(channelMembers.channelId, channelId), eq(channelMembers.userId, userId)));

    if (existingMember.length === 0) {
      await db
        .insert(channelMembers)
        .values({ channelId, userId, role });

      // Update member count
      await db
        .update(channels)
        .set({ memberCount: sql`${channels.memberCount} + 1` })
        .where(eq(channels.id, channelId));
    }
  }

  async leaveChannel(channelId: string, userId: string): Promise<void> {
    const deletedMembers = await db
      .delete(channelMembers)
      .where(and(eq(channelMembers.channelId, channelId), eq(channelMembers.userId, userId)))
      .returning();

    if (deletedMembers.length > 0) {
      // Update member count
      await db
        .update(channels)
        .set({ memberCount: sql`${channels.memberCount} - 1` })
        .where(eq(channels.id, channelId));
    }
  }

  async isChannelMember(channelId: string, userId: string): Promise<boolean> {
    const [member] = await db
      .select()
      .from(channelMembers)
      .where(and(eq(channelMembers.channelId, channelId), eq(channelMembers.userId, userId)));
    return !!member;
  }

  async getChannelMembers(channelId: string): Promise<ChannelMember[]> {
    return await db
      .select()
      .from(channelMembers)
      .where(eq(channelMembers.channelId, channelId))
      .orderBy(channelMembers.joinedAt);
  }

  async updateChannelMemberRole(channelId: string, userId: string, role: string): Promise<void> {
    await db
      .update(channelMembers)
      .set({ role })
      .where(and(eq(channelMembers.channelId, channelId), eq(channelMembers.userId, userId)));
  }

  // Channel Messages
  async getChannelMessages(channelId: string, limit: number = 50, offset: number = 0): Promise<ChannelMessage[]> {
    return await db
      .select()
      .from(channelMessages)
      .where(eq(channelMessages.channelId, channelId))
      .orderBy(desc(channelMessages.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async sendChannelMessage(message: InsertChannelMessage): Promise<ChannelMessage> {
    const [newMessage] = await db
      .insert(channelMessages)
      .values(message)
      .returning();

    // Update channel's last message time
    await db
      .update(channels)
      .set({ lastMessageAt: new Date() })
      .where(eq(channels.id, message.channelId));

    return newMessage;
  }

  async editChannelMessage(messageId: string, content: string): Promise<ChannelMessage> {
    const [editedMessage] = await db
      .update(channelMessages)
      .set({ 
        content, 
        isEdited: true, 
        editedAt: new Date() 
      })
      .where(eq(channelMessages.id, messageId))
      .returning();
    return editedMessage;
  }

  async deleteChannelMessage(messageId: string): Promise<void> {
    await db
      .delete(channelMessages)
      .where(eq(channelMessages.id, messageId));
  }

  async getChannelMessage(messageId: string): Promise<ChannelMessage | undefined> {
    const [message] = await db
      .select()
      .from(channelMessages)
      .where(eq(channelMessages.id, messageId));
    return message;
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

  // Representatives ChatGPT Integration Methods
  async getRepresentativesByZipCode(zipCode: string): Promise<Representative[]> {
    const lookup = await db
      .select()
      .from(zipCodeLookups)
      .where(eq(zipCodeLookups.zipCode, zipCode));

    if (lookup.length === 0) {
      return [];
    }

    const representativeIds = lookup[0].representativeIds;
    if (!representativeIds || representativeIds.length === 0) {
      return [];
    }

    return await db
      .select()
      .from(representatives)
      .where(inArray(representatives.id, representativeIds))
      .orderBy(representatives.level, representatives.office);
  }

  async saveRepresentatives(repData: InsertRepresentative[]): Promise<Representative[]> {
    if (repData.length === 0) {
      return [];
    }

    const saved = await db
      .insert(representatives)
      .values(repData)
      .returning();

    return saved;
  }

  async markZipCodeAsSearched(zipCode: string, representativeIds: string[]): Promise<void> {
    // Check if zip code already exists
    const existing = await db
      .select()
      .from(zipCodeLookups)
      .where(eq(zipCodeLookups.zipCode, zipCode));

    if (existing.length > 0) {
      // Update existing record
      await db
        .update(zipCodeLookups)
        .set({
          representativeIds,
          searchedAt: new Date(),
        })
        .where(eq(zipCodeLookups.zipCode, zipCode));
    } else {
      // Create new record
      await db
        .insert(zipCodeLookups)
        .values({
          zipCode,
          representativeIds,
        });
    }
  }

  async hasZipCodeBeenSearched(zipCode: string): Promise<boolean> {
    const lookup = await db
      .select()
      .from(zipCodeLookups)
      .where(eq(zipCodeLookups.zipCode, zipCode));
    
    return lookup.length > 0;
  }

  // Representative Auto-Refresh System Methods
  async getRepresentativeById(id: string): Promise<Representative | undefined> {
    const [representative] = await db
      .select()
      .from(representatives)
      .where(eq(representatives.id, id));
    return representative || undefined;
  }

  async updateRepresentative(id: string, updateData: Partial<Representative>): Promise<Representative> {
    const [updated] = await db
      .update(representatives)
      .set({
        ...updateData,
        updatedAt: new Date(),
        lastVerified: new Date(),
      })
      .where(eq(representatives.id, id))
      .returning();
    return updated;
  }

  async markRepresentativeAsInactive(id: string): Promise<void> {
    await db
      .update(representatives)
      .set({ 
        isCurrentlyServing: false,
        updatedAt: new Date(),
      })
      .where(eq(representatives.id, id));
  }

  async refreshRepresentativeIfExpired(id: string): Promise<Representative | null> {
    const representative = await this.getRepresentativeById(id);
    if (!representative) {
      return null;
    }

    // Import the helper functions from openai.ts
    const { hasTermExpired, findCurrentOfficeholder } = await import('./openai');
    
    // Check if term has expired
    if (!hasTermExpired(representative)) {
      return representative; // Still current, return as-is
    }

    console.log(`Representative ${representative.name} (${representative.office}) term has expired, checking for replacement...`);

    try {
      // Query ChatGPT for current officeholder
      const currentOfficeholder = await findCurrentOfficeholder(
        representative.office,
        representative.district || undefined,
        representative.state || undefined
      );

      if (!currentOfficeholder) {
        console.log(`No current officeholder found for ${representative.office}`);
        // Mark as inactive if no replacement found
        await this.markRepresentativeAsInactive(id);
        return representative;
      }

      // Check if it's the same person (name match)
      if (currentOfficeholder.name.toLowerCase() === representative.name.toLowerCase()) {
        console.log(`Same person ${representative.name} still in office, updating term dates`);
        // Same person, just update term dates and verification
        return await this.updateRepresentative(id, {
          termStart: currentOfficeholder.termStart,
          termEnd: currentOfficeholder.termEnd,
          termLength: currentOfficeholder.termLength,
          electedDate: currentOfficeholder.electedDate,
          party: currentOfficeholder.party,
          phone: currentOfficeholder.phone,
          email: currentOfficeholder.email,
          website: currentOfficeholder.website,
          verificationSource: "chatgpt",
        });
      } else {
        console.log(`New person ${currentOfficeholder.name} replaced ${representative.name}`);
        // Different person, mark old as inactive and create new representative
        await this.markRepresentativeAsInactive(id);
        
        // Create new representative with same zip codes
        const newRepresentative = await this.saveRepresentatives([{
          ...currentOfficeholder,
          zipCodes: representative.zipCodes, // Inherit zip codes
        }]);
        
        return newRepresentative[0] || null;
      }
    } catch (error) {
      console.error('Error refreshing representative:', error);
      return representative; // Return original on error
    }
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
        query = query.where(and(...conditions)) as typeof query;
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

  // ACP Cryptocurrency System Implementation
  async getUserBalance(userId: string): Promise<string> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    return user?.acpCoinBalance || "0.00000000";
  }

  async updateUserBalance(userId: string, newBalance: string): Promise<void> {
    await db.update(users)
      .set({ acpCoinBalance: newBalance })
      .where(eq(users.id, userId));
  }

  async createTransaction(transaction: InsertACPTransaction): Promise<ACPTransaction> {
    const [created] = await db.insert(acpTransactions).values(transaction).returning();
    return created;
  }

  async getTransactionHistory(userId: string, limit = 50): Promise<ACPTransaction[]> {
    return await db.select()
      .from(acpTransactions)
      .where(or(eq(acpTransactions.fromUserId, userId), eq(acpTransactions.toUserId, userId)))
      .orderBy(desc(acpTransactions.createdAt))
      .limit(limit);
  }

  async createBlockchainBlock(transactions: ACPTransaction[]): Promise<ACPBlock> {
    const latestBlock = await this.getLatestBlock();
    const blockNumber = (latestBlock?.blockNumber || 0) + 1;
    
    // Simple blockchain implementation
    const transactionIds = transactions.map(t => t.id);
    const merkleRoot = this.calculateMerkleRoot(transactionIds);
    const previousHash = latestBlock?.hash || "0";
    const timestamp = new Date();
    const nonce = Math.random().toString(36);
    const blockData = `${blockNumber}${previousHash}${merkleRoot}${timestamp.toISOString()}${nonce}`;
    const hash = await this.calculateHash(blockData);

    const blockData_final = {
      blockNumber,
      previousHash,
      merkleRoot,
      timestamp,
      nonce,
      hash,
      transactionIds
    };

    const [block] = await db.insert(acpBlocks).values(blockData_final).returning();
    
    // Update transactions with block info
    await db.update(acpTransactions)
      .set({ 
        blockNumber,
        blockchainHash: hash,
        status: "confirmed"
      })
      .where(inArray(acpTransactions.id, transactionIds));

    return block;
  }

  async getLatestBlock(): Promise<ACPBlock | undefined> {
    const [block] = await db.select()
      .from(acpBlocks)
      .orderBy(desc(acpBlocks.blockNumber))
      .limit(1);
    return block;
  }

  async awardSubscriptionCoins(userId: string, month: Date): Promise<SubscriptionReward> {
    // Check if already awarded for this month
    const existingReward = await db.select()
      .from(subscriptionRewards)
      .where(and(
        eq(subscriptionRewards.userId, userId),
        eq(subscriptionRewards.subscriptionMonth, month)
      ))
      .limit(1);

    if (existingReward.length > 0) {
      return existingReward[0];
    }

    // Create transaction for coin reward
    const transaction = await this.createTransaction({
      toUserId: userId,
      amount: "9.00000000",
      transactionType: "subscription_reward",
      description: `Monthly ACP+ subscription reward for ${month.toISOString().split('T')[0]}`,
    });

    // Update user balance
    const currentBalance = await this.getUserBalance(userId);
    const newBalance = (parseFloat(currentBalance) + 9).toFixed(8);
    await this.updateUserBalance(userId, newBalance);

    // Record subscription reward
    const [reward] = await db.insert(subscriptionRewards).values({
      userId,
      subscriptionMonth: month,
      coinsAwarded: "9.00000000",
      transactionId: transaction.id
    }).returning();

    return reward;
  }

  // Store and Marketplace Implementation
  async getStoreItems(category?: string, type?: string): Promise<StoreItem[]> {
    let query = db.select().from(storeItems);
    
    if (category) {
      query = query.where(eq(storeItems.category, category)) as any;
    }
    if (type) {
      query = query.where(eq(storeItems.type, type)) as any;
    }

    return await query.orderBy(desc(storeItems.createdAt));
  }

  async getStoreItemById(id: string): Promise<StoreItem | undefined> {
    const [item] = await db.select().from(storeItems).where(eq(storeItems.id, id));
    return item;
  }

  async createStoreItem(item: InsertStoreItem): Promise<StoreItem> {
    const [created] = await db.insert(storeItems).values(item).returning();
    return created;
  }

  async purchaseStoreItem(userId: string, storeItemId: string): Promise<UserPurchase> {
    const storeItem = await this.getStoreItemById(storeItemId);
    if (!storeItem) throw new Error("Store item not found");

    const userBalance = await this.getUserBalance(userId);
    const itemPrice = parseFloat(storeItem.price);
    
    if (parseFloat(userBalance) < itemPrice) {
      throw new Error("Insufficient ACP coins");
    }

    // Check if already purchased
    const existingPurchase = await db.select()
      .from(userPurchases)
      .where(and(
        eq(userPurchases.userId, userId),
        eq(userPurchases.itemId, storeItemId)
      ))
      .limit(1);

    if (existingPurchase.length > 0) {
      throw new Error("Item already purchased");
    }

    // Create purchase transaction
    const transaction = await this.createTransaction({
      fromUserId: userId,
      toUserId: storeItem.creatorId,
      amount: storeItem.price,
      transactionType: "purchase",
      description: `Purchase: ${storeItem.name}`,
      relatedItemId: storeItemId
    });

    // Update balances
    const newUserBalance = (parseFloat(userBalance) - itemPrice).toFixed(8);
    await this.updateUserBalance(userId, newUserBalance);

    if (storeItem.creatorId) {
      const creatorBalance = await this.getUserBalance(storeItem.creatorId);
      const newCreatorBalance = (parseFloat(creatorBalance) + itemPrice).toFixed(8);
      await this.updateUserBalance(storeItem.creatorId, newCreatorBalance);
    }

    // Record purchase
    const [purchase] = await db.insert(userPurchases).values({
      userId,
      itemId: storeItemId,
      purchasePrice: storeItem.price
    }).returning();

    // Update download count
    await db.update(storeItems)
      .set({ downloadCount: sql`${storeItems.downloadCount} + 1` })
      .where(eq(storeItems.id, storeItemId));

    return purchase;
  }

  async getUserPurchases(userId: string): Promise<UserPurchase[]> {
    return await db.select()
      .from(userPurchases)
      .where(eq(userPurchases.userId, userId))
      .orderBy(desc(userPurchases.purchasedAt));
  }

  async checkUserPurchase(userId: string, storeItemId: string): Promise<boolean> {
    const [purchase] = await db.select()
      .from(userPurchases)
      .where(and(
        eq(userPurchases.userId, userId),
        eq(userPurchases.itemId, storeItemId)
      ))
      .limit(1);
    return !!purchase;
  }

  async updateSubscriptionStatus(userId: string, status: string, startDate?: Date, endDate?: Date): Promise<void> {
    const updateData: any = { subscriptionStatus: status };
    if (startDate) updateData.subscriptionStartDate = startDate;
    if (endDate) updateData.subscriptionEndDate = endDate;

    await db.update(users).set(updateData).where(eq(users.id, userId));
  }

  // Charity Management Methods
  async getCharities(limit: number = 50, offset: number = 0, filters?: { category?: string; isActive?: boolean }): Promise<Charity[]> {
    let query = db.select().from(charities);

    if (filters?.category) {
      query = query.where(eq(charities.category, filters.category));
    }
    if (filters?.isActive !== undefined) {
      query = query.where(eq(charities.isActive, filters.isActive));
    }

    return await query
      .orderBy(desc(charities.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async getCharityById(id: string): Promise<Charity | undefined> {
    const [charity] = await db.select().from(charities).where(eq(charities.id, id));
    return charity || undefined;
  }

  async createCharity(insertCharity: InsertCharity): Promise<Charity> {
    const [charity] = await db
      .insert(charities)
      .values(insertCharity)
      .returning();
    return charity;
  }

  async updateCharity(charityId: string, updateData: Partial<Charity>): Promise<Charity> {
    const [charity] = await db
      .update(charities)
      .set(updateData)
      .where(eq(charities.id, charityId))
      .returning();
    return charity;
  }

  async deleteCharity(charityId: string): Promise<void> {
    await db.delete(charities).where(eq(charities.id, charityId));
  }

  async getUserCharities(userId: string): Promise<Charity[]> {
    return await db
      .select()
      .from(charities)
      .where(eq(charities.creatorId, userId))
      .orderBy(desc(charities.createdAt));
  }

  async getCharitiesByCategory(category: string): Promise<Charity[]> {
    return await db
      .select()
      .from(charities)
      .where(and(eq(charities.category, category), eq(charities.isActive, true)))
      .orderBy(desc(charities.createdAt));
  }

  // Charity Donations Methods
  async donateToCharity(insertDonation: InsertCharityDonation): Promise<CharityDonation> {
    // Create the donation record
    const [donation] = await db
      .insert(charityDonations)
      .values(insertDonation)
      .returning();

    // Update charity progress
    await this.updateCharityProgress(insertDonation.charityId);

    return donation;
  }

  async getCharityDonations(charityId: string): Promise<CharityDonation[]> {
    return await db
      .select()
      .from(charityDonations)
      .where(eq(charityDonations.charityId, charityId))
      .orderBy(desc(charityDonations.createdAt));
  }

  async getUserDonations(userId: string): Promise<CharityDonation[]> {
    return await db
      .select()
      .from(charityDonations)
      .where(eq(charityDonations.userId, userId))
      .orderBy(desc(charityDonations.createdAt));
  }

  async updateCharityProgress(charityId: string): Promise<void> {
    // Calculate total raised amounts in both USD and ACP coins
    const donations = await db
      .select()
      .from(charityDonations)
      .where(and(
        eq(charityDonations.charityId, charityId),
        eq(charityDonations.status, "completed")
      ));

    let totalUSD = 0;
    let totalACPCoins = 0;
    const uniqueDonors = new Set<string>();

    donations.forEach(donation => {
      uniqueDonors.add(donation.userId);
      
      if (donation.currencyType === "usd") {
        totalUSD += parseFloat(donation.amount);
      } else if (donation.currencyType === "acp_coin") {
        totalACPCoins += parseFloat(donation.amount);
      }
    });

    // Update charity with calculated totals
    await db
      .update(charities)
      .set({
        raisedAmount: totalUSD.toFixed(2),
        acpCoinRaised: totalACPCoins.toFixed(8),
        donorCount: uniqueDonors.size
      })
      .where(eq(charities.id, charityId));
  }

  async getTopDonors(charityId: string, limit: number = 10): Promise<{ user: User; totalDonated: string; donationCount: number }[]> {
    const donorStats = await db
      .select({
        userId: charityDonations.userId,
        totalDonated: sql<string>`SUM(CASE WHEN ${charityDonations.currencyType} = 'usd' THEN ${charityDonations.amount}::numeric ELSE 0 END)`.as('totalDonated'),
        donationCount: sql<number>`COUNT(*)`.as('donationCount')
      })
      .from(charityDonations)
      .where(and(
        eq(charityDonations.charityId, charityId),
        eq(charityDonations.status, "completed"),
        eq(charityDonations.isAnonymous, false)
      ))
      .groupBy(charityDonations.userId)
      .orderBy(sql`totalDonated DESC`)
      .limit(limit);

    // Get user details for each donor
    const results = [];
    for (const stat of donorStats) {
      const user = await this.getUser(stat.userId);
      if (user) {
        results.push({
          user,
          totalDonated: stat.totalDonated || "0",
          donationCount: stat.donationCount
        });
      }
    }

    return results;
  }

  async createDonationPost(userId: string, charityId: string, donationAmount: string, currencyType: string, isAnonymous: boolean = false): Promise<Post> {
    // Get charity details
    const charity = await this.getCharityById(charityId);
    if (!charity) {
      throw new Error("Charity not found");
    }

    // Create donation announcement post
    const content = isAnonymous 
      ? `An anonymous donor contributed ${donationAmount} ${currencyType.toUpperCase()} to ${charity.name}! 🎯💚`
      : `I just donated ${donationAmount} ${currencyType.toUpperCase()} to ${charity.name}! Join me in supporting this cause. 🎯💚`;

    const [post] = await db
      .insert(posts)
      .values({
        authorId: userId,
        content,
        type: "charity_donation",
        tags: ["charity", "donation", charity.category],
        image: charity.image
      })
      .returning();

    return post;
  }

  // Blockchain utility methods
  private calculateMerkleRoot(transactionIds: string[]): string {
    if (transactionIds.length === 0) return "0";
    if (transactionIds.length === 1) return transactionIds[0];
    
    // Simple merkle root calculation
    return transactionIds.join('').slice(0, 64);
  }

  private async calculateHash(data: string): Promise<string> {
    // Simple hash implementation using crypto
    const crypto = await import('crypto');
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  // Boycott Methods
  async getBoycotts(limit = 50, offset = 0): Promise<Boycott[]> {
    return await db
      .select()
      .from(boycotts)
      .where(eq(boycotts.isActive, true))
      .orderBy(desc(boycotts.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async getBoycottById(id: string): Promise<Boycott | undefined> {
    const [boycott] = await db.select().from(boycotts).where(eq(boycotts.id, id));
    return boycott || undefined;
  }

  async createBoycott(boycottData: InsertBoycott): Promise<Boycott> {
    const [newBoycott] = await db
      .insert(boycotts)
      .values(boycottData)
      .returning();

    // Create associated group for discussion
    if (newBoycott.creatorId) {
      try {
        const group = await this.createGroup({
          name: `Boycott: ${newBoycott.title}`,
          description: `Discussion group for the ${newBoycott.targetCompany} boycott`,
          category: "boycott",
          creatorId: newBoycott.creatorId,
          isPublic: true,
        });

        // Create associated channel for messaging
        const channel = await this.createChannel({
          name: `${newBoycott.title} Chat`,
          description: `Chat channel for boycott organizers`,
          type: "text",
          groupId: group.id,
          creatorId: newBoycott.creatorId,
          isPublic: true,
        });

        // Update boycott with group and channel IDs
        await this.updateBoycott(newBoycott.id, {
          groupId: group.id,
          channelId: channel.id,
        });

        // Join creator to the group and channel
        await this.joinGroup(group.id, newBoycott.creatorId);
        await this.joinChannel(channel.id, newBoycott.creatorId, "admin");
        
      } catch (error) {
        console.error("Error creating boycott group/channel:", error);
      }
    }

    return newBoycott;
  }

  async updateBoycott(boycottId: string, updateData: Partial<Boycott>): Promise<Boycott> {
    const [updatedBoycott] = await db
      .update(boycotts)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(boycotts.id, boycottId))
      .returning();
    return updatedBoycott;
  }

  async deleteBoycott(boycottId: string): Promise<void> {
    await db.delete(boycotts).where(eq(boycotts.id, boycottId));
  }

  async getUserBoycotts(userId: string): Promise<Boycott[]> {
    return await db
      .select()
      .from(boycotts)
      .where(eq(boycotts.creatorId, userId))
      .orderBy(desc(boycotts.createdAt));
  }

  async getBoycottsByTag(tag: string): Promise<Boycott[]> {
    return await db
      .select()
      .from(boycotts)
      .where(and(
        eq(boycotts.isActive, true),
        sql`${boycotts.tags} @> ${JSON.stringify([tag])}`
      ))
      .orderBy(desc(boycotts.createdAt));
  }

  // Boycott Subscription Methods
  async subscribeToBoycott(boycottId: string, userId: string): Promise<boolean> {
    try {
      // Check if already subscribed
      const existing = await db
        .select()
        .from(boycottSubscriptions)
        .where(and(
          eq(boycottSubscriptions.boycottId, boycottId),
          eq(boycottSubscriptions.userId, userId),
          eq(boycottSubscriptions.isActive, true)
        ));

      if (existing.length > 0) {
        return false; // Already subscribed
      }

      // Add subscription
      await db
        .insert(boycottSubscriptions)
        .values({
          boycottId,
          userId,
        });

      // Update subscriber count
      await db
        .update(boycotts)
        .set({
          subscriberCount: sql`${boycotts.subscriberCount} + 1`
        })
        .where(eq(boycotts.id, boycottId));

      // Join user to the boycott's group and channel
      const boycott = await this.getBoycottById(boycottId);
      if (boycott) {
        if (boycott.groupId) {
          await this.joinGroup(boycott.groupId, userId).catch(console.error);
        }
        if (boycott.channelId) {
          await this.joinChannel(boycott.channelId, userId).catch(console.error);
        }
      }

      return true;
    } catch (error) {
      console.error("Error subscribing to boycott:", error);
      return false;
    }
  }

  async unsubscribeFromBoycott(boycottId: string, userId: string): Promise<boolean> {
    try {
      // Mark subscription as inactive
      const result = await db
        .update(boycottSubscriptions)
        .set({ isActive: false })
        .where(and(
          eq(boycottSubscriptions.boycottId, boycottId),
          eq(boycottSubscriptions.userId, userId),
          eq(boycottSubscriptions.isActive, true)
        ))
        .returning();

      if (result.length === 0) {
        return false; // Not subscribed
      }

      // Update subscriber count
      await db
        .update(boycotts)
        .set({
          subscriberCount: sql`GREATEST(${boycotts.subscriberCount} - 1, 0)`
        })
        .where(eq(boycotts.id, boycottId));

      // Leave associated group and channel
      const boycott = await this.getBoycottById(boycottId);
      if (boycott) {
        if (boycott.groupId) {
          await this.leaveGroup(boycott.groupId, userId).catch(console.error);
        }
        if (boycott.channelId) {
          await this.leaveChannel(boycott.channelId, userId).catch(console.error);
        }
      }

      return true;
    } catch (error) {
      console.error("Error unsubscribing from boycott:", error);
      return false;
    }
  }

  async isSubscribedToBoycott(boycottId: string, userId: string): Promise<boolean> {
    const subscription = await db
      .select()
      .from(boycottSubscriptions)
      .where(and(
        eq(boycottSubscriptions.boycottId, boycottId),
        eq(boycottSubscriptions.userId, userId),
        eq(boycottSubscriptions.isActive, true)
      ));

    return subscription.length > 0;
  }

  async getBoycottSubscribers(boycottId: string): Promise<User[]> {
    const subscribers = await db
      .select({
        id: users.id,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        avatar: users.avatar,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(boycottSubscriptions)
      .innerJoin(users, eq(boycottSubscriptions.userId, users.id))
      .where(and(
        eq(boycottSubscriptions.boycottId, boycottId),
        eq(boycottSubscriptions.isActive, true)
      ))
      .orderBy(desc(boycottSubscriptions.subscribedAt));

    return subscribers.map(subscriber => ({
      ...subscriber,
      password: "", // Never return password
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      acpBalance: null,
    }));
  }

  async getUserBoycottSubscriptions(userId: string): Promise<Boycott[]> {
    return await db
      .select({
        id: boycotts.id,
        title: boycotts.title,
        reason: boycotts.reason,
        targetCompany: boycotts.targetCompany,
        targetProduct: boycotts.targetProduct,
        alternativeProduct: boycotts.alternativeProduct,
        alternativeCompany: boycotts.alternativeCompany,
        image: boycotts.image,
        creatorId: boycotts.creatorId,
        groupId: boycotts.groupId,
        channelId: boycotts.channelId,
        subscriberCount: boycotts.subscriberCount,
        isActive: boycotts.isActive,
        tags: boycotts.tags,
        createdAt: boycotts.createdAt,
        updatedAt: boycotts.updatedAt,
      })
      .from(boycottSubscriptions)
      .innerJoin(boycotts, eq(boycottSubscriptions.boycottId, boycotts.id))
      .where(and(
        eq(boycottSubscriptions.userId, userId),
        eq(boycottSubscriptions.isActive, true),
        eq(boycotts.isActive, true)
      ))
      .orderBy(desc(boycottSubscriptions.subscribedAt));
  }

  // Citizen Initiative System Implementation
  // Jurisdictions
  async getJurisdictions(): Promise<Jurisdiction[]> {
    return await db
      .select()
      .from(jurisdictions)
      .where(eq(jurisdictions.active, true))
      .orderBy(jurisdictions.name);
  }

  async getJurisdictionById(id: string): Promise<Jurisdiction | undefined> {
    const [jurisdiction] = await db.select().from(jurisdictions).where(eq(jurisdictions.id, id));
    return jurisdiction || undefined;
  }

  async getJurisdictionByCode(code: string): Promise<Jurisdiction | undefined> {
    const [jurisdiction] = await db.select().from(jurisdictions).where(eq(jurisdictions.code, code));
    return jurisdiction || undefined;
  }

  async createJurisdiction(jurisdictionData: InsertJurisdiction): Promise<Jurisdiction> {
    const [jurisdiction] = await db
      .insert(jurisdictions)
      .values(jurisdictionData)
      .returning();
    return jurisdiction;
  }

  // Rulesets
  async getRulesetByJurisdiction(jurisdictionId: string): Promise<Ruleset | undefined> {
    const [ruleset] = await db
      .select()
      .from(rulesets)
      .where(and(
        eq(rulesets.jurisdictionId, jurisdictionId),
        eq(rulesets.effectiveTo, null)
      ))
      .orderBy(desc(rulesets.effectiveFrom))
      .limit(1);
    return ruleset || undefined;
  }

  async createRuleset(rulesetData: InsertRuleset): Promise<Ruleset> {
    const [ruleset] = await db
      .insert(rulesets)
      .values(rulesetData)
      .returning();
    return ruleset;
  }

  // Initiatives
  async getInitiatives(limit = 50, offset = 0, filters?: { status?: string; jurisdictionId?: string }): Promise<Initiative[]> {
    let query = db.select().from(initiatives);

    if (filters?.status) {
      query = query.where(eq(initiatives.status, filters.status));
    }
    if (filters?.jurisdictionId) {
      query = query.where(eq(initiatives.jurisdictionId, filters.jurisdictionId));
    }

    return await query
      .orderBy(desc(initiatives.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async getInitiativeById(id: string): Promise<Initiative | undefined> {
    const [initiative] = await db.select().from(initiatives).where(eq(initiatives.id, id));
    return initiative || undefined;
  }

  async getInitiativeBySlug(slug: string): Promise<Initiative | undefined> {
    const [initiative] = await db.select().from(initiatives).where(eq(initiatives.slug, slug));
    return initiative || undefined;
  }

  async createInitiative(initiativeData: InsertInitiative): Promise<Initiative> {
    const [initiative] = await db
      .insert(initiatives)
      .values(initiativeData)
      .returning();

    // Create first version
    await this.createInitiativeVersion({
      initiativeId: initiative.id,
      title: initiative.title,
      summary: initiative.summary,
      fullTextMd: initiative.fullTextMd,
      changelog: "Initial version",
      authorId: initiative.createdBy,
    });

    return initiative;
  }

  async updateInitiative(initiativeId: string, updateData: Partial<Initiative>): Promise<Initiative> {
    const [updatedInitiative] = await db
      .update(initiatives)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(initiatives.id, initiativeId))
      .returning();
    return updatedInitiative;
  }

  async deleteInitiative(initiativeId: string): Promise<void> {
    await db.delete(initiatives).where(eq(initiatives.id, initiativeId));
  }

  async getUserInitiatives(userId: string): Promise<Initiative[]> {
    return await db
      .select()
      .from(initiatives)
      .where(eq(initiatives.createdBy, userId))
      .orderBy(desc(initiatives.createdAt));
  }

  // Initiative Versions
  async getInitiativeVersions(initiativeId: string): Promise<InitiativeVersion[]> {
    return await db
      .select()
      .from(initiativeVersions)
      .where(eq(initiativeVersions.initiativeId, initiativeId))
      .orderBy(desc(initiativeVersions.createdAt));
  }

  async createInitiativeVersion(versionData: InsertInitiativeVersion): Promise<InitiativeVersion> {
    const [version] = await db
      .insert(initiativeVersions)
      .values(versionData)
      .returning();
    return version;
  }

  async getInitiativeVersionById(versionId: string): Promise<InitiativeVersion | undefined> {
    const [version] = await db.select().from(initiativeVersions).where(eq(initiativeVersions.id, versionId));
    return version || undefined;
  }

  // Placeholder implementations for remaining methods (to satisfy interface)
  async getPetitionsByInitiative(initiativeId: string): Promise<Petition[]> {
    return [];
  }

  async createPetition(petition: InsertPetition): Promise<Petition> {
    const [newPetition] = await db.insert(petitions).values(petition).returning();
    return newPetition;
  }

  async getPetitionById(petitionId: string): Promise<Petition | undefined> {
    const [petition] = await db.select().from(petitions).where(eq(petitions.id, petitionId));
    return petition || undefined;
  }

  async updatePetitionSignatureCount(petitionId: string, count: number): Promise<void> {
    await db.update(petitions).set({ currentSignatureCount: count }).where(eq(petitions.id, petitionId));
  }

  async createSignature(signature: InsertSignature): Promise<Signature> {
    const [newSignature] = await db.insert(signatures).values(signature).returning();
    return newSignature;
  }

  async getSignaturesByPetition(petitionId: string, limit = 50, offset = 0): Promise<Signature[]> {
    return await db.select().from(signatures)
      .where(eq(signatures.petitionId, petitionId))
      .limit(limit).offset(offset);
  }

  async updateSignatureVerification(signatureId: string, status: string, failureReason?: string): Promise<void> {
    await db.update(signatures)
      .set({ verified: status, failureReason })
      .where(eq(signatures.id, signatureId));
  }

  async getSignatureById(signatureId: string): Promise<Signature | undefined> {
    const [signature] = await db.select().from(signatures).where(eq(signatures.id, signatureId));
    return signature || undefined;
  }

  async checkDuplicateSignature(petitionId: string, emailHash: string): Promise<boolean> {
    const existing = await db.select().from(signatures)
      .where(and(eq(signatures.petitionId, petitionId), eq(signatures.emailHash, emailHash)));
    return existing.length > 0;
  }

  async createValidationEvent(event: InsertValidationEvent): Promise<ValidationEvent> {
    const [validationEvent] = await db.insert(validationEvents).values(event).returning();
    return validationEvent;
  }

  async getValidationEventsBySignature(signatureId: string): Promise<ValidationEvent[]> {
    return await db.select().from(validationEvents).where(eq(validationEvents.signatureId, signatureId));
  }

  async getInitiativeSponsors(initiativeId: string): Promise<Sponsor[]> {
    return await db.select().from(sponsors).where(eq(sponsors.initiativeId, initiativeId));
  }

  async createSponsor(sponsor: InsertSponsor): Promise<Sponsor> {
    const [newSponsor] = await db.insert(sponsors).values(sponsor).returning();
    return newSponsor;
  }

  async deleteSponsor(sponsorId: string): Promise<void> {
    await db.delete(sponsors).where(eq(sponsors.id, sponsorId));
  }

  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const [auditLog] = await db.insert(auditLogs).values(log).returning();
    return auditLog;
  }

  async getAuditLogsByEntity(entityType: string, entityId: string, limit = 100): Promise<AuditLog[]> {
    return await db.select().from(auditLogs)
      .where(and(eq(auditLogs.entityType, entityType), eq(auditLogs.entityId, entityId)))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);
  }
}

export const storage = new DatabaseStorage();
