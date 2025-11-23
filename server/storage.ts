import { users, posts, polls, pollVotes, groups, groupMembers, comments, likes, candidates, candidateSupports, messages, channels, channelMembers, channelMessages, followedRepresentatives, userAddresses, passwordResetTokens, flags, events, eventAttendees, charities, charityDonations, acpTransactions, acpBlocks, storeItems, userPurchases, subscriptionRewards, representatives, zipCodeLookups, politicalPositions, politicianProfiles, politicianCorruptionRatings, boycotts, boycottSubscriptions, jurisdictions, rulesets, initiatives, initiativeVersions, petitions, signatures, validationEvents, sponsors, auditLogs, userFollows, reactions, biasVotes, invitations, whistleblowingPosts, whistleblowingVotes, type User, type InsertUser, type Post, type InsertPost, type PostWithAuthor, type Poll, type InsertPoll, type Group, type InsertGroup, type Comment, type InsertComment, type WhistleblowingPost, type InsertWhistleblowingPost, type WhistleblowingVote, type InsertWhistleblowingVote, type Candidate, type InsertCandidate, type CandidateSupport, type InsertCandidateSupport, type Message, type InsertMessage, type Channel, type InsertChannel, type ChannelMember, type InsertChannelMember, type ChannelMessage, type InsertChannelMessage, type FollowedRepresentative, type InsertFollowedRepresentative, type UserAddress, type InsertUserAddress, type PasswordResetToken, type InsertPasswordResetToken, type Flag, type InsertFlag, type Event, type InsertEvent, type EventAttendee, type InsertEventAttendee, type Charity, type InsertCharity, type CharityDonation, type InsertCharityDonation, type ACPTransaction, type InsertACPTransaction, type StoreItem, type InsertStoreItem, type UserPurchase, type SubscriptionReward, type InsertSubscriptionReward, type ACPBlock, type Representative, type InsertRepresentative, type ZipCodeLookup, type InsertZipCodeLookup, type PoliticalPosition, type InsertPoliticalPosition, type PoliticianProfile, type InsertPoliticianProfile, type PoliticianCorruptionRating, type InsertPoliticianCorruptionRating, type Boycott, type InsertBoycott, type BoycottSubscription, type InsertBoycottSubscription, type Jurisdiction, type InsertJurisdiction, type Ruleset, type InsertRuleset, type Initiative, type InsertInitiative, type InitiativeVersion, type InsertInitiativeVersion, type Petition, type InsertPetition, type Signature, type InsertSignature, type ValidationEvent, type InsertValidationEvent, type Sponsor, type InsertSponsor, type AuditLog, type InsertAuditLog, type Invitation, type InsertInvitation, insertUserFollowSchema, insertReactionSchema, insertBiasVoteSchema } from "@shared/schema";
import { FEED_CONFIG } from "@shared/feed-config";
import { friendships, friendGroups, friendGroupMembers, friendSuggestions, friendSuggestionDismissals, userReferrals, liveStreams, liveStreamViewers, notifications, flaggedContent, bannedUsers, blockedIps, voterVerificationRequests, type Friendship, type InsertFriendship, type FriendGroup, type InsertFriendGroup, type FriendGroupMember, type InsertFriendGroupMember, type FriendSuggestion, type InsertFriendSuggestion, type FriendSuggestionDismissal, type InsertFriendSuggestionDismissal, type UserReferral, type InsertUserReferral, type LiveStream, type InsertLiveStream, type LiveStreamWithOwner, type LiveStreamViewer, type InsertLiveStreamViewer, type Notification, type InsertNotification, type FlaggedContent, type InsertFlaggedContent, type BannedUser, type InsertBannedUser, type BlockedIp, type InsertBlockedIp, type VoterVerificationRequest, type InsertVoterVerificationRequest } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, sql, count, inArray, gte } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserCount(): Promise<number>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(userId: string, updateData: Partial<User>): Promise<User>;
  updateUserStripeInfo(userId: string, customerId: string, subscriptionId: string): Promise<User>;
  updateUserPassword(userId: string, hashedPassword: string): Promise<User>;
  updateLastSeen(userId: string): Promise<void>;
  getOnlineFriends(userId: string): Promise<User[]>;

  // Posts
  getPosts(limit?: number, offset?: number, userId?: string): Promise<PostWithAuthor[]>;
  getPostById(id: string, userId?: string): Promise<Post | undefined>;
  createPost(post: InsertPost): Promise<Post>;
  deletePost(postId: string): Promise<void>;
  getPostsByUser(userId: string, viewerId?: string): Promise<Post[]>;
  getPostsByTag(tag: string, userId?: string): Promise<Post[]>;
  incrementPostShares(postId: string): Promise<void>;
  sharePost(originalPostId: string, userId: string): Promise<Post>;

  // Feed System
  getAllFeed(limit?: number, offset?: number, userId?: string): Promise<PostWithAuthor[]>;
  getFollowingFeed(userId: string, limit?: number, offset?: number): Promise<PostWithAuthor[]>;
  getNewsFeed(limit?: number, offset?: number, userId?: string): Promise<PostWithAuthor[]>;
  
  // User Following
  followUser(followerId: string, followeeId: string): Promise<void>;
  unfollowUser(followerId: string, followeeId: string): Promise<void>;
  isFollowing(followerId: string, followeeId: string): Promise<boolean>;
  getFollowers(userId: string): Promise<User[]>;
  getFollowing(userId: string): Promise<User[]>;

  // Invitation System
  createInvitation(invitationData: InsertInvitation): Promise<Invitation>;
  getInvitationByToken(token: string): Promise<Invitation | undefined>;
  validateInvitation(token: string, email?: string): Promise<{ valid: boolean; reason?: string; invitation?: Invitation }>;
  useInvitation(token: string, userId: string): Promise<void>;
  getInvitationsByUser(userId: string): Promise<Invitation[]>;
  deleteInvitation(id: string): Promise<void>;

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
  getFeaturedPolls(): Promise<Poll[]>;
  updatePoll(pollId: string, updates: Partial<Poll>): Promise<Poll>;
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
  getCommentById(commentId: string): Promise<Comment | undefined>;
  createComment(comment: InsertComment): Promise<Comment>;
  deleteComment(commentId: string): Promise<void>;
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

  // Admin Representatives Management
  listRepresentatives(filters?: { officeLevel?: string; active?: boolean; search?: string }, pagination?: { limit: number; offset: number }): Promise<{ representatives: Representative[]; total: number }>;
  getRepresentative(id: string): Promise<Representative | undefined>;
  createRepresentative(data: InsertRepresentative): Promise<Representative>;
  updateRepresentativeAdmin(id: string, patch: Partial<Representative>): Promise<Representative>;
  deleteRepresentative(id: string): Promise<void>;
  
  // Admin Zip Code Mappings Management
  listZipMappings(zipCode?: string): Promise<ZipCodeLookup[]>;
  upsertZipMapping(data: InsertZipCodeLookup): Promise<ZipCodeLookup>;
  deleteZipMapping(id: string): Promise<void>;
  
  // Admin Import/Export Operations
  exportRepresentatives(): Promise<Representative[]>;
  importRepresentatives(items: InsertRepresentative[], adminUserId: string): Promise<{ imported: number; errors: string[] }>;
  exportZipMappings(): Promise<ZipCodeLookup[]>;
  importZipMappings(items: InsertZipCodeLookup[], adminUserId: string): Promise<{ imported: number; errors: string[] }>;

  // Political Positions Management
  listPoliticalPositions(filters?: { level?: string; jurisdiction?: string; isActive?: boolean }): Promise<PoliticalPosition[]>;
  getPoliticalPosition(id: string): Promise<PoliticalPosition | undefined>;
  createPoliticalPosition(data: InsertPoliticalPosition): Promise<PoliticalPosition>;
  updatePoliticalPosition(id: string, patch: Partial<PoliticalPosition>): Promise<PoliticalPosition>;
  deletePoliticalPosition(id: string): Promise<void>;
  
  // Politician Profiles Management
  listPoliticianProfiles(filters?: { positionId?: string; isCurrent?: boolean }): Promise<any[]>;
  getPoliticianProfile(id: string): Promise<any>;
  createPoliticianProfile(data: InsertPoliticianProfile): Promise<PoliticianProfile>;
  updatePoliticianProfile(id: string, patch: Partial<PoliticianProfile>): Promise<PoliticianProfile>;
  deletePoliticianProfile(id: string): Promise<void>;
  assignPoliticianToPosition(politicianId: string, positionId: string): Promise<void>;
  submitPageClaimRequest(profileId: string, email: string, phone: string): Promise<PoliticianProfile>;
  getPendingClaimRequests(): Promise<any[]>;
  approveClaimRequest(profileId: string): Promise<PoliticianProfile>;
  rejectClaimRequest(profileId: string): Promise<PoliticianProfile>;
  getFeaturedPoliticians(): Promise<any[]>;

  // Politician Corruption Ratings
  submitCorruptionRating(politicianId: string, userId: string, grade: string, reasoning?: string): Promise<PoliticianCorruptionRating>;
  getUserCorruptionRating(politicianId: string, userId: string): Promise<PoliticianCorruptionRating | undefined>;
  getCorruptionRatingStats(politicianId: string): Promise<{ averageGrade: string; gradeDistribution: Record<string, number>; totalRatings: number }>;

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

  // Friendship System
  createFriendship(requesterId: string, addresseeId: string): Promise<void>;
  acceptFriendship(friendshipId: string): Promise<void>;
  rejectFriendship(friendshipId: string): Promise<void>;
  blockUser(friendshipId: string): Promise<void>;
  getFriends(userId: string): Promise<any[]>;
  getFriendRequests(userId: string): Promise<any[]>;
  getFriendGroups(userId: string): Promise<any[]>;
  createFriendGroup(userId: string, name: string, color: string, description?: string): Promise<any>;
  addFriendToGroup(groupId: string, friendshipId: string): Promise<void>;
  createReferral(referrerId: string, referredUserId: string, invitationId?: string): Promise<void>;
  getAdminUserId(): Promise<string | undefined>;

  // Social Petitions (for feeds - different from initiative petitions)
  getSocialPetitions(limit?: number, offset?: number): Promise<any[]>;
  createSocialPetition(petition: any): Promise<any>;
  signSocialPetition(petitionId: string, signerId: string, isAnonymous?: boolean): Promise<void>;
  getUserSocialPetitionSignature(petitionId: string, signerId: string): Promise<any | undefined>;
  updateSocialPetitionSignatureCount(petitionId: string): Promise<void>;

  // Unions - verified organizations with private membership
  getUnions(limit?: number, offset?: number): Promise<any[]>;
  getUnionById(unionId: string): Promise<any | undefined>;
  createUnion(union: any): Promise<any>;
  joinUnion(unionId: string, userId: string): Promise<void>;
  leaveUnion(unionId: string, userId: string): Promise<void>;
  isUnionMember(unionId: string, userId: string): Promise<boolean>;
  getUnionPosts(unionId: string, limit?: number, offset?: number): Promise<any[]>;
  updateUnionMemberCount(unionId: string): Promise<void>;

  // Live Streaming
  createLiveStream(stream: InsertLiveStream): Promise<LiveStream>;
  updateLiveStreamStatus(streamId: string, status: string, actualStart?: Date, endedAt?: Date): Promise<LiveStream>;
  listLiveStreams(options?: { status?: string; limit?: number; offset?: number }): Promise<LiveStreamWithOwner[]>;
  getLiveStream(id: string): Promise<LiveStreamWithOwner | undefined>;
  listUserStreams(userId: string): Promise<LiveStream[]>;
  scheduleNotification(streamId: string): Promise<void>;
  markNotified(streamId: string): Promise<void>;
  listUpcomingToNotify(windowMinutes?: number): Promise<LiveStream[]>;
  recordViewerJoin(streamId: string, userId?: string): Promise<void>;
  recordViewerLeave(streamId: string, userId?: string): Promise<void>;
  updateStreamViewerCount(streamId: string, count: number): Promise<void>;
  
  // Notifications
  createNotification(notification: InsertNotification): Promise<Notification>;
  listUserNotifications(userId: string, limit?: number, offset?: number): Promise<Notification[]>;
  markNotificationRead(notificationId: string): Promise<void>;
  markAllNotificationsRead(userId: string): Promise<void>;
  getUnreadNotificationCount(userId: string): Promise<number>;

  // Analytics
  getPostCount(): Promise<number>;
  getPollCount(): Promise<number>;
  getGroupCount(): Promise<number>;
  getEventCount(): Promise<number>;
  getCharityCount(): Promise<number>;

  // Content Moderation
  getFlaggedContent(status?: string): Promise<any[]>;
  createFlaggedContent(data: any): Promise<any>;
  reviewFlaggedContent(id: string, reviewedBy: string, status: string, actionTaken?: string, reviewNote?: string): Promise<void>;

  // User Bans
  getBannedUsers(activeOnly?: boolean): Promise<any[]>;
  banUser(userId: string, bannedBy: string, reason: string, duration?: string, expiresAt?: Date): Promise<void>;
  unbanUser(banId: string, unbannedBy: string): Promise<void>;
  getUserBanStatus(userId: string): Promise<any | undefined>;

  // IP Blocking
  getBlockedIps(activeOnly?: boolean): Promise<any[]>;
  blockIp(ipAddress: string, blockedBy: string, reason: string): Promise<void>;
  unblockIp(id: string, unblockedBy: string): Promise<void>;
  isIpBlocked(ipAddress: string): Promise<boolean>;

  // Voter Verification
  getMyVerificationRequest(userId: string): Promise<VoterVerificationRequest | undefined>;
  submitVerificationRequest(data: InsertVoterVerificationRequest): Promise<VoterVerificationRequest>;
  listVerificationRequests(status?: string): Promise<VoterVerificationRequest[]>;
  reviewVerificationRequest(requestId: string, reviewerId: string, decision: "verified" | "rejected", rejectionReason?: string): Promise<void>;
  updateUserVerificationStatus(userId: string, status: "verified" | "rejected", verifiedDate?: Date): Promise<void>;

  // Friend Suggestions
  updateUserDiscoverability(userId: string, phoneNumber: string, discoverableByPhone: boolean, discoverableByEmail: boolean): Promise<User>;
  getFriendSuggestions(userId: string, limit?: number): Promise<FriendSuggestion[]>;
  dismissFriendSuggestion(userId: string, suggestedUserId: string): Promise<void>;
  generateFriendSuggestions(userId: string): Promise<FriendSuggestion[]>;

  // Whistleblowing
  createWhistleblowingPost(post: InsertWhistleblowingPost): Promise<WhistleblowingPost>;
  getWhistleblowingPosts(limit?: number, offset?: number, sortBy?: "recent" | "credibility"): Promise<WhistleblowingPost[]>;
  getWhistleblowingPostById(id: string): Promise<WhistleblowingPost | undefined>;
  voteOnWhistleblowing(postId: string, userId: string, vote: "credible" | "not_credible"): Promise<void>;
  getUserWhistleblowingVote(postId: string, userId: string): Promise<WhistleblowingVote | undefined>;
  deleteWhistleblowingPost(postId: string): Promise<void>;
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

  async getUserCount(): Promise<number> {
    const result = await db.select({ count: count() }).from(users);
    return result[0]?.count || 0;
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

  async updateLastSeen(userId: string): Promise<void> {
    await db
      .update(users)
      .set({ lastSeen: new Date() })
      .where(eq(users.id, userId));
  }

  async getOnlineFriends(userId: string): Promise<User[]> {
    // Consider users online if they've been seen in the last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    return await db
      .select({
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
        profileTheme: users.profileTheme,
        profileBackground: users.profileBackground,
        favoriteSong: users.favoriteSong,
        profileLayout: users.profileLayout,
        createdAt: users.createdAt,
        lastSeen: users.lastSeen,
        isNewsOrganization: users.isNewsOrganization,
        organizationName: users.organizationName,
        politicalLean: users.politicalLean,
        trustScore: users.trustScore,
      })
      .from(users)
      .innerJoin(friendships, or(
        and(
          eq(friendships.requesterId, userId),
          eq(friendships.addresseeId, users.id)
        ),
        and(
          eq(friendships.addresseeId, userId),
          eq(friendships.requesterId, users.id)
        )
      ))
      .where(and(
        eq(friendships.status, 'accepted'),
        gte(users.lastSeen, fiveMinutesAgo)
      ))
      .orderBy(desc(users.lastSeen));
  }

  // Invitation System
  async createInvitation(invitationData: InsertInvitation): Promise<Invitation> {
    const [invitation] = await db
      .insert(invitations)
      .values(invitationData)
      .returning();
    return invitation;
  }

  async getInvitationByToken(token: string): Promise<Invitation | undefined> {
    const [invitation] = await db
      .select()
      .from(invitations)
      .where(eq(invitations.token, token))
      .limit(1);
    return invitation;
  }

  async validateInvitation(token: string, email?: string): Promise<{ valid: boolean; reason?: string; invitation?: Invitation }> {
    const invitation = await this.getInvitationByToken(token);
    
    if (!invitation) {
      return { valid: false, reason: "Invitation not found" };
    }
    
    if (invitation.isUsed && invitation.usageCount >= invitation.maxUses) {
      return { valid: false, reason: "Invitation has already been used" };
    }
    
    if (invitation.expiresAt && new Date() > invitation.expiresAt) {
      return { valid: false, reason: "Invitation has expired" };
    }
    
    if (invitation.email && email && invitation.email !== email) {
      return { valid: false, reason: "Invitation is restricted to a different email address" };
    }
    
    return { valid: true, invitation };
  }

  async useInvitation(token: string, userId: string): Promise<void> {
    const invitation = await this.getInvitationByToken(token);
    if (!invitation) {
      throw new Error("Invitation not found");
    }
    
    await db
      .update(invitations)
      .set({
        usedBy: userId,
        isUsed: invitation.usageCount + 1 >= invitation.maxUses,
        usageCount: invitation.usageCount + 1,
        usedAt: new Date(),
      })
      .where(eq(invitations.id, invitation.id));
  }

  async getInvitationsByUser(userId: string): Promise<Invitation[]> {
    return await db
      .select()
      .from(invitations)
      .where(eq(invitations.invitedBy, userId))
      .orderBy(desc(invitations.createdAt));
  }

  async deleteInvitation(id: string): Promise<void> {
    await db
      .delete(invitations)
      .where(eq(invitations.id, id));
  }

  async getPosts(limit = 20, offset = 0, userId?: string): Promise<PostWithAuthor[]> {
    // Build privacy filter
    let privacyFilter;
    if (userId) {
      privacyFilter = or(
        eq(posts.privacy, 'public'),
        eq(posts.authorId, userId), // Author can always see their own posts
        and(
          eq(posts.privacy, 'friends'),
          sql`EXISTS (
            SELECT 1 FROM ${friendships} 
            WHERE ((${friendships.requesterId} = ${userId} AND ${friendships.addresseeId} = ${posts.authorId})
               OR  (${friendships.addresseeId} = ${userId} AND ${friendships.requesterId} = ${posts.authorId}))
            AND ${friendships.status} = 'accepted'
          )`
        )
      );
    } else {
      privacyFilter = eq(posts.privacy, 'public');
    }
    
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
        // Share and privacy fields
        sharedPostId: posts.sharedPostId,
        privacy: posts.privacy,
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
      .where(privacyFilter)
      .orderBy(desc(posts.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async getPostById(id: string, userId?: string): Promise<Post | undefined> {
    // Build privacy filter
    let privacyFilter;
    if (userId) {
      privacyFilter = or(
        eq(posts.privacy, 'public'),
        eq(posts.authorId, userId), // Author can always see their own posts
        and(
          eq(posts.privacy, 'friends'),
          sql`EXISTS (
            SELECT 1 FROM ${friendships} 
            WHERE ((${friendships.requesterId} = ${userId} AND ${friendships.addresseeId} = ${posts.authorId})
               OR  (${friendships.addresseeId} = ${userId} AND ${friendships.requesterId} = ${posts.authorId}))
            AND ${friendships.status} = 'accepted'
          )`
        )
      );
    } else {
      privacyFilter = eq(posts.privacy, 'public');
    }
    
    const [post] = await db
      .select()
      .from(posts)
      .where(and(
        eq(posts.id, id),
        privacyFilter
      ));
    return post || undefined;
  }

  async createPost(post: InsertPost): Promise<Post> {
    const [newPost] = await db
      .insert(posts)
      .values(post)
      .returning();
    return newPost;
  }

  async deletePost(postId: string): Promise<void> {
    // Use a transaction to ensure data integrity
    await db.transaction(async (tx) => {
      // Delete associated comments first
      await tx.delete(comments).where(eq(comments.postId, postId));
      
      // Delete associated likes for the post
      await tx.delete(likes).where(eq(likes.targetId, postId));
      
      // Delete associated reactions for the post
      await tx.delete(reactions).where(eq(reactions.targetId, postId));
      
      // Delete associated flags for the post
      await tx.delete(flags).where(eq(flags.targetId, postId));
      
      // Delete any bias votes related to this post
      await tx.delete(biasVotes).where(eq(biasVotes.postId, postId));
      
      // Finally delete the post itself
      await tx.delete(posts).where(eq(posts.id, postId));
    });
  }

  async getPostsByUser(userId: string, viewerId?: string): Promise<Post[]> {
    // Build privacy filter
    let privacyFilter;
    if (viewerId) {
      privacyFilter = or(
        eq(posts.privacy, 'public'),
        eq(posts.authorId, viewerId), // Author can always see their own posts
        and(
          eq(posts.privacy, 'friends'),
          sql`EXISTS (
            SELECT 1 FROM ${friendships} 
            WHERE ((${friendships.requesterId} = ${viewerId} AND ${friendships.addresseeId} = ${posts.authorId})
               OR  (${friendships.addresseeId} = ${viewerId} AND ${friendships.requesterId} = ${posts.authorId}))
            AND ${friendships.status} = 'accepted'
          )`
        )
      );
    } else {
      privacyFilter = eq(posts.privacy, 'public');
    }
    
    return await db
      .select()
      .from(posts)
      .where(and(
        eq(posts.authorId, userId),
        privacyFilter
      ))
      .orderBy(desc(posts.createdAt));
  }

  async getPostsByTag(tag: string, userId?: string): Promise<Post[]> {
    // Build privacy filter
    let privacyFilter;
    if (userId) {
      privacyFilter = or(
        eq(posts.privacy, 'public'),
        eq(posts.authorId, userId), // Author can always see their own posts
        and(
          eq(posts.privacy, 'friends'),
          sql`EXISTS (
            SELECT 1 FROM ${friendships} 
            WHERE ((${friendships.requesterId} = ${userId} AND ${friendships.addresseeId} = ${posts.authorId})
               OR  (${friendships.addresseeId} = ${userId} AND ${friendships.requesterId} = ${posts.authorId}))
            AND ${friendships.status} = 'accepted'
          )`
        )
      );
    } else {
      privacyFilter = eq(posts.privacy, 'public');
    }
    
    return await db
      .select()
      .from(posts)
      .where(and(
        sql`${tag} = ANY(${posts.tags})`,
        privacyFilter
      ))
      .orderBy(desc(posts.createdAt));
  }

  async incrementPostShares(postId: string): Promise<void> {
    await db
      .update(posts)
      .set({ sharesCount: sql`${posts.sharesCount} + 1` })
      .where(eq(posts.id, postId));
  }

  async sharePost(originalPostId: string, userId: string): Promise<Post> {
    return await db.transaction(async (tx) => {
      // First verify the user has permission to view the original post
      // Build privacy filter to check if user can see this post
      const privacyFilter = or(
        eq(posts.privacy, 'public'),
        eq(posts.authorId, userId), // Author can always share their own posts
        and(
          eq(posts.privacy, 'friends'),
          sql`EXISTS (
            SELECT 1 FROM ${friendships} 
            WHERE ((${friendships.requesterId} = ${userId} AND ${friendships.addresseeId} = ${posts.authorId})
               OR  (${friendships.addresseeId} = ${userId} AND ${friendships.requesterId} = ${posts.authorId}))
            AND ${friendships.status} = 'accepted'
          )`
        )
      );
      
      // Get the original post with privacy check
      const [originalPost] = await tx
        .select()
        .from(posts)
        .where(and(
          eq(posts.id, originalPostId),
          privacyFilter
        ));

      if (!originalPost) {
        throw new Error("NOT_AUTHORIZED");
      }

      // Security: Block sharing friends-only posts unless user is the original author
      // This prevents privacy leaks where friends-only content becomes visible to the sharer's friends
      if (originalPost.privacy === 'friends' && originalPost.authorId !== userId) {
        throw new Error("CANNOT_SHARE_FRIENDS_ONLY");
      }

      // Create the shared post - use public privacy for shares to avoid confusion
      const [sharedPost] = await tx
        .insert(posts)
        .values({
          authorId: userId,
          content: originalPost.content,
          type: originalPost.type,
          tags: originalPost.tags || [],
          image: originalPost.image,
          url: originalPost.url,
          title: originalPost.title,
          newsSourceName: originalPost.newsSourceName,
          sharedPostId: originalPost.id,
          privacy: originalPost.privacy === 'friends' ? 'friends' : 'public', // Keep friends-only if author is sharing their own post
        })
        .returning();

      // Increment the shares count atomically
      await tx
        .update(posts)
        .set({ sharesCount: sql`${posts.sharesCount} + 1` })
        .where(eq(posts.id, originalPostId));

      return sharedPost;
    });
  }

  // Feed System Implementation
  async getAllFeed(limit = 20, offset = 0, userId?: string): Promise<PostWithAuthor[]> {
    // Build privacy filter
    let privacyFilter;
    if (userId) {
      // Show public posts OR author's own posts OR friends-only posts from friends
      privacyFilter = or(
        eq(posts.privacy, 'public'),
        eq(posts.authorId, userId), // Author can always see their own posts
        and(
          eq(posts.privacy, 'friends'),
          sql`EXISTS (
            SELECT 1 FROM ${friendships} 
            WHERE ((${friendships.requesterId} = ${userId} AND ${friendships.addresseeId} = ${posts.authorId})
               OR  (${friendships.addresseeId} = ${userId} AND ${friendships.requesterId} = ${posts.authorId}))
            AND ${friendships.status} = 'accepted'
          )`
        )
      );
    } else {
      // Show only public posts
      privacyFilter = eq(posts.privacy, 'public');
    }
    
    // Chronological feed - newest first
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
        sharedPostId: posts.sharedPostId,
        privacy: posts.privacy,
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
        privacyFilter
      ))
      .orderBy(desc(posts.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async getFollowingFeed(userId: string, limit = 20, offset = 0): Promise<PostWithAuthor[]> {
    // Build privacy filter for followed users
    const privacyFilter = or(
      eq(posts.privacy, 'public'),
      eq(posts.authorId, userId), // Author can always see their own posts
      and(
        eq(posts.privacy, 'friends'),
        sql`EXISTS (
          SELECT 1 FROM ${friendships} 
          WHERE ((${friendships.requesterId} = ${userId} AND ${friendships.addresseeId} = ${posts.authorId})
             OR  (${friendships.addresseeId} = ${userId} AND ${friendships.requesterId} = ${posts.authorId}))
          AND ${friendships.status} = 'accepted'
        )`
      )
    );

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
        sharedPostId: posts.sharedPostId,
        privacy: posts.privacy,
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
        eq(posts.isDeleted, false),
        privacyFilter
      ))
      .orderBy(desc(posts.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async getNewsFeed(limit = 20, offset = 0, userId?: string): Promise<PostWithAuthor[]> {
    const { minVotesForConfidence, decayHours } = FEED_CONFIG.news;
    
    // Calculate cutoff timestamp in TypeScript to avoid parameter binding issues
    const cutoffTimestamp = new Date(Date.now() - decayHours * 3600 * 1000);
    
    // Build privacy filter
    let privacyFilter;
    if (userId) {
      privacyFilter = or(
        eq(posts.privacy, 'public'),
        eq(posts.authorId, userId), // Author can always see their own posts
        and(
          eq(posts.privacy, 'friends'),
          sql`EXISTS (
            SELECT 1 FROM ${friendships} 
            WHERE ((${friendships.requesterId} = ${userId} AND ${friendships.addresseeId} = ${posts.authorId})
               OR  (${friendships.addresseeId} = ${userId} AND ${friendships.requesterId} = ${posts.authorId}))
            AND ${friendships.status} = 'accepted'
          )`
        )
      );
    } else {
      privacyFilter = eq(posts.privacy, 'public');
    }
    
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
        sharedPostId: posts.sharedPostId,
        privacy: posts.privacy,
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
        gte(posts.createdAt, cutoffTimestamp),
        privacyFilter
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

  async getFeaturedPolls(): Promise<Poll[]> {
    return await db
      .select()
      .from(polls)
      .where(and(eq(polls.featured, true), eq(polls.isActive, true)))
      .orderBy(desc(polls.createdAt))
      .limit(3);
  }

  async updatePoll(pollId: string, updates: Partial<Poll>): Promise<Poll> {
    const [updatedPoll] = await db
      .update(polls)
      .set(updates)
      .where(eq(polls.id, pollId))
      .returning();
    
    if (!updatedPoll) {
      throw new Error("Poll not found");
    }
    
    return updatedPoll;
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

  async getCommentById(commentId: string): Promise<Comment | undefined> {
    const [comment] = await db
      .select()
      .from(comments)
      .where(eq(comments.id, commentId));
    return comment || undefined;
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

  async deleteComment(commentId: string): Promise<void> {
    // Get the comment to know which post to update
    const [comment] = await db.select().from(comments).where(eq(comments.id, commentId));
    
    if (comment) {
      // Delete associated likes for this comment
      await db.delete(likes).where(eq(likes.targetId, commentId));
      
      // Delete the comment
      await db.delete(comments).where(eq(comments.id, commentId));
      
      // Update post comment count if it was a post comment
      if (comment.postId) {
        await db
          .update(posts)
          .set({ commentsCount: sql`${posts.commentsCount} - 1` })
          .where(eq(posts.id, comment.postId));
      }
    }
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

  // Admin Representatives Management Implementation
  async listRepresentatives(
    filters?: { officeLevel?: string; active?: boolean; search?: string }, 
    pagination?: { limit: number; offset: number }
  ): Promise<{ representatives: Representative[]; total: number }> {
    const limit = pagination?.limit || 50;
    const offset = pagination?.offset || 0;

    let query = db.select().from(representatives);
    let countQuery = db.select({ count: count() }).from(representatives);

    const conditions = [];
    if (filters) {
      if (filters.officeLevel) {
        conditions.push(eq(representatives.officeLevel, filters.officeLevel));
      }
      if (filters.active !== undefined) {
        conditions.push(eq(representatives.active, filters.active));
      }
      if (filters.search) {
        conditions.push(
          or(
            sql`${representatives.name} ILIKE ${`%${filters.search}%`}`,
            sql`${representatives.officeTitle} ILIKE ${`%${filters.search}%`}`,
            sql`${representatives.party} ILIKE ${`%${filters.search}%`}`,
            sql`${representatives.district} ILIKE ${`%${filters.search}%`}`,
            sql`${representatives.jurisdiction} ILIKE ${`%${filters.search}%`}`
          )
        );
      }
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
      countQuery = countQuery.where(and(...conditions));
    }

    const [reps, totalResult] = await Promise.all([
      query.orderBy(representatives.name).limit(limit).offset(offset),
      countQuery
    ]);

    return {
      representatives: reps,
      total: totalResult[0]?.count || 0
    };
  }

  async getRepresentative(id: string): Promise<Representative | undefined> {
    const [representative] = await db
      .select()
      .from(representatives)
      .where(eq(representatives.id, id));
    return representative || undefined;
  }

  async createRepresentative(data: InsertRepresentative): Promise<Representative> {
    const [newRep] = await db
      .insert(representatives)
      .values(data)
      .returning();
    
    // Create audit log
    await this.createAuditLog({
      entityType: "representative",
      entityId: newRep.id,
      action: "created",
      diffJson: { new: newRep }
    });
    
    return newRep;
  }

  async updateRepresentativeAdmin(id: string, patch: Partial<Representative>): Promise<Representative> {
    const existing = await this.getRepresentative(id);
    if (!existing) {
      throw new Error("Representative not found");
    }

    const [updated] = await db
      .update(representatives)
      .set({
        ...patch,
        updatedAt: new Date()
      })
      .where(eq(representatives.id, id))
      .returning();

    // Create audit log
    await this.createAuditLog({
      entityType: "representative",
      entityId: id,
      action: "updated",
      diffJson: { old: existing, new: updated }
    });

    return updated;
  }

  async deleteRepresentative(id: string): Promise<void> {
    const existing = await this.getRepresentative(id);
    if (!existing) {
      throw new Error("Representative not found");
    }

    // Delete related zip mappings first (cascade will handle this automatically due to FK constraint)
    await db.delete(representatives).where(eq(representatives.id, id));

    // Create audit log
    await this.createAuditLog({
      entityType: "representative",
      entityId: id,
      action: "deleted",
      diffJson: { old: existing }
    });
  }

  // Admin Zip Code Mappings Management Implementation
  async listZipMappings(zipCode?: string): Promise<ZipCodeLookup[]> {
    let query = db
      .select({
        id: zipCodeLookups.id,
        zipCode: zipCodeLookups.zipCode,
        representativeId: zipCodeLookups.representativeId,
        officeLevel: zipCodeLookups.officeLevel,
        district: zipCodeLookups.district,
        jurisdiction: zipCodeLookups.jurisdiction,
        priority: zipCodeLookups.priority,
        createdAt: zipCodeLookups.createdAt,
        updatedAt: zipCodeLookups.updatedAt,
        representativeName: representatives.name,
        representativeOfficeTitle: representatives.officeTitle
      })
      .from(zipCodeLookups)
      .innerJoin(representatives, eq(zipCodeLookups.representativeId, representatives.id));

    if (zipCode) {
      query = query.where(eq(zipCodeLookups.zipCode, zipCode));
    }

    return await query.orderBy(zipCodeLookups.zipCode, zipCodeLookups.priority);
  }

  async upsertZipMapping(data: InsertZipCodeLookup): Promise<ZipCodeLookup> {
    // Check for existing mapping with same zipCode + officeLevel + representativeId
    const existing = await db
      .select()
      .from(zipCodeLookups)
      .where(and(
        eq(zipCodeLookups.zipCode, data.zipCode),
        eq(zipCodeLookups.officeLevel, data.officeLevel),
        eq(zipCodeLookups.representativeId, data.representativeId)
      ));

    if (existing.length > 0) {
      // Update existing
      const [updated] = await db
        .update(zipCodeLookups)
        .set({
          ...data,
          updatedAt: new Date()
        })
        .where(eq(zipCodeLookups.id, existing[0].id))
        .returning();

      await this.createAuditLog({
        entityType: "zip_mapping",
        entityId: updated.id,
        action: "updated",
        diffJson: { old: existing[0], new: updated }
      });

      return updated;
    } else {
      // Create new
      const [newMapping] = await db
        .insert(zipCodeLookups)
        .values(data)
        .returning();

      await this.createAuditLog({
        entityType: "zip_mapping",
        entityId: newMapping.id,
        action: "created",
        diffJson: { new: newMapping }
      });

      return newMapping;
    }
  }

  async deleteZipMapping(id: string): Promise<void> {
    const existing = await db
      .select()
      .from(zipCodeLookups)
      .where(eq(zipCodeLookups.id, id));

    if (existing.length === 0) {
      throw new Error("Zip mapping not found");
    }

    await db.delete(zipCodeLookups).where(eq(zipCodeLookups.id, id));

    await this.createAuditLog({
      entityType: "zip_mapping",
      entityId: id,
      action: "deleted",
      diffJson: { old: existing[0] }
    });
  }

  // Admin Import/Export Operations Implementation
  async exportRepresentatives(): Promise<Representative[]> {
    return await db.select().from(representatives).orderBy(representatives.name);
  }

  async importRepresentatives(items: InsertRepresentative[], adminUserId: string): Promise<{ imported: number; errors: string[] }> {
    const errors: string[] = [];
    let imported = 0;

    for (const item of items) {
      try {
        await this.createRepresentative(item);
        imported++;
      } catch (error: any) {
        errors.push(`Error importing ${item.name}: ${error.message}`);
      }
    }

    // Create audit log for bulk import
    await this.createAuditLog({
      actorId: adminUserId,
      entityType: "representative",
      entityId: "bulk_import",
      action: "bulk_imported",
      diffJson: { imported, errors: errors.length, totalItems: items.length }
    });

    return { imported, errors };
  }

  async exportZipMappings(): Promise<ZipCodeLookup[]> {
    return await db.select().from(zipCodeLookups).orderBy(zipCodeLookups.zipCode, zipCodeLookups.priority);
  }

  async importZipMappings(items: InsertZipCodeLookup[], adminUserId: string): Promise<{ imported: number; errors: string[] }> {
    const errors: string[] = [];
    let imported = 0;

    for (const item of items) {
      try {
        await this.upsertZipMapping(item);
        imported++;
      } catch (error: any) {
        errors.push(`Error importing zip mapping ${item.zipCode}: ${error.message}`);
      }
    }

    // Create audit log for bulk import
    await this.createAuditLog({
      actorId: adminUserId,
      entityType: "zip_mapping",
      entityId: "bulk_import",
      action: "bulk_imported",
      diffJson: { imported, errors: errors.length, totalItems: items.length }
    });

    return { imported, errors };
  }

  // Political Positions Management
  async listPoliticalPositions(filters?: { level?: string; jurisdiction?: string; isActive?: boolean }): Promise<PoliticalPosition[]> {
    let query = db.select().from(politicalPositions);
    
    const conditions = [];
    if (filters?.level) {
      conditions.push(eq(politicalPositions.level, filters.level));
    }
    if (filters?.jurisdiction) {
      conditions.push(eq(politicalPositions.jurisdiction, filters.jurisdiction));
    }
    if (filters?.isActive !== undefined) {
      conditions.push(eq(politicalPositions.isActive, filters.isActive));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    return await query.orderBy(politicalPositions.displayOrder, politicalPositions.title);
  }

  async getPoliticalPosition(id: string): Promise<PoliticalPosition | undefined> {
    const [position] = await db
      .select()
      .from(politicalPositions)
      .where(eq(politicalPositions.id, id));
    return position || undefined;
  }

  async createPoliticalPosition(data: InsertPoliticalPosition): Promise<PoliticalPosition> {
    const [position] = await db
      .insert(politicalPositions)
      .values(data)
      .returning();
    return position;
  }

  async updatePoliticalPosition(id: string, patch: Partial<PoliticalPosition>): Promise<PoliticalPosition> {
    const [updated] = await db
      .update(politicalPositions)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(politicalPositions.id, id))
      .returning();
    return updated;
  }

  async deletePoliticalPosition(id: string): Promise<void> {
    await db
      .delete(politicalPositions)
      .where(eq(politicalPositions.id, id));
  }

  // Politician Profiles Management
  async listPoliticianProfiles(filters?: { positionId?: string; isCurrent?: boolean }): Promise<any[]> {
    let query = db
      .select({
        politician: politicianProfiles,
        position: politicalPositions,
      })
      .from(politicianProfiles)
      .leftJoin(politicalPositions, eq(politicianProfiles.positionId, politicalPositions.id));
    
    const conditions = [];
    if (filters?.positionId) {
      conditions.push(eq(politicianProfiles.positionId, filters.positionId));
    }
    if (filters?.isCurrent !== undefined) {
      conditions.push(eq(politicianProfiles.isCurrent, filters.isCurrent));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    const results = await query.orderBy(politicianProfiles.fullName);
    return results.map(r => ({ ...r.politician, position: r.position }));
  }

  async getPoliticianProfile(id: string): Promise<any> {
    const [result] = await db
      .select({
        politician: politicianProfiles,
        position: politicalPositions,
      })
      .from(politicianProfiles)
      .leftJoin(politicalPositions, eq(politicianProfiles.positionId, politicalPositions.id))
      .where(eq(politicianProfiles.id, id));
    
    if (!result) return undefined;
    return { ...result.politician, position: result.position };
  }

  async createPoliticianProfile(data: InsertPoliticianProfile): Promise<PoliticianProfile> {
    const [profile] = await db
      .insert(politicianProfiles)
      .values(data)
      .returning();
    return profile;
  }

  async updatePoliticianProfile(id: string, patch: Partial<PoliticianProfile>): Promise<PoliticianProfile> {
    const [updated] = await db
      .update(politicianProfiles)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(politicianProfiles.id, id))
      .returning();
    return updated;
  }

  async deletePoliticianProfile(id: string): Promise<void> {
    await db
      .delete(politicianProfiles)
      .where(eq(politicianProfiles.id, id));
  }

  async assignPoliticianToPosition(politicianId: string, positionId: string): Promise<void> {
    await db
      .update(politicianProfiles)
      .set({ positionId, updatedAt: new Date() })
      .where(eq(politicianProfiles.id, politicianId));
  }

  async submitPageClaimRequest(profileId: string, email: string, phone: string): Promise<PoliticianProfile> {
    const [updated] = await db
      .update(politicianProfiles)
      .set({ 
        claimRequestEmail: email,
        claimRequestPhone: phone,
        claimRequestStatus: 'pending',
        claimRequestDate: new Date(),
        updatedAt: new Date()
      })
      .where(eq(politicianProfiles.id, profileId))
      .returning();
    return updated;
  }

  async getPendingClaimRequests(): Promise<any[]> {
    const results = await db
      .select({
        politician: politicianProfiles,
        position: politicalPositions,
      })
      .from(politicianProfiles)
      .leftJoin(politicalPositions, eq(politicianProfiles.positionId, politicalPositions.id))
      .where(eq(politicianProfiles.claimRequestStatus, 'pending'))
      .orderBy(politicianProfiles.claimRequestDate);
    return results.map(r => ({ ...r.politician, position: r.position }));
  }

  async approveClaimRequest(profileId: string): Promise<PoliticianProfile> {
    const [updated] = await db
      .update(politicianProfiles)
      .set({ 
        claimRequestStatus: 'approved',
        isVerified: true,
        verifiedDate: new Date(),
        updatedAt: new Date()
      })
      .where(eq(politicianProfiles.id, profileId))
      .returning();
    return updated;
  }

  async rejectClaimRequest(profileId: string): Promise<PoliticianProfile> {
    const [updated] = await db
      .update(politicianProfiles)
      .set({ 
        claimRequestStatus: 'rejected',
        updatedAt: new Date()
      })
      .where(eq(politicianProfiles.id, profileId))
      .returning();
    return updated;
  }

  async getFeaturedPoliticians(): Promise<any[]> {
    const results = await db
      .select({
        politician: politicianProfiles,
        position: politicalPositions,
      })
      .from(politicianProfiles)
      .leftJoin(politicalPositions, eq(politicianProfiles.positionId, politicalPositions.id))
      .where(and(
        eq(politicianProfiles.featured, true),
        eq(politicianProfiles.isCurrent, true)
      ))
      .orderBy(politicianProfiles.fullName)
      .limit(5);
    return results.map(r => ({ ...r.politician, position: r.position }));
  }

  async submitCorruptionRating(politicianId: string, userId: string, grade: string, reasoning?: string): Promise<PoliticianCorruptionRating> {
    const existing = await this.getUserCorruptionRating(politicianId, userId);
    
    if (existing) {
      const [updated] = await db
        .update(politicianCorruptionRatings)
        .set({
          grade,
          reasoning: reasoning || null,
          updatedAt: new Date(),
        })
        .where(and(
          eq(politicianCorruptionRatings.politicianId, politicianId),
          eq(politicianCorruptionRatings.userId, userId)
        ))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(politicianCorruptionRatings)
        .values({
          politicianId,
          userId,
          grade,
          reasoning: reasoning || null,
        })
        .returning();
      return created;
    }
  }

  async getUserCorruptionRating(politicianId: string, userId: string): Promise<PoliticianCorruptionRating | undefined> {
    const [rating] = await db
      .select()
      .from(politicianCorruptionRatings)
      .where(and(
        eq(politicianCorruptionRatings.politicianId, politicianId),
        eq(politicianCorruptionRatings.userId, userId)
      ));
    return rating;
  }

  async getCorruptionRatingStats(politicianId: string): Promise<{ averageGrade: string; gradeDistribution: Record<string, number>; totalRatings: number }> {
    const ratings = await db
      .select()
      .from(politicianCorruptionRatings)
      .where(eq(politicianCorruptionRatings.politicianId, politicianId));

    const totalRatings = ratings.length;
    const gradeDistribution: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, F: 0 };
    
    if (totalRatings === 0) {
      return { averageGrade: 'N/A', gradeDistribution, totalRatings: 0 };
    }

    const gradeValues: Record<string, number> = { A: 4, B: 3, C: 2, D: 1, F: 0 };
    let totalValue = 0;

    ratings.forEach(rating => {
      gradeDistribution[rating.grade] = (gradeDistribution[rating.grade] || 0) + 1;
      totalValue += gradeValues[rating.grade];
    });

    const averageValue = totalValue / totalRatings;
    let averageGrade = 'F';
    if (averageValue >= 3.5) averageGrade = 'A';
    else if (averageValue >= 2.5) averageGrade = 'B';
    else if (averageValue >= 1.5) averageGrade = 'C';
    else if (averageValue >= 0.5) averageGrade = 'D';

    return { averageGrade, gradeDistribution, totalRatings };
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

  // Friendship System Implementation
  async createFriendship(requesterId: string, addresseeId: string): Promise<void> {
    await db.insert(friendships).values({
      requesterId,
      addresseeId,
      status: 'accepted' // Auto-accept for Tom/inviter connections
    });
  }

  async acceptFriendship(friendshipId: string): Promise<void> {
    await db.update(friendships)
      .set({ status: 'accepted', updatedAt: new Date() })
      .where(eq(friendships.id, friendshipId));
  }

  async rejectFriendship(friendshipId: string): Promise<void> {
    await db.update(friendships)
      .set({ status: 'rejected', updatedAt: new Date() })
      .where(eq(friendships.id, friendshipId));
  }

  async blockUser(friendshipId: string): Promise<void> {
    await db.update(friendships)
      .set({ status: 'blocked', updatedAt: new Date() })
      .where(eq(friendships.id, friendshipId));
  }

  async getFriends(userId: string): Promise<any[]> {
    return await db.select({
      id: friendships.id,
      username: users.username,
      firstName: users.firstName,
      lastName: users.lastName,
      avatar: users.avatar,
      status: friendships.status,
    })
    .from(friendships)
    .innerJoin(users, 
      or(
        and(eq(friendships.requesterId, userId), eq(users.id, friendships.addresseeId)),
        and(eq(friendships.addresseeId, userId), eq(users.id, friendships.requesterId))
      )
    )
    .where(eq(friendships.status, 'accepted'));
  }

  async getFriendRequests(userId: string): Promise<any[]> {
    return await db.select({
      id: friendships.id,
      username: users.username,
      firstName: users.firstName,
      lastName: users.lastName,
      avatar: users.avatar,
      status: friendships.status,
    })
    .from(friendships)
    .innerJoin(users, eq(users.id, friendships.requesterId))
    .where(and(
      eq(friendships.addresseeId, userId),
      eq(friendships.status, 'pending')
    ));
  }

  async getFriendGroups(userId: string): Promise<any[]> {
    return await db.select({
      id: friendGroups.id,
      name: friendGroups.name,
      description: friendGroups.description,
      color: friendGroups.color,
      memberCount: sql<number>`count(${friendGroupMembers.id})`.as('memberCount')
    })
    .from(friendGroups)
    .leftJoin(friendGroupMembers, eq(friendGroupMembers.groupId, friendGroups.id))
    .where(eq(friendGroups.userId, userId))
    .groupBy(friendGroups.id);
  }

  async createFriendGroup(userId: string, name: string, color: string, description?: string): Promise<any> {
    const [group] = await db.insert(friendGroups)
      .values({ userId, name, color, description })
      .returning();
    return group;
  }

  async addFriendToGroup(groupId: string, friendshipId: string): Promise<void> {
    await db.insert(friendGroupMembers)
      .values({ groupId, friendshipId });
  }

  async createReferral(referrerId: string, referredUserId: string, invitationId?: string): Promise<void> {
    await db.insert(userReferrals).values({
      referrerId,
      referredUserId,
      invitationId,
      creditsEarned: 20,
      creditsAwarded: false
    });
  }

  async getAdminUserId(): Promise<string | undefined> {
    const [adminUser] = await db.select({ id: users.id })
      .from(users)
      .where(eq(users.role, 'admin'))
      .limit(1);
    return adminUser?.id;
  }

  // Social Petitions (for feeds - different from initiative petitions)
  async getSocialPetitions(limit: number = 50, offset: number = 0): Promise<any[]> {
    const result = await db.execute(sql`
      SELECT sp.*, u.username, u.first_name, u.last_name,
             COUNT(sps.id) as signature_count
      FROM social_petitions sp
      LEFT JOIN users u ON sp.creator_id = u.id
      LEFT JOIN social_petition_signatures sps ON sp.id = sps.petition_id
      WHERE sp.is_active = true
      GROUP BY sp.id, u.id, u.username, u.first_name, u.last_name
      ORDER BY sp.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `);
    return result.rows.map((row: any) => ({
      ...row,
      currentSignatures: parseInt(row.signature_count) || 0,
      targetSignatures: row.target_signatures || 1000,
      createdAt: row.created_at,
    }));
  }

  async createSocialPetition(petition: any): Promise<any> {
    const [result] = await db.execute(sql`
      INSERT INTO social_petitions (title, objective, description, creator_id, target_signatures, tags)
      VALUES (${petition.title}, ${petition.objective}, ${petition.description}, 
              ${petition.creatorId}, ${petition.targetSignatures || 1000}, 
              ${petition.tags || sql`'{}'::text[]`})
      RETURNING *
    `);
    return result;
  }

  async signSocialPetition(petitionId: string, signerId: string, isAnonymous: boolean = false): Promise<void> {
    // Insert signature and update count in a transaction
    await db.execute(sql`
      INSERT INTO social_petition_signatures (petition_id, signer_id, is_anonymous)
      VALUES (${petitionId}, ${signerId}, ${isAnonymous})
      ON CONFLICT (petition_id, signer_id) DO NOTHING
    `);
    
    // Update petition signature count
    await this.updateSocialPetitionSignatureCount(petitionId);
  }

  async getUserSocialPetitionSignature(petitionId: string, signerId: string): Promise<any | undefined> {
    const result = await db.execute(sql`
      SELECT * FROM social_petition_signatures
      WHERE petition_id = ${petitionId} AND signer_id = ${signerId}
    `);
    return result.rows[0];
  }

  async updateSocialPetitionSignatureCount(petitionId: string): Promise<void> {
    await db.execute(sql`
      UPDATE social_petitions
      SET current_signatures = (
        SELECT COUNT(*) FROM social_petition_signatures WHERE petition_id = ${petitionId}
      ),
      updated_at = NOW()
      WHERE id = ${petitionId}
    `);
  }

  // Unions - verified organizations with private membership
  async getUnions(limit: number = 50, offset: number = 0): Promise<any[]> {
    const result = await db.execute(sql`
      SELECT u.*, 
             COUNT(um.id) as member_count
      FROM unions u
      LEFT JOIN union_memberships um ON u.id = um.union_id AND um.status = 'active'
      GROUP BY u.id
      ORDER BY u.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `);
    return result.rows.map((row: any) => ({
      ...row,
      memberCount: parseInt(row.member_count) || 0,
      isVerified: row.is_verified,
      createdAt: row.created_at,
    }));
  }

  async getUnionById(unionId: string): Promise<any | undefined> {
    const result = await db.execute(sql`
      SELECT u.*, 
             COUNT(um.id) as member_count
      FROM unions u
      LEFT JOIN union_memberships um ON u.id = um.union_id AND um.status = 'active'
      WHERE u.id = ${unionId}
      GROUP BY u.id
    `);
    if (result.rows.length === 0) return undefined;
    
    const row = result.rows[0] as any;
    return {
      ...row,
      memberCount: parseInt(row.member_count) || 0,
      isVerified: row.is_verified,
      createdAt: row.created_at,
    };
  }

  async createUnion(union: any): Promise<any> {
    const [result] = await db.execute(sql`
      INSERT INTO unions (name, description, industry, website, contact_email)
      VALUES (${union.name}, ${union.description}, ${union.industry}, 
              ${union.website}, ${union.contactEmail})
      RETURNING *
    `);
    return result;
  }

  async joinUnion(unionId: string, userId: string): Promise<void> {
    await db.execute(sql`
      INSERT INTO union_memberships (union_id, user_id, status, is_private)
      VALUES (${unionId}, ${userId}, 'active', true)
      ON CONFLICT (union_id, user_id) DO UPDATE
      SET status = 'active', joined_at = NOW()
    `);
    
    await this.updateUnionMemberCount(unionId);
  }

  async leaveUnion(unionId: string, userId: string): Promise<void> {
    await db.execute(sql`
      UPDATE union_memberships
      SET status = 'inactive'
      WHERE union_id = ${unionId} AND user_id = ${userId}
    `);
    
    await this.updateUnionMemberCount(unionId);
  }

  async isUnionMember(unionId: string, userId: string): Promise<boolean> {
    const result = await db.execute(sql`
      SELECT 1 FROM union_memberships
      WHERE union_id = ${unionId} AND user_id = ${userId} AND status = 'active'
    `);
    return result.rows.length > 0;
  }

  async getUnionPosts(unionId: string, limit: number = 50, offset: number = 0): Promise<any[]> {
    const result = await db.execute(sql`
      SELECT up.*, u.name as union_name
      FROM union_posts up
      JOIN unions u ON up.union_id = u.id
      WHERE up.union_id = ${unionId} AND up.is_public = true
      ORDER BY up.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `);
    return result.rows.map((row: any) => ({
      ...row,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async updateUnionMemberCount(unionId: string): Promise<void> {
    await db.execute(sql`
      UPDATE unions
      SET member_count = (
        SELECT COUNT(*) FROM union_memberships WHERE union_id = ${unionId} AND status = 'active'
      ),
      updated_at = NOW()
      WHERE id = ${unionId}
    `);
  }

  // Live Streaming Implementation
  async createLiveStream(stream: InsertLiveStream): Promise<LiveStream> {
    const [createdStream] = await db
      .insert(liveStreams)
      .values(stream)
      .returning();
    return createdStream;
  }

  async updateLiveStreamStatus(streamId: string, status: string, actualStart?: Date, endedAt?: Date): Promise<LiveStream> {
    const updateData: any = { status };
    if (actualStart) updateData.actualStart = actualStart;
    if (endedAt) updateData.endedAt = endedAt;

    const [updatedStream] = await db
      .update(liveStreams)
      .set(updateData)
      .where(eq(liveStreams.id, streamId))
      .returning();
    return updatedStream;
  }

  async listLiveStreams(options: { status?: string; limit?: number; offset?: number } = {}): Promise<LiveStreamWithOwner[]> {
    const { status, limit = 50, offset = 0 } = options;
    
    let query = db
      .select({
        id: liveStreams.id,
        ownerId: liveStreams.ownerId,
        title: liveStreams.title,
        description: liveStreams.description,
        status: liveStreams.status,
        visibility: liveStreams.visibility,
        scheduledStart: liveStreams.scheduledStart,
        actualStart: liveStreams.actualStart,
        endedAt: liveStreams.endedAt,
        provider: liveStreams.provider,
        providerInputId: liveStreams.providerInputId,
        providerPlaybackId: liveStreams.providerPlaybackId,
        providerPlaybackUrl: liveStreams.providerPlaybackUrl,
        rtmpServerUrl: liveStreams.rtmpServerUrl,
        streamKeyHash: liveStreams.streamKeyHash,
        thumbnailUrl: liveStreams.thumbnailUrl,
        contextType: liveStreams.contextType,
        contextId: liveStreams.contextId,
        notificationScheduled: liveStreams.notificationScheduled,
        viewerCount: liveStreams.viewerCount,
        createdAt: liveStreams.createdAt,
        owner: {
          username: users.username,
          firstName: users.firstName,
          lastName: users.lastName,
          avatar: users.avatar,
        },
      })
      .from(liveStreams)
      .leftJoin(users, eq(liveStreams.ownerId, users.id))
      .orderBy(desc(liveStreams.createdAt))
      .limit(limit)
      .offset(offset);

    if (status) {
      query = query.where(eq(liveStreams.status, status));
    }

    const results = await query;
    return results as LiveStreamWithOwner[];
  }

  async getLiveStream(id: string): Promise<LiveStreamWithOwner | undefined> {
    const [stream] = await db
      .select({
        id: liveStreams.id,
        ownerId: liveStreams.ownerId,
        title: liveStreams.title,
        description: liveStreams.description,
        status: liveStreams.status,
        visibility: liveStreams.visibility,
        scheduledStart: liveStreams.scheduledStart,
        actualStart: liveStreams.actualStart,
        endedAt: liveStreams.endedAt,
        provider: liveStreams.provider,
        providerInputId: liveStreams.providerInputId,
        providerPlaybackId: liveStreams.providerPlaybackId,
        providerPlaybackUrl: liveStreams.providerPlaybackUrl,
        rtmpServerUrl: liveStreams.rtmpServerUrl,
        streamKeyHash: liveStreams.streamKeyHash,
        thumbnailUrl: liveStreams.thumbnailUrl,
        contextType: liveStreams.contextType,
        contextId: liveStreams.contextId,
        notificationScheduled: liveStreams.notificationScheduled,
        viewerCount: liveStreams.viewerCount,
        createdAt: liveStreams.createdAt,
        owner: {
          username: users.username,
          firstName: users.firstName,
          lastName: users.lastName,
          avatar: users.avatar,
        },
      })
      .from(liveStreams)
      .leftJoin(users, eq(liveStreams.ownerId, users.id))
      .where(eq(liveStreams.id, id));

    return stream as LiveStreamWithOwner;
  }

  async listUserStreams(userId: string): Promise<LiveStream[]> {
    return await db
      .select()
      .from(liveStreams)
      .where(eq(liveStreams.ownerId, userId))
      .orderBy(desc(liveStreams.createdAt));
  }

  async scheduleNotification(streamId: string): Promise<void> {
    await db
      .update(liveStreams)
      .set({ notificationScheduled: true })
      .where(eq(liveStreams.id, streamId));
  }

  async markNotified(streamId: string): Promise<void> {
    await db
      .update(liveStreams)
      .set({ notificationScheduled: true })
      .where(eq(liveStreams.id, streamId));
  }

  async listUpcomingToNotify(windowMinutes: number = 60): Promise<LiveStream[]> {
    const now = new Date();
    const futureTime = new Date(now.getTime() + windowMinutes * 60 * 1000);
    
    return await db
      .select()
      .from(liveStreams)
      .where(
        and(
          eq(liveStreams.status, 'scheduled'),
          eq(liveStreams.notificationScheduled, false),
          gte(liveStreams.scheduledStart, now),
          sql`${liveStreams.scheduledStart} <= ${futureTime}`
        )
      );
  }

  async recordViewerJoin(streamId: string, userId?: string): Promise<void> {
    if (userId) {
      await db
        .insert(liveStreamViewers)
        .values({
          streamId,
          userId,
          joinedAt: new Date(),
        });
    }
  }

  async recordViewerLeave(streamId: string, userId?: string): Promise<void> {
    if (userId) {
      await db
        .update(liveStreamViewers)
        .set({ leftAt: new Date() })
        .where(
          and(
            eq(liveStreamViewers.streamId, streamId),
            eq(liveStreamViewers.userId, userId),
            sql`${liveStreamViewers.leftAt} IS NULL`
          )
        );
    }
  }

  async updateStreamViewerCount(streamId: string, count: number): Promise<void> {
    await db
      .update(liveStreams)
      .set({ viewerCount: count })
      .where(eq(liveStreams.id, streamId));
  }

  // Notifications Implementation
  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [createdNotification] = await db
      .insert(notifications)
      .values(notification)
      .returning();
    return createdNotification;
  }

  async listUserNotifications(userId: string, limit: number = 50, offset: number = 0): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async markNotificationRead(notificationId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ read: true })
      .where(eq(notifications.id, notificationId));
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ read: true })
      .where(eq(notifications.userId, userId));
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.read, false)
        )
      );
    return result?.count || 0;
  }

  // Analytics Implementation
  async getPostCount(): Promise<number> {
    const [result] = await db.select({ count: count() }).from(posts);
    return result?.count || 0;
  }

  async getPollCount(): Promise<number> {
    const [result] = await db.select({ count: count() }).from(polls);
    return result?.count || 0;
  }

  async getGroupCount(): Promise<number> {
    const [result] = await db.select({ count: count() }).from(groups);
    return result?.count || 0;
  }

  async getEventCount(): Promise<number> {
    const [result] = await db.select({ count: count() }).from(events);
    return result?.count || 0;
  }

  async getCharityCount(): Promise<number> {
    const [result] = await db.select({ count: count() }).from(charities);
    return result?.count || 0;
  }

  // Content Moderation Implementation
  async getFlaggedContent(status?: string): Promise<any[]> {
    let query = db.select().from(flaggedContent);
    if (status) {
      query = query.where(eq(flaggedContent.status, status)) as any;
    }
    return await query.orderBy(desc(flaggedContent.createdAt));
  }

  async createFlaggedContent(data: any): Promise<any> {
    const [flagged] = await db.insert(flaggedContent).values(data).returning();
    return flagged;
  }

  async reviewFlaggedContent(
    id: string,
    reviewedBy: string,
    status: string,
    actionTaken?: string,
    reviewNote?: string
  ): Promise<void> {
    await db
      .update(flaggedContent)
      .set({
        status,
        reviewedBy,
        actionTaken,
        reviewNote,
        reviewedAt: new Date(),
      })
      .where(eq(flaggedContent.id, id));
  }

  // User Bans Implementation
  async getBannedUsers(activeOnly: boolean = true): Promise<any[]> {
    let query = db.select().from(bannedUsers);
    if (activeOnly) {
      query = query.where(eq(bannedUsers.isActive, true)) as any;
    }
    return await query.orderBy(desc(bannedUsers.createdAt));
  }

  async banUser(
    userId: string,
    bannedBy: string,
    reason: string,
    duration?: string,
    expiresAt?: Date
  ): Promise<void> {
    await db.insert(bannedUsers).values({
      userId,
      bannedBy,
      reason,
      duration: duration || 'permanent',
      expiresAt: expiresAt || null,
      isActive: true,
    });
  }

  async unbanUser(banId: string, unbannedBy: string): Promise<void> {
    await db
      .update(bannedUsers)
      .set({
        isActive: false,
        unbannedAt: new Date(),
        unbannedBy,
      })
      .where(eq(bannedUsers.id, banId));
  }

  async getUserBanStatus(userId: string): Promise<any | undefined> {
    const [ban] = await db
      .select()
      .from(bannedUsers)
      .where(
        and(
          eq(bannedUsers.userId, userId),
          eq(bannedUsers.isActive, true)
        )
      )
      .orderBy(desc(bannedUsers.createdAt))
      .limit(1);
    return ban || undefined;
  }

  // IP Blocking Implementation
  async getBlockedIps(activeOnly: boolean = true): Promise<any[]> {
    let query = db.select().from(blockedIps);
    if (activeOnly) {
      query = query.where(eq(blockedIps.isActive, true)) as any;
    }
    return await query.orderBy(desc(blockedIps.createdAt));
  }

  async blockIp(ipAddress: string, blockedBy: string, reason: string): Promise<void> {
    await db.insert(blockedIps).values({
      ipAddress,
      blockedBy,
      reason,
      isActive: true,
    });
  }

  async unblockIp(id: string, unblockedBy: string): Promise<void> {
    await db
      .update(blockedIps)
      .set({
        isActive: false,
        unblockedAt: new Date(),
        unblockedBy,
      })
      .where(eq(blockedIps.id, id));
  }

  async isIpBlocked(ipAddress: string): Promise<boolean> {
    const [blocked] = await db
      .select()
      .from(blockedIps)
      .where(
        and(
          eq(blockedIps.ipAddress, ipAddress),
          eq(blockedIps.isActive, true)
        )
      )
      .limit(1);
    return !!blocked;
  }

  // Voter Verification
  async getMyVerificationRequest(userId: string): Promise<VoterVerificationRequest | undefined> {
    const [request] = await db
      .select()
      .from(voterVerificationRequests)
      .where(eq(voterVerificationRequests.userId, userId))
      .limit(1);
    return request || undefined;
  }

  async submitVerificationRequest(data: InsertVoterVerificationRequest): Promise<VoterVerificationRequest> {
    const [existing] = await db
      .select()
      .from(voterVerificationRequests)
      .where(eq(voterVerificationRequests.userId, data.userId))
      .limit(1);

    if (existing) {
      const [updated] = await db
        .update(voterVerificationRequests)
        .set({
          ...data,
          submittedAt: new Date(),
          status: "pending",
          reviewedAt: null,
          reviewedBy: null,
          rejectionReason: null,
        })
        .where(eq(voterVerificationRequests.userId, data.userId))
        .returning();
      
      await db.insert(auditLogs).values({
        action: "voter_verification_resubmitted",
        performedBy: data.userId,
        targetId: data.userId,
        targetType: "user",
        metadata: { fullLegalName: data.fullLegalName },
      });

      return updated;
    }

    const [request] = await db
      .insert(voterVerificationRequests)
      .values({
        ...data,
        status: "pending",
      })
      .returning();

    await db.insert(auditLogs).values({
      action: "voter_verification_submitted",
      performedBy: data.userId,
      targetId: data.userId,
      targetType: "user",
      metadata: { fullLegalName: data.fullLegalName },
    });

    return request;
  }

  async listVerificationRequests(status?: string): Promise<VoterVerificationRequest[]> {
    let query = db.select().from(voterVerificationRequests);
    
    if (status) {
      query = query.where(eq(voterVerificationRequests.status, status)) as any;
    }
    
    return await query.orderBy(desc(voterVerificationRequests.submittedAt));
  }

  async reviewVerificationRequest(
    requestId: string,
    reviewerId: string,
    decision: "verified" | "rejected",
    rejectionReason?: string
  ): Promise<void> {
    const [request] = await db
      .select()
      .from(voterVerificationRequests)
      .where(eq(voterVerificationRequests.id, requestId))
      .limit(1);

    if (!request) {
      throw new Error("Verification request not found");
    }

    await db
      .update(voterVerificationRequests)
      .set({
        status: decision,
        reviewedAt: new Date(),
        reviewedBy: reviewerId,
        rejectionReason: decision === "rejected" ? rejectionReason : null,
      })
      .where(eq(voterVerificationRequests.id, requestId));

    await this.updateUserVerificationStatus(
      request.userId,
      decision,
      decision === "verified" ? new Date() : undefined
    );

    await db.insert(auditLogs).values({
      action: `voter_verification_${decision}`,
      performedBy: reviewerId,
      targetId: request.userId,
      targetType: "user",
      metadata: {
        requestId,
        fullLegalName: request.fullLegalName,
        rejectionReason,
      },
    });
  }

  async updateUserVerificationStatus(
    userId: string,
    status: "verified" | "rejected",
    verifiedDate?: Date
  ): Promise<void> {
    await db
      .update(users)
      .set({
        voterVerificationStatus: status,
        voterVerifiedDate: status === "verified" ? verifiedDate : null,
      })
      .where(eq(users.id, userId));
  }

  // Friend Suggestions - TODO: Consider extracting to separate service module if this grows
  async updateUserDiscoverability(
    userId: string,
    phoneNumber: string,
    discoverableByPhone: boolean,
    discoverableByEmail: boolean
  ): Promise<User> {
    const { hashContact, normalizeEmail, normalizePhone } = await import("./lib/crypto-utils");
    
    const normalizedPhone = normalizePhone(phoneNumber);
    const phoneHash = normalizedPhone ? hashContact(normalizedPhone) : null;
    
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error("User not found");
    }
    
    const normalizedEmailValue = normalizeEmail(user.email);
    
    const [updatedUser] = await db
      .update(users)
      .set({
        phoneNumber: normalizedPhone || null,
        phoneHash,
        normalizedEmail: normalizedEmailValue,
        discoverableByPhone,
        discoverableByEmail,
      })
      .where(eq(users.id, userId))
      .returning();
    
    return updatedUser;
  }

  async getFriendSuggestions(userId: string, limit: number = 10): Promise<FriendSuggestion[]> {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const cachedSuggestions = await db
      .select()
      .from(friendSuggestions)
      .where(
        and(
          eq(friendSuggestions.userId, userId),
          gte(friendSuggestions.expiresAt, now),
          gte(friendSuggestions.createdAt, sevenDaysAgo)
        )
      )
      .orderBy(desc(friendSuggestions.score))
      .limit(limit);
    
    if (cachedSuggestions.length === 0) {
      await this.generateFriendSuggestions(userId);
      return this.getFriendSuggestions(userId, limit);
    }
    
    return cachedSuggestions;
  }

  async dismissFriendSuggestion(userId: string, suggestedUserId: string): Promise<void> {
    await db.insert(friendSuggestionDismissals).values({
      userId,
      dismissedUserId: suggestedUserId,
    }).onConflictDoNothing();
    
    await db
      .delete(friendSuggestions)
      .where(
        and(
          eq(friendSuggestions.userId, userId),
          eq(friendSuggestions.suggestedUserId, suggestedUserId)
        )
      );
  }

  async generateFriendSuggestions(userId: string): Promise<FriendSuggestion[]> {
    const dismissedIds = await db
      .select({ dismissedUserId: friendSuggestionDismissals.dismissedUserId })
      .from(friendSuggestionDismissals)
      .where(eq(friendSuggestionDismissals.userId, userId));
    
    const dismissedSet = new Set(dismissedIds.map(d => d.dismissedUserId));
    
    const mutualFriends = await this.collectMutualFriends(userId);
    const contactMatches = await this.collectContactMatches(userId);
    const sharedGroups = await this.collectSharedGroups(userId);
    
    const allSuggestions = new Map<string, { userId: string; reasons: string[]; score: number }>();
    
    mutualFriends.forEach(({ userId: suggestedId, count }) => {
      if (!dismissedSet.has(suggestedId) && suggestedId !== userId) {
        allSuggestions.set(suggestedId, {
          userId: suggestedId,
          reasons: ['mutual_friends'],
          score: count * 10,
        });
      }
    });
    
    contactMatches.forEach(({ userId: suggestedId, matchType }) => {
      if (!dismissedSet.has(suggestedId) && suggestedId !== userId) {
        const existing = allSuggestions.get(suggestedId);
        if (existing) {
          existing.reasons.push(matchType);
          existing.score += 5;
        } else {
          allSuggestions.set(suggestedId, {
            userId: suggestedId,
            reasons: [matchType],
            score: 5,
          });
        }
      }
    });
    
    sharedGroups.forEach(({ userId: suggestedId, count }) => {
      if (!dismissedSet.has(suggestedId) && suggestedId !== userId) {
        const existing = allSuggestions.get(suggestedId);
        if (existing) {
          existing.reasons.push('shared_groups');
          existing.score += count * 2;
        } else {
          allSuggestions.set(suggestedId, {
            userId: suggestedId,
            reasons: ['shared_groups'],
            score: count * 2,
          });
        }
      }
    });
    
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const suggestions: FriendSuggestion[] = [];
    
    for (const [suggestedUserId, data] of allSuggestions.entries()) {
      const [inserted] = await db
        .insert(friendSuggestions)
        .values({
          userId,
          suggestedUserId,
          reason: data.reasons[0],
          score: data.score,
          expiresAt,
        })
        .onConflictDoUpdate({
          target: [friendSuggestions.userId, friendSuggestions.suggestedUserId],
          set: {
            score: data.score,
            reason: data.reasons[0],
            expiresAt,
          },
        })
        .returning();
      
      suggestions.push(inserted);
    }
    
    return suggestions;
  }

  private async collectMutualFriends(userId: string): Promise<Array<{ userId: string; count: number }>> {
    const myFriends = await db
      .select({ friendId: friendships.addresseeId })
      .from(friendships)
      .where(
        and(
          eq(friendships.requesterId, userId),
          eq(friendships.status, 'accepted')
        )
      );
    
    const myFriendIds = myFriends.map(f => f.friendId);
    
    if (myFriendIds.length === 0) {
      return [];
    }
    
    const mutualFriends = await db
      .select({
        suggestedUserId: friendships.addresseeId,
        count: count(),
      })
      .from(friendships)
      .where(
        and(
          inArray(friendships.requesterId, myFriendIds),
          eq(friendships.status, 'accepted')
        )
      )
      .groupBy(friendships.addresseeId)
      .having(sql`count(*) > 0`);
    
    return mutualFriends.map(m => ({ userId: m.suggestedUserId, count: Number(m.count) }));
  }

  private async collectContactMatches(userId: string): Promise<Array<{ userId: string; matchType: string }>> {
    const user = await this.getUser(userId);
    if (!user) {
      return [];
    }
    
    const matches: Array<{ userId: string; matchType: string }> = [];
    
    if (user.phoneHash && user.discoverableByPhone) {
      const phoneMatches = await db
        .select()
        .from(users)
        .where(
          and(
            eq(users.phoneHash, user.phoneHash),
            eq(users.discoverableByPhone, true)
          )
        );
      
      phoneMatches.forEach(match => {
        if (match.id !== userId) {
          matches.push({ userId: match.id, matchType: 'phone_match' });
        }
      });
    }
    
    if (user.normalizedEmail && user.discoverableByEmail) {
      const emailMatches = await db
        .select()
        .from(users)
        .where(
          and(
            eq(users.normalizedEmail, user.normalizedEmail),
            eq(users.discoverableByEmail, true)
          )
        );
      
      emailMatches.forEach(match => {
        if (match.id !== userId) {
          matches.push({ userId: match.id, matchType: 'email_match' });
        }
      });
    }
    
    return matches;
  }

  private async collectSharedGroups(userId: string): Promise<Array<{ userId: string; count: number }>> {
    const myGroups = await db
      .select({ groupId: groupMembers.groupId })
      .from(groupMembers)
      .where(eq(groupMembers.userId, userId));
    
    const myGroupIds = myGroups.map(g => g.groupId);
    
    if (myGroupIds.length === 0) {
      return [];
    }
    
    const sharedGroupMembers = await db
      .select({
        userId: groupMembers.userId,
        count: count(),
      })
      .from(groupMembers)
      .where(inArray(groupMembers.groupId, myGroupIds))
      .groupBy(groupMembers.userId)
      .having(sql`count(*) > 0`);
    
    return sharedGroupMembers
      .filter(m => m.userId !== userId)
      .map(m => ({ userId: m.userId, count: Number(m.count) }));
  }

  // Whistleblowing methods
  async createWhistleblowingPost(post: InsertWhistleblowingPost): Promise<WhistleblowingPost> {
    const [newPost] = await db.insert(whistleblowingPosts).values(post).returning();
    return newPost;
  }

  async getWhistleblowingPosts(limit: number = 20, offset: number = 0, sortBy: "recent" | "credibility" = "recent"): Promise<WhistleblowingPost[]> {
    const orderBy = sortBy === "credibility" 
      ? desc(whistleblowingPosts.credibilityScore)
      : desc(whistleblowingPosts.createdAt);
    
    const posts = await db
      .select()
      .from(whistleblowingPosts)
      .where(eq(whistleblowingPosts.isDeleted, false))
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);
    
    return posts;
  }

  async getWhistleblowingPostById(id: string): Promise<WhistleblowingPost | undefined> {
    const [post] = await db
      .select()
      .from(whistleblowingPosts)
      .where(and(
        eq(whistleblowingPosts.id, id),
        eq(whistleblowingPosts.isDeleted, false)
      ));
    return post || undefined;
  }

  async voteOnWhistleblowing(postId: string, userId: string, vote: "credible" | "not_credible"): Promise<void> {
    // Check if user already voted
    const existingVote = await this.getUserWhistleblowingVote(postId, userId);
    
    if (existingVote) {
      // Update existing vote
      if (existingVote.vote !== vote) {
        // Change vote
        await db
          .update(whistleblowingVotes)
          .set({ vote })
          .where(and(
            eq(whistleblowingVotes.postId, postId),
            eq(whistleblowingVotes.userId, userId)
          ));
        
        // Update post counters
        await db.execute(sql`
          UPDATE whistleblowing_posts
          SET 
            credible_votes = CASE WHEN ${vote} = 'credible' THEN credible_votes + 1 ELSE credible_votes - 1 END,
            not_credible_votes = CASE WHEN ${vote} = 'not_credible' THEN not_credible_votes + 1 ELSE not_credible_votes - 1 END,
            credibility_score = (CASE WHEN ${vote} = 'credible' THEN credible_votes + 1 ELSE credible_votes - 1 END) - (CASE WHEN ${vote} = 'not_credible' THEN not_credible_votes + 1 ELSE not_credible_votes - 1 END)
          WHERE id = ${postId}
        `);
      }
    } else {
      // Create new vote
      await db.insert(whistleblowingVotes).values({
        postId,
        userId,
        vote,
      });
      
      // Update post counters
      await db.execute(sql`
        UPDATE whistleblowing_posts
        SET 
          credible_votes = CASE WHEN ${vote} = 'credible' THEN credible_votes + 1 ELSE credible_votes END,
          not_credible_votes = CASE WHEN ${vote} = 'not_credible' THEN not_credible_votes + 1 ELSE not_credible_votes END,
          credibility_score = credibility_score + CASE WHEN ${vote} = 'credible' THEN 1 ELSE -1 END
        WHERE id = ${postId}
      `);
    }
  }

  async getUserWhistleblowingVote(postId: string, userId: string): Promise<WhistleblowingVote | undefined> {
    const [vote] = await db
      .select()
      .from(whistleblowingVotes)
      .where(and(
        eq(whistleblowingVotes.postId, postId),
        eq(whistleblowingVotes.userId, userId)
      ));
    return vote || undefined;
  }

  async deleteWhistleblowingPost(postId: string): Promise<void> {
    await db
      .update(whistleblowingPosts)
      .set({ isDeleted: true })
      .where(eq(whistleblowingPosts.id, postId));
  }
}

export const storage = new DatabaseStorage();
