import { users, posts, polls, pollVotes, groups, groupMembers, comments, likes, candidates, candidateSupports, messages, channels, channelMembers, channelMessages, followedRepresentatives, userAddresses, passwordResetTokens, flags, events, eventAttendees, volunteerSignups, charities, charityDonations, acpTransactions, acpBlocks, storeItems, userPurchases, subscriptionRewards, representatives, zipCodeLookups, politicalPositions, politicianProfiles, politicianCorruptionRatings, specialInterestGroups, politicianSigSponsorships, boycotts, boycottSubscriptions, jurisdictions, rulesets, initiatives, initiativeVersions, petitions, signatures, validationEvents, sponsors, auditLogs, userFollows, reactions, biasVotes, invitations, whistleblowingPosts, whistleblowingVotes, type User, type InsertUser, type Post, type InsertPost, type PostWithAuthor, type Poll, type InsertPoll, type Group, type InsertGroup, type Comment, type InsertComment, type WhistleblowingPost, type InsertWhistleblowingPost, type WhistleblowingVote, type InsertWhistleblowingVote, type Candidate, type InsertCandidate, type CandidateSupport, type InsertCandidateSupport, type Message, type InsertMessage, type Channel, type InsertChannel, type ChannelMember, type InsertChannelMember, type ChannelMessage, type InsertChannelMessage, type FollowedRepresentative, type InsertFollowedRepresentative, type UserAddress, type InsertUserAddress, type PasswordResetToken, type InsertPasswordResetToken, type Flag, type InsertFlag, type Event, type InsertEvent, type EventAttendee, type InsertEventAttendee, type VolunteerSignup, type InsertVolunteerSignup, type Charity, type InsertCharity, type CharityDonation, type InsertCharityDonation, type ACPTransaction, type InsertACPTransaction, type StoreItem, type InsertStoreItem, type UserPurchase, type SubscriptionReward, type InsertSubscriptionReward, type ACPBlock, type Representative, type InsertRepresentative, type ZipCodeLookup, type InsertZipCodeLookup, type PoliticalPosition, type InsertPoliticalPosition, type PoliticianProfile, type InsertPoliticianProfile, type PoliticianCorruptionRating, type InsertPoliticianCorruptionRating, type SpecialInterestGroup, type InsertSpecialInterestGroup, type PoliticianSigSponsorship, type InsertPoliticianSigSponsorship, type Boycott, type InsertBoycott, type BoycottSubscription, type InsertBoycottSubscription, type Jurisdiction, type InsertJurisdiction, type Ruleset, type InsertRuleset, type Initiative, type InsertInitiative, type InitiativeVersion, type InsertInitiativeVersion, type Petition, type InsertPetition, type Signature, type InsertSignature, type ValidationEvent, type InsertValidationEvent, type Sponsor, type InsertSponsor, type AuditLog, type InsertAuditLog, type Invitation, type InsertInvitation, insertUserFollowSchema, insertReactionSchema, insertBiasVoteSchema } from "@shared/schema";
import { FEED_CONFIG } from "@shared/feed-config";
import { gradingAlgorithmSettings, fecCandidateTotals, sigCommunityVotes, type GradingAlgorithmSettings, type FecCandidateTotals, type SigCommunityVote } from "@shared/schema";
import { friendships, friendGroups, friendGroupMembers, friendSuggestions, friendSuggestionDismissals, userReferrals, liveStreams, liveStreamViewers, notifications, flaggedContent, bannedUsers, blockedIps, voterVerificationRequests, signals, signalLikes, signalComments, aiArticleParameters, tradingFlags, politicianDemerits, type Friendship, type InsertFriendship, type FriendGroup, type InsertFriendGroup, type FriendGroupMember, type InsertFriendGroupMember, type FriendSuggestion, type InsertFriendSuggestion, type FriendSuggestionDismissal, type InsertFriendSuggestionDismissal, type UserReferral, type InsertUserReferral, type LiveStream, type InsertLiveStream, type LiveStreamWithOwner, type LiveStreamViewer, type InsertLiveStreamViewer, type Notification, type InsertNotification, type FlaggedContent, type InsertFlaggedContent, type BannedUser, type InsertBannedUser, type BlockedIp, type InsertBlockedIp, type VoterVerificationRequest, type InsertVoterVerificationRequest, type Signal, type InsertSignal, type SignalWithAuthor, type SignalLike, type InsertSignalLike, type AiArticleParameters, type TradingFlag, type InsertTradingFlag, type PoliticianDemerit, type InsertPoliticianDemerit } from "@shared/schema";
import * as cheerio from "cheerio";
import { db } from "./db";
import { eq, desc, and, or, sql, count, inArray, gte, ilike } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserCount(search?: string): Promise<number>;
  getAllUsers(limit?: number, offset?: number, search?: string): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(userId: string, updateData: Partial<User>): Promise<User>;
  updateUserStripeInfo(userId: string, customerId: string, subscriptionId: string): Promise<User>;
  updateUserPassword(userId: string, hashedPassword: string): Promise<User>;
  updateLastSeen(userId: string): Promise<void>;
  getOnlineFriends(userId: string): Promise<User[]>;

  // Posts
  getPosts(limit?: number, offset?: number, userId?: string): Promise<PostWithAuthor[]>;
  getPostById(id: string, userId?: string): Promise<PostWithAuthor | undefined>;
  createPost(post: InsertPost): Promise<Post>;
  updatePost(postId: string, updateData: Partial<Post>): Promise<Post>;
  deletePost(postId: string): Promise<void>;
  getPostsByUser(userId: string, viewerId?: string): Promise<Post[]>;
  getPostsByTag(tag: string, userId?: string): Promise<Post[]>;
  getPublicArticles(category?: string, limit?: number, offset?: number): Promise<PostWithAuthor[]>;
  getPublicArticle(id: string): Promise<PostWithAuthor | undefined>;
  incrementPostShares(postId: string): Promise<void>;
  sharePost(originalPostId: string, userId: string): Promise<Post>;
  getTrendingHashtags(limit?: number, hoursAgo?: number): Promise<Array<{ tag: string; count: number }>>;


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
  listPoliticiansWithSigs(): Promise<any[]>;
  getPoliticiansByPositionTitles(titles: string[]): Promise<any[]>;
  getPoliticiansByStateAndDistrict(stateName: string, congressionalDistricts: number[]): Promise<any[]>;
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
  refreshProfileData(id: string): Promise<{ updated: boolean; fields: string[] }>;
  refreshAllProfilesData(): Promise<{ updated: number; skipped: number }>;
  setPoliticianClaimToken(id: string, token: string, expiry: Date): Promise<void>;
  verifyClaimToken(token: string): Promise<PoliticianProfile | null>;

  // Politician Corruption Ratings
  submitCorruptionRating(politicianId: string, userId: string, grade: string, reasoning?: string): Promise<PoliticianCorruptionRating>;
  getUserCorruptionRating(politicianId: string, userId: string): Promise<PoliticianCorruptionRating | undefined>;
  getCorruptionRatingStats(politicianId: string): Promise<{ averageGrade: string; gradeDistribution: Record<string, number>; totalRatings: number }>;

  // Special Interest Groups (SIGs)
  listSpecialInterestGroups(filters?: { category?: string; industry?: string; search?: string; isActive?: boolean }): Promise<SpecialInterestGroup[]>;
  getSpecialInterestGroup(id: string): Promise<SpecialInterestGroup | undefined>;
  createSpecialInterestGroup(data: InsertSpecialInterestGroup): Promise<SpecialInterestGroup>;
  updateSpecialInterestGroup(id: string, patch: Partial<SpecialInterestGroup>): Promise<SpecialInterestGroup>;
  deleteSpecialInterestGroup(id: string): Promise<void>;
  getSigCategories(): Promise<string[]>;
  getSigIndustries(): Promise<string[]>;
  getPublicSigs(filters?: { category?: string; sentiment?: string }): Promise<SpecialInterestGroup[]>;
  getPublicSigByTag(tag: string, userId?: string): Promise<{ sig: SpecialInterestGroup; politicians: any[]; totalContributions: number; communityScore: number | null; voteCount: number; userVote: number | null; connectedLobbies: any[]; top10Recipients: any[] } | null>;
  updateSigInfluence(sigId: string, influenceScore: number | null, letterGrade: string | null): Promise<void>;
  submitSigCommunityVote(sigId: string, userId: string, vote: number): Promise<SigCommunityVote>;
  seedSigsXlsx(sigs: Array<{ name: string; tag: string; description: string; category: string; sentiment: string; dataSourceName: string; dataSourceUrl: string; disclosureNotes?: string }>): Promise<number>;
  
  importCongress(): Promise<{ profiles_created: number; profiles_updated: number; positions_created: number; sigs_created: number; sponsorships_created: number }>;
  importCandidates(candidates: Array<{ fullName: string; office: string; officeLevel: string; district: string; state: string; party: string; isIncumbent: string; status: string; primaryDate: string; generalDate: string; ballotpediaUrl: string; fecCandidateId: string; website: string; email: string; phone: string; biography: string; photoUrl: string; notes: string; profileType?: string }>): Promise<{ created: number; updated: number; positions_created: number; photos_fetched: number; handles_generated: number }>;
  importProfilesCsv(profiles: Array<{ fullName: string; party: string; email: string; phone: string; website: string; biography: string; termStart: string; termEnd: string; isCurrent: string; officeAddress: string }>): Promise<{ created: number; updated: number }>;
  importPositionsCsv(positions: Array<{ title: string; officeType: string; level: string; jurisdiction: string; district: string; termLength: string; isElected: string; isActive: string }>): Promise<{ created: number; updated: number }>;

  // Politician SIG Sponsorships
  listPoliticianSponsors(politicianId: string): Promise<any[]>;
  linkSponsorToPolitician(data: InsertPoliticianSigSponsorship): Promise<PoliticianSigSponsorship>;
  updatePoliticianSponsorship(id: string, patch: Partial<PoliticianSigSponsorship>): Promise<PoliticianSigSponsorship>;
  recalculateGradeFromSigs(politicianId: string): Promise<string>;
  unlinkSponsorFromPolitician(politicianId: string, sigId: string): Promise<void>;
  getGradingConfig(): Promise<GradingAlgorithmSettings>;
  updateGradingConfig(patch: Partial<GradingAlgorithmSettings>): Promise<GradingAlgorithmSettings>;
  fetchFecCandidateTotals(fecCandidateId: string): Promise<{ individualShare: number; smallDollarShare: number; committeeShare: number; selfFundingShare: number; receipts: number } | null>;
  lookupFecCandidateId(name: string, state?: string, office?: string): Promise<string | null>;
  computePoliticianGrade(politicianId: string): Promise<{ grade: string; numericScore: number; explanation: any }>;
  regradeAllProfiles(): Promise<{ scanned: number; regraded: number; errors: string[] }>;
  setCommunityAdj(politicianId: string, adj: number): Promise<void>;
  getPoliticiansBySig(sigId: string): Promise<any[]>;

  // Trading Flags
  createTradingFlag(flag: InsertTradingFlag): Promise<TradingFlag>;
  getTradingFlagsByPolitician(politicianId: string): Promise<TradingFlag[]>;
  getAllTradingFlags(status?: string): Promise<TradingFlag[]>;
  reviewTradingFlag(flagId: string, status: string, reviewedBy: string, reviewNote?: string): Promise<TradingFlag>;

  // Politician Demerits
  createDemerit(demerit: InsertPoliticianDemerit): Promise<PoliticianDemerit>;
  getDemeritsByPolitician(politicianId: string): Promise<PoliticianDemerit[]>;
  deleteDemerit(demeritId: string): Promise<void>;

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

  // Volunteer Signups
  signUpForVolunteer(postId: string, userId: string, data: { message?: string; phone?: string; email?: string; availability?: string; experience?: string }): Promise<VolunteerSignup>;
  withdrawVolunteerSignup(postId: string, userId: string): Promise<void>;
  getVolunteerSignups(postId: string): Promise<VolunteerSignup[]>;
  getUserVolunteerSignups(userId: string): Promise<VolunteerSignup[]>;
  getVolunteerSignupStatus(postId: string, userId: string): Promise<VolunteerSignup | undefined>;
  updateVolunteerSignupStatus(signupId: string, status: string): Promise<VolunteerSignup>;
  incrementVolunteerSpotsFilled(postId: string): Promise<void>;
  decrementVolunteerSpotsFilled(postId: string): Promise<void>;

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
  createFriendshipPending(requesterId: string, addresseeId: string): Promise<void>;
  acceptFriendship(friendshipId: string): Promise<void>;
  rejectFriendship(friendshipId: string): Promise<void>;
  cancelFriendRequest(friendshipId: string, userId: string): Promise<void>;
  unfriend(userId: string, friendId: string): Promise<void>;
  blockUser(friendshipId: string): Promise<void>;
  getFriends(userId: string): Promise<any[]>;
  getFriendRequests(userId: string): Promise<any[]>;
  getSentFriendRequests(userId: string): Promise<any[]>;
  getFriendshipStatus(userId1: string, userId2: string): Promise<{ status: string; friendshipId?: string; isRequester?: boolean } | null>;
  getFriendGroups(userId: string): Promise<any[]>;
  createFriendGroup(userId: string, name: string, color: string, description?: string): Promise<any>;
  addFriendToGroup(groupId: string, friendshipId: string): Promise<void>;
  createReferral(referrerId: string, referredUserId: string, invitationId?: string): Promise<void>;
  getAdminUserId(): Promise<string | undefined>;
  getDefaultFriendUserId(): Promise<string | undefined>;
  searchUsersByEmailOrUsername(query: string, excludeUserId?: string): Promise<User[]>;

  // Contact Upload & Friend Discovery
  uploadUserContacts(userId: string, contacts: { name?: string; phoneHash?: string; emailHash?: string; phoneLast4?: string }[]): Promise<{ matched: any[]; unmatchedCount: number }>;
  getUserContacts(userId: string): Promise<any[]>;
  getMatchedContacts(userId: string): Promise<any[]>;
  deleteUserContacts(userId: string): Promise<void>;
  getFriendSuggestions(userId: string, limit?: number): Promise<any[]>;
  dismissFriendSuggestion(userId: string, suggestedUserId: string): Promise<void>;
  getMutualFriendsCount(userId1: string, userId2: string): Promise<number>;
  getUsersInSameLocation(userId: string, limit?: number): Promise<any[]>;

  // Two-Factor Authentication
  createSmsOtp(userId: string, codeHash: string, phoneNumber: string, expiresAt: Date): Promise<void>;
  verifySmsOtp(userId: string, codeHash: string): Promise<{ success: boolean; reason?: string }>;
  createTrustedDevice(userId: string, tokenHash: string, userAgent: string, ipAddress: string, expiresAt: Date): Promise<void>;
  verifyTrustedDevice(userId: string, tokenHash: string): Promise<boolean>;
  removeTrustedDevice(userId: string, deviceId: string): Promise<void>;
  getTrustedDevices(userId: string): Promise<any[]>;
  addUserCredits(userId: string, credits: number): Promise<void>;

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
  getRepresentativeFlags(): Promise<any[]>;
  dismissRepresentativeFlag(flagId: string, reviewedBy: string): Promise<void>;
  createFlaggedContent(data: any): Promise<any>;
  reviewFlaggedContent(id: string, reviewedBy: string, status: string, actionTaken?: string, reviewNote?: string): Promise<void>;
  dismissPostFlags(postId: string, reviewedBy: string): Promise<void>;

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

  // Algorithm Settings
  getAlgorithmSettings(): Promise<AlgorithmSettings>;
  updateAlgorithmSettings(settings: Partial<AlgorithmSettings>, updatedBy: string): Promise<AlgorithmSettings>;

  // AI Article Parameters
  getAiArticleParameters(): Promise<AiArticleParameters>;
  updateAiArticleParameters(params: Partial<AiArticleParameters>, updatedBy: string): Promise<AiArticleParameters>;

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

  // Mobile App Signals
  getSignals(limit?: number, offset?: number): Promise<SignalWithAuthor[]>;
  getSignalById(id: string): Promise<SignalWithAuthor | undefined>;
  getSignalsByUser(userId: string): Promise<SignalWithAuthor[]>;
  createSignal(signal: InsertSignal): Promise<Signal>;
  likeSignal(signalId: string, userId: string): Promise<void>;
  unlikeSignal(signalId: string, userId: string): Promise<void>;
  incrementSignalViewCount(signalId: string): Promise<void>;
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

  async getUserCount(search = ""): Promise<number> {
    if (search) {
      const q = `%${search.toLowerCase()}%`;
      const result = await db.select({ count: count() }).from(users)
        .where(sql`lower(username) LIKE ${q} OR lower(email) LIKE ${q} OR lower(coalesce(first_name,'') || ' ' || coalesce(last_name,'')) LIKE ${q}`);
      return result[0]?.count || 0;
    }
    const result = await db.select({ count: count() }).from(users);
    return result[0]?.count || 0;
  }

  async getAllUsers(limit = 50, offset = 0, search = ""): Promise<User[]> {
    if (search) {
      const q = `%${search.toLowerCase()}%`;
      return await db.select().from(users)
        .where(sql`lower(username) LIKE ${q} OR lower(email) LIKE ${q} OR lower(coalesce(first_name,'') || ' ' || coalesce(last_name,'')) LIKE ${q}`)
        .orderBy(desc(users.createdAt))
        .limit(limit)
        .offset(offset);
    }
    return await db
      .select()
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        acpCoinBalance: "20.00000000", // Every new account starts with 20 ACP Credits
      })
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
        // Volunteer fields
        volunteerTitle: posts.volunteerTitle,
        volunteerOrganization: posts.volunteerOrganization,
        volunteerLocation: posts.volunteerLocation,
        volunteerIsRemote: posts.volunteerIsRemote,
        volunteerStartDate: posts.volunteerStartDate,
        volunteerEndDate: posts.volunteerEndDate,
        volunteerCommitment: posts.volunteerCommitment,
        volunteerSkills: posts.volunteerSkills,
        volunteerRequirements: posts.volunteerRequirements,
        volunteerBenefits: posts.volunteerBenefits,
        volunteerSpotsTotal: posts.volunteerSpotsTotal,
        volunteerSpotsFilled: posts.volunteerSpotsFilled,
        volunteerContactEmail: posts.volunteerContactEmail,
        volunteerContactPhone: posts.volunteerContactPhone,
        volunteerCategory: posts.volunteerCategory,
        volunteerUrgency: posts.volunteerUrgency,
        // Poll fields
        pollId: polls.id,
        pollTitle: polls.title,
        pollDescription: polls.description,
        pollOptions: polls.options,
        pollVotingType: polls.votingType,
        pollIsBlockchainVerified: polls.isBlockchainVerified,
        pollTotalVotes: polls.totalVotes,
        pollEndDate: polls.endDate,
        pollIsActive: polls.isActive,
        author: {
          username: users.username,
          firstName: users.firstName,
          lastName: users.lastName,
          avatar: users.avatar,
        },
      })
      .from(posts)
      .leftJoin(users, eq(posts.authorId, users.id))
      .leftJoin(polls, eq(posts.id, polls.postId))
      .where(privacyFilter)
      .orderBy(desc(posts.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async getPostById(id: string, userId?: string): Promise<PostWithAuthor | undefined> {
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
    
    const result = await db
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
        linkPreview: posts.linkPreview,
        sharesCount: posts.sharesCount,
        sharedPostId: posts.sharedPostId,
        eventId: posts.eventId,
        privacy: posts.privacy,
        emojiReactionsCount: posts.emojiReactionsCount,
        gifReactionsCount: posts.gifReactionsCount,
        bookmarksCount: posts.bookmarksCount,
        flagsCount: posts.flagsCount,
        isDeleted: posts.isDeleted,
        createdAt: posts.createdAt,
        // Blog/article fields
        articleBody: posts.articleBody,
        featuredImage: posts.featuredImage,
        excerpt: posts.excerpt,
        articleImages: posts.articleImages,
        readingTime: posts.readingTime,
        // Volunteer fields
        volunteerTitle: posts.volunteerTitle,
        volunteerOrganization: posts.volunteerOrganization,
        volunteerLocation: posts.volunteerLocation,
        volunteerIsRemote: posts.volunteerIsRemote,
        volunteerStartDate: posts.volunteerStartDate,
        volunteerEndDate: posts.volunteerEndDate,
        volunteerCommitment: posts.volunteerCommitment,
        volunteerSkills: posts.volunteerSkills,
        volunteerRequirements: posts.volunteerRequirements,
        volunteerBenefits: posts.volunteerBenefits,
        volunteerSpotsTotal: posts.volunteerSpotsTotal,
        volunteerSpotsFilled: posts.volunteerSpotsFilled,
        volunteerContactEmail: posts.volunteerContactEmail,
        volunteerContactPhone: posts.volunteerContactPhone,
        volunteerCategory: posts.volunteerCategory,
        volunteerUrgency: posts.volunteerUrgency,
        // Poll fields
        pollId: polls.id,
        pollTitle: polls.title,
        pollDescription: polls.description,
        pollOptions: polls.options,
        pollVotingType: polls.votingType,
        pollIsBlockchainVerified: polls.isBlockchainVerified,
        pollTotalVotes: polls.totalVotes,
        pollEndDate: polls.endDate,
        pollIsActive: polls.isActive,
        author: {
          id: users.id,
          username: users.username,
          firstName: users.firstName,
          lastName: users.lastName,
          avatar: users.avatar,
          bio: users.bio,
        },
      })
      .from(posts)
      .leftJoin(users, eq(posts.authorId, users.id))
      .leftJoin(polls, eq(posts.id, polls.postId))
      .where(and(
        eq(posts.id, id),
        privacyFilter
      ))
      .limit(1);
    
    return result[0] || undefined;
  }

  async createPost(post: InsertPost): Promise<Post> {
    const [newPost] = await db
      .insert(posts)
      .values(post)
      .returning();
    return newPost;
  }

  async updatePost(postId: string, updateData: Partial<Post>): Promise<Post> {
    const [updatedPost] = await db
      .update(posts)
      .set(updateData)
      .where(eq(posts.id, postId))
      .returning();
    return updatedPost;
  }

  async deletePost(postId: string): Promise<void> {
    // Use a transaction to ensure data integrity
    await db.transaction(async (tx) => {
      // Delete associated comments first
      await tx.delete(comments).where(eq(comments.postId, postId));
      
      // Delete associated likes for the post
      await tx.delete(likes).where(eq(likes.targetId, postId));
      
      // Delete associated reactions for the post
      await tx.delete(reactions).where(eq(reactions.postId, postId));
      
      // Delete associated flags for the post
      await tx.delete(flags).where(eq(flags.targetId, postId));
      
      // Delete any bias votes related to this post
      await tx.delete(biasVotes).where(eq(biasVotes.postId, postId));
      
      // Handle shared posts - nullify the sharedPostId reference in posts that shared this one
      await tx
        .update(posts)
        .set({ sharedPostId: null })
        .where(eq(posts.sharedPostId, postId));
      
      // Delete associated poll if it exists
      await tx.delete(polls).where(eq(polls.postId, postId));
      
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

  async getPublicArticles(category?: string, limit = 50, offset = 0): Promise<PostWithAuthor[]> {
    const categoryMapping: Record<string, string[]> = {
      'current-events': ['current-events', 'news', 'current events', 'breaking'],
      'politicians': ['politicians', 'politician', 'congress', 'senator', 'representative'],
      'proposals': ['proposals', 'proposal', 'bill', 'legislation'],
      'issues': ['issues', 'issue', 'policy', 'policies'],
      'donors': ['donors', 'donor', 'donation', 'campaign finance', 'pac'],
      'propaganda': ['propaganda', 'misinformation', 'disinformation'],
      'conspiracies': ['conspiracies', 'conspiracy', 'cover-up'],
      'legal-cases': ['legal-cases', 'legal', 'lawsuit', 'court', 'trial', 'indictment'],
      'leaks': ['leaks', 'leak', 'whistleblower', 'exposed', 'documents'],
    };

    let whereConditions = and(
      eq(posts.type, 'blog'),
      eq(posts.privacy, 'public')
    );

    if (category && category !== 'all' && categoryMapping[category]) {
      const tags = categoryMapping[category];
      whereConditions = and(
        whereConditions,
        sql`(${posts.tags} && ARRAY[${sql.join(tags.map(t => sql`${t}`), sql`, `)}]::text[] OR LOWER(${posts.title}) LIKE ANY(ARRAY[${sql.join(tags.map(t => sql`${'%' + t + '%'}`), sql`, `)}]))`
      );
    }

    const results = await db
      .select({
        post: posts,
        author: users,
      })
      .from(posts)
      .innerJoin(users, eq(posts.authorId, users.id))
      .where(whereConditions)
      .orderBy(desc(posts.createdAt))
      .limit(limit)
      .offset(offset);

    return results.map(row => ({
      ...row.post,
      author: row.author,
    }));
  }

  async getPublicArticle(id: string): Promise<PostWithAuthor | undefined> {
    const results = await db
      .select({
        post: posts,
        author: users,
      })
      .from(posts)
      .innerJoin(users, eq(posts.authorId, users.id))
      .where(and(
        eq(posts.id, id),
        eq(posts.type, 'blog'),
        eq(posts.privacy, 'public')
      ))
      .limit(1);

    if (results.length === 0) return undefined;

    return {
      ...results[0].post,
      author: results[0].author,
    };
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
          linkPreview: originalPost.linkPreview,
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

  async getTrendingHashtags(limit = 10, hoursAgo = 72): Promise<Array<{ tag: string; count: number }>> {
    const cutoffTime = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
    
    // Get all posts from the last X hours (indexed query with limit to avoid full table scan)
    const recentPosts = await db
      .select({ content: posts.content, tags: posts.tags })
      .from(posts)
      .where(and(
        gte(posts.createdAt, cutoffTime),
        eq(posts.isDeleted, false)
      ))
      .orderBy(desc(posts.createdAt))
      .limit(1000); // Limit to most recent 1000 posts to prevent memory issues
    
    // Extract and count hashtags
    const hashtagCounts = new Map<string, number>();
    
    for (const post of recentPosts) {
      // Extract hashtags from content
      const hashtagRegex = /#(\w+)/g;
      let match;
      while ((match = hashtagRegex.exec(post.content)) !== null) {
        const tag = `#${match[1]}`;
        hashtagCounts.set(tag, (hashtagCounts.get(tag) || 0) + 1);
      }
      
      // Also count tags from the tags array
      if (post.tags && Array.isArray(post.tags)) {
        for (const tag of post.tags) {
          const formattedTag = tag.startsWith('#') ? tag : `#${tag}`;
          hashtagCounts.set(formattedTag, (hashtagCounts.get(formattedTag) || 0) + 1);
        }
      }
    }
    
    // Sort by count descending and return top N
    return Array.from(hashtagCounts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
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
        linkPreview: posts.linkPreview,
        sharesCount: posts.sharesCount,
        sharedPostId: posts.sharedPostId,
        eventId: posts.eventId,
        privacy: posts.privacy,
        emojiReactionsCount: posts.emojiReactionsCount,
        gifReactionsCount: posts.gifReactionsCount,
        bookmarksCount: posts.bookmarksCount,
        flagsCount: posts.flagsCount,
        isDeleted: posts.isDeleted,
        createdAt: posts.createdAt,
        // Volunteer fields
        volunteerTitle: posts.volunteerTitle,
        volunteerOrganization: posts.volunteerOrganization,
        volunteerLocation: posts.volunteerLocation,
        volunteerIsRemote: posts.volunteerIsRemote,
        volunteerStartDate: posts.volunteerStartDate,
        volunteerEndDate: posts.volunteerEndDate,
        volunteerCommitment: posts.volunteerCommitment,
        volunteerSkills: posts.volunteerSkills,
        volunteerRequirements: posts.volunteerRequirements,
        volunteerBenefits: posts.volunteerBenefits,
        volunteerSpotsTotal: posts.volunteerSpotsTotal,
        volunteerSpotsFilled: posts.volunteerSpotsFilled,
        volunteerContactEmail: posts.volunteerContactEmail,
        volunteerContactPhone: posts.volunteerContactPhone,
        volunteerCategory: posts.volunteerCategory,
        volunteerUrgency: posts.volunteerUrgency,
        // Poll fields
        pollId: polls.id,
        pollTitle: polls.title,
        pollDescription: polls.description,
        pollOptions: polls.options,
        pollVotingType: polls.votingType,
        pollIsBlockchainVerified: polls.isBlockchainVerified,
        pollTotalVotes: polls.totalVotes,
        pollEndDate: polls.endDate,
        pollIsActive: polls.isActive,
        author: {
          username: users.username,
          firstName: users.firstName,
          lastName: users.lastName,
          avatar: users.avatar,
        },
      })
      .from(posts)
      .leftJoin(users, eq(posts.authorId, users.id))
      .leftJoin(polls, eq(posts.id, polls.postId))
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
        linkPreview: posts.linkPreview,
        sharesCount: posts.sharesCount,
        sharedPostId: posts.sharedPostId,
        eventId: posts.eventId,
        privacy: posts.privacy,
        emojiReactionsCount: posts.emojiReactionsCount,
        gifReactionsCount: posts.gifReactionsCount,
        bookmarksCount: posts.bookmarksCount,
        flagsCount: posts.flagsCount,
        isDeleted: posts.isDeleted,
        createdAt: posts.createdAt,
        // Volunteer fields
        volunteerTitle: posts.volunteerTitle,
        volunteerOrganization: posts.volunteerOrganization,
        volunteerLocation: posts.volunteerLocation,
        volunteerIsRemote: posts.volunteerIsRemote,
        volunteerStartDate: posts.volunteerStartDate,
        volunteerEndDate: posts.volunteerEndDate,
        volunteerCommitment: posts.volunteerCommitment,
        volunteerSkills: posts.volunteerSkills,
        volunteerRequirements: posts.volunteerRequirements,
        volunteerBenefits: posts.volunteerBenefits,
        volunteerSpotsTotal: posts.volunteerSpotsTotal,
        volunteerSpotsFilled: posts.volunteerSpotsFilled,
        volunteerContactEmail: posts.volunteerContactEmail,
        volunteerContactPhone: posts.volunteerContactPhone,
        volunteerCategory: posts.volunteerCategory,
        volunteerUrgency: posts.volunteerUrgency,
        // Poll fields
        pollId: polls.id,
        pollTitle: polls.title,
        pollDescription: polls.description,
        pollOptions: polls.options,
        pollVotingType: polls.votingType,
        pollIsBlockchainVerified: polls.isBlockchainVerified,
        pollTotalVotes: polls.totalVotes,
        pollEndDate: polls.endDate,
        pollIsActive: polls.isActive,
        author: {
          username: users.username,
          firstName: users.firstName,
          lastName: users.lastName,
          avatar: users.avatar,
        },
      })
      .from(posts)
      .leftJoin(users, eq(posts.authorId, users.id))
      .leftJoin(polls, eq(posts.id, polls.postId))
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
        linkPreview: posts.linkPreview,
        sharesCount: posts.sharesCount,
        sharedPostId: posts.sharedPostId,
        eventId: posts.eventId,
        privacy: posts.privacy,
        emojiReactionsCount: posts.emojiReactionsCount,
        gifReactionsCount: posts.gifReactionsCount,
        bookmarksCount: posts.bookmarksCount,
        flagsCount: posts.flagsCount,
        isDeleted: posts.isDeleted,
        createdAt: posts.createdAt,
        // Poll fields
        pollId: polls.id,
        pollTitle: polls.title,
        pollDescription: polls.description,
        pollOptions: polls.options,
        pollVotingType: polls.votingType,
        pollIsBlockchainVerified: polls.isBlockchainVerified,
        pollTotalVotes: polls.totalVotes,
        pollEndDate: polls.endDate,
        pollIsActive: polls.isActive,
        author: {
          username: users.username,
          firstName: users.firstName,
          lastName: users.lastName,
          avatar: users.avatar,
        },
      })
      .from(posts)
      .leftJoin(users, eq(posts.authorId, users.id))
      .leftJoin(polls, eq(posts.id, polls.postId))
      .leftJoin(biasVotes, eq(biasVotes.postId, posts.id))
      .where(and(
        eq(posts.type, 'news'),
        eq(posts.isDeleted, false),
        gte(posts.createdAt, cutoffTimestamp),
        privacyFilter
      ))
      .groupBy(posts.id, users.id, polls.id)
      .orderBy(sql`
        COUNT(CASE WHEN ${biasVotes.vote} = 'Neutral' THEN 1 END) DESC,
        COUNT(${biasVotes.vote}) DESC,
        ${posts.createdAt} DESC
      `)
      .limit(limit)
      .offset(offset);
  }

  async getMyRepsFeed(userId: string, limit = 50): Promise<PostWithAuthor[]> {
    // Get names of the user's followed representatives
    const followedReps = await db
      .select()
      .from(followedRepresentatives)
      .where(eq(followedRepresentatives.userId, userId));

    if (followedReps.length === 0) return [];

    // Match their names to politician profiles to get handles
    const repNames = followedReps.map(r => r.name);
    const profiles = await db
      .select({ fullName: politicianProfiles.fullName, handle: politicianProfiles.handle })
      .from(politicianProfiles)
      .where(inArray(politicianProfiles.fullName, repNames));

    const handles = profiles.map(p => p.handle).filter(Boolean) as string[];
    if (handles.length === 0) return [];

    // Build tag conditions: any post where tags @> ARRAY['@Handle']
    const tagConditions = handles.map(h =>
      sql`${posts.tags} @> ARRAY[${`@${h}`}]::text[]`
    );

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
        linkPreview: posts.linkPreview,
        sharesCount: posts.sharesCount,
        sharedPostId: posts.sharedPostId,
        eventId: posts.eventId,
        privacy: posts.privacy,
        emojiReactionsCount: posts.emojiReactionsCount,
        gifReactionsCount: posts.gifReactionsCount,
        bookmarksCount: posts.bookmarksCount,
        flagsCount: posts.flagsCount,
        isDeleted: posts.isDeleted,
        createdAt: posts.createdAt,
        pollId: polls.id,
        pollTitle: polls.title,
        pollDescription: polls.description,
        pollOptions: polls.options,
        pollVotingType: polls.votingType,
        pollIsBlockchainVerified: polls.isBlockchainVerified,
        pollTotalVotes: polls.totalVotes,
        pollEndDate: polls.endDate,
        pollIsActive: polls.isActive,
        author: {
          username: users.username,
          firstName: users.firstName,
          lastName: users.lastName,
          avatar: users.avatar,
        },
      })
      .from(posts)
      .leftJoin(users, eq(posts.authorId, users.id))
      .leftJoin(polls, eq(posts.id, polls.postId))
      .where(and(
        eq(posts.isDeleted, false),
        eq(posts.privacy, 'public'),
        or(...tagConditions)
      ))
      .orderBy(desc(posts.createdAt))
      .limit(limit);
  }

  async getMyCandidatesFeed(userId: string, limit = 50): Promise<PostWithAuthor[]> {
    // Get candidates the user supports
    const supports = await db
      .select({ candidateUserId: candidates.userId })
      .from(candidateSupports)
      .innerJoin(candidates, eq(candidateSupports.candidateId, candidates.id))
      .where(eq(candidateSupports.userId, userId));

    if (supports.length === 0) return [];

    const candidateUserIds = supports.map(s => s.candidateUserId);

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
        linkPreview: posts.linkPreview,
        sharesCount: posts.sharesCount,
        sharedPostId: posts.sharedPostId,
        eventId: posts.eventId,
        privacy: posts.privacy,
        emojiReactionsCount: posts.emojiReactionsCount,
        gifReactionsCount: posts.gifReactionsCount,
        bookmarksCount: posts.bookmarksCount,
        flagsCount: posts.flagsCount,
        isDeleted: posts.isDeleted,
        createdAt: posts.createdAt,
        pollId: polls.id,
        pollTitle: polls.title,
        pollDescription: polls.description,
        pollOptions: polls.options,
        pollVotingType: polls.votingType,
        pollIsBlockchainVerified: polls.isBlockchainVerified,
        pollTotalVotes: polls.totalVotes,
        pollEndDate: polls.endDate,
        pollIsActive: polls.isActive,
        author: {
          username: users.username,
          firstName: users.firstName,
          lastName: users.lastName,
          avatar: users.avatar,
        },
      })
      .from(posts)
      .leftJoin(users, eq(posts.authorId, users.id))
      .leftJoin(polls, eq(posts.id, polls.postId))
      .where(and(
        eq(posts.isDeleted, false),
        eq(posts.privacy, 'public'),
        inArray(posts.authorId, candidateUserIds)
      ))
      .orderBy(desc(posts.createdAt))
      .limit(limit);
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
      .where(eq(polls.featured, true))
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

  async getGroupFeed(groupId: string, limit = 50): Promise<PostWithAuthor[]> {
    const members = await db
      .select({ userId: groupMembers.userId })
      .from(groupMembers)
      .where(eq(groupMembers.groupId, groupId));

    if (members.length === 0) return [];

    const memberIds = members.map(m => m.userId);

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
        linkPreview: posts.linkPreview,
        sharesCount: posts.sharesCount,
        sharedPostId: posts.sharedPostId,
        eventId: posts.eventId,
        privacy: posts.privacy,
        emojiReactionsCount: posts.emojiReactionsCount,
        gifReactionsCount: posts.gifReactionsCount,
        bookmarksCount: posts.bookmarksCount,
        flagsCount: posts.flagsCount,
        isDeleted: posts.isDeleted,
        createdAt: posts.createdAt,
        // Volunteer fields
        volunteerTitle: posts.volunteerTitle,
        volunteerOrganization: posts.volunteerOrganization,
        volunteerLocation: posts.volunteerLocation,
        volunteerIsRemote: posts.volunteerIsRemote,
        volunteerStartDate: posts.volunteerStartDate,
        volunteerEndDate: posts.volunteerEndDate,
        volunteerCommitment: posts.volunteerCommitment,
        volunteerSkills: posts.volunteerSkills,
        volunteerRequirements: posts.volunteerRequirements,
        volunteerBenefits: posts.volunteerBenefits,
        volunteerSpotsTotal: posts.volunteerSpotsTotal,
        volunteerSpotsFilled: posts.volunteerSpotsFilled,
        volunteerContactEmail: posts.volunteerContactEmail,
        volunteerContactPhone: posts.volunteerContactPhone,
        volunteerCategory: posts.volunteerCategory,
        volunteerUrgency: posts.volunteerUrgency,
        // Poll fields
        pollId: polls.id,
        pollTitle: polls.title,
        pollDescription: polls.description,
        pollOptions: polls.options,
        pollVotingType: polls.votingType,
        pollIsBlockchainVerified: polls.isBlockchainVerified,
        pollTotalVotes: polls.totalVotes,
        pollEndDate: polls.endDate,
        pollIsActive: polls.isActive,
        author: {
          username: users.username,
          firstName: users.firstName,
          lastName: users.lastName,
          avatar: users.avatar,
        },
      })
      .from(posts)
      .leftJoin(users, eq(posts.authorId, users.id))
      .leftJoin(polls, eq(posts.id, polls.postId))
      .where(and(
        eq(posts.isDeleted, false),
        eq(posts.privacy, 'public'),
        inArray(posts.authorId, memberIds),
      ))
      .orderBy(desc(posts.createdAt))
      .limit(limit);
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
    filters?: { level?: string; isCurrentlyServing?: boolean; search?: string }, 
    pagination?: { limit: number; offset: number }
  ): Promise<{ representatives: Representative[]; total: number }> {
    const limit = pagination?.limit || 50;
    const offset = pagination?.offset || 0;

    const conditions = [];
    if (filters) {
      if (filters.level) {
        conditions.push(eq(representatives.level, filters.level));
      }
      if (filters.isCurrentlyServing !== undefined) {
        conditions.push(eq(representatives.isCurrentlyServing, filters.isCurrentlyServing));
      }
      if (filters.search) {
        conditions.push(
          or(
            sql`${representatives.name} ILIKE ${`%${filters.search}%`}`,
            sql`${representatives.office} ILIKE ${`%${filters.search}%`}`,
            sql`${representatives.party} ILIKE ${`%${filters.search}%`}`,
            sql`${representatives.district} ILIKE ${`%${filters.search}%`}`,
            sql`${representatives.state} ILIKE ${`%${filters.search}%`}`
          )
        );
      }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [reps, totalResult] = await Promise.all([
      whereClause 
        ? db.select().from(representatives).where(whereClause).orderBy(representatives.name).limit(limit).offset(offset)
        : db.select().from(representatives).orderBy(representatives.name).limit(limit).offset(offset),
      whereClause
        ? db.select({ count: count() }).from(representatives).where(whereClause)
        : db.select({ count: count() }).from(representatives)
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
    if (zipCode) {
      return await db
        .select()
        .from(zipCodeLookups)
        .where(eq(zipCodeLookups.zipCode, zipCode))
        .orderBy(zipCodeLookups.zipCode);
    }
    return await db
      .select()
      .from(zipCodeLookups)
      .orderBy(zipCodeLookups.zipCode);
  }

  async upsertZipMapping(data: InsertZipCodeLookup): Promise<ZipCodeLookup> {
    // Check for existing mapping with same zipCode
    const existing = await db
      .select()
      .from(zipCodeLookups)
      .where(eq(zipCodeLookups.zipCode, data.zipCode));

    if (existing.length > 0) {
      // Update existing - merge representative IDs
      const existingIds = existing[0].representativeIds || [];
      const newIds = data.representativeIds || [];
      const mergedIds = [...new Set([...existingIds, ...newIds])];
      
      const [updated] = await db
        .update(zipCodeLookups)
        .set({
          representativeIds: mergedIds,
          searchedAt: new Date()
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
        .values({
          zipCode: data.zipCode,
          representativeIds: data.representativeIds || [],
        })
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
    const targetPositions = alias(politicalPositions, "target_positions");
    let query = db
      .select({
        politician: politicianProfiles,
        position: politicalPositions,
        targetPosition: targetPositions,
      })
      .from(politicianProfiles)
      .leftJoin(politicalPositions, eq(politicianProfiles.positionId, politicalPositions.id))
      .leftJoin(targetPositions, eq(politicianProfiles.targetPositionId, targetPositions.id));
    
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
    return results.map(r => ({ ...r.politician, position: r.position, targetPosition: r.targetPosition }));
  }

  async listPoliticiansWithSigs(): Promise<any[]> {
    const targetPositions = alias(politicalPositions, "target_positions");
    const results = await db
      .select({
        politician: politicianProfiles,
        position: politicalPositions,
        targetPosition: targetPositions,
      })
      .from(politicianProfiles)
      .leftJoin(politicalPositions, eq(politicianProfiles.positionId, politicalPositions.id))
      .leftJoin(targetPositions, eq(politicianProfiles.targetPositionId, targetPositions.id))
      .where(eq(politicianProfiles.isCurrent, true))
      .orderBy(
        sql`CASE ${politicianProfiles.corruptionGrade} WHEN 'A' THEN 1 WHEN 'B' THEN 2 WHEN 'C' THEN 3 WHEN 'D' THEN 4 WHEN 'F' THEN 5 ELSE 6 END`,
        politicianProfiles.fullName
      )
      .limit(2000);

    const politicians = results.map(r => ({ ...r.politician, position: r.position, targetPosition: r.targetPosition }));
    if (politicians.length === 0) return [];

    const ids = politicians.map(p => p.id);
    const sponsorships = await db
      .select({
        politicianId: politicianSigSponsorships.politicianId,
        acronym: specialInterestGroups.acronym,
        reportedAmount: politicianSigSponsorships.reportedAmount,
        relationshipType: politicianSigSponsorships.relationshipType,
      })
      .from(politicianSigSponsorships)
      .innerJoin(specialInterestGroups, eq(politicianSigSponsorships.sigId, specialInterestGroups.id))
      .where(inArray(politicianSigSponsorships.politicianId, ids));

    const sigMap = new Map<string, typeof sponsorships>();
    for (const s of sponsorships) {
      if (!sigMap.has(s.politicianId)) sigMap.set(s.politicianId, []);
      sigMap.get(s.politicianId)!.push(s);
    }

    const allDemerits = await db
      .select({ politicianId: politicianDemerits.politicianId, label: politicianDemerits.label, type: politicianDemerits.type })
      .from(politicianDemerits)
      .where(inArray(politicianDemerits.politicianId, ids));

    const demeritMap = new Map<string, Array<{ label: string; type: string }>>();
    for (const d of allDemerits) {
      if (!demeritMap.has(d.politicianId)) demeritMap.set(d.politicianId, []);
      demeritMap.get(d.politicianId)!.push({ label: d.label, type: d.type });
    }

    return politicians.map(p => {
      const sigs = sigMap.get(p.id) || [];
      const totalLobbyAmount = sigs.reduce((sum, s) => sum + (s.reportedAmount ?? 0), 0);
      const sigAcronyms = sigs
        .filter(s => s.acronym && s.relationshipType !== 'pledged_against')
        .map(s => s.acronym as string);
      const rejectsAIPAC = sigs.some(s => s.relationshipType === 'pledged_against');
      const demerits = demeritMap.get(p.id) || [];
      return { ...p, totalLobbyAmount, sigAcronyms, rejectsAIPAC, demerits };
    });
  }

  async getPoliticiansByPositionTitles(titles: string[]): Promise<any[]> {
    if (titles.length === 0) return [];
    const results = await db
      .select({
        politician: politicianProfiles,
        position: politicalPositions,
      })
      .from(politicianProfiles)
      .innerJoin(politicalPositions, eq(politicianProfiles.positionId, politicalPositions.id))
      .where(
        and(
          eq(politicianProfiles.isCurrent, true),
          inArray(politicalPositions.title, titles)
        )
      )
      .orderBy(politicalPositions.title);
    return results.map(r => ({ ...r.politician, position: r.position }));
  }

  async getPoliticiansByStateAndDistrict(stateName: string, congressionalDistricts: number[]): Promise<any[]> {
    // Return ALL politicians (incumbents + candidates) whose position jurisdiction matches the state
    // and whose position is a federal Senate or House office.
    // Ordered: incumbents first, then candidates alphabetically.
    const results = await db.execute(sql`
      SELECT pol.*, pos.title as pos_title, pos.office_type as pos_office_type,
             pos.level as pos_level, pos.jurisdiction as pos_jurisdiction,
             pos.district as pos_district, pos.term_length as pos_term_length,
             pos.is_elected as pos_is_elected, pos.display_order as pos_display_order,
             pos.id as pos_id
      FROM politician_profiles pol
      JOIN political_positions pos ON pol.position_id = pos.id
      WHERE pos.level = 'federal'
        AND (
          pos.jurisdiction ILIKE ${'%' + stateName + '%'}
          OR pos.title ILIKE ${'%' + stateName + '%'}
        )
        AND (
          pos.title ILIKE '%senator%'
          OR pos.title ILIKE '%senate%'
          OR pos.title ILIKE '%representative%'
          OR pos.office_type ILIKE '%house%'
          OR pos.office_type ILIKE '%senate%'
        )
      ORDER BY pol.is_current DESC, pol.full_name ASC
    `);
    return (results.rows as any[]).map(r => ({
      id: r.id,
      fullName: r.full_name,
      party: r.party,
      state: r.state,
      photoUrl: r.photo_url,
      handle: r.handle,
      corruptionGrade: r.corruption_grade,
      numericScore: r.numeric_score,
      isCurrent: r.is_current,
      isVerified: r.is_verified,
      profileType: r.profile_type,
      position: {
        id: r.pos_id,
        title: r.pos_title,
        officeType: r.pos_office_type,
        level: r.pos_level,
        jurisdiction: r.pos_jurisdiction,
        district: r.pos_district,
        termLength: r.pos_term_length,
        isElected: r.pos_is_elected,
        displayOrder: r.pos_display_order,
      },
    }));
  }

  async getPoliticianProfile(id: string): Promise<any> {
    const targetPositions = alias(politicalPositions, "target_positions");
    const [result] = await db
      .select({
        politician: politicianProfiles,
        position: politicalPositions,
        targetPosition: targetPositions,
      })
      .from(politicianProfiles)
      .leftJoin(politicalPositions, eq(politicianProfiles.positionId, politicalPositions.id))
      .leftJoin(targetPositions, eq(politicianProfiles.targetPositionId, targetPositions.id))
      .where(eq(politicianProfiles.id, id));
    
    if (!result) return undefined;
    return { ...result.politician, position: result.position, targetPosition: result.targetPosition };
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

  async searchPoliticians(q: string): Promise<any[]> {
    const targetPositions = alias(politicalPositions, "target_positions");
    const results = await db
      .select({
        politician: politicianProfiles,
        position: politicalPositions,
        targetPosition: targetPositions,
      })
      .from(politicianProfiles)
      .leftJoin(politicalPositions, eq(politicianProfiles.positionId, politicalPositions.id))
      .leftJoin(targetPositions, eq(politicianProfiles.targetPositionId, targetPositions.id))
      .where(
        or(
          ilike(politicianProfiles.fullName, `%${q}%`),
          ilike(politicianProfiles.handle, `%${q}%`)
        )
      )
      .orderBy(politicianProfiles.fullName)
      .limit(8);
    return results.map(r => ({ ...r.politician, position: r.position, targetPosition: r.targetPosition }));
  }

  async getPoliticianByHandle(handle: string): Promise<any | null> {
    const targetPositions = alias(politicalPositions, "target_positions");
    const results = await db
      .select({
        politician: politicianProfiles,
        position: politicalPositions,
        targetPosition: targetPositions,
      })
      .from(politicianProfiles)
      .leftJoin(politicalPositions, eq(politicianProfiles.positionId, politicalPositions.id))
      .leftJoin(targetPositions, eq(politicianProfiles.targetPositionId, targetPositions.id))
      .where(ilike(politicianProfiles.handle, handle))
      .limit(1);
    if (!results[0]) return null;
    return { ...results[0].politician, position: results[0].position, targetPosition: results[0].targetPosition };
  }

  async updatePoliticianPhoto(id: string, photoUrl: string): Promise<void> {
    await db
      .update(politicianProfiles)
      .set({ photoUrl, updatedAt: new Date() })
      .where(eq(politicianProfiles.id, id));
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

  // ─── Shared BallotPedia / Wikipedia helpers ──────────────────────────────

  private async _fetchEnrichedData(profile: { id?: string; fullName: string; website?: string | null; ballotpediaUrl?: string | null; state?: string | null }): Promise<{
    photoUrl?: string;
    website?: string;
    socialMedia?: Record<string, string>;
    biography?: string;
    totalContributions?: number;
    fecCandidateId?: string;
    runningForPositionTitle?: string; // detected "running for" office from BallotPedia
  }> {
    const result: { photoUrl?: string; website?: string; socialMedia?: Record<string, string>; biography?: string; totalContributions?: number; fecCandidateId?: string; runningForPositionTitle?: string } = {};

    // Try BallotPedia first
    if (profile.ballotpediaUrl) {
      try {
        const pageTitle = (profile.ballotpediaUrl as string).replace("https://ballotpedia.org/", "").split("?")[0];
        if (pageTitle) {
          const res = await fetch(
            `https://ballotpedia.org/api.php?action=query&titles=${encodeURIComponent(pageTitle)}&prop=pageimages|extlinks&pithumbsize=300&ellimit=max&format=json`,
            { headers: { "User-Agent": "ACPlatform/1.0 (contact@anticorruptionparty.us)" }, signal: AbortSignal.timeout(8000) }
          );
          if (res.ok) {
            const data: any = await res.json();
            const pages = data?.query?.pages;
            if (pages) {
              const page = Object.values(pages)[0] as any;
              if (page?.thumbnail?.source) result.photoUrl = page.thumbnail.source;
              const social: Record<string, string> = {};
              const links: string[] = (page?.extlinks || []).map((l: any) => l["*"] || "");
              for (const link of links) {
                if (!link) continue;
                if (!result.website && (link.includes(".gov") || link.includes(".org")) && !link.includes("twitter") && !link.includes("facebook")) {
                  result.website = link;
                }
                if (!social.twitter && (link.includes("twitter.com/") || link.includes("x.com/"))) social.twitter = link;
                if (!social.facebook && link.includes("facebook.com/")) social.facebook = link;
                if (!social.instagram && link.includes("instagram.com/")) social.instagram = link;
                if (!social.youtube && link.includes("youtube.com/")) social.youtube = link;
                if (!social.linkedin && link.includes("linkedin.com/")) social.linkedin = link;
              }
              if (Object.keys(social).length > 0) result.socialMedia = social;
            }
          }
        }
      } catch { /* ignore */ }
    }

    // Scrape BallotPedia HTML for total contributions (career total raised)
    try {
      const bpTitle = profile.fullName.trim().replace(/\s+/g, "_");
      const bpUrl = `https://ballotpedia.org/${encodeURIComponent(bpTitle)}`;
      const bpHtmlRes = await fetch(bpUrl, {
        headers: { "User-Agent": "ACPlatform/1.0 (contact@anticorruptionparty.us)", Accept: "text/html" },
        signal: AbortSignal.timeout(12000),
      });
      if (bpHtmlRes.ok) {
        const html = await bpHtmlRes.text();
        const $ = cheerio.load(html);
        let grandTotal = 0;

        // BallotPedia renders a "campaign contribution history" table with columns:
        // Year | Office | Status | Contributions | Expenditures
        // Some pages have an explicit "Grand total" row; others only list per-cycle rows.
        $("table").each((_, tbl) => {
          const tblText = $(tbl).text();
          if (!tblText.includes("campaign contribution history") &&
              !tblText.includes("ContributionsExpenditures")) return;

          let cycleSum = 0;
          let explicitTotal = 0;
          $(tbl).find("tr").each((_, row) => {
            const cells = $(row).find("td");
            if (cells.length < 4) return;
            const yearCell = $(cells[0]).text().trim();
            const contribCell = $(cells[3]).text().trim();
            const m = contribCell.match(/\$([\d,]+)/);
            if (!m) return;
            const v = parseInt(m[1].replace(/,/g, ""), 10);
            if (isNaN(v)) return;

            if (/grand total/i.test(yearCell)) {
              explicitTotal = v; // Use the explicit Grand total row if present
            } else if (/^\d{4}/.test(yearCell) || /\*/.test(yearCell)) {
              cycleSum += v; // Sum per-cycle contribution rows
            }
          });

          const best = explicitTotal > 0 ? explicitTotal : cycleSum;
          if (best > grandTotal) grandTotal = best;
        });

        if (grandTotal > 10000) {
          result.totalContributions = grandTotal; // store in dollars
        }

        // Detect "running for" office from BallotPedia page content.
        // BallotPedia often says "[Name] is running for [Office] in [Year]" or has
        // an elections row for the upcoming election year.
        if (!result.runningForPositionTitle) {
          const currentYear = new Date().getFullYear();
          const nextYear = currentYear + 1;

          // Pattern 1: prose text — "[Name] is running for X in YEAR"
          const bodyText = $("body").text();
          const runningForMatch = bodyText.match(
            new RegExp(`(?:is running for|announced (?:a )?(?:bid|candidacy|campaign|run) for|filed to run for|seeks|is seeking)\\s+([A-Z][\\w .()–-]{3,60})\\s+(?:in (?:${currentYear}|${nextYear})|election)`, "i")
          );
          if (runningForMatch) {
            const candidate = runningForMatch[1].trim().replace(/\s+/g, " ");
            if (candidate.length > 3 && candidate.length < 80) {
              result.runningForPositionTitle = candidate;
            }
          }

          // Pattern 2: elections table — find row with upcoming year where person is a candidate
          if (!result.runningForPositionTitle) {
            $("table").each((_, tbl) => {
              if (result.runningForPositionTitle) return;
              const tblText = $(tbl).text();
              if (!/election|race|candidacy/i.test(tblText)) return;
              $(tbl).find("tr").each((_, row) => {
                if (result.runningForPositionTitle) return;
                const cells = $(row).find("td");
                if (cells.length < 2) return;
                const yearCell = $(cells[0]).text().trim();
                if (!new RegExp(`${currentYear}|${nextYear}`).test(yearCell)) return;
                const officeCell = $(cells[1]).text().trim();
                if (officeCell.length > 3 && officeCell.length < 80) {
                  result.runningForPositionTitle = officeCell;
                }
              });
            });
          }
        }
      }
    } catch { /* ignore */ }

    // Try Wikipedia for photo fallback + biography
    try {
      const wikiName = profile.fullName.replace(/\s+/g, "_");
      const res = await fetch(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikiName)}`,
        { headers: { "User-Agent": "ACPlatform/1.0" }, signal: AbortSignal.timeout(6000) }
      );
      if (res.ok) {
        const data: any = await res.json();
        if (!result.photoUrl && data?.thumbnail?.source) result.photoUrl = data.thumbnail.source;
        if (data?.extract) result.biography = data.extract.slice(0, 800);
      }
    } catch { /* ignore */ }

    // FEC candidate ID lookup if not already known
    if (profile.id && !(profile as any).fecCandidateId) {
      try {
        const fecId = await this.lookupFecCandidateId(profile.fullName, profile.state ?? undefined);
        if (fecId) result.fecCandidateId = fecId;
      } catch { /* ignore */ }
    }

    return result;
  }

  async refreshProfileData(id: string): Promise<{ updated: boolean; fields: string[] }> {
    const profile = await this.getPoliticianProfile(id);
    if (!profile) return { updated: false, fields: [] };

    const enriched = await this._fetchEnrichedData(profile as any);
    const patch: Partial<PoliticianProfile> = {};
    const fields: string[] = [];

    if (enriched.photoUrl && !profile.photoUrl) { patch.photoUrl = enriched.photoUrl; fields.push("photoUrl"); }
    if (enriched.website && !profile.website) { patch.website = enriched.website; fields.push("website"); }
    if (enriched.biography && !profile.biography) { patch.biography = enriched.biography; fields.push("biography"); }
    if (enriched.socialMedia) {
      const existing = (profile.socialMedia as Record<string, string>) || {};
      const merged = { ...enriched.socialMedia, ...existing }; // don't overwrite existing
      if (JSON.stringify(merged) !== JSON.stringify(existing)) { patch.socialMedia = merged; fields.push("socialMedia"); }
    }
    if (enriched.totalContributions != null) {
      (patch as any).totalContributions = enriched.totalContributions;
      fields.push("totalContributions");
    }
    if (enriched.fecCandidateId && !(profile as any).fecCandidateId) {
      (patch as any).fecCandidateId = enriched.fecCandidateId;
      fields.push("fecCandidateId");
    }

    // If BallotPedia indicated a "running for" office, try to match it to a known position
    // and set targetPositionId when the detected office differs from the current position
    if (enriched.runningForPositionTitle && !(profile as any).targetPositionId) {
      try {
        const titleLower = enriched.runningForPositionTitle.toLowerCase();
        const matchedPos = await db
          .select({ id: politicalPositions.id, title: politicalPositions.title })
          .from(politicalPositions)
          .where(ilike(politicalPositions.title, `%${enriched.runningForPositionTitle}%`))
          .limit(5);

        // Pick best match: exact or starts-with
        const best = matchedPos.find(p => p.title.toLowerCase() === titleLower)
          || matchedPos.find(p => p.title.toLowerCase().startsWith(titleLower.substring(0, 12)))
          || matchedPos[0];

        if (best && best.id !== (profile as any).positionId) {
          (patch as any).targetPositionId = best.id;
          fields.push("targetPositionId");
        }
      } catch { /* ignore */ }
    }

    if (fields.length === 0) return { updated: false, fields: [] };
    await this.updatePoliticianProfile(id, patch);
    return { updated: true, fields };
  }

  async refreshAllProfilesData(): Promise<{ updated: number; skipped: number }> {
    const allProfiles = await db
      .select({ id: politicianProfiles.id, fullName: politicianProfiles.fullName, photoUrl: politicianProfiles.photoUrl, website: politicianProfiles.website, biography: politicianProfiles.biography, socialMedia: politicianProfiles.socialMedia, totalContributions: politicianProfiles.totalContributions })
      .from(politicianProfiles);

    let updated = 0, skipped = 0;
    for (const p of allProfiles) {
      if (p.photoUrl && p.website && p.biography && p.totalContributions != null) { skipped++; continue; }
      const result = await this.refreshProfileData(p.id);
      if (result.updated) updated++; else skipped++;
      await new Promise(r => setTimeout(r, 80)); // gentle rate-limit
    }
    return { updated, skipped };
  }

  async setPoliticianClaimToken(id: string, token: string, expiry: Date): Promise<void> {
    await db
      .update(politicianProfiles)
      .set({ claimToken: token, claimTokenExpiry: expiry, updatedAt: new Date() } as any)
      .where(eq(politicianProfiles.id, id));
  }

  async verifyClaimToken(token: string): Promise<PoliticianProfile | null> {
    const [profile] = await db
      .select()
      .from(politicianProfiles)
      .where(eq((politicianProfiles as any).claimToken, token))
      .limit(1);
    if (!profile) return null;
    const expiry = (profile as any).claimTokenExpiry;
    if (!expiry || new Date() > new Date(expiry)) return null;
    return profile;
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

  // Special Interest Groups (SIGs)
  async listSpecialInterestGroups(filters?: { category?: string; industry?: string; search?: string; isActive?: boolean }): Promise<SpecialInterestGroup[]> {
    let query = db.select().from(specialInterestGroups);
    const conditions = [];
    
    if (filters?.category) {
      conditions.push(eq(specialInterestGroups.category, filters.category));
    }
    if (filters?.industry) {
      conditions.push(eq(specialInterestGroups.industry, filters.industry));
    }
    if (filters?.search) {
      conditions.push(
        or(
          sql`${specialInterestGroups.name} ILIKE ${'%' + filters.search + '%'}`,
          sql`${specialInterestGroups.acronym} ILIKE ${'%' + filters.search + '%'}`
        )
      );
    }
    if (filters?.isActive !== undefined) {
      conditions.push(eq(specialInterestGroups.isActive, filters.isActive));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    return await query.orderBy(specialInterestGroups.name);
  }

  async getSpecialInterestGroup(id: string): Promise<SpecialInterestGroup | undefined> {
    const [sig] = await db
      .select()
      .from(specialInterestGroups)
      .where(eq(specialInterestGroups.id, id));
    return sig || undefined;
  }

  async createSpecialInterestGroup(data: InsertSpecialInterestGroup): Promise<SpecialInterestGroup> {
    const [sig] = await db
      .insert(specialInterestGroups)
      .values(data)
      .returning();
    return sig;
  }

  async updateSpecialInterestGroup(id: string, patch: Partial<SpecialInterestGroup>): Promise<SpecialInterestGroup> {
    const [sig] = await db
      .update(specialInterestGroups)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(specialInterestGroups.id, id))
      .returning();
    return sig;
  }

  async deleteSpecialInterestGroup(id: string): Promise<void> {
    await db
      .delete(specialInterestGroups)
      .where(eq(specialInterestGroups.id, id));
  }

  async getSigCategories(): Promise<string[]> {
    const results = await db
      .selectDistinct({ category: specialInterestGroups.category })
      .from(specialInterestGroups)
      .where(sql`${specialInterestGroups.category} IS NOT NULL`);
    return results.map(r => r.category).filter(Boolean) as string[];
  }

  async getSigIndustries(): Promise<string[]> {
    const results = await db
      .selectDistinct({ industry: specialInterestGroups.industry })
      .from(specialInterestGroups)
      .where(sql`${specialInterestGroups.industry} IS NOT NULL`);
    return results.map(r => r.industry).filter(Boolean) as string[];
  }

  async getPublicSigs(filters?: { category?: string; sentiment?: string }): Promise<SpecialInterestGroup[]> {
    const conditions: any[] = [eq(specialInterestGroups.isActive, true)];
    if (filters?.category) conditions.push(eq(specialInterestGroups.category, filters.category));
    if (filters?.sentiment) conditions.push(eq(specialInterestGroups.sentiment as any, filters.sentiment));
    return await db
      .select()
      .from(specialInterestGroups)
      .where(and(...conditions))
      .orderBy(specialInterestGroups.name);
  }

  async getPublicSigByTag(tag: string, userId?: string): Promise<{ sig: SpecialInterestGroup; politicians: any[]; totalContributions: number; communityScore: number | null; voteCount: number; userVote: number | null; connectedLobbies: any[] } | null> {
    const [sig] = await db
      .select()
      .from(specialInterestGroups)
      .where(eq(specialInterestGroups.tag as any, tag));
    if (!sig) return null;

    const sponsorships = await db
      .select({
        sponsorship: politicianSigSponsorships,
        politician: politicianProfiles,
      })
      .from(politicianSigSponsorships)
      .innerJoin(politicianProfiles, eq(politicianSigSponsorships.politicianId, politicianProfiles.id))
      .where(eq(politicianSigSponsorships.sigId, sig.id));

    const politicians = sponsorships.map(r => ({
      ...r.politician,
      relationshipType: r.sponsorship.relationshipType,
      reportedAmount: r.sponsorship.reportedAmount,
      disclosureUrl: r.sponsorship.disclosureUrl,
      disclosureSource: r.sponsorship.disclosureSource,
    }));

    // Total contributions (sum of all linked politician sponsorship amounts, in cents)
    const totalContributions = sponsorships.reduce((sum, r) => sum + (r.sponsorship.reportedAmount ?? 0), 0);

    // Community vote aggregates
    const voteRows = await db
      .select({ vote: sigCommunityVotes.vote })
      .from(sigCommunityVotes)
      .where(eq(sigCommunityVotes.sigId, sig.id));
    const voteCount = voteRows.length;
    const communityScore = voteCount > 0 ? voteRows.reduce((s, v) => s + v.vote, 0) / voteCount : null;

    // Current user's vote (if logged in)
    let userVote: number | null = null;
    if (userId) {
      const [myVote] = await db
        .select({ vote: sigCommunityVotes.vote })
        .from(sigCommunityVotes)
        .where(and(eq(sigCommunityVotes.sigId, sig.id), eq(sigCommunityVotes.userId, userId)));
      if (myVote) userVote = myVote.vote;
    }

    // Connected lobbies — other SIGs that share at least one politician with this one
    const politicianIds = sponsorships.map(r => r.politician.id);
    let connectedLobbies: any[] = [];
    if (politicianIds.length > 0) {
      const connected = await db.execute(sql`
        SELECT s.id, s.name, s.tag, s.category, s.sentiment, s.is_ace,
               COUNT(DISTINCT pss.politician_id) AS shared_count
        FROM politician_sig_sponsorships pss
        JOIN special_interest_groups s ON s.id = pss.sig_id
        WHERE pss.politician_id = ANY(${politicianIds}::varchar[])
          AND pss.sig_id != ${sig.id}
        GROUP BY s.id, s.name, s.tag, s.category, s.sentiment, s.is_ace
        ORDER BY shared_count DESC
        LIMIT 12
      `);
      connectedLobbies = (connected.rows as any[]).map(r => ({
        id: r.id,
        name: r.name,
        tag: r.tag,
        category: r.category,
        sentiment: r.sentiment,
        isAce: r.is_ace,
        sharedCount: Number(r.shared_count),
      }));
    }

    // Top 10 recipients by reported amount
    const top10Recipients = politicians
      .filter(p => typeof p.reportedAmount === "number" && p.reportedAmount > 0)
      .sort((a, b) => (b.reportedAmount ?? 0) - (a.reportedAmount ?? 0))
      .slice(0, 10)
      .map(p => ({
        id: p.id,
        fullName: p.fullName,
        party: p.party,
        state: p.state,
        photoUrl: p.photoUrl,
        handle: p.handle,
        corruptionGrade: p.corruptionGrade,
        reportedAmount: p.reportedAmount,
        disclosureUrl: p.disclosureUrl,
      }));

    return { sig, politicians, totalContributions, communityScore, voteCount, userVote, connectedLobbies, top10Recipients };
  }

  async updateSigInfluence(sigId: string, influenceScore: number | null, letterGrade: string | null): Promise<void> {
    await db.execute(sql`
      UPDATE special_interest_groups
      SET influence_score = ${influenceScore}, letter_grade = ${letterGrade}, updated_at = NOW()
      WHERE id = ${sigId}
    `);
  }

  async submitSigCommunityVote(sigId: string, userId: string, vote: number): Promise<SigCommunityVote> {
    const clamped = Math.max(-50, Math.min(50, Math.round(vote)));
    const result = await db.execute(sql`
      INSERT INTO sig_community_votes (id, sig_id, user_id, vote, created_at, updated_at)
      VALUES (gen_random_uuid(), ${sigId}, ${userId}, ${clamped}, NOW(), NOW())
      ON CONFLICT (sig_id, user_id) DO UPDATE SET vote = ${clamped}, updated_at = NOW()
      RETURNING *
    `);
    return (result.rows[0] as any) as SigCommunityVote;
  }

  async seedSigsXlsx(sigs: Array<{ name: string; tag: string; description: string; category: string; sentiment: string; dataSourceName: string; dataSourceUrl: string; disclosureNotes?: string }>): Promise<number> {
    let upserted = 0;
    for (const s of sigs) {
      await db.execute(sql`
        INSERT INTO special_interest_groups (id, name, tag, description, category, sentiment, data_source_name, data_source_url, disclosure_notes, is_active, created_at, updated_at)
        VALUES (gen_random_uuid(), ${s.name}, ${s.tag}, ${s.description}, ${s.category}, ${s.sentiment}, ${s.dataSourceName}, ${s.dataSourceUrl}, ${s.disclosureNotes || null}, true, NOW(), NOW())
        ON CONFLICT (tag) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          category = EXCLUDED.category,
          sentiment = EXCLUDED.sentiment,
          data_source_name = EXCLUDED.data_source_name,
          data_source_url = EXCLUDED.data_source_url,
          disclosure_notes = EXCLUDED.disclosure_notes,
          updated_at = NOW()
      `);
      upserted++;
    }
    return upserted;
  }

  // Politician SIG Sponsorships
  async listPoliticianSponsors(politicianId: string): Promise<any[]> {
    const results = await db
      .select({
        sponsorship: politicianSigSponsorships,
        sig: specialInterestGroups,
      })
      .from(politicianSigSponsorships)
      .innerJoin(specialInterestGroups, eq(politicianSigSponsorships.sigId, specialInterestGroups.id))
      .where(eq(politicianSigSponsorships.politicianId, politicianId))
      .orderBy(desc(politicianSigSponsorships.reportedAmount));
    
    return results.map(r => ({
      ...r.sponsorship,
      sig: r.sig,
    }));
  }

  async linkSponsorToPolitician(data: InsertPoliticianSigSponsorship): Promise<PoliticianSigSponsorship> {
    const [sponsorship] = await db
      .insert(politicianSigSponsorships)
      .values(data)
      .onConflictDoUpdate({
        target: [politicianSigSponsorships.politicianId, politicianSigSponsorships.sigId],
        set: {
          relationshipType: data.relationshipType,
          reportedAmount: data.reportedAmount ?? null,
          notes: data.notes ?? null,
          sigRank: data.sigRank ?? null,
          disclosureSource: data.disclosureSource ?? null,
          disclosureUrl: data.disclosureUrl ?? null,
          contributionPeriod: data.contributionPeriod ?? null,
          updatedAt: new Date(),
        },
      })
      .returning();
    return sponsorship;
  }

  async updatePoliticianSponsorship(id: string, patch: Partial<PoliticianSigSponsorship>): Promise<PoliticianSigSponsorship> {
    const [sponsorship] = await db
      .update(politicianSigSponsorships)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(politicianSigSponsorships.id, id))
      .returning();
    return sponsorship;
  }

  async recalculateGradeFromSigs(politicianId: string): Promise<string> {
    const sponsorships = await this.listPoliticianSponsors(politicianId);
    let weightedScore = 0;
    for (const s of sponsorships) {
      if (!s.sig) continue;
      const rankMultiplier = s.sigRank ? 1 / s.sigRank : 1.0;
      if (s.sig.isAce) {
        weightedScore -= (s.sig.gradeWeight ?? 1.0) * rankMultiplier * 500_000;
      } else {
        const amount = s.reportedAmount ?? 0;
        weightedScore += amount * (s.sig.gradeWeight ?? 1.0) * rankMultiplier;
      }
    }
    let grade: string;
    if (weightedScore <= 0) grade = 'A';
    else if (weightedScore < 100_000) grade = 'B';
    else if (weightedScore < 500_000) grade = 'C';
    else if (weightedScore < 1_000_000) grade = 'D';
    else grade = 'F';
    await db.update(politicianProfiles)
      .set({ corruptionGrade: grade })
      .where(eq(politicianProfiles.id, politicianId));
    return grade;
  }

  // ─── Grading Config ───────────────────────────────────────────────────────

  async getGradingConfig(): Promise<GradingAlgorithmSettings> {
    const [row] = await db.select().from(gradingAlgorithmSettings).limit(1);
    if (row) return row;
    // Seed defaults
    const [created] = await db.insert(gradingAlgorithmSettings).values({}).returning();
    return created;
  }

  async updateGradingConfig(patch: Partial<GradingAlgorithmSettings>): Promise<GradingAlgorithmSettings> {
    const existing = await this.getGradingConfig();
    const [updated] = await db
      .update(gradingAlgorithmSettings)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(gradingAlgorithmSettings.id, existing.id))
      .returning();
    return updated;
  }

  // ─── FEC Data Fetching ─────────────────────────────────────────────────────

  async lookupFecCandidateId(name: string, state?: string, office?: string): Promise<string | null> {
    try {
      const params = new URLSearchParams({ q: name, api_key: process.env.FEC_API_KEY ?? '', per_page: '5' });
      if (state) params.set('state', state);
      if (office) params.set('office', office);
      const res = await fetch(`https://api.open.fec.gov/v1/candidates/search/?${params}`, {
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) return null;
      const data: any = await res.json();
      const results: any[] = data?.results ?? [];
      if (results.length === 0) return null;
      // Prefer active candidate (has_raised_funds) with name closest to query
      const sorted = results.sort((a: any, b: any) => {
        const aActive = a.has_raised_funds ? 0 : 1;
        const bActive = b.has_raised_funds ? 0 : 1;
        return aActive - bActive;
      });
      return sorted[0]?.candidate_id ?? null;
    } catch { return null; }
  }

  async fetchFecCandidateTotals(fecCandidateId: string): Promise<{ individualShare: number; smallDollarShare: number; committeeShare: number; selfFundingShare: number; receipts: number } | null> {
    // Check cache — skip if fetched within 48 hours
    const [cached] = await db
      .select()
      .from(fecCandidateTotals)
      .where(eq(fecCandidateTotals.fecCandidateId, fecCandidateId))
      .orderBy(desc(fecCandidateTotals.fetchedAt))
      .limit(1);

    const cacheExpiry = 48 * 60 * 60 * 1000; // 48 hours in ms
    if (cached && cached.fetchedAt && (Date.now() - new Date(cached.fetchedAt).getTime()) < cacheExpiry) {
      return this._computeFecMetrics(cached);
    }

    // Fetch fresh from FEC
    try {
      const params = new URLSearchParams({
        api_key: process.env.FEC_API_KEY ?? '',
        sort: '-cycle',
        per_page: '1',
      });
      const res = await fetch(`https://api.open.fec.gov/v1/candidate/${fecCandidateId}/totals/?${params}`, {
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) return cached ? this._computeFecMetrics(cached) : null;
      const data: any = await res.json();
      const result = data?.results?.[0];
      if (!result) return null;

      const [saved] = await db.insert(fecCandidateTotals).values({
        fecCandidateId,
        cycle: result.cycle ?? null,
        receipts: result.receipts ?? null,
        individualContributions: result.individual_contributions ?? null,
        individualUnitemized: result.individual_unitemized_contributions ?? null,
        partyContributions: result.party_full ?? null,
        otherCommitteeContributions: result.other_political_committee_contributions ?? null,
        candidateContribution: result.candidate_contribution ?? null,
        loansFromCandidate: result.loans_from_candidate ?? null,
        payloadJson: result,
        fetchedAt: new Date(),
      }).returning();
      return this._computeFecMetrics(saved);
    } catch { return cached ? this._computeFecMetrics(cached) : null; }
  }

  private _computeFecMetrics(row: FecCandidateTotals): { individualShare: number; smallDollarShare: number; committeeShare: number; selfFundingShare: number; receipts: number } {
    const receipts = row.receipts ?? 0;
    if (receipts === 0) return { individualShare: 0, smallDollarShare: 0, committeeShare: 0, selfFundingShare: 0, receipts: 0 };
    const individual = row.individualContributions ?? 0;
    const unitemized = row.individualUnitemized ?? 0;
    const committee = row.otherCommitteeContributions ?? 0;
    const selfFunding = (row.candidateContribution ?? 0) + (row.loansFromCandidate ?? 0);
    return {
      receipts,
      individualShare: individual / receipts,
      smallDollarShare: individual > 0 ? unitemized / individual : 0,
      committeeShare: committee / receipts,
      selfFundingShare: selfFunding / receipts,
    };
  }

  // ─── Grading Algorithm ─────────────────────────────────────────────────────

  async computePoliticianGrade(politicianId: string): Promise<{ grade: string; numericScore: number; explanation: any }> {
    const config = await this.getGradingConfig();
    const profile = await this.getPoliticianProfile(politicianId);
    if (!profile) throw new Error(`Profile ${politicianId} not found`);

    const explanation: any = { sources: [], metrics: {} };

    // ── DataScore ──────────────────────────────────────────────────────────
    let dataScore = 100;
    const fecId = (profile as any).fecCandidateId as string | null;
    if (fecId) {
      const fec = await this.fetchFecCandidateTotals(fecId);
      if (fec) {
        explanation.sources.push('FEC');
        explanation.metrics.fec = fec;
        const committeePenalty = config.committeeSharePenalty * fec.committeeShare;
        const smallDollarBonusAmt = config.smallDollarBonus * fec.smallDollarShare;
        const indivBonus = fec.individualShare > 0.5 ? config.individualShareBonus * (fec.individualShare - 0.5) * 2 : 0;
        dataScore -= committeePenalty;
        dataScore += smallDollarBonusAmt;
        dataScore += indivBonus;
        explanation.metrics.committeePenalty = committeePenalty;
        explanation.metrics.smallDollarBonus = smallDollarBonusAmt;
        explanation.metrics.individualBonus = indivBonus;
      }
    }

    // SIG money penalty within DataScore
    const sponsorships = await this.listPoliticianSponsors(politicianId);
    let sigWeightedScore = 0;
    for (const s of sponsorships) {
      if (!s.sig || s.sig.isAce) continue;
      const rankMult = s.sigRank ? 1 / s.sigRank : 1.0;
      sigWeightedScore += (s.reportedAmount ?? 0) * (s.sig.gradeWeight ?? 1.0) * rankMult;
    }
    // Normalize: $1M+ in SIG money → full penalty; map to 0–1 scale
    const sigNorm = Math.min(sigWeightedScore / 1_000_000, 1.0);
    const sigPenalty = config.sigMoneyWeight * sigNorm;
    dataScore -= sigPenalty;
    explanation.sources.push('SIG');
    explanation.metrics.sigWeightedScore = sigWeightedScore;
    explanation.metrics.sigPenalty = sigPenalty;
    dataScore = Math.max(0, Math.min(100, dataScore));

    // ── PledgeScore ───────────────────────────────────────────────────────
    let pledgeScore = 100; // start optimistic
    let aceCount = 0;
    for (const s of sponsorships) {
      if (!s.sig) continue;
      if (s.sig.isAce) {
        aceCount++;
      } else {
        // Non-ACE SIG money reduces pledge score
        const tierPenalty = sigWeightedScore > 1_000_000 ? 80 : sigWeightedScore > 500_000 ? 60 : sigWeightedScore > 100_000 ? 40 : sigWeightedScore > 0 ? 20 : 0;
        pledgeScore = Math.max(0, 100 - tierPenalty);
        break;
      }
    }
    if (aceCount > 0) pledgeScore = Math.min(100, pledgeScore + aceCount * 20);
    pledgeScore = Math.max(0, Math.min(100, pledgeScore));
    explanation.metrics.aceCount = aceCount;
    explanation.metrics.pledgeScore = pledgeScore;

    // ── CommunityAdj ──────────────────────────────────────────────────────
    const communityAdj = Math.max(-5, Math.min(5, (profile as any).communityAdj ?? 0));
    const communityAdjNorm = communityAdj * 20; // map ±5 → ±100

    // ── FinalScore ────────────────────────────────────────────────────────
    const finalScore = Math.max(0, Math.min(100,
      config.dataScoreWeight * dataScore +
      config.pledgeScoreWeight * pledgeScore +
      config.communityAdjWeight * communityAdjNorm
    ));

    explanation.metrics.dataScore = dataScore;
    explanation.metrics.finalScore = finalScore;
    explanation.weights = {
      dataScoreWeight: config.dataScoreWeight,
      pledgeScoreWeight: config.pledgeScoreWeight,
      communityAdjWeight: config.communityAdjWeight,
    };

    // ── Letter Grade ──────────────────────────────────────────────────────
    let grade: string;
    if (finalScore >= config.gradeACutoff) grade = 'A';
    else if (finalScore >= config.gradeBCutoff) grade = 'B';
    else if (finalScore >= config.gradeCCutoff) grade = 'C';
    else if (finalScore >= config.gradeDCutoff) grade = 'D';
    else grade = 'F';

    // ── SuperPAC / SIG Grade Ceiling ──────────────────────────────────────
    // Caps the letter grade based on raw dollar intake from non-ACE SIGs.
    // Amounts are stored in cents; thresholds in the config are in dollars.
    if (config.enablePacCeiling) {
      const rawSigDollars = sponsorships
        .filter(s => s.sig && !s.sig.isAce)
        .reduce((sum, s) => sum + (s.reportedAmount ?? 0), 0) / 100;

      const GRADE_ORDER = ['A', 'B', 'C', 'D', 'F'];
      let ceiling: string | null = null;

      if (rawSigDollars >= config.pacCeilingFThreshold) ceiling = 'F';
      else if (rawSigDollars >= config.pacCeilingDThreshold) ceiling = 'D';
      else if (rawSigDollars >= config.pacCeilingCThreshold) ceiling = 'C';
      else if (rawSigDollars > config.pacCeilingBThreshold) ceiling = 'B';

      if (ceiling && GRADE_ORDER.indexOf(grade) < GRADE_ORDER.indexOf(ceiling)) {
        explanation.metrics.pacCeilingApplied = ceiling;
        explanation.metrics.pacCeilingRawDollars = rawSigDollars;
        grade = ceiling;
      }
    }

    // Persist
    await db.update(politicianProfiles).set({
      corruptionGrade: grade,
      numericScore: finalScore,
      gradeExplanation: explanation,
    } as any).where(eq(politicianProfiles.id, politicianId));

    return { grade, numericScore: finalScore, explanation };
  }

  async regradeAllProfiles(): Promise<{ scanned: number; regraded: number; errors: string[] }> {
    const all = await db.select({ id: politicianProfiles.id }).from(politicianProfiles);
    const scanned = all.length;
    let regraded = 0;
    const errors: string[] = [];
    for (const p of all) {
      try {
        await this.computePoliticianGrade(p.id);
        regraded++;
      } catch (e: any) {
        errors.push(`${p.id}: ${e?.message ?? 'unknown error'}`);
      }
      await new Promise(r => setTimeout(r, 50)); // avoid hammering FEC/DB
    }
    return { scanned, regraded, errors };
  }

  async setCommunityAdj(politicianId: string, adj: number): Promise<void> {
    const clamped = Math.max(-5, Math.min(5, adj));
    await db.update(politicianProfiles).set({ communityAdj: clamped } as any).where(eq(politicianProfiles.id, politicianId));
  }

  async importCongress(): Promise<{
    profiles_created: number;
    profiles_updated: number;
    positions_created: number;
    sigs_created: number;
    sponsorships_created: number;
  }> {
    const pathMod = await import('path');
    const XLSXMod = await import('xlsx');

    const filePath = pathMod.default.join(process.cwd(), 'attached_assets/ALL-CONGRESS-AIPAC_1772667997732.xlsx');
    const workbook = XLSXMod.default.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: any[] = XLSXMod.default.utils.sheet_to_json(sheet);

    const STATE_NAMES: Record<string, string> = {
      AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
      CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia",
      HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
      KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
      MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri",
      MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey",
      NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio",
      OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
      SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont",
      VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
      DC: "Washington D.C.", AS: "American Samoa", GU: "Guam", MP: "Northern Mariana Islands",
      PR: "Puerto Rico", VI: "U.S. Virgin Islands",
    };

    function toOrdinal(n: number): string {
      const s = ["th", "st", "nd", "rd"];
      const v = n % 100;
      return n + (s[(v - 20) % 10] || s[v] || s[0]);
    }

    function makePositionInfo(district: string): { title: string; termLength: number; districtLabel?: string; stateName: string } {
      const [stateCode, districtCode] = district.split('-');
      const stateName = STATE_NAMES[stateCode] || stateCode;
      if (districtCode === 'SEN') {
        return { title: `U.S. Senator from ${stateName}`, termLength: 6, stateName };
      } else if (districtCode === 'AL') {
        return { title: `U.S. Representative from ${stateName} (At-Large)`, termLength: 2, districtLabel: 'At-Large', stateName };
      } else {
        const num = parseInt(districtCode, 10);
        const ordinal = toOrdinal(num);
        return {
          title: `U.S. Representative, ${stateName}'s ${ordinal} Congressional District`,
          termLength: 2,
          districtLabel: `${ordinal} Congressional District`,
          stateName,
        };
      }
    }

    function calcGrade(totalLobby: number, rejectsAIPAC: boolean): string {
      if (rejectsAIPAC) return 'A';
      if (totalLobby > 1_000_000) return 'F';
      if (totalLobby >= 100_000) return 'D';
      return 'C';
    }

    const SKIP_GROUPS = new Set(['Data Not Provided', '', 'N/A', 'n/a']);

    function cleanAcronym(raw: string): string {
      return raw.replace(/\s*\(.*?\)/g, '').trim();
    }

    // Step 1: Collect all unique lobby group acronyms
    const allAcronyms = new Set<string>();
    for (const row of rows) {
      const lg = String(row['Lobby Groups'] || '').trim();
      if (lg) {
        for (const a of lg.split(',').map((s: string) => cleanAcronym(s)).filter(Boolean)) {
          if (!SKIP_GROUPS.has(a)) allAcronyms.add(a);
        }
      }
    }

    // Step 2: Upsert SIGs
    const existingSigs = await db.select().from(specialInterestGroups);
    const sigByAcronym = new Map<string, string>();
    for (const sig of existingSigs) {
      if (sig.acronym) sigByAcronym.set(sig.acronym, sig.id);
    }

    let sigs_created = 0;
    for (const acronym of allAcronyms) {
      if (!sigByAcronym.has(acronym)) {
        const isAIPAC = acronym === 'AIPAC';
        const [newSig] = await db.insert(specialInterestGroups).values({
          name: isAIPAC ? 'American Israel Public Affairs Committee' : acronym,
          acronym,
          description: isAIPAC
            ? 'AIPAC is a powerful pro-Israel lobbying organization that advocates for strong U.S.-Israel relations and influences U.S. foreign policy in the Middle East.'
            : 'Israel lobby group tracked by TrackAIPAC.com. Source: https://www.trackaipac.com/endorsements',
          category: 'pac',
          industry: 'foreign policy',
          website: isAIPAC ? 'https://www.aipac.org' : undefined,
          isActive: true,
        }).returning();
        sigByAcronym.set(acronym, newSig.id);
        sigs_created++;
      }
    }

    // Step 3: Upsert positions
    const existingPositions = await db.select().from(politicalPositions);
    const positionByTitle = new Map<string, string>();
    for (const pos of existingPositions) {
      positionByTitle.set(pos.title, pos.id);
    }

    let positions_created = 0;
    const uniqueDistricts = [...new Set(rows.map((r: any) => String(r['District'] || '').trim()).filter(Boolean))];
    for (const district of uniqueDistricts) {
      const { title, termLength, districtLabel, stateName } = makePositionInfo(district);
      if (!positionByTitle.has(title)) {
        const [newPos] = await db.insert(politicalPositions).values({
          title,
          officeType: 'Legislative',
          level: 'federal',
          jurisdiction: stateName,
          district: districtLabel,
          termLength,
          isElected: true,
          isActive: true,
        }).returning();
        positionByTitle.set(title, newPos.id);
        positions_created++;
      }
    }

    // Step 4 & 5: Upsert profiles and sponsorships
    const existingProfiles = await db.select().from(politicianProfiles);
    const profileByName = new Map<string, string>();
    for (const p of existingProfiles) {
      profileByName.set(p.fullName.toLowerCase(), p.id);
    }

    let profiles_created = 0;
    let profiles_updated = 0;
    let sponsorships_created = 0;

    for (const row of rows) {
      const fullName = String(row['Name'] || '').trim();
      if (!fullName) continue;

      const district = String(row['District'] || '').trim();
      const partyCode = String(row['Party'] || '').trim();
      const party = partyCode === 'R' ? 'Republican' : partyCode === 'D' ? 'Democrat' : partyCode;
      const rawAmount = row['Israel Lobby Total'];
      const totalAmount = typeof rawAmount === 'number'
        ? rawAmount
        : parseFloat(String(rawAmount || '0').replace(/[$,]/g, '')) || 0;
      const notesRaw = String(row['Notes'] || '').trim();
      const notes = notesRaw || undefined;
      const lobbyGroupsRaw = String(row['Lobby Groups'] || '').trim();
      const lobbyGroupList = lobbyGroupsRaw
        ? lobbyGroupsRaw.split(',').map((s: string) => cleanAcronym(s)).filter((a: string) => a && !SKIP_GROUPS.has(a))
        : [];
      const rejectsAIPAC = notesRaw.toLowerCase().includes('rejects aipac');

      const { title } = makePositionInfo(district);
      const positionId = positionByTitle.get(title) || null;
      const grade = calcGrade(totalAmount, rejectsAIPAC);

      const scorecardLines = [
        `Total Israel Lobby Contributions: $${totalAmount.toLocaleString()}`,
        `Lobby Groups: ${lobbyGroupList.join(', ') || 'None listed'}`,
        rejectsAIPAC
          ? 'Status: Has publicly pledged to reject AIPAC funding.'
          : 'Status: Has accepted Israel lobby funding.',
        `Source: TrackAIPAC.com — https://www.trackaipac.com/endorsements`,
      ];
      const corruptionScorecard = scorecardLines.join('\n');

      let politicianId: string;
      const existingId = profileByName.get(fullName.toLowerCase());

      if (existingId) {
        await db.update(politicianProfiles).set({
          party,
          positionId,
          corruptionGrade: grade,
          notes: notes || null,
          corruptionScorecard,
          isCurrent: true,
          updatedAt: new Date(),
        }).where(eq(politicianProfiles.id, existingId));
        politicianId = existingId;
        profiles_updated++;
      } else {
        const [newProfile] = await db.insert(politicianProfiles).values({
          fullName,
          party,
          positionId,
          corruptionGrade: grade,
          notes: notes || null,
          corruptionScorecard,
          isCurrent: true,
        }).returning();
        politicianId = newProfile.id;
        profileByName.set(fullName.toLowerCase(), politicianId);
        profiles_created++;
      }

      // SIG sponsorships
      for (const acronym of lobbyGroupList) {
        const sigId = sigByAcronym.get(acronym);
        if (!sigId) continue;
        const isAIPAC = acronym === 'AIPAC';
        const relType = (rejectsAIPAC && isAIPAC) ? 'pledged_against' : 'donor';
        const reportedAmount = (isAIPAC && !rejectsAIPAC && totalAmount > 0)
          ? Math.round(totalAmount * 100)
          : undefined;
        try {
          await db.insert(politicianSigSponsorships).values({
            politicianId,
            sigId,
            relationshipType: relType,
            reportedAmount,
            contributionPeriod: '2024 election cycle',
            disclosureSource: 'TrackAIPAC',
            disclosureUrl: 'https://www.trackaipac.com/endorsements',
            isVerified: false,
          });
          sponsorships_created++;
        } catch {
          // UNIQUE conflict — already exists, skip
        }
      }

      // If rejects AIPAC but AIPAC not in their groups list, still add pledged_against entry
      if (rejectsAIPAC && !lobbyGroupList.includes('AIPAC')) {
        const aipacId = sigByAcronym.get('AIPAC');
        if (aipacId) {
          try {
            await db.insert(politicianSigSponsorships).values({
              politicianId,
              sigId: aipacId,
              relationshipType: 'pledged_against',
              contributionPeriod: '2024 election cycle',
              disclosureSource: 'TrackAIPAC',
              disclosureUrl: 'https://www.trackaipac.com/endorsements',
              isVerified: false,
            });
            sponsorships_created++;
          } catch {
            // Already exists
          }
        }
      }
    }

    return { profiles_created, profiles_updated, positions_created, sigs_created, sponsorships_created };
  }

  async importCandidates(candidates: Array<{
    fullName: string; office: string; officeLevel: string; district: string; state: string;
    party: string; isIncumbent: string; status: string; primaryDate: string;
    generalDate: string; ballotpediaUrl: string; fecCandidateId: string;
    website: string; email: string; phone: string; biography: string; photoUrl: string;
    notes: string; profileType?: string;
  }>): Promise<{ created: number; updated: number; positions_created: number; photos_fetched: number; handles_generated: number }> {
    let created = 0;
    let updated = 0;
    let positions_created = 0;
    let photos_fetched = 0;
    let handles_generated = 0;

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
    };

    const US_STATE_ABBRS = new Set(Object.values(STATE_NAME_TO_ABBR));

    function buildHandle(fullName: string, stateAbbr: string): string {
      let name = fullName
        .replace(/\s+(?:Jr\.?|Sr\.?|II|III|IV|V|Esq\.?)$/i, "")
        .replace(/\s+[A-Z]\.\s+/, " ")
        .trim();
      const parts = name.split(/\s+/);
      const first = parts[0] ?? "";
      const last = parts[parts.length - 1] ?? "";
      return (first + last + stateAbbr).replace(/[^a-zA-Z0-9]/g, "");
    }

    function getStateAbbrFromText(text: string): string | null {
      if (!text) return null;
      const upper = text.trim().toUpperCase();
      if (US_STATE_ABBRS.has(upper)) return upper;
      for (const [name, abbr] of Object.entries(STATE_NAME_TO_ABBR)) {
        if (text.toLowerCase().includes(name.toLowerCase())) return abbr;
      }
      const match = text.match(/\b([A-Z]{2})\b/);
      if (match && US_STATE_ABBRS.has(match[1])) return match[1];
      return null;
    }

    async function fetchBallotpediaPhoto(ballotpediaUrl: string): Promise<string | null> {
      try {
        const pageTitle = ballotpediaUrl.replace("https://ballotpedia.org/", "").split("?")[0];
        if (!pageTitle) return null;
        const res = await fetch(
          `https://ballotpedia.org/api.php?action=query&titles=${encodeURIComponent(pageTitle)}&prop=pageimages&pithumbsize=300&format=json`,
          { headers: { "User-Agent": "ACPlatform/1.0 (contact@anticocorruptionparty.org)" } }
        );
        if (!res.ok) return null;
        const data: any = await res.json();
        const pages = data?.query?.pages;
        if (!pages) return null;
        const page = Object.values(pages)[0] as any;
        return page?.thumbnail?.source || null;
      } catch {
        return null;
      }
    }

    async function fetchWikipediaPhoto(fullName: string): Promise<string | null> {
      try {
        const wikiName = fullName.replace(/\s+/g, "_");
        const res = await fetch(
          `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikiName)}`,
          { headers: { "User-Agent": "ACPlatform/1.0" } }
        );
        if (!res.ok) return null;
        const data: any = await res.json();
        return data?.thumbnail?.source || null;
      } catch {
        return null;
      }
    }

    // Load ALL existing positions once — avoids N+1 queries and enables multi-field dedup
    const allExistingPositions = await db.select().from(politicalPositions);
    const positionCache = new Map<string, string>();
    const usedHandles = new Set<string>();

    const existingHandles = await db.select({ handle: politicianProfiles.handle }).from(politicianProfiles);
    for (const r of existingHandles) {
      if (r.handle) usedHandles.add(r.handle.toLowerCase());
    }

    for (const row of candidates) {
      const office = (row.office || "").trim();
      const district = (row.district || "").trim();
      const state = (row.state || "").trim();
      const level = (row.officeLevel || "State").trim();

      // Determine the jurisdiction: prefer the explicit STATE column, fall back to district text parsing
      const jurisdiction = state || district || "Statewide";

      let positionTitle: string;
      if (district && district !== "Statewide") {
        positionTitle = `${office} – ${district}`;
      } else {
        positionTitle = office;
      }

      let positionId: string | null = null;
      // Cache key includes jurisdiction to prevent cross-state collisions (e.g. same district number in two states)
      const cacheKey = `${positionTitle.toLowerCase()}|${jurisdiction.toLowerCase()}`;

      if (positionCache.has(cacheKey)) {
        positionId = positionCache.get(cacheKey)!;
      } else {
        // Match by title + jurisdiction + district (all three) to prevent duplicates across states/cycles
        const existing = allExistingPositions.find(p =>
          p.title.toLowerCase() === positionTitle.toLowerCase() &&
          (p.jurisdiction || "").toLowerCase() === jurisdiction.toLowerCase()
        );
        if (existing) {
          positionId = existing.id;
          positionCache.set(cacheKey, positionId);
        } else {
          const officeType = ["Governor", "Lieutenant Governor", "Attorney General", "Secretary of State", "State Auditor", "President", "Vice President"].includes(office)
            ? "Executive"
            : "Legislative";
          const [newPos] = await db.insert(politicalPositions).values({
            title: positionTitle,
            officeType,
            level: level.toLowerCase() === "federal" ? "federal" : "state",
            jurisdiction,
            district: district !== "Statewide" ? district : undefined,
            isElected: true,
            isActive: true,
          }).returning();
          positionId = newPos.id;
          // Add to in-memory list so subsequent rows in the same batch find it
          allExistingPositions.push(newPos);
          positionCache.set(cacheKey, positionId);
          positions_created++;
        }
      }

      const fullName = (row.fullName || "").trim();
      if (!fullName) continue;

      const notesText = [row.status, row.notes].filter(Boolean).join(" | ") || null;

      const normalizedProfileType = (() => {
        const pt = (row.profileType || "").toLowerCase().trim();
        if (pt === "representative") return "representative";
        if (pt === "delegate") return "delegate";
        return "candidate";
      })();

      const existingProfiles = await db.select().from(politicianProfiles)
        .where(sql`lower(full_name) = lower(${fullName})`);

      let profileId: string;
      let existingPhotoUrl: string | null = null;

      if (existingProfiles.length > 0) {
        const existing = existingProfiles[0];
        profileId = existing.id;
        existingPhotoUrl = existing.photoUrl || null;

        // Smart position assignment for incumbents running for a different seat:
        // If they already hold a position and the CSV office is different, treat CSV as targetPositionId
        const isIncumbent = row.isIncumbent === "Yes";
        let assignedPositionId: string | undefined = positionId || undefined;
        let assignedTargetPositionId: string | null | undefined = undefined; // undefined = don't change

        if (isIncumbent && existing.positionId && positionId && existing.positionId !== positionId) {
          // They hold a known current role; the CSV office is what they're campaigning for
          assignedPositionId = existing.positionId; // keep their current role
          assignedTargetPositionId = positionId;    // mark the office they're seeking
        } else if (isIncumbent && existing.positionId && positionId && existing.positionId === positionId) {
          // Running for re-election — same seat, no target needed
          assignedPositionId = positionId;
          assignedTargetPositionId = null;
        }

        await db.update(politicianProfiles).set({
          party: row.party || undefined,
          isCurrent: isIncumbent,
          ballotpediaUrl: row.ballotpediaUrl || undefined,
          website: row.website || undefined,
          email: row.email || undefined,
          phone: row.phone || undefined,
          biography: row.biography || undefined,
          fecCandidateId: row.fecCandidateId || undefined,
          termStart: row.primaryDate || undefined,
          termEnd: row.generalDate || undefined,
          notes: notesText,
          positionId: assignedPositionId,
          ...(assignedTargetPositionId !== undefined ? { targetPositionId: assignedTargetPositionId } : {}),
          profileType: normalizedProfileType,
          updatedAt: new Date(),
        } as any).where(eq(politicianProfiles.id, existing.id));
        updated++;
      } else {
        // New profile — positionId from CSV is their primary position (current or target)
        const [inserted] = await db.insert(politicianProfiles).values({
          fullName,
          party: row.party || null,
          isCurrent: row.isIncumbent === "Yes",
          ballotpediaUrl: row.ballotpediaUrl || null,
          website: row.website || null,
          email: row.email || null,
          phone: row.phone || null,
          biography: row.biography || null,
          fecCandidateId: row.fecCandidateId || null,
          termStart: row.primaryDate || null,
          termEnd: row.generalDate || null,
          notes: notesText,
          positionId: positionId || null,
          profileType: normalizedProfileType,
        } as any).returning();
        profileId = inserted.id;
        created++;
      }

      // Photo: use PHOTO_URL from sheet first, then auto-fetch from Ballotpedia/Wikipedia
      if (!existingPhotoUrl) {
        let photoUrl: string | null = row.photoUrl || null;
        if (!photoUrl && row.ballotpediaUrl) {
          photoUrl = await fetchBallotpediaPhoto(row.ballotpediaUrl);
        }
        if (!photoUrl) {
          photoUrl = await fetchWikipediaPhoto(fullName);
        }
        if (photoUrl) {
          await db.update(politicianProfiles).set({ photoUrl, updatedAt: new Date() })
            .where(eq(politicianProfiles.id, profileId));
          photos_fetched++;
        }
        await new Promise(r => setTimeout(r, 50));
      }

      // Generate @handle from name + state abbreviation
      const stateAbbr = getStateAbbrFromText(state) || getStateAbbrFromText(district);
      if (stateAbbr) {
        let handle = buildHandle(fullName, stateAbbr);
        if (handle) {
          let finalHandle = handle;
          let suffix = 2;
          while (usedHandles.has(finalHandle.toLowerCase())) {
            finalHandle = handle + suffix;
            suffix++;
          }
          usedHandles.add(finalHandle.toLowerCase());
          await db.update(politicianProfiles).set({ handle: finalHandle } as any)
            .where(eq(politicianProfiles.id, profileId));
          handles_generated++;
        }
      }
    }

    return { created, updated, positions_created, photos_fetched, handles_generated };
  }

  async importProfilesCsv(profiles: Array<{
    fullName: string; party: string; email: string; phone: string;
    website: string; biography: string; termStart: string; termEnd: string;
    isCurrent: string; officeAddress: string;
  }>): Promise<{ created: number; updated: number }> {
    let created = 0;
    let updated = 0;

    for (const row of profiles) {
      const fullName = (row.fullName || "").trim();
      if (!fullName) continue;

      const existing = await db.select().from(politicianProfiles)
        .where(sql`lower(full_name) = lower(${fullName})`);

      const patch = {
        party: row.party || undefined,
        email: row.email || undefined,
        phone: row.phone || undefined,
        website: row.website || undefined,
        biography: row.biography || undefined,
        termStart: row.termStart || undefined,
        termEnd: row.termEnd || undefined,
        isCurrent: row.isCurrent ? row.isCurrent.toLowerCase() === "yes" || row.isCurrent === "true" : false,
        officeAddress: row.officeAddress || undefined,
      };

      if (existing.length > 0) {
        await db.update(politicianProfiles).set({ ...patch, updatedAt: new Date() })
          .where(eq(politicianProfiles.id, existing[0].id));
        updated++;
      } else {
        await db.insert(politicianProfiles).values({ fullName, ...patch });
        created++;
      }
    }

    return { created, updated };
  }

  async importPositionsCsv(positions: Array<{
    title: string; officeType: string; level: string; jurisdiction: string;
    district: string; termLength: string; isElected: string; isActive: string;
  }>): Promise<{ created: number; updated: number }> {
    let created = 0;
    let updated = 0;

    for (const row of positions) {
      const title = (row.title || "").trim();
      const jurisdiction = (row.jurisdiction || "").trim();
      if (!title) continue;

      const existing = await db.select().from(politicalPositions)
        .where(
          and(
            sql`lower(title) = lower(${title})`,
            jurisdiction ? sql`lower(jurisdiction) = lower(${jurisdiction})` : sql`true`
          )
        );

      const patch = {
        officeType: row.officeType || "Legislative",
        level: row.level || "state",
        jurisdiction: jurisdiction || undefined,
        district: row.district || undefined,
        termLength: row.termLength ? parseInt(row.termLength) : undefined,
        isElected: row.isElected ? row.isElected.toLowerCase() === "yes" || row.isElected === "true" : true,
        isActive: row.isActive ? row.isActive.toLowerCase() !== "no" && row.isActive !== "false" : true,
      };

      if (existing.length > 0) {
        await db.update(politicalPositions).set({ ...patch, updatedAt: new Date() })
          .where(eq(politicalPositions.id, existing[0].id));
        updated++;
      } else {
        await db.insert(politicalPositions).values({ title, ...patch });
        created++;
      }
    }

    return { created, updated };
  }

  async unlinkSponsorFromPolitician(politicianId: string, sigId: string): Promise<void> {
    await db
      .delete(politicianSigSponsorships)
      .where(
        and(
          eq(politicianSigSponsorships.politicianId, politicianId),
          eq(politicianSigSponsorships.sigId, sigId)
        )
      );
  }

  async getPoliticiansBySig(sigId: string): Promise<any[]> {
    const results = await db
      .select({
        sponsorship: politicianSigSponsorships,
        politician: politicianProfiles,
      })
      .from(politicianSigSponsorships)
      .innerJoin(politicianProfiles, eq(politicianSigSponsorships.politicianId, politicianProfiles.id))
      .where(eq(politicianSigSponsorships.sigId, sigId))
      .orderBy(desc(politicianSigSponsorships.reportedAmount));
    
    return results.map(r => ({
      ...r.sponsorship,
      politician: r.politician,
    }));
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

  // Volunteer Signups Implementation
  async signUpForVolunteer(postId: string, userId: string, data: { message?: string; phone?: string; email?: string; availability?: string; experience?: string }): Promise<VolunteerSignup> {
    const existing = await db
      .select()
      .from(volunteerSignups)
      .where(and(eq(volunteerSignups.postId, postId), eq(volunteerSignups.userId, userId)));
    
    if (existing.length > 0) {
      throw new Error("Already signed up for this volunteer opportunity");
    }
    
    const [signup] = await db
      .insert(volunteerSignups)
      .values({ postId, userId, ...data })
      .returning();
    
    await this.incrementVolunteerSpotsFilled(postId);
    return signup;
  }

  async withdrawVolunteerSignup(postId: string, userId: string): Promise<void> {
    await db
      .delete(volunteerSignups)
      .where(and(eq(volunteerSignups.postId, postId), eq(volunteerSignups.userId, userId)));
    
    await this.decrementVolunteerSpotsFilled(postId);
  }

  async getVolunteerSignups(postId: string): Promise<VolunteerSignup[]> {
    return await db
      .select()
      .from(volunteerSignups)
      .where(eq(volunteerSignups.postId, postId))
      .orderBy(desc(volunteerSignups.createdAt));
  }

  async getUserVolunteerSignups(userId: string): Promise<VolunteerSignup[]> {
    return await db
      .select()
      .from(volunteerSignups)
      .where(eq(volunteerSignups.userId, userId))
      .orderBy(desc(volunteerSignups.createdAt));
  }

  async getVolunteerSignupStatus(postId: string, userId: string): Promise<VolunteerSignup | undefined> {
    const [signup] = await db
      .select()
      .from(volunteerSignups)
      .where(and(eq(volunteerSignups.postId, postId), eq(volunteerSignups.userId, userId)));
    return signup;
  }

  async updateVolunteerSignupStatus(signupId: string, status: string): Promise<VolunteerSignup> {
    const [updated] = await db
      .update(volunteerSignups)
      .set({ status, updatedAt: new Date() })
      .where(eq(volunteerSignups.id, signupId))
      .returning();
    return updated;
  }

  async incrementVolunteerSpotsFilled(postId: string): Promise<void> {
    await db
      .update(posts)
      .set({ volunteerSpotsFilled: sql`COALESCE(${posts.volunteerSpotsFilled}, 0) + 1` })
      .where(eq(posts.id, postId));
  }

  async decrementVolunteerSpotsFilled(postId: string): Promise<void> {
    await db
      .update(posts)
      .set({ volunteerSpotsFilled: sql`GREATEST(COALESCE(${posts.volunteerSpotsFilled}, 0) - 1, 0)` })
      .where(eq(posts.id, postId));
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
      userId: users.id,
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
      userId: users.id,
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

  async getSentFriendRequests(userId: string): Promise<any[]> {
    return await db.select({
      id: friendships.id,
      userId: users.id,
      username: users.username,
      firstName: users.firstName,
      lastName: users.lastName,
      avatar: users.avatar,
      status: friendships.status,
    })
    .from(friendships)
    .innerJoin(users, eq(users.id, friendships.addresseeId))
    .where(and(
      eq(friendships.requesterId, userId),
      eq(friendships.status, 'pending')
    ));
  }

  async getFriendshipStatus(userId1: string, userId2: string): Promise<{ status: string; friendshipId?: string; isRequester?: boolean } | null> {
    const [friendship] = await db.select({
      id: friendships.id,
      status: friendships.status,
      requesterId: friendships.requesterId,
    })
    .from(friendships)
    .where(
      or(
        and(eq(friendships.requesterId, userId1), eq(friendships.addresseeId, userId2)),
        and(eq(friendships.requesterId, userId2), eq(friendships.addresseeId, userId1))
      )
    )
    .limit(1);
    
    if (!friendship) return null;
    
    return {
      status: friendship.status,
      friendshipId: friendship.id,
      isRequester: friendship.requesterId === userId1
    };
  }

  async createFriendshipPending(requesterId: string, addresseeId: string): Promise<void> {
    await db.insert(friendships).values({
      requesterId,
      addresseeId,
      status: 'pending'
    });
  }

  async cancelFriendRequest(friendshipId: string, userId: string): Promise<void> {
    // Only the requester can cancel their own request
    await db.delete(friendships)
      .where(and(
        eq(friendships.id, friendshipId),
        eq(friendships.requesterId, userId),
        eq(friendships.status, 'pending')
      ));
  }

  async unfriend(userId: string, friendId: string): Promise<void> {
    // Delete the friendship where either party can unfriend
    await db.delete(friendships)
      .where(
        and(
          eq(friendships.status, 'accepted'),
          or(
            and(eq(friendships.requesterId, userId), eq(friendships.addresseeId, friendId)),
            and(eq(friendships.requesterId, friendId), eq(friendships.addresseeId, userId))
          )
        )
      );
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

  async getDefaultFriendUserId(): Promise<string | undefined> {
    // Get the 'jox' user specifically for auto-friending all new users
    const [joxUser] = await db.select({ id: users.id })
      .from(users)
      .where(eq(users.username, 'jox'))
      .limit(1);
    return joxUser?.id;
  }

  async searchUsersByEmailOrUsername(query: string, excludeUserId?: string): Promise<User[]> {
    const searchTerm = `%${query.toLowerCase()}%`;
    // Normalize phone number for search (remove non-digits)
    const normalizedPhone = query.replace(/\D/g, '');
    const phoneSearchTerm = normalizedPhone.length >= 4 ? `%${normalizedPhone}%` : null;
    
    // Build search conditions
    const searchConditions = [
      sql`LOWER(${users.username}) LIKE ${searchTerm}`,
      sql`LOWER(${users.email}) LIKE ${searchTerm}`,
      sql`LOWER(${users.firstName}) LIKE ${searchTerm}`,
      sql`LOWER(${users.lastName}) LIKE ${searchTerm}`
    ];
    
    // Add phone number search if query looks like a phone number
    if (phoneSearchTerm) {
      searchConditions.push(
        sql`REPLACE(REPLACE(REPLACE(REPLACE(${users.phoneNumber}, '-', ''), ' ', ''), '(', ''), ')', '') LIKE ${phoneSearchTerm}`
      );
    }
    
    let searchQuery = db.select()
      .from(users)
      .where(or(...searchConditions))
      .limit(20);
    
    const results = await searchQuery;
    
    // Filter out the current user if excludeUserId is provided
    // Also filter out users who don't have discoverableByPhone=true when searching by phone
    if (excludeUserId) {
      return results.filter(u => {
        if (u.id === excludeUserId) return false;
        // If searching by phone, respect privacy settings (must be explicitly true to be discoverable)
        if (phoneSearchTerm && u.phoneNumber) {
          // Only exclude if the match was via phone number AND user has not opted in
          const userPhoneNormalized = u.phoneNumber.replace(/\D/g, '');
          if (userPhoneNormalized.includes(normalizedPhone)) {
            // Treat null/undefined/false as non-discoverable (opt-out by default)
            if (u.discoverableByPhone !== true) {
              return false;
            }
          }
        }
        return true;
      });
    }
    
    return results;
  }

  // Contact Upload & Friend Discovery Implementation
  async uploadUserContacts(
    userId: string, 
    contacts: { name?: string; phoneHash?: string; emailHash?: string; phoneLast4?: string }[]
  ): Promise<{ matched: any[]; unmatchedCount: number }> {
    const matched: any[] = [];
    let unmatchedCount = 0;

    for (const contact of contacts) {
      let matchedUserId: string | null = null;
      let matchedUser = null;

      if (contact.phoneHash) {
        const [userByPhone] = await db.select({
          id: users.id,
          username: users.username,
          firstName: users.firstName,
          lastName: users.lastName,
          avatar: users.avatar,
          discoverableByPhone: users.discoverableByPhone,
        })
        .from(users)
        .where(and(
          eq(users.phoneHash, contact.phoneHash),
          eq(users.discoverableByPhone, true),
          sql`${users.id} != ${userId}`
        ))
        .limit(1);
        
        if (userByPhone) {
          matchedUserId = userByPhone.id;
          matchedUser = userByPhone;
        }
      }

      if (!matchedUserId && contact.emailHash) {
        const normalizedEmailHash = contact.emailHash.toLowerCase();
        const [userByEmail] = await db.select({
          id: users.id,
          username: users.username,
          firstName: users.firstName,
          lastName: users.lastName,
          avatar: users.avatar,
          discoverableByEmail: users.discoverableByEmail,
        })
        .from(users)
        .where(and(
          eq(users.normalizedEmail, normalizedEmailHash),
          eq(users.discoverableByEmail, true),
          sql`${users.id} != ${userId}`
        ))
        .limit(1);
        
        if (userByEmail) {
          matchedUserId = userByEmail.id;
          matchedUser = userByEmail;
        }
      }

      await db.execute(sql`
        INSERT INTO user_contacts (owner_id, contact_name, phone_hash, email_hash, phone_last_4, matched_user_id)
        VALUES (${userId}, ${contact.name || null}, ${contact.phoneHash || null}, ${contact.emailHash || null}, ${contact.phoneLast4 || null}, ${matchedUserId})
        ON CONFLICT DO NOTHING
      `);

      if (matchedUser) {
        matched.push({ ...matchedUser, contactName: contact.name, reason: 'contact' });
      } else {
        unmatchedCount++;
      }
    }

    await db.execute(sql`
      INSERT INTO contact_uploads (user_id, total_contacts, matched_count, unmatched_count)
      VALUES (${userId}, ${contacts.length}, ${matched.length}, ${unmatchedCount})
    `);

    return { matched, unmatchedCount };
  }

  async getUserContacts(userId: string): Promise<any[]> {
    const result = await db.execute(sql`
      SELECT uc.*, u.username, u.first_name, u.last_name, u.avatar
      FROM user_contacts uc
      LEFT JOIN users u ON uc.matched_user_id = u.id
      WHERE uc.owner_id = ${userId}
      ORDER BY uc.created_at DESC
    `);
    return result.rows.map((row: any) => ({
      id: row.id,
      contactName: row.contact_name,
      phoneLast4: row.phone_last_4,
      matchedUserId: row.matched_user_id,
      matchedUser: row.matched_user_id ? {
        id: row.matched_user_id,
        username: row.username,
        firstName: row.first_name,
        lastName: row.last_name,
        avatar: row.avatar,
      } : null,
      createdAt: row.created_at,
    }));
  }

  async getMatchedContacts(userId: string): Promise<any[]> {
    const result = await db.execute(sql`
      SELECT uc.*, u.username, u.first_name, u.last_name, u.avatar
      FROM user_contacts uc
      INNER JOIN users u ON uc.matched_user_id = u.id
      WHERE uc.owner_id = ${userId} AND uc.matched_user_id IS NOT NULL
      ORDER BY uc.created_at DESC
    `);
    return result.rows.map((row: any) => ({
      id: row.id,
      contactName: row.contact_name,
      phoneLast4: row.phone_last_4,
      matchedUser: {
        id: row.matched_user_id,
        username: row.username,
        firstName: row.first_name,
        lastName: row.last_name,
        avatar: row.avatar,
      },
      reason: 'contact',
      createdAt: row.created_at,
    }));
  }

  async deleteUserContacts(userId: string): Promise<void> {
    await db.execute(sql`DELETE FROM user_contacts WHERE owner_id = ${userId}`);
  }

  async getFriendSuggestions(userId: string, limit: number = 30): Promise<any[]> {
    const dismissedResult = await db.execute(sql`
      SELECT dismissed_user_id FROM friend_suggestion_dismissals WHERE user_id = ${userId}
    `);
    const dismissedIds = new Set(dismissedResult.rows.map((r: any) => r.dismissed_user_id));

    const existingFriendsResult = await db.execute(sql`
      SELECT CASE WHEN requester_id = ${userId} THEN addressee_id ELSE requester_id END as friend_id
      FROM friendships
      WHERE (requester_id = ${userId} OR addressee_id = ${userId})
        AND status IN ('accepted', 'pending', 'blocked')
    `);
    const existingFriendIds = new Set(existingFriendsResult.rows.map((r: any) => r.friend_id));

    const suggestions: any[] = [];
    const seenUserIds = new Set<string>([userId]);

    const contactMatches = await this.getMatchedContacts(userId);
    for (const contact of contactMatches) {
      if (!seenUserIds.has(contact.matchedUser.id) && 
          !dismissedIds.has(contact.matchedUser.id) && 
          !existingFriendIds.has(contact.matchedUser.id)) {
        seenUserIds.add(contact.matchedUser.id);
        suggestions.push({
          user: contact.matchedUser,
          score: 100,
          reasons: ['contact'],
          contactName: contact.contactName,
          mutualCount: 0,
        });
      }
    }

    const mutualResult = await db.execute(sql`
      WITH my_friends AS (
        SELECT CASE WHEN requester_id = ${userId} THEN addressee_id ELSE requester_id END as friend_id
        FROM friendships
        WHERE (requester_id = ${userId} OR addressee_id = ${userId}) AND status = 'accepted'
      ),
      friends_of_friends AS (
        SELECT 
          CASE WHEN f.requester_id = mf.friend_id THEN f.addressee_id ELSE f.requester_id END as fof_id,
          COUNT(*) as mutual_count
        FROM friendships f
        INNER JOIN my_friends mf ON (f.requester_id = mf.friend_id OR f.addressee_id = mf.friend_id)
        WHERE f.status = 'accepted'
          AND CASE WHEN f.requester_id = mf.friend_id THEN f.addressee_id ELSE f.requester_id END != ${userId}
          AND CASE WHEN f.requester_id = mf.friend_id THEN f.addressee_id ELSE f.requester_id END NOT IN (SELECT friend_id FROM my_friends)
        GROUP BY fof_id
        ORDER BY mutual_count DESC
        LIMIT 50
      )
      SELECT fof.fof_id, fof.mutual_count, u.username, u.first_name, u.last_name, u.avatar
      FROM friends_of_friends fof
      INNER JOIN users u ON u.id = fof.fof_id
    `);

    for (const row of mutualResult.rows as any[]) {
      if (!seenUserIds.has(row.fof_id) && 
          !dismissedIds.has(row.fof_id) && 
          !existingFriendIds.has(row.fof_id)) {
        seenUserIds.add(row.fof_id);
        const mutualScore = 20 * Math.log2((row.mutual_count || 0) + 1);
        suggestions.push({
          user: {
            id: row.fof_id,
            username: row.username,
            firstName: row.first_name,
            lastName: row.last_name,
            avatar: row.avatar,
          },
          score: mutualScore,
          reasons: ['mutual_friends'],
          mutualCount: parseInt(row.mutual_count) || 0,
        });
      }
    }

    const geoUsers = await this.getUsersInSameLocation(userId, 30);
    for (const geoUser of geoUsers) {
      if (!seenUserIds.has(geoUser.id) && 
          !dismissedIds.has(geoUser.id) && 
          !existingFriendIds.has(geoUser.id)) {
        seenUserIds.add(geoUser.id);
        suggestions.push({
          user: geoUser,
          score: geoUser.sameCity ? 15 : 10,
          reasons: ['location'],
          location: geoUser.location,
          mutualCount: 0,
        });
      }
    }

    suggestions.sort((a, b) => b.score - a.score);
    return suggestions.slice(0, limit);
  }

  async dismissFriendSuggestion(userId: string, suggestedUserId: string): Promise<void> {
    await db.execute(sql`
      INSERT INTO friend_suggestion_dismissals (user_id, dismissed_user_id)
      VALUES (${userId}, ${suggestedUserId})
      ON CONFLICT DO NOTHING
    `);
  }

  async getMutualFriendsCount(userId1: string, userId2: string): Promise<number> {
    const result = await db.execute(sql`
      WITH user1_friends AS (
        SELECT CASE WHEN requester_id = ${userId1} THEN addressee_id ELSE requester_id END as friend_id
        FROM friendships
        WHERE (requester_id = ${userId1} OR addressee_id = ${userId1}) AND status = 'accepted'
      ),
      user2_friends AS (
        SELECT CASE WHEN requester_id = ${userId2} THEN addressee_id ELSE requester_id END as friend_id
        FROM friendships
        WHERE (requester_id = ${userId2} OR addressee_id = ${userId2}) AND status = 'accepted'
      )
      SELECT COUNT(*) as count FROM user1_friends u1 INNER JOIN user2_friends u2 ON u1.friend_id = u2.friend_id
    `);
    return parseInt((result.rows[0] as any)?.count) || 0;
  }

  async getUsersInSameLocation(userId: string, limit: number = 20): Promise<any[]> {
    const [currentUser] = await db.select({ location: users.location })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!currentUser?.location) return [];

    const locationParts = currentUser.location.split(',').map(s => s.trim());
    const city = locationParts[0] || '';
    const state = locationParts.length > 1 ? locationParts[locationParts.length - 1] : '';

    const result = await db.execute(sql`
      SELECT id, username, first_name, last_name, avatar, location,
             CASE WHEN location ILIKE ${`${city}%`} THEN true ELSE false END as same_city
      FROM users
      WHERE id != ${userId}
        AND location IS NOT NULL
        AND (location ILIKE ${`%${state}%`} OR location ILIKE ${`%${city}%`})
      ORDER BY same_city DESC, last_seen DESC NULLS LAST
      LIMIT ${limit}
    `);

    return result.rows.map((row: any) => ({
      id: row.id,
      username: row.username,
      firstName: row.first_name,
      lastName: row.last_name,
      avatar: row.avatar,
      location: row.location,
      sameCity: row.same_city,
    }));
  }

  // Two-Factor Authentication
  async createSmsOtp(userId: string, codeHash: string, phoneNumber: string, expiresAt: Date): Promise<void> {
    await db.execute(sql`
      INSERT INTO sms_otp_codes (user_id, code_hash, phone_number, expires_at)
      VALUES (${userId}, ${codeHash}, ${phoneNumber}, ${expiresAt})
    `);
  }

  async verifySmsOtp(userId: string, codeHash: string): Promise<{ success: boolean; reason?: string }> {
    const result = await db.execute(sql`
      SELECT id, attempts, is_used, expires_at FROM sms_otp_codes
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      return { success: false, reason: 'No OTP found' };
    }

    const otp = result.rows[0] as any;
    
    if (otp.is_used) {
      return { success: false, reason: 'OTP already used' };
    }
    
    if (new Date(otp.expires_at) < new Date()) {
      return { success: false, reason: 'OTP expired' };
    }
    
    if (otp.attempts >= 6) {
      return { success: false, reason: 'Too many attempts' };
    }

    await db.execute(sql`
      UPDATE sms_otp_codes SET attempts = attempts + 1 WHERE id = ${otp.id}
    `);

    const verifyResult = await db.execute(sql`
      SELECT id FROM sms_otp_codes
      WHERE id = ${otp.id} AND code_hash = ${codeHash}
    `);

    if (verifyResult.rows.length > 0) {
      await db.execute(sql`
        UPDATE sms_otp_codes SET is_used = true WHERE id = ${otp.id}
      `);
      return { success: true };
    }

    return { success: false, reason: 'Invalid code' };
  }

  async createTrustedDevice(userId: string, tokenHash: string, userAgent: string, ipAddress: string, expiresAt: Date): Promise<void> {
    await db.execute(sql`
      INSERT INTO trusted_devices (user_id, token_hash, user_agent, ip_address, expires_at)
      VALUES (${userId}, ${tokenHash}, ${userAgent}, ${ipAddress}, ${expiresAt})
    `);
  }

  async verifyTrustedDevice(userId: string, tokenHash: string): Promise<boolean> {
    const result = await db.execute(sql`
      SELECT id FROM trusted_devices
      WHERE user_id = ${userId}
        AND token_hash = ${tokenHash}
        AND expires_at > NOW()
    `);
    
    if (result.rows.length > 0) {
      const deviceId = (result.rows[0] as any).id;
      await db.execute(sql`
        UPDATE trusted_devices SET last_used_at = NOW() WHERE id = ${deviceId}
      `);
      return true;
    }
    return false;
  }

  async removeTrustedDevice(userId: string, deviceId: string): Promise<void> {
    await db.execute(sql`
      DELETE FROM trusted_devices WHERE id = ${deviceId} AND user_id = ${userId}
    `);
  }

  async getTrustedDevices(userId: string): Promise<any[]> {
    const result = await db.execute(sql`
      SELECT id, device_name, user_agent, ip_address, last_used_at, created_at
      FROM trusted_devices
      WHERE user_id = ${userId} AND expires_at > NOW()
      ORDER BY last_used_at DESC
    `);
    return result.rows.map((row: any) => ({
      id: row.id,
      deviceName: row.device_name,
      userAgent: row.user_agent,
      ipAddress: row.ip_address,
      lastUsedAt: row.last_used_at,
      createdAt: row.created_at,
    }));
  }

  async addUserCredits(userId: string, credits: number): Promise<void> {
    await db.execute(sql`
      UPDATE users SET credits = COALESCE(credits, 0) + ${credits} WHERE id = ${userId}
    `);
  }

  async create2FAChallenge(userId: string, challengeToken: string, expiresAt: Date): Promise<void> {
    await db.execute(sql`
      DELETE FROM two_factor_challenges WHERE user_id = ${userId}
    `);
    await db.execute(sql`
      INSERT INTO two_factor_challenges (user_id, challenge_token, expires_at)
      VALUES (${userId}, ${challengeToken}, ${expiresAt})
    `);
  }

  async verify2FAChallenge(challengeToken: string): Promise<{ valid: boolean; userId?: string }> {
    const result = await db.execute(sql`
      SELECT user_id, expires_at FROM two_factor_challenges
      WHERE challenge_token = ${challengeToken}
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      return { valid: false };
    }

    const row = result.rows[0] as any;
    if (new Date(row.expires_at) < new Date()) {
      await db.execute(sql`
        DELETE FROM two_factor_challenges WHERE challenge_token = ${challengeToken}
      `);
      return { valid: false };
    }

    return { valid: true, userId: row.user_id };
  }

  async delete2FAChallenge(challengeToken: string): Promise<void> {
    await db.execute(sql`
      DELETE FROM two_factor_challenges WHERE challenge_token = ${challengeToken}
    `);
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
    // Get flagged posts with aggregated counts
    const flaggedPosts = await db
      .select({
        postId: flags.targetId,
        flagCount: sql<number>`count(*)`,
        dislikeCount: sql<number>`count(*) filter (where ${flags.reason} = 'not_interested')`,
        reportCount: sql<number>`count(*) filter (where ${flags.reason} != 'not_interested')`,
        firstFlaggedAt: sql<Date>`min(${flags.createdAt})`,
        reasons: sql<string[]>`array_agg(distinct ${flags.reason})`,
      })
      .from(flags)
      .where(eq(flags.targetType, 'post'))
      .groupBy(flags.targetId);

    // Get posts with author info
    const flaggedPostsWithDetails = await Promise.all(
      flaggedPosts.map(async (flagged) => {
        const [post] = await db
          .select({
            id: posts.id,
            content: posts.content,
            createdAt: posts.createdAt,
            authorId: posts.authorId,
            authorUsername: users.username,
            authorFirstName: users.firstName,
            authorLastName: users.lastName,
            likesCount: posts.likesCount,
            commentsCount: posts.commentsCount,
          })
          .from(posts)
          .leftJoin(users, eq(posts.authorId, users.id))
          .where(eq(posts.id, flagged.postId));

        if (!post) return null;

        return {
          postId: flagged.postId,
          post,
          flagCount: Number(flagged.flagCount),
          dislikeCount: Number(flagged.dislikeCount),
          reportCount: Number(flagged.reportCount),
          totalUrgency: Number(flagged.flagCount) + Number(flagged.dislikeCount),
          firstFlaggedAt: flagged.firstFlaggedAt,
          reasons: flagged.reasons,
          status: 'pending',
        };
      })
    );

    // Filter out nulls and sort by urgency (most flagged/disliked on top)
    return flaggedPostsWithDetails
      .filter((item) => item !== null)
      .sort((a, b) => b!.totalUrgency - a!.totalUrgency);
  }

  async getRepresentativeFlags(): Promise<any[]> {
    const repFlags = await db
      .select({
        id: flags.id,
        targetId: flags.targetId,
        reason: flags.reason,
        status: flags.status,
        createdAt: flags.createdAt,
        userId: flags.userId,
        reporterUsername: users.username,
        reporterFirstName: users.firstName,
        reporterLastName: users.lastName,
      })
      .from(flags)
      .leftJoin(users, eq(flags.userId, users.id))
      .where(
        and(
          eq(flags.targetType, 'representative'),
          eq(flags.status, 'pending')
        )
      )
      .orderBy(desc(flags.createdAt));

    return repFlags;
  }

  async dismissRepresentativeFlag(flagId: string, reviewedBy: string): Promise<void> {
    await db
      .update(flags)
      .set({
        status: 'dismissed',
      })
      .where(eq(flags.id, flagId));
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

  async dismissPostFlags(postId: string, reviewedBy: string): Promise<void> {
    // Mark all flags for this post as dismissed with no action taken
    await db
      .update(flaggedContent)
      .set({
        status: 'dismissed',
        reviewedBy,
        actionTaken: 'no_action',
        reviewNote: 'Marked as safe by admin',
        reviewedAt: new Date(),
      })
      .where(
        and(
          eq(flaggedContent.contentType, 'post'),
          eq(flaggedContent.contentId, postId),
          eq(flaggedContent.status, 'pending')
        )
      );
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

  // Algorithm Settings Implementation
  async getAlgorithmSettings(): Promise<AlgorithmSettings> {
    // Get the default settings row (there should only be one)
    const [settings] = await db
      .select()
      .from(algorithmSettings)
      .limit(1);
    
    // If no settings exist, create default settings
    if (!settings) {
      const [newSettings] = await db
        .insert(algorithmSettings)
        .values({ id: 'default-settings-001' })
        .returning();
      return newSettings;
    }
    
    return settings;
  }

  async updateAlgorithmSettings(settings: Partial<AlgorithmSettings>, updatedBy: string): Promise<AlgorithmSettings> {
    // Get current settings
    const current = await this.getAlgorithmSettings();
    
    // Update the settings
    const [updated] = await db
      .update(algorithmSettings)
      .set({
        ...settings,
        updatedBy,
        updatedAt: new Date(),
      })
      .where(eq(algorithmSettings.id, current.id))
      .returning();
    
    return updated;
  }

  // AI Article Parameters
  async getAiArticleParameters(): Promise<AiArticleParameters> {
    const [params] = await db
      .select()
      .from(aiArticleParameters)
      .where(eq(aiArticleParameters.isActive, true))
      .limit(1);

    if (!params) {
      // Create default parameters if none exist
      const [created] = await db
        .insert(aiArticleParameters)
        .values({
          name: "Default",
          isActive: true,
        })
        .returning();
      return created;
    }

    return params;
  }

  async updateAiArticleParameters(params: Partial<AiArticleParameters>, updatedBy: string): Promise<AiArticleParameters> {
    const current = await this.getAiArticleParameters();

    const [updated] = await db
      .update(aiArticleParameters)
      .set({
        ...params,
        updatedBy,
        updatedAt: new Date(),
      })
      .where(eq(aiArticleParameters.id, current.id))
      .returning();

    return updated;
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

  // Mobile App Signals Implementation
  async getSignals(limit: number = 20, offset: number = 0): Promise<SignalWithAuthor[]> {
    const result = await db
      .select({
        id: signals.id,
        authorId: signals.authorId,
        title: signals.title,
        description: signals.description,
        videoUrl: signals.videoUrl,
        thumbnailUrl: signals.thumbnailUrl,
        duration: signals.duration,
        maxDuration: signals.maxDuration,
        filter: signals.filter,
        overlays: signals.overlays,
        tags: signals.tags,
        viewCount: signals.viewCount,
        likesCount: signals.likesCount,
        commentsCount: signals.commentsCount,
        sharesCount: signals.sharesCount,
        isPublic: signals.isPublic,
        isDeleted: signals.isDeleted,
        createdAt: signals.createdAt,
        author: {
          id: users.id,
          username: users.username,
          firstName: users.firstName,
          lastName: users.lastName,
          avatar: users.avatar,
          subscriptionStatus: users.subscriptionStatus,
        },
      })
      .from(signals)
      .leftJoin(users, eq(signals.authorId, users.id))
      .where(eq(signals.isDeleted, false))
      .orderBy(desc(signals.createdAt))
      .limit(limit)
      .offset(offset);

    return result as SignalWithAuthor[];
  }

  async getSignalById(id: string): Promise<SignalWithAuthor | undefined> {
    const [result] = await db
      .select({
        id: signals.id,
        authorId: signals.authorId,
        title: signals.title,
        description: signals.description,
        videoUrl: signals.videoUrl,
        thumbnailUrl: signals.thumbnailUrl,
        duration: signals.duration,
        maxDuration: signals.maxDuration,
        filter: signals.filter,
        overlays: signals.overlays,
        tags: signals.tags,
        viewCount: signals.viewCount,
        likesCount: signals.likesCount,
        commentsCount: signals.commentsCount,
        sharesCount: signals.sharesCount,
        isPublic: signals.isPublic,
        isDeleted: signals.isDeleted,
        createdAt: signals.createdAt,
        author: {
          id: users.id,
          username: users.username,
          firstName: users.firstName,
          lastName: users.lastName,
          avatar: users.avatar,
          subscriptionStatus: users.subscriptionStatus,
        },
      })
      .from(signals)
      .leftJoin(users, eq(signals.authorId, users.id))
      .where(and(eq(signals.id, id), eq(signals.isDeleted, false)));

    return result as SignalWithAuthor | undefined;
  }

  async getSignalsByUser(userId: string): Promise<SignalWithAuthor[]> {
    const result = await db
      .select({
        id: signals.id,
        authorId: signals.authorId,
        title: signals.title,
        description: signals.description,
        videoUrl: signals.videoUrl,
        thumbnailUrl: signals.thumbnailUrl,
        duration: signals.duration,
        maxDuration: signals.maxDuration,
        filter: signals.filter,
        overlays: signals.overlays,
        tags: signals.tags,
        viewCount: signals.viewCount,
        likesCount: signals.likesCount,
        commentsCount: signals.commentsCount,
        sharesCount: signals.sharesCount,
        isPublic: signals.isPublic,
        isDeleted: signals.isDeleted,
        createdAt: signals.createdAt,
        author: {
          id: users.id,
          username: users.username,
          firstName: users.firstName,
          lastName: users.lastName,
          avatar: users.avatar,
          subscriptionStatus: users.subscriptionStatus,
        },
      })
      .from(signals)
      .leftJoin(users, eq(signals.authorId, users.id))
      .where(and(eq(signals.authorId, userId), eq(signals.isDeleted, false)))
      .orderBy(desc(signals.createdAt));

    return result as SignalWithAuthor[];
  }

  async createSignal(signalData: InsertSignal): Promise<Signal> {
    const [signal] = await db
      .insert(signals)
      .values(signalData)
      .returning();
    return signal;
  }

  async likeSignal(signalId: string, userId: string): Promise<void> {
    await db.insert(signalLikes).values({
      signalId,
      userId,
    }).onConflictDoNothing();

    await db.execute(sql`
      UPDATE signals 
      SET likes_count = likes_count + 1 
      WHERE id = ${signalId}
    `);
  }

  async unlikeSignal(signalId: string, userId: string): Promise<void> {
    const result = await db
      .delete(signalLikes)
      .where(and(
        eq(signalLikes.signalId, signalId),
        eq(signalLikes.userId, userId)
      ))
      .returning();

    if (result.length > 0) {
      await db.execute(sql`
        UPDATE signals 
        SET likes_count = GREATEST(0, likes_count - 1) 
        WHERE id = ${signalId}
      `);
    }
  }

  async incrementSignalViewCount(signalId: string): Promise<void> {
    await db.execute(sql`
      UPDATE signals 
      SET view_count = view_count + 1 
      WHERE id = ${signalId}
    `);
  }

  async createTradingFlag(flag: InsertTradingFlag): Promise<TradingFlag> {
    const [result] = await db.insert(tradingFlags).values(flag).returning();
    return result;
  }

  async getTradingFlagsByPolitician(politicianId: string): Promise<TradingFlag[]> {
    return await db.select().from(tradingFlags).where(eq(tradingFlags.politicianId, politicianId)).orderBy(desc(tradingFlags.createdAt));
  }

  async getAllTradingFlags(status?: string): Promise<TradingFlag[]> {
    if (status) {
      return await db.select().from(tradingFlags).where(eq(tradingFlags.status, status)).orderBy(desc(tradingFlags.createdAt));
    }
    return await db.select().from(tradingFlags).orderBy(desc(tradingFlags.createdAt));
  }

  async reviewTradingFlag(flagId: string, status: string, reviewedBy: string, reviewNote?: string): Promise<TradingFlag> {
    const [result] = await db.update(tradingFlags)
      .set({ status, reviewedBy, reviewNote: reviewNote ?? null, reviewedAt: new Date() })
      .where(eq(tradingFlags.id, flagId))
      .returning();
    return result;
  }

  async createDemerit(demerit: InsertPoliticianDemerit): Promise<PoliticianDemerit> {
    const [result] = await db.insert(politicianDemerits).values(demerit).returning();
    return result;
  }

  async getDemeritsByPolitician(politicianId: string): Promise<PoliticianDemerit[]> {
    return await db.select().from(politicianDemerits).where(eq(politicianDemerits.politicianId, politicianId)).orderBy(desc(politicianDemerits.createdAt));
  }

  async deleteDemerit(demeritId: string): Promise<void> {
    await db.delete(politicianDemerits).where(eq(politicianDemerits.id, demeritId));
  }
}

export const storage = new DatabaseStorage();
