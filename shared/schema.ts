import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, json, decimal, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("citizen"), // admin, moderator, citizen, candidate
  firstName: text("first_name"),
  lastName: text("last_name"),
  location: text("location"),
  bio: text("bio"),
  avatar: text("avatar"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  // ACP+ Subscription and Crypto
  subscriptionStatus: text("subscription_status").default("free"), // free, premium, expired
  subscriptionStartDate: timestamp("subscription_start_date"),
  subscriptionEndDate: timestamp("subscription_end_date"),
  acpCoinBalance: text("acp_coin_balance").default("0.00000000"), // Using text for precision
  // Profile Customization
  profileTheme: text("profile_theme").default("default"),
  profileBackground: text("profile_background"),
  favoriteSong: text("favorite_song"),
  profileLayout: json("profile_layout"), // Modular layout configuration
  createdAt: timestamp("created_at").defaultNow(),
  lastSeen: timestamp("last_seen"),
  // News organization fields
  isNewsOrganization: boolean("is_news_organization").default(false),
  organizationName: text("organization_name"),
  politicalLean: decimal("political_lean", { precision: 3, scale: 2 }), // -1.00 to 1.00
  trustScore: decimal("trust_score", { precision: 3, scale: 2 }).default("0.00"),
  // Voter verification fields
  voterVerificationStatus: text("voter_verification_status").default("unverified"), // unverified, pending, verified, rejected
  voterVerifiedDate: timestamp("voter_verified_date"),
  // Friend discovery fields
  phoneNumber: text("phone_number"),
  phoneHash: text("phone_hash"), // Hashed phone for matching
  normalizedEmail: text("normalized_email"), // Lowercase email for matching
  discoverableByPhone: boolean("discoverable_by_phone").default(false),
  discoverableByEmail: boolean("discoverable_by_email").default(false),
  // IP tracking for security and analytics
  registrationIp: text("registration_ip"),
  lastLoginIp: text("last_login_ip"),
  registrationCountry: text("registration_country"),
  lastLoginCountry: text("last_login_country"),
}, (table) => ({
  politicalLeanRange: sql`CHECK (${table.politicalLean} BETWEEN -1.00 AND 1.00 OR ${table.politicalLean} IS NULL)`,
  trustScoreRange: sql`CHECK (${table.trustScore} BETWEEN 0.00 AND 1.00 OR ${table.trustScore} IS NULL)`,
  phoneNumberIndex: index("users_phone_hash_idx").on(table.phoneHash),
  normalizedEmailIndex: index("users_normalized_email_idx").on(table.normalizedEmail),
}));

// User-to-user following relationships
export const userFollows = pgTable("user_follows", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  followerId: varchar("follower_id").notNull().references(() => users.id),
  followeeId: varchar("followee_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniqueFollow: sql`UNIQUE(${table.followerId}, ${table.followeeId})`,
  followerIndex: index("user_follows_follower_idx").on(table.followerId),
  followeeIndex: index("user_follows_followee_idx").on(table.followeeId),
  noSelfFollow: sql`CHECK (${table.followerId} <> ${table.followeeId})`,
}));

// Invitation system for controlled user registration
export const invitations = pgTable("invitations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  token: varchar("token").notNull().unique(), // URL-safe invitation token
  email: text("email"), // Optional: pre-assign to specific email
  invitedBy: varchar("invited_by").notNull().references(() => users.id),
  usedBy: varchar("used_by").references(() => users.id), // Who used this invitation
  isUsed: boolean("is_used").default(false),
  expiresAt: timestamp("expires_at"), // Optional expiration
  maxUses: integer("max_uses").default(1), // How many times this invite can be used
  usageCount: integer("usage_count").default(0), // How many times it has been used
  createdAt: timestamp("created_at").defaultNow(),
  usedAt: timestamp("used_at"), // When it was used
}, (table) => ({
  tokenIndex: index("invitations_token_idx").on(table.token),
  invitedByIndex: index("invitations_invited_by_idx").on(table.invitedBy),
  usedByIndex: index("invitations_used_by_idx").on(table.usedBy),
}));

// Friends/Social Network System
export const friendships = pgTable("friendships", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  requesterId: varchar("requester_id").notNull().references(() => users.id),
  addresseeId: varchar("addressee_id").notNull().references(() => users.id),
  status: text("status").notNull().default("pending"), // pending, accepted, blocked, rejected
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  uniqueFriendship: sql`UNIQUE(${table.requesterId}, ${table.addresseeId})`,
  requesterIndex: index("friendships_requester_idx").on(table.requesterId),
  addresseeIndex: index("friendships_addressee_idx").on(table.addresseeId),
  statusIndex: index("friendships_status_idx").on(table.status),
  noSelfFriend: sql`CHECK (${table.requesterId} <> ${table.addresseeId})`,
}));

// Friend Groups for organizing friends
export const friendGroups = pgTable("friend_groups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
  color: text("color").default("#3b82f6"), // Hex color for group
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userGroupIndex: index("friend_groups_user_idx").on(table.userId),
  uniqueUserGroupName: sql`UNIQUE(${table.userId}, ${table.name})`,
}));

// Many-to-many relationship between friends and groups
export const friendGroupMembers = pgTable("friend_group_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  groupId: varchar("group_id").notNull().references(() => friendGroups.id, { onDelete: "cascade" }),
  friendshipId: varchar("friendship_id").notNull().references(() => friendships.id, { onDelete: "cascade" }),
  addedAt: timestamp("added_at").defaultNow(),
}, (table) => ({
  groupIndex: index("friend_group_members_group_idx").on(table.groupId),
  friendshipIndex: index("friend_group_members_friendship_idx").on(table.friendshipId),
  uniqueGroupFriend: sql`UNIQUE(${table.groupId}, ${table.friendshipId})`,
}));

// Friend suggestions - People you may know
export const friendSuggestions = pgTable("friend_suggestions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  suggestedUserId: varchar("suggested_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  reason: text("reason").notNull(), // mutual_friends, phone_match, email_match, shared_groups, location
  score: integer("score").notNull().default(0), // Higher score = better suggestion
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userIndex: index("friend_suggestions_user_idx").on(table.userId),
  suggestedUserIndex: index("friend_suggestions_suggested_user_idx").on(table.suggestedUserId),
  scoreIndex: index("friend_suggestions_score_idx").on(table.score),
  uniqueSuggestion: sql`UNIQUE(${table.userId}, ${table.suggestedUserId})`,
  noSelfSuggestion: sql`CHECK (${table.userId} <> ${table.suggestedUserId})`,
}));

// Dismissed friend suggestions - Users can dismiss suggestions
export const friendSuggestionDismissals = pgTable("friend_suggestion_dismissals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  dismissedUserId: varchar("dismissed_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userIndex: index("friend_suggestion_dismissals_user_idx").on(table.userId),
  dismissedUserIndex: index("friend_suggestion_dismissals_dismissed_user_idx").on(table.dismissedUserId),
  uniqueDismissal: sql`UNIQUE(${table.userId}, ${table.dismissedUserId})`,
}));

// User uploaded contacts for friend matching
export const userContacts = pgTable("user_contacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerId: varchar("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  contactName: text("contact_name"),
  phoneHash: text("phone_hash"), // SHA-256 hash of normalized phone
  emailHash: text("email_hash"), // SHA-256 hash of normalized email
  phoneLast4: text("phone_last_4"), // Last 4 digits for display
  matchedUserId: varchar("matched_user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  ownerIndex: index("user_contacts_owner_idx").on(table.ownerId),
  phoneHashIndex: index("user_contacts_phone_hash_idx").on(table.phoneHash),
  emailHashIndex: index("user_contacts_email_hash_idx").on(table.emailHash),
  matchedUserIndex: index("user_contacts_matched_user_idx").on(table.matchedUserId),
  uniqueOwnerPhone: sql`UNIQUE NULLS NOT DISTINCT(${table.ownerId}, ${table.phoneHash})`,
  uniqueOwnerEmail: sql`UNIQUE NULLS NOT DISTINCT(${table.ownerId}, ${table.emailHash})`,
}));

// Contact upload audit log
export const contactUploads = pgTable("contact_uploads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  totalContacts: integer("total_contacts").notNull().default(0),
  matchedCount: integer("matched_count").notNull().default(0),
  unmatchedCount: integer("unmatched_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userIndex: index("contact_uploads_user_idx").on(table.userId),
}));

// Referral tracking and credits system
export const userReferrals = pgTable("user_referrals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  referrerId: varchar("referrer_id").notNull().references(() => users.id),
  referredUserId: varchar("referred_user_id").notNull().references(() => users.id),
  invitationId: varchar("invitation_id").references(() => invitations.id),
  creditsEarned: integer("credits_earned").default(20), // ACP Credits earned
  creditsAwarded: boolean("credits_awarded").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  referrerIndex: index("user_referrals_referrer_idx").on(table.referrerId),
  referredIndex: index("user_referrals_referred_idx").on(table.referredUserId),
  invitationIndex: index("user_referrals_invitation_idx").on(table.invitationId),
  uniqueReferral: sql`UNIQUE(${table.referrerId}, ${table.referredUserId})`,
}));

// Petitions system - e-signing petitions with stated objectives
export const petitions = pgTable("petitions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  objective: text("objective").notNull(), // Stated objective of the petition
  description: text("description"),
  creatorId: varchar("creator_id").notNull().references(() => users.id),
  targetSignatures: integer("target_signatures").default(1000),
  currentSignatures: integer("current_signatures").default(0),
  isActive: boolean("is_active").default(true),
  expiresAt: timestamp("expires_at"),
  tags: text("tags").array(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  creatorIndex: index("petitions_creator_idx").on(table.creatorId),
  statusIndex: index("petitions_status_idx").on(table.isActive),
  signaturesIndex: index("petitions_signatures_idx").on(table.currentSignatures),
}));

// Petition signatures - e-signing capability
export const petitionSignatures = pgTable("petition_signatures", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  petitionId: varchar("petition_id").notNull().references(() => petitions.id, { onDelete: "cascade" }),
  signerId: varchar("signer_id").notNull().references(() => users.id),
  isAnonymous: boolean("is_anonymous").default(false),
  signedAt: timestamp("signed_at").defaultNow(),
}, (table) => ({
  petitionIndex: index("petition_signatures_petition_idx").on(table.petitionId),
  signerIndex: index("petition_signatures_signer_idx").on(table.signerId),
  uniqueSignature: sql`UNIQUE(${table.petitionId}, ${table.signerId})`,
}));

// Unions system - verified organizations with private membership
export const unions = pgTable("unions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  industry: text("industry"), // e.g., "Healthcare", "Education", "Manufacturing"
  website: text("website"),
  isVerified: boolean("is_verified").default(false), // Like news organizations
  memberCount: integer("member_count").default(0), // Public count only
  contactEmail: text("contact_email"),
  logoUrl: text("logo_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  nameIndex: index("unions_name_idx").on(table.name),
  verifiedIndex: index("unions_verified_idx").on(table.isVerified),
  industryIndex: index("unions_industry_idx").on(table.industry),
}));

// Union memberships - private, only count is public
export const unionMemberships = pgTable("union_memberships", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  unionId: varchar("union_id").notNull().references(() => unions.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id),
  status: text("status").notNull().default("active"), // active, inactive
  isPrivate: boolean("is_private").default(true), // Identity remains private
  joinedAt: timestamp("joined_at").defaultNow(),
}, (table) => ({
  unionIndex: index("union_memberships_union_idx").on(table.unionId),
  userIndex: index("union_memberships_user_idx").on(table.userId),
  statusIndex: index("union_memberships_status_idx").on(table.status),
  uniqueMembership: sql`UNIQUE(${table.unionId}, ${table.userId})`,
}));

// Union posts/updates - like news organization posts
export const unionPosts = pgTable("union_posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  unionId: varchar("union_id").notNull().references(() => unions.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  content: text("content").notNull(),
  type: text("type").default("update"), // update, news, announcement, action
  tags: text("tags").array(),
  isPublic: boolean("is_public").default(true),
  viewCount: integer("view_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  unionIndex: index("union_posts_union_idx").on(table.unionId),
  typeIndex: index("union_posts_type_idx").on(table.type),
  publicIndex: index("union_posts_public_idx").on(table.isPublic),
  createdIndex: index("union_posts_created_idx").on(table.createdAt),
}));

export const posts = pgTable("posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  authorId: varchar("author_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  type: text("type").notNull().default("post"), // post, poll, announcement, charity_donation, news, event, blog
  tags: text("tags").array().default([]),
  image: text("image"),
  url: text("url"), // For news articles and external links
  title: text("title"), // News headlines or blog titles
  newsSourceName: text("news_source_name"), // Original news source
  linkPreview: json("link_preview").$type<{ url: string; title?: string; description?: string; image?: string; siteName?: string }>(), // Metadata for link previews
  sharedPostId: varchar("shared_post_id"), // ID of the original post if this is a share - forward reference resolved later
  eventId: varchar("event_id"),  // Reference to events table for event-type posts - forward reference resolved later
  // Blog post fields
  articleBody: text("article_body"), // Full article content (markdown/HTML)
  featuredImage: text("featured_image"), // Main header image for blog posts
  excerpt: text("excerpt"), // Short preview text for blog posts in feed
  articleImages: json("article_images").$type<{ url: string; caption?: string; position?: number }[]>(), // Embedded images in article
  readingTime: integer("reading_time"), // Estimated reading time in minutes
  privacy: text("privacy").notNull().default("public"), // "friends" or "public"
  likesCount: integer("likes_count").default(0),
  commentsCount: integer("comments_count").default(0),
  sharesCount: integer("shares_count").default(0),
  emojiReactionsCount: integer("emoji_reactions_count").default(0),
  gifReactionsCount: integer("gif_reactions_count").default(0),
  bookmarksCount: integer("bookmarks_count").default(0),
  flagsCount: integer("flags_count").default(0),
  isDeleted: boolean("is_deleted").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  createdAtIndex: index("posts_created_at_idx").on(table.createdAt.desc()),
  authorCreatedAtIndex: index("posts_author_created_at_idx").on(table.authorId, table.createdAt.desc()),
  typeCreatedAtIndex: index("posts_type_created_at_idx").on(table.type, table.createdAt.desc()),
}));

export const polls = pgTable("polls", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").references(() => posts.id),
  title: text("title").notNull(),
  description: text("description"),
  options: json("options").notNull().$type<{ id: string; text: string; votes: number }[]>(),
  votingType: text("voting_type").default("simple"), // "simple" or "ranked_choice"
  isBlockchainVerified: boolean("is_blockchain_verified").default(false),
  blockchainHash: text("blockchain_hash"),
  totalVotes: integer("total_votes").default(0),
  endDate: timestamp("end_date"),
  isActive: boolean("is_active").default(true),
  featured: boolean("featured").default(false), // Featured in the Featured Polls sidebar module
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  featuredIndex: index("polls_featured_idx").on(table.featured),
}));

export const pollVotes = pgTable("poll_votes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  pollId: varchar("poll_id").notNull().references(() => polls.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  optionId: text("option_id").notNull(),
  rankedChoices: json("ranked_choices").$type<string[]>(), // For ranked choice voting
  blockchainHash: text("blockchain_hash"), // Individual vote verification
  createdAt: timestamp("created_at").defaultNow(),
});

export const groups = pgTable("groups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category"), // climate, education, corruption, etc.
  image: text("image"),
  memberCount: integer("member_count").default(0),
  isPublic: boolean("is_public").default(true),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const groupMembers = pgTable("group_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  groupId: varchar("group_id").notNull().references(() => groups.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  role: text("role").default("member"), // admin, moderator, member
  joinedAt: timestamp("joined_at").defaultNow(),
});

// Whistleblowing system - Reports with credibility voting
export const whistleblowingPosts = pgTable("whistleblowing_posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  authorId: varchar("author_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  link: text("link"), // External evidence link
  documents: json("documents").$type<{ name: string; url: string; size: number }[]>().default([]), // Uploaded documents
  credibleVotes: integer("credible_votes").default(0),
  notCredibleVotes: integer("not_credible_votes").default(0),
  credibilityScore: integer("credibility_score").default(0), // Calculated: credibleVotes - notCredibleVotes
  tags: text("tags").array().default([]),
  viewsCount: integer("views_count").default(0),
  commentsCount: integer("comments_count").default(0),
  isDeleted: boolean("is_deleted").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  authorIndex: index("whistleblowing_posts_author_idx").on(table.authorId),
  credibilityIndex: index("whistleblowing_posts_credibility_idx").on(table.credibilityScore.desc()),
  createdAtIndex: index("whistleblowing_posts_created_at_idx").on(table.createdAt.desc()),
}));

// Whistleblowing votes - Track credibility voting
export const whistleblowingVotes = pgTable("whistleblowing_votes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").notNull().references(() => whistleblowingPosts.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id),
  vote: text("vote").notNull(), // "credible" or "not_credible"
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  postIndex: index("whistleblowing_votes_post_idx").on(table.postId),
  userIndex: index("whistleblowing_votes_user_idx").on(table.userId),
  uniqueVote: sql`UNIQUE(${table.postId}, ${table.userId})`,
}));

export const comments = pgTable("comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").references(() => posts.id),
  pollId: varchar("poll_id").references(() => polls.id),
  authorId: varchar("author_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  parentId: varchar("parent_id"),
  likesCount: integer("likes_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const likes = pgTable("likes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  targetId: varchar("target_id").notNull(), // post or comment id
  targetType: text("target_type").notNull(), // post, comment
  createdAt: timestamp("created_at").defaultNow(),
});

// Enhanced reactions system (emojis, gifs, shares, bookmarks - excludes likes/comments to avoid duplication)
export const reactions = pgTable("reactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").notNull().references(() => posts.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  type: text("type").notNull(), // 'emoji', 'gif', 'share', 'bookmark' - NO likes/comments to avoid duplication
  emoji: text("emoji"), // Emoji code for emoji reactions
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  postUserTypeIndex: index("reactions_post_user_type_idx").on(table.postId, table.userId, table.type),
  postTypeIndex: index("reactions_post_type_idx").on(table.postId, table.type),
  uniqueReaction: sql`UNIQUE(${table.postId}, ${table.userId}, ${table.type})`, // Prevent duplicate reactions
  typeCheck: sql`CHECK (${table.type} IN ('emoji', 'gif', 'share', 'bookmark'))`,
}));

// Bias voting system for news posts
export const biasVotes = pgTable("bias_votes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").notNull().references(() => posts.id),
  voterId: varchar("voter_id").notNull().references(() => users.id),
  vote: text("vote").notNull(), // 'Neutral', 'LeftBias', 'RightBias'
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniqueVote: sql`UNIQUE(${table.postId}, ${table.voterId})`,
  postIndex: index("bias_votes_post_idx").on(table.postId),
  voteCheck: sql`CHECK (${table.vote} IN ('Neutral', 'LeftBias', 'RightBias'))`,
}));

export const candidates = pgTable("candidates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  position: text("position").notNull(), // mayor, city council, etc.
  platform: text("platform"),
  proposals: json("proposals").$type<{ id: string; title: string; description: string }[]>().default([]),
  endorsements: integer("endorsements").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const candidateSupports = pgTable("candidate_supports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  candidateId: varchar("candidate_id").notNull().references(() => candidates.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniqueSupport: sql`UNIQUE(${table.candidateId}, ${table.userId})`
}));

export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  senderId: varchar("sender_id").notNull().references(() => users.id),
  recipientId: varchar("recipient_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Slack-like messaging system
export const channels = pgTable("channels", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull().default("public"), // public, private, group_channel, direct
  groupId: varchar("group_id").references(() => groups.id), // Links to existing groups
  createdBy: varchar("created_by").notNull().references(() => users.id),
  memberCount: integer("member_count").default(0),
  lastMessageAt: timestamp("last_message_at"),
  isArchived: boolean("is_archived").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const channelMembers = pgTable("channel_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  channelId: varchar("channel_id").notNull().references(() => channels.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  role: text("role").default("member"), // admin, moderator, member
  joinedAt: timestamp("joined_at").defaultNow(),
  lastReadAt: timestamp("last_read_at").defaultNow(),
  isNotificationEnabled: boolean("is_notification_enabled").default(true),
});

export const channelMessages = pgTable("channel_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  channelId: varchar("channel_id").notNull().references(() => channels.id),
  senderId: varchar("sender_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  messageType: text("message_type").default("text"), // text, image, file, system
  attachmentUrl: text("attachment_url"),
  replyToId: varchar("reply_to_id"),
  isEdited: boolean("is_edited").default(false),
  editedAt: timestamp("edited_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const followedRepresentatives = pgTable("followed_representatives", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  office: text("office").notNull(),
  party: text("party"),
  followedAt: timestamp("followed_at").defaultNow(),
});

export const userAddresses = pgTable("user_addresses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  address: text("address").notNull(),
  lastUsed: timestamp("last_used").defaultNow(),
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const flags = pgTable("flags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  targetId: varchar("target_id").notNull(), // post or comment id
  targetType: text("target_type").notNull(), // post, comment
  reason: text("reason").notNull(), // inappropriate_content, spam, harassment, etc.
  status: text("status").default("pending"), // pending, reviewed, dismissed
  createdAt: timestamp("created_at").defaultNow(),
});

export const events = pgTable("events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizerId: varchar("organizer_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  location: text("location").notNull(),
  address: text("address"),
  city: text("city").notNull(),
  state: text("state").notNull(),
  zipCode: text("zip_code"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  isVirtual: boolean("is_virtual").default(false),
  virtualLink: text("virtual_link"),
  maxAttendees: integer("max_attendees"),
  currentAttendees: integer("current_attendees").default(0),
  tags: text("tags").array().default([]),
  isPublic: boolean("is_public").default(true),
  requiresApproval: boolean("requires_approval").default(false),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const eventAttendees = pgTable("event_attendees", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").notNull().references(() => events.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  status: text("status").default("attending"), // attending, maybe, not_attending, pending
  registeredAt: timestamp("registered_at").defaultNow(),
});

export const userAddressesRelations = relations(userAddresses, ({ one }) => ({
  user: one(users, {
    fields: [userAddresses.userId],
    references: [users.id],
  }),
}));

export const followedRepresentativesRelations = relations(followedRepresentatives, ({ one }) => ({
  user: one(users, {
    fields: [followedRepresentatives.userId],
    references: [users.id],
  }),
}));

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
  comments: many(comments),
  likes: many(likes),
  reactions: many(reactions),
  biasVotes: many(biasVotes),
  following: many(userFollows, { relationName: "follower" }),
  followers: many(userFollows, { relationName: "followee" }),
  pollVotes: many(pollVotes),
  groupMemberships: many(groupMembers),
  sentMessages: many(messages, { relationName: "sender" }),
  receivedMessages: many(messages, { relationName: "recipient" }),
  candidateProfile: many(candidates),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
  comments: many(comments),
  likes: many(likes),
  reactions: many(reactions),
  biasVotes: many(biasVotes),
  poll: one(polls),
}));

export const pollsRelations = relations(polls, ({ one, many }) => ({
  post: one(posts, {
    fields: [polls.postId],
    references: [posts.id],
  }),
  votes: many(pollVotes),
}));

export const groupsRelations = relations(groups, ({ one, many }) => ({
  creator: one(users, {
    fields: [groups.createdBy],
    references: [users.id],
  }),
  members: many(groupMembers),
}));

export const groupMembersRelations = relations(groupMembers, ({ one }) => ({
  group: one(groups, {
    fields: [groupMembers.groupId],
    references: [groups.id],
  }),
  user: one(users, {
    fields: [groupMembers.userId],
    references: [users.id],
  }),
}));

export const commentsRelations = relations(comments, ({ one, many }) => ({
  post: one(posts, {
    fields: [comments.postId],
    references: [posts.id],
  }),
  author: one(users, {
    fields: [comments.authorId],
    references: [users.id],
  }),
  parent: one(comments, {
    fields: [comments.parentId],
    references: [comments.id],
  }),
  replies: many(comments),
  likes: many(likes),
}));

export const candidatesRelations = relations(candidates, ({ one }) => ({
  user: one(users, {
    fields: [candidates.userId],
    references: [users.id],
  }),
}));

// Add missing userFollows relationships
export const userFollowsRelations = relations(userFollows, ({ one }) => ({
  follower: one(users, {
    fields: [userFollows.followerId],
    references: [users.id],
    relationName: "follower",
  }),
  followee: one(users, {
    fields: [userFollows.followeeId],
    references: [users.id],
    relationName: "followee",
  }),
}));

// Add missing relations for new tables
export const reactionsRelations = relations(reactions, ({ one }) => ({
  post: one(posts, {
    fields: [reactions.postId],
    references: [posts.id],
  }),
  user: one(users, {
    fields: [reactions.userId],
    references: [users.id],
  }),
}));

export const biasVotesRelations = relations(biasVotes, ({ one }) => ({
  post: one(posts, {
    fields: [biasVotes.postId],
    references: [posts.id],
  }),
  voter: one(users, {
    fields: [biasVotes.voterId],
    references: [users.id],
  }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
    relationName: "sender",
  }),
  recipient: one(users, {
    fields: [messages.recipientId],
    references: [users.id],
    relationName: "recipient",
  }),
}));

export const channelsRelations = relations(channels, ({ one, many }) => ({
  creator: one(users, {
    fields: [channels.createdBy],
    references: [users.id],
  }),
  group: one(groups, {
    fields: [channels.groupId],
    references: [groups.id],
  }),
  members: many(channelMembers),
  messages: many(channelMessages),
}));

export const channelMembersRelations = relations(channelMembers, ({ one }) => ({
  channel: one(channels, {
    fields: [channelMembers.channelId],
    references: [channels.id],
  }),
  user: one(users, {
    fields: [channelMembers.userId],
    references: [users.id],
  }),
}));

export const channelMessagesRelations = relations(channelMessages, ({ one, many }) => ({
  channel: one(channels, {
    fields: [channelMessages.channelId],
    references: [channels.id],
  }),
  sender: one(users, {
    fields: [channelMessages.senderId],
    references: [users.id],
  }),
  replyTo: one(channelMessages, {
    fields: [channelMessages.replyToId],
    references: [channelMessages.id],
  }),
  replies: many(channelMessages),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  organizer: one(users, {
    fields: [events.organizerId],
    references: [users.id],
  }),
  attendees: many(eventAttendees),
}));

export const eventAttendeesRelations = relations(eventAttendees, ({ one }) => ({
  event: one(events, {
    fields: [eventAttendees.eventId],
    references: [events.id],
  }),
  user: one(users, {
    fields: [eventAttendees.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertInvitationSchema = createInsertSchema(invitations).omit({
  id: true,
  createdAt: true,
  usedAt: true,
  usageCount: true,
  isUsed: true,
  usedBy: true,
});

export const insertFriendshipSchema = createInsertSchema(friendships).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFriendGroupSchema = createInsertSchema(friendGroups).omit({
  id: true,
  createdAt: true,
});

export const insertFriendGroupMemberSchema = createInsertSchema(friendGroupMembers).omit({
  id: true,
  addedAt: true,
});

export const insertFriendSuggestionSchema = createInsertSchema(friendSuggestions).omit({
  id: true,
  createdAt: true,
});

export const insertFriendSuggestionDismissalSchema = createInsertSchema(friendSuggestionDismissals).omit({
  id: true,
  createdAt: true,
});

export const insertUserContactSchema = createInsertSchema(userContacts).omit({
  id: true,
  createdAt: true,
  matchedUserId: true,
});

export const insertContactUploadSchema = createInsertSchema(contactUploads).omit({
  id: true,
  createdAt: true,
});

export const insertUserReferralSchema = createInsertSchema(userReferrals).omit({
  id: true,
  createdAt: true,
  creditsAwarded: true,
});

// Schema definitions for the first petitions table (social petitions)
export const insertPetitionSchema = createInsertSchema(petitions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  currentSignatures: true,
});

export const insertPetitionSignatureSchema = createInsertSchema(petitionSignatures).omit({
  id: true,
  signedAt: true,
});

// Schema definitions for unions
export const insertUnionSchema = createInsertSchema(unions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  memberCount: true,
  isVerified: true,
});

export const insertUnionMembershipSchema = createInsertSchema(unionMemberships).omit({
  id: true,
  joinedAt: true,
});

export const insertUnionPostSchema = createInsertSchema(unionPosts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  viewCount: true,
});

// Schema definition will be after table definitions

export const insertPostSchema = createInsertSchema(posts).omit({
  id: true,
  createdAt: true,
  likesCount: true,
  commentsCount: true,
  sharesCount: true,
  emojiReactionsCount: true,
  gifReactionsCount: true,
  bookmarksCount: true,
  flagsCount: true,
  isDeleted: true,
});

export const insertPollSchema = createInsertSchema(polls).omit({
  id: true,
  createdAt: true,
  totalVotes: true,
});

export const insertGroupSchema = createInsertSchema(groups).omit({
  id: true,
  createdAt: true,
  memberCount: true,
});

export const insertCommentSchema = createInsertSchema(comments).omit({
  id: true,
  createdAt: true,
  likesCount: true,
});

export const insertWhistleblowingPostSchema = createInsertSchema(whistleblowingPosts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  credibleVotes: true,
  notCredibleVotes: true,
  credibilityScore: true,
  viewsCount: true,
  commentsCount: true,
  isDeleted: true,
});

export const insertWhistleblowingVoteSchema = createInsertSchema(whistleblowingVotes).omit({
  id: true,
  createdAt: true,
});

export const insertCandidateSchema = createInsertSchema(candidates).omit({
  id: true,
  createdAt: true,
  endorsements: true,
});

export const insertCandidateSupportSchema = createInsertSchema(candidateSupports).omit({
  id: true,
  createdAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export const insertChannelSchema = createInsertSchema(channels).omit({
  id: true,
  createdAt: true,
  memberCount: true,
  lastMessageAt: true,
});

export const insertChannelMemberSchema = createInsertSchema(channelMembers).omit({
  id: true,
  joinedAt: true,
  lastReadAt: true,
});

export const insertChannelMessageSchema = createInsertSchema(channelMessages).omit({
  id: true,
  createdAt: true,
  isEdited: true,
  editedAt: true,
});

export const insertFlagSchema = createInsertSchema(flags).omit({
  id: true,
  createdAt: true,
  status: true,
});

export const insertEventSchema = createInsertSchema(events).omit({
  id: true,
  createdAt: true,
  currentAttendees: true,
});

// Insert schemas for new feed system tables
export const insertUserFollowSchema = createInsertSchema(userFollows).omit({
  id: true,
  createdAt: true,
});

export const insertReactionSchema = createInsertSchema(reactions).omit({
  id: true,
  createdAt: true,
});

export const insertBiasVoteSchema = createInsertSchema(biasVotes).omit({
  id: true,
  createdAt: true,
});

// ACP Cryptocurrency and Blockchain Tables
export const acpTransactions = pgTable("acp_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fromUserId: varchar("from_user_id").references(() => users.id),
  toUserId: varchar("to_user_id").references(() => users.id),
  amount: text("amount").notNull(), // Using text for precision
  transactionType: text("transaction_type").notNull(), // subscription_reward, purchase, sale, transfer
  description: text("description"),
  blockchainHash: text("blockchain_hash"),
  blockNumber: integer("block_number"),
  status: text("status").default("pending"), // pending, confirmed, failed
  relatedItemId: varchar("related_item_id"), // Links to store items, customizations, etc.
  createdAt: timestamp("created_at").defaultNow(),
});

export const acpBlocks = pgTable("acp_blocks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  blockNumber: integer("block_number").notNull().unique(),
  previousHash: text("previous_hash"),
  merkleRoot: text("merkle_root").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
  nonce: text("nonce").notNull(),
  hash: text("hash").notNull().unique(),
  transactionIds: json("transaction_ids").$type<string[]>(),
});

// Profile Store and Marketplace
export const storeItems = pgTable("marketplace_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(), // theme, background, widget, song, layout
  type: text("type").notNull(), // official, user_created
  price: text("price").notNull(), // ACP coin price
  creatorId: varchar("creator_id").references(() => users.id),
  itemData: json("item_data"), // CSS, JSON, or other configuration data
  previewImage: text("preview_image"),
  downloadCount: integer("download_count").default(0),
  rating: text("rating").default("0"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userPurchases = pgTable("marketplace_purchases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  itemId: varchar("item_id").notNull().references(() => storeItems.id),
  purchasePrice: text("purchase_price").notNull(),
  purchasedAt: timestamp("purchased_at").defaultNow(),
});

export const subscriptionRewards = pgTable("subscription_rewards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  subscriptionMonth: timestamp("subscription_month").notNull(),
  coinsAwarded: text("coins_awarded").default("10.00000000"),
  transactionId: varchar("transaction_id").references(() => acpTransactions.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Charity Tables
export const charities = pgTable("charities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(), // environment, education, healthcare, poverty, etc.
  goalAmount: text("goal_amount").notNull(), // USD goal amount (using text for precision)
  raisedAmount: text("raised_amount").default("0.00"), // Total raised in USD
  acpCoinRaised: text("acp_coin_raised").default("0.00000000"), // Total ACP coins raised
  creatorId: varchar("creator_id").notNull().references(() => users.id),
  image: text("image"), // Charity image/logo
  website: text("website"),
  endDate: timestamp("end_date"), // Optional fundraising deadline
  isActive: boolean("is_active").default(true),
  isVerified: boolean("is_verified").default(false), // Admin verification
  donorCount: integer("donor_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const charityDonations = pgTable("charity_donations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  charityId: varchar("charity_id").notNull().references(() => charities.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  amount: text("amount").notNull(), // Donation amount
  currencyType: text("currency_type").notNull(), // "usd" or "acp_coin"
  transactionId: varchar("transaction_id").references(() => acpTransactions.id), // For ACP coin donations
  paymentMethodId: text("payment_method_id"), // For USD donations (Stripe payment intent ID)
  isAnonymous: boolean("is_anonymous").default(false),
  message: text("message"), // Optional message to charity
  status: text("status").default("completed"), // pending, completed, failed, refunded
  createdAt: timestamp("created_at").defaultNow(),
});

export const charitiesRelations = relations(charities, ({ one, many }) => ({
  creator: one(users, {
    fields: [charities.creatorId],
    references: [users.id],
  }),
  donations: many(charityDonations),
}));

export const charityDonationsRelations = relations(charityDonations, ({ one }) => ({
  charity: one(charities, {
    fields: [charityDonations.charityId],
    references: [charities.id],
  }),
  user: one(users, {
    fields: [charityDonations.userId],
    references: [users.id],
  }),
  transaction: one(acpTransactions, {
    fields: [charityDonations.transactionId],
    references: [acpTransactions.id],
  }),
}));

export const insertEventAttendeeSchema = createInsertSchema(eventAttendees).omit({
  id: true,
  registeredAt: true,
});

export const insertStoreItemSchema = createInsertSchema(storeItems).omit({
  id: true,
  createdAt: true,
  downloadCount: true,
  rating: true,
});

export const insertACPTransactionSchema = createInsertSchema(acpTransactions).omit({
  id: true,
  createdAt: true,
  blockNumber: true,
  status: true,
});

export const insertSubscriptionRewardSchema = createInsertSchema(subscriptionRewards).omit({
  id: true,
  createdAt: true,
});

export const createSubscriptionSchema = z.object({
  plan: z.enum(["monthly", "annual"]),
  amount: z.number().min(0).max(200), // Reasonable max limit
  tipAmount: z.number().min(0).max(100), // Reasonable tip limit
});

export const insertCharitySchema = createInsertSchema(charities).omit({
  id: true,
  createdAt: true,
  raisedAmount: true,
  acpCoinRaised: true,
  donorCount: true,
});

export const insertCharityDonationSchema = createInsertSchema(charityDonations).omit({
  id: true,
  createdAt: true,
});

// Representatives Tables for Admin Management
export const representatives = pgTable("representatives", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  officeTitle: text("office_title").notNull(), // e.g., "President", "Senator", "Representative"
  officeLevel: text("office_level").notNull(), // federal, state, local
  party: text("party"),
  email: text("email"),
  phone: text("phone"),
  website: text("website"),
  district: text("district"), // congressional district, state district, etc.
  jurisdiction: text("jurisdiction"), // geographic area of representation
  termStart: timestamp("term_start"), // When current term started
  termEnd: timestamp("term_end"), // When current term ends
  photoUrl: text("photo_url"),
  socials: json("socials"), // JSON object for social media links
  notes: text("notes"), // Admin notes about the representative
  active: boolean("active").default(true), // Whether the representative is currently active
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  nameIndex: index("representatives_name_idx").on(table.name),
  officeLevelIndex: index("representatives_office_level_idx").on(table.officeLevel),
  activeIndex: index("representatives_active_idx").on(table.active),
}));

export const zipCodeLookups = pgTable("zip_code_lookups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  zipCode: text("zip_code").notNull(),
  representativeId: varchar("representative_id").notNull().references(() => representatives.id, { onDelete: "cascade" }),
  officeLevel: text("office_level").notNull(), // federal, state, local
  district: text("district"),
  jurisdiction: text("jurisdiction"),
  priority: integer("priority").default(0), // Priority for ordering representatives
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  zipCodeIndex: index("zip_code_lookups_zip_code_idx").on(table.zipCode),
  representativeIndex: index("zip_code_lookups_representative_idx").on(table.representativeId),
  uniqueZipRepOffice: sql`UNIQUE(${table.zipCode}, ${table.officeLevel}, ${table.representativeId})`,
}));

// Political Positions - Defines the political offices/seats that exist
export const politicalPositions = pgTable("political_positions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(), // e.g., "President of the United States"
  officeType: text("office_type").notNull(), // e.g., "Executive", "Legislative", "Judicial"
  level: text("level").notNull(), // federal, state, county, city
  jurisdiction: text("jurisdiction").notNull(), // e.g., "United States", "California", "Los Angeles County"
  district: text("district"), // e.g., "District 1", "At-Large"
  termLength: integer("term_length"), // term length in years
  isElected: boolean("is_elected").default(true), // elected vs appointed
  description: text("description"), // description of the position's duties
  displayOrder: integer("display_order").default(0), // for sorting positions
  isActive: boolean("is_active").default(true), // whether this position currently exists
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  levelIndex: index("political_positions_level_idx").on(table.level),
  jurisdictionIndex: index("political_positions_jurisdiction_idx").on(table.jurisdiction),
  activeIndex: index("political_positions_active_idx").on(table.isActive),
}));

// Politician Profiles - Information about individual politicians
export const politicianProfiles = pgTable("politician_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  positionId: varchar("position_id").references(() => politicalPositions.id, { onDelete: "set null" }), // current position
  fullName: text("full_name").notNull(),
  party: text("party"), // political party affiliation
  email: text("email"),
  phone: text("phone"),
  officeAddress: text("office_address"), // physical office location
  website: text("website"),
  socialMedia: json("social_media"), // {twitter, facebook, instagram, etc.}
  photoUrl: text("photo_url"),
  biography: text("biography"), // brief bio
  termStart: text("term_start"), // when current term started (MM/DD/YYYY format)
  termEnd: text("term_end"), // when current term ends (MM/DD/YYYY format)
  previousPositions: json("previous_positions"), // array of previous positions held
  notes: text("notes"), // admin notes
  isCurrent: boolean("is_current").default(true), // currently holding office
  featured: boolean("featured").default(false), // featured in the Featured Candidate module
  corruptionGrade: text("corruption_grade"), // A, B, C, D, or F corruption grade
  corruptionScorecard: text("corruption_scorecard"), // Detailed corruption history and information
  isVerified: boolean("is_verified").default(false), // Whether politician claimed and verified their page
  claimRequestEmail: text("claim_request_email"), // Email used to request page claim
  claimRequestPhone: text("claim_request_phone"), // Phone for verification
  claimRequestStatus: text("claim_request_status"), // pending, approved, rejected
  claimRequestDate: timestamp("claim_request_date"), // When claim was requested
  verifiedDate: timestamp("verified_date"), // When admin approved the claim
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  positionIndex: index("politician_profiles_position_idx").on(table.positionId),
  nameIndex: index("politician_profiles_name_idx").on(table.fullName),
  currentIndex: index("politician_profiles_current_idx").on(table.isCurrent),
  featuredIndex: index("politician_profiles_featured_idx").on(table.featured),
  verifiedIndex: index("politician_profiles_verified_idx").on(table.isVerified),
  claimStatusIndex: index("politician_profiles_claim_status_idx").on(table.claimRequestStatus),
  corruptionGradeCheck: sql`CHECK (${table.corruptionGrade} IN ('A', 'B', 'C', 'D', 'F') OR ${table.corruptionGrade} IS NULL)`,
  claimStatusCheck: sql`CHECK (${table.claimRequestStatus} IN ('pending', 'approved', 'rejected') OR ${table.claimRequestStatus} IS NULL)`,
}));

// User Corruption Ratings - Community ratings for politician corruption
export const politicianCorruptionRatings = pgTable("politician_corruption_ratings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  politicianId: varchar("politician_id").notNull().references(() => politicianProfiles.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  grade: text("grade").notNull(), // A, B, C, D, or F
  reasoning: text("reasoning"), // Optional explanation for the rating
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  politicianIndex: index("corruption_ratings_politician_idx").on(table.politicianId),
  userIndex: index("corruption_ratings_user_idx").on(table.userId),
  uniqueUserPolitician: sql`UNIQUE(${table.politicianId}, ${table.userId})`,
  gradeCheck: sql`CHECK (${table.grade} IN ('A', 'B', 'C', 'D', 'F'))`,
}));

// Voter Verification Requests - Secure storage of voter verification data
export const voterVerificationRequests = pgTable("voter_verification_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  fullLegalName: text("full_legal_name").notNull(),
  address: text("address").notNull(),
  dateOfBirth: timestamp("date_of_birth").notNull(),
  stateIdPhotoUrl: text("state_id_photo_url").notNull(), // Stored in object storage
  selfiePhotoUrl: text("selfie_photo_url").notNull(), // Stored in object storage
  phoneNumber: text("phone_number").notNull(),
  emailAddress: text("email_address").notNull(),
  hasFelonyOrIneligibility: boolean("has_felony_or_ineligibility").notNull().default(false),
  ineligibilityExplanation: text("ineligibility_explanation"),
  status: text("status").notNull().default("pending"), // pending, approved, rejected
  submittedAt: timestamp("submitted_at").defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  rejectionReason: text("rejection_reason"),
}, (table) => ({
  userIndex: index("voter_verification_user_idx").on(table.userId),
  statusIndex: index("voter_verification_status_idx").on(table.status),
}));

// Boycotts - Feature for organizing consumer boycotts
export const boycotts = pgTable("boycotts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  reason: text("reason").notNull(), // Why we should boycott
  targetCompany: text("target_company").notNull(), // Company/brand being boycotted
  targetProduct: text("target_product"), // Specific product being boycotted
  alternativeProduct: text("alternative_product"), // Recommended ethical alternative
  alternativeCompany: text("alternative_company"), // Company that makes the alternative
  image: text("image"), // Photo for the boycott
  creatorId: varchar("creator_id").notNull().references(() => users.id),
  groupId: varchar("group_id").references(() => groups.id), // Associated group for discussion
  channelId: varchar("channel_id").references(() => channels.id), // Associated channel for messaging
  subscriberCount: integer("subscriber_count").default(0),
  isActive: boolean("is_active").default(true),
  tags: text("tags").array().default([]), // Categories like "fast-food", "tech", "fashion"
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Boycott Subscriptions - Users who have joined a boycott
export const boycottSubscriptions = pgTable("boycott_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  boycottId: varchar("boycott_id").notNull().references(() => boycotts.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  subscribedAt: timestamp("subscribed_at").defaultNow(),
  isActive: boolean("is_active").default(true),
});

// Unique constraint handled by the database UNIQUE(boycott_id, user_id) constraint

// Citizen Initiative System Tables
export const jurisdictions = pgTable("jurisdictions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(), // e.g., "California", "Los Angeles County", "San Francisco"
  code: text("code").notNull().unique(), // e.g., "US-CA", "US-CA-LA", "US-CA-SF"
  parentId: varchar("parent_id"), // hierarchical jurisdictions - reference added later
  geojson: json("geojson"), // geographic boundaries
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const rulesets = pgTable("rulesets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jurisdictionId: varchar("jurisdiction_id").notNull().references(() => jurisdictions.id),
  yamlBlob: text("yaml_blob").notNull(), // YAML configuration for jurisdiction rules
  effectiveFrom: timestamp("effective_from").notNull().defaultNow(),
  effectiveTo: timestamp("effective_to"), // nullable for current rules
  createdAt: timestamp("created_at").defaultNow(),
});

export const initiatives = pgTable("initiatives", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  slug: text("slug").notNull().unique(), // URL-friendly identifier
  title: text("title").notNull(),
  summary: text("summary").notNull(), // 100-200 words
  fullTextMd: text("full_text_md").notNull(), // full text in markdown
  jurisdictionId: varchar("jurisdiction_id").notNull().references(() => jurisdictions.id),
  scopeLevel: text("scope_level").notNull(), // state, county, city
  status: text("status").notNull().default("draft"), // draft, in_review, collecting, submitted, qualified, failed, withdrawn
  initiativeType: text("initiative_type").notNull(), // statute, constitutional_amendment, ordinance
  directOrIndirect: text("direct_or_indirect").notNull(), // direct, indirect
  createdBy: varchar("created_by").notNull().references(() => users.id),
  currentVersionId: varchar("current_version_id"), // references initiative_versions.id
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const initiativeVersions = pgTable("initiative_versions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  initiativeId: varchar("initiative_id").notNull().references(() => initiatives.id),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  fullTextMd: text("full_text_md").notNull(),
  changelog: text("changelog"), // description of changes
  authorId: varchar("author_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const initiativePetitions = pgTable("initiative_petitions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  initiativeId: varchar("initiative_id").notNull().references(() => initiatives.id),
  targetSignatureCount: integer("target_signature_count").notNull(),
  currentSignatureCount: integer("current_signature_count").default(0),
  startDate: timestamp("start_date").notNull(),
  deadline: timestamp("deadline").notNull(),
  visible: boolean("visible").default(true),
  circulatorRequirements: json("circulator_requirements"), // JSON rules for circulators
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const signatures = pgTable("signatures", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  petitionId: varchar("petition_id").notNull().references(() => initiativePetitions.id),
  userId: varchar("user_id").references(() => users.id), // nullable for anonymous signatures
  legalNameHash: text("legal_name_hash").notNull(), // salted hash
  addressHash: text("address_hash").notNull(), // salted hash
  emailHash: text("email_hash").notNull(), // salted hash
  phoneHash: text("phone_hash"), // salted hash, optional
  voterIdHash: text("voter_id_hash"), // salted hash, optional
  signedAt: timestamp("signed_at").defaultNow(),
  ipHash: text("ip_hash").notNull(), // salted hash for fraud detection
  deviceFingerprintHash: text("device_fingerprint_hash"), // salted hash
  verified: text("verified").default("unverified"), // unverified, auto_pass, auto_fail, manual_pass, manual_fail
  failureReason: text("failure_reason"), // reason for verification failure
  circulatorId: varchar("circulator_id").references(() => users.id), // who collected this signature
  createdAt: timestamp("created_at").defaultNow(),
});

export const validationEvents = pgTable("validation_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  signatureId: varchar("signature_id").notNull().references(() => signatures.id),
  eventType: text("event_type").notNull(), // verification_started, auto_verified, manual_review, etc.
  payloadJson: json("payload_json"), // event-specific data
  actorId: varchar("actor_id").references(() => users.id), // who performed the action
  createdAt: timestamp("created_at").defaultNow(),
});

export const sponsors = pgTable("sponsors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  initiativeId: varchar("initiative_id").notNull().references(() => initiatives.id),
  name: text("name").notNull(),
  contactEmail: text("contact_email").notNull(),
  isFinancialSponsor: boolean("is_financial_sponsor").default(false),
  sponsorshipAmount: decimal("sponsorship_amount", { precision: 10, scale: 2 }), // optional funding amount
  createdAt: timestamp("created_at").defaultNow(),
});

export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  actorId: varchar("actor_id").references(() => users.id),
  entityType: text("entity_type").notNull(), // "initiative", "signature", "petition", etc.
  entityId: varchar("entity_id").notNull(),
  action: text("action").notNull(), // "created", "updated", "verified", "rejected", etc.
  diffJson: json("diff_json"), // before/after state
  createdAt: timestamp("created_at").defaultNow(),
});

// Live Streaming Tables
export const liveStreams = pgTable("live_streams", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerId: varchar("owner_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("scheduled"), // 'scheduled', 'live', 'ended', 'canceled'
  visibility: text("visibility").notNull().default("public"), // 'public', 'followers', 'group', 'private'
  scheduledStart: timestamp("scheduled_start"),
  actualStart: timestamp("actual_start"),
  endedAt: timestamp("ended_at"),
  provider: text("provider").default("cloudflare"), // 'cloudflare', 'mux'
  providerInputId: text("provider_input_id"),
  providerPlaybackId: text("provider_playback_id"),
  providerPlaybackUrl: text("provider_playback_url"),
  rtmpServerUrl: text("rtmp_server_url"),
  streamKeyHash: text("stream_key_hash"),
  thumbnailUrl: text("thumbnail_url"),
  contextType: text("context_type"), // 'post', 'debate', 'event'
  contextId: varchar("context_id"),
  notificationScheduled: boolean("notification_scheduled").default(false),
  viewerCount: integer("viewer_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  ownerIndex: index("live_streams_owner_idx").on(table.ownerId),
  statusIndex: index("live_streams_status_idx").on(table.status),
  scheduledStartIndex: index("live_streams_scheduled_start_idx").on(table.scheduledStart),
  contextIndex: index("live_streams_context_idx").on(table.contextType, table.contextId),
}));

export const liveStreamViewers = pgTable("live_stream_viewers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  streamId: varchar("stream_id").notNull().references(() => liveStreams.id, { onDelete: "cascade" }),
  userId: varchar("user_id").references(() => users.id),
  joinedAt: timestamp("joined_at").defaultNow(),
  leftAt: timestamp("left_at"),
}, (table) => ({
  streamIndex: index("live_stream_viewers_stream_idx").on(table.streamId),
  userIndex: index("live_stream_viewers_user_idx").on(table.userId),
}));

// Mobile App Signals (TikTok-style short videos)
export const signals = pgTable("signals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  authorId: varchar("author_id").notNull().references(() => users.id),
  title: text("title"),
  description: text("description"),
  videoUrl: text("video_url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  duration: integer("duration").notNull(), // Duration in seconds
  maxDuration: integer("max_duration").default(60), // 60s default, 300s for ACP+
  filter: text("filter").default("none"), // Applied filter name
  overlays: json("overlays").$type<{
    texts: { id: string; content: string; x: number; y: number; fontSize: number; color: string; background?: string; font?: string }[];
    emojis: { id: string; emoji: string; x: number; y: number; size: number }[];
    graphics: { id: string; url: string; x: number; y: number; width: number; height: number }[];
  }>(),
  tags: text("tags").array().default([]),
  viewCount: integer("view_count").default(0),
  likesCount: integer("likes_count").default(0),
  commentsCount: integer("comments_count").default(0),
  sharesCount: integer("shares_count").default(0),
  isPublic: boolean("is_public").default(true),
  isDeleted: boolean("is_deleted").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  authorIndex: index("signals_author_idx").on(table.authorId),
  createdAtIndex: index("signals_created_at_idx").on(table.createdAt.desc()),
  viewCountIndex: index("signals_view_count_idx").on(table.viewCount.desc()),
}));

// Signal recording chunks for progressive upload
export const signalChunks = pgTable("signal_chunks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  signalId: varchar("signal_id").references(() => signals.id, { onDelete: "cascade" }),
  authorId: varchar("author_id").notNull().references(() => users.id),
  chunkNumber: integer("chunk_number").notNull(),
  blobUrl: text("blob_url").notNull(),
  duration: integer("duration").notNull(), // Duration of this chunk in ms
  status: text("status").default("pending"), // pending, uploaded, merged
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  signalIndex: index("signal_chunks_signal_idx").on(table.signalId),
  authorIndex: index("signal_chunks_author_idx").on(table.authorId),
  orderIndex: index("signal_chunks_order_idx").on(table.signalId, table.chunkNumber),
}));

// Signal likes (separate from post likes)
export const signalLikes = pgTable("signal_likes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  signalId: varchar("signal_id").notNull().references(() => signals.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  signalIndex: index("signal_likes_signal_idx").on(table.signalId),
  userIndex: index("signal_likes_user_idx").on(table.userId),
  uniqueLike: sql`UNIQUE(${table.signalId}, ${table.userId})`,
}));

// Signal comments
export const signalComments = pgTable("signal_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  signalId: varchar("signal_id").notNull().references(() => signals.id, { onDelete: "cascade" }),
  authorId: varchar("author_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  parentId: varchar("parent_id"),
  likesCount: integer("likes_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  signalIndex: index("signal_comments_signal_idx").on(table.signalId),
  authorIndex: index("signal_comments_author_idx").on(table.authorId),
  parentIndex: index("signal_comments_parent_idx").on(table.parentId),
}));

export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  type: text("type").notNull(), // 'live_schedule', 'live_start', 'general'
  title: text("title").notNull(),
  message: text("message").notNull(),
  payload: json("payload"), // Additional data
  read: boolean("read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userIndex: index("notifications_user_idx").on(table.userId),
  readIndex: index("notifications_read_idx").on(table.read),
  typeIndex: index("notifications_type_idx").on(table.type),
}));

// Content Moderation: Flagged Content
export const flaggedContent = pgTable("flagged_content", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contentType: text("content_type").notNull(), // 'post', 'comment', 'message', 'poll'
  contentId: varchar("content_id").notNull(),
  flagType: text("flag_type").notNull(), // 'spam', 'hate_speech', 'nudity', 'crime', 'misinformation', 'other'
  flaggedBy: varchar("flagged_by").notNull().references(() => users.id),
  reason: text("reason"),
  status: text("status").notNull().default("pending"), // 'pending', 'reviewed', 'action_taken', 'dismissed'
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewNote: text("review_note"),
  actionTaken: text("action_taken"), // 'removed', 'warning_sent', 'user_banned', 'no_action'
  createdAt: timestamp("created_at").defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
}, (table) => ({
  contentIndex: index("flagged_content_content_idx").on(table.contentType, table.contentId),
  statusIndex: index("flagged_content_status_idx").on(table.status),
  flagTypeIndex: index("flagged_content_flag_type_idx").on(table.flagType),
  flaggedByIndex: index("flagged_content_flagged_by_idx").on(table.flaggedBy),
}));

// User Bans
export const bannedUsers = pgTable("banned_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  bannedBy: varchar("banned_by").notNull().references(() => users.id),
  reason: text("reason").notNull(),
  duration: text("duration"), // 'permanent', '1day', '7days', '30days', or null
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  unbannedAt: timestamp("unbanned_at"),
  unbannedBy: varchar("unbanned_by").references(() => users.id),
}, (table) => ({
  userIndex: index("banned_users_user_idx").on(table.userId),
  activeIndex: index("banned_users_active_idx").on(table.isActive),
  expiresIndex: index("banned_users_expires_idx").on(table.expiresAt),
}));

// IP Address Blocking
export const blockedIps = pgTable("blocked_ips", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ipAddress: text("ip_address").notNull().unique(),
  blockedBy: varchar("blocked_by").notNull().references(() => users.id),
  reason: text("reason").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  unblockedAt: timestamp("unblocked_at"),
  unblockedBy: varchar("unblocked_by").references(() => users.id),
}, (table) => ({
  ipIndex: index("blocked_ips_ip_idx").on(table.ipAddress),
  activeIndex: index("blocked_ips_active_idx").on(table.isActive),
}));

// Algorithm Configuration
export const algorithmSettings = pgTable("algorithm_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  // Temporal Signals
  freshnessWeight: integer("freshness_weight").default(70).notNull(), // 0-100%
  timeDecayCurve: text("time_decay_curve").default("exponential").notNull(), // 'linear', 'exponential', 'logarithmic'
  
  // Engagement Signals
  likeWeight: integer("like_weight").default(10).notNull(), // 0-100 (multiplier x0.1)
  commentWeight: integer("comment_weight").default(30).notNull(), // 0-100 (multiplier x0.1)
  shareWeight: integer("share_weight").default(50).notNull(), // 0-100 (multiplier x0.1)
  reactionDiversityBonus: integer("reaction_diversity_bonus").default(20).notNull(), // 0-50%
  
  // Social Graph Signals
  friendContentBoost: integer("friend_content_boost").default(150).notNull(), // 0-200%
  followingBoost: integer("following_boost").default(120).notNull(), // 0-200%
  groupMembershipBoost: integer("group_membership_boost").default(100).notNull(), // 0-150%
  
  // Quality & Trust Signals
  verifiedUserBoost: integer("verified_user_boost").default(50).notNull(), // 0-100%
  flagPenalty: integer("flag_penalty").default(-50).notNull(), // -100% to 0%
  localContentBoost: integer("local_content_boost").default(80).notNull(), // 0-150%
  
  // Advanced Settings
  diversityScore: integer("diversity_score").default(40).notNull(), // 0-100% - ensure varied viewpoints
  viralDetectionThreshold: integer("viral_detection_threshold").default(100).notNull(), // engagement count
  pollUrgencyBoost: integer("poll_urgency_boost").default(75).notNull(), // 0-150% - boost polls nearing end
  eventProximityBoost: integer("event_proximity_boost").default(90).notNull(), // 0-150% - boost nearby/soon events
  
  // Metadata
  updatedBy: varchar("updated_by").references(() => users.id),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  updatedAtIndex: index("algorithm_settings_updated_at_idx").on(table.updatedAt),
}));

export const insertRepresentativeSchema = createInsertSchema(representatives).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertZipCodeLookupSchema = createInsertSchema(zipCodeLookups).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPoliticalPositionSchema = createInsertSchema(politicalPositions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPoliticianProfileSchema = createInsertSchema(politicianProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPoliticianCorruptionRatingSchema = createInsertSchema(politicianCorruptionRatings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertVoterVerificationRequestSchema = createInsertSchema(voterVerificationRequests).omit({
  id: true,
  submittedAt: true,
  reviewedAt: true,
  reviewedBy: true,
  rejectionReason: true,
  status: true,
});

export const insertBoycottSchema = createInsertSchema(boycotts).omit({
  id: true,
  subscriberCount: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBoycottSubscriptionSchema = createInsertSchema(boycottSubscriptions).omit({
  id: true,
  subscribedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Post = typeof posts.$inferSelect;
export type InsertPost = z.infer<typeof insertPostSchema>;
export type PostWithAuthor = Post & {
  author: {
    username: string;
    firstName: string | null;
    lastName: string | null;
    avatar: string | null;
  } | null;
  pollId?: string | null;
  pollTitle?: string | null;
  pollDescription?: string | null;
  pollOptions?: { id: string; text: string; votes: number }[] | null;
  pollVotingType?: string | null;
  pollIsBlockchainVerified?: boolean | null;
  pollTotalVotes?: number | null;
  pollEndDate?: Date | null;
  pollIsActive?: boolean | null;
};
export type Poll = typeof polls.$inferSelect;
export type InsertPoll = z.infer<typeof insertPollSchema>;
export type Group = typeof groups.$inferSelect;
export type InsertGroup = z.infer<typeof insertGroupSchema>;
export type Comment = typeof comments.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type WhistleblowingPost = typeof whistleblowingPosts.$inferSelect;
export type InsertWhistleblowingPost = z.infer<typeof insertWhistleblowingPostSchema>;
export type WhistleblowingVote = typeof whistleblowingVotes.$inferSelect;
export type InsertWhistleblowingVote = z.infer<typeof insertWhistleblowingVoteSchema>;
export type Candidate = typeof candidates.$inferSelect;
export type InsertCandidate = z.infer<typeof insertCandidateSchema>;
export type CandidateSupport = typeof candidateSupports.$inferSelect;
export type InsertCandidateSupport = z.infer<typeof insertCandidateSupportSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Channel = typeof channels.$inferSelect;
export type InsertChannel = z.infer<typeof insertChannelSchema>;
export type ChannelMember = typeof channelMembers.$inferSelect;
export type InsertChannelMember = z.infer<typeof insertChannelMemberSchema>;
export type ChannelMessage = typeof channelMessages.$inferSelect;
export type InsertChannelMessage = z.infer<typeof insertChannelMessageSchema>;
export type FollowedRepresentative = typeof followedRepresentatives.$inferSelect;
export type InsertFollowedRepresentative = typeof followedRepresentatives.$inferInsert;
export type UserAddress = typeof userAddresses.$inferSelect;
export type InsertUserAddress = typeof userAddresses.$inferInsert;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = typeof passwordResetTokens.$inferInsert;
export type Flag = typeof flags.$inferSelect;
export type InsertFlag = z.infer<typeof insertFlagSchema>;
export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type EventAttendee = typeof eventAttendees.$inferSelect;
export type InsertEventAttendee = z.infer<typeof insertEventAttendeeSchema>;
export type ACPTransaction = typeof acpTransactions.$inferSelect;
export type InsertACPTransaction = z.infer<typeof insertACPTransactionSchema>;
export type ACPBlock = typeof acpBlocks.$inferSelect;
export type StoreItem = typeof storeItems.$inferSelect;
export type InsertStoreItem = z.infer<typeof insertStoreItemSchema>;
export type UserPurchase = typeof userPurchases.$inferSelect;
export type SubscriptionReward = typeof subscriptionRewards.$inferSelect;
export type InsertSubscriptionReward = z.infer<typeof insertSubscriptionRewardSchema>;
export type Charity = typeof charities.$inferSelect;
export type InsertCharity = z.infer<typeof insertCharitySchema>;
export type CharityDonation = typeof charityDonations.$inferSelect;
export type InsertCharityDonation = z.infer<typeof insertCharityDonationSchema>;
export type Representative = typeof representatives.$inferSelect;
export type InsertRepresentative = z.infer<typeof insertRepresentativeSchema>;
export type ZipCodeLookup = typeof zipCodeLookups.$inferSelect;
export type InsertZipCodeLookup = z.infer<typeof insertZipCodeLookupSchema>;
export type PoliticalPosition = typeof politicalPositions.$inferSelect;
export type InsertPoliticalPosition = z.infer<typeof insertPoliticalPositionSchema>;
export type PoliticianProfile = typeof politicianProfiles.$inferSelect;
export type InsertPoliticianProfile = z.infer<typeof insertPoliticianProfileSchema>;
export type PoliticianCorruptionRating = typeof politicianCorruptionRatings.$inferSelect;
export type InsertPoliticianCorruptionRating = z.infer<typeof insertPoliticianCorruptionRatingSchema>;
export type VoterVerificationRequest = typeof voterVerificationRequests.$inferSelect;
export type InsertVoterVerificationRequest = z.infer<typeof insertVoterVerificationRequestSchema>;
export type Boycott = typeof boycotts.$inferSelect;
export type InsertBoycott = z.infer<typeof insertBoycottSchema>;
export type BoycottSubscription = typeof boycottSubscriptions.$inferSelect;
export type InsertBoycottSubscription = z.infer<typeof insertBoycottSubscriptionSchema>;

// Citizen Initiative schema exports
export const insertJurisdictionSchema = createInsertSchema(jurisdictions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRulesetSchema = createInsertSchema(rulesets).omit({
  id: true,
  createdAt: true,
});

export const insertInitiativeSchema = createInsertSchema(initiatives).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  currentVersionId: true,
});

export const insertInitiativeVersionSchema = createInsertSchema(initiativeVersions).omit({
  id: true,
  createdAt: true,
});

export const insertInitiativePetitionSchema = createInsertSchema(initiativePetitions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  currentSignatureCount: true,
});

export const insertSignatureSchema = createInsertSchema(signatures).omit({
  id: true,
  createdAt: true,
});

export const insertValidationEventSchema = createInsertSchema(validationEvents).omit({
  id: true,
  createdAt: true,
});

export const insertSponsorSchema = createInsertSchema(sponsors).omit({
  id: true,
  createdAt: true,
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true,
});

export const insertLiveStreamSchema = createInsertSchema(liveStreams).omit({
  id: true,
  createdAt: true,
  viewerCount: true,
  actualStart: true,
  endedAt: true,
  streamKeyHash: true,
  notificationScheduled: true,
});

export const insertLiveStreamViewerSchema = createInsertSchema(liveStreamViewers).omit({
  id: true,
  joinedAt: true,
  leftAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
  read: true,
});

export const insertFlaggedContentSchema = createInsertSchema(flaggedContent).omit({
  id: true,
  createdAt: true,
  reviewedAt: true,
  status: true,
});

export const insertBannedUserSchema = createInsertSchema(bannedUsers).omit({
  id: true,
  createdAt: true,
  unbannedAt: true,
  isActive: true,
});

export const insertBlockedIpSchema = createInsertSchema(blockedIps).omit({
  id: true,
  createdAt: true,
  unblockedAt: true,
  isActive: true,
});

export const insertAlgorithmSettingsSchema = createInsertSchema(algorithmSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Mobile Signals insert schemas
export const insertSignalSchema = createInsertSchema(signals).omit({
  id: true,
  createdAt: true,
  viewCount: true,
  likesCount: true,
  commentsCount: true,
  sharesCount: true,
  isDeleted: true,
});

export const insertSignalChunkSchema = createInsertSchema(signalChunks).omit({
  id: true,
  createdAt: true,
});

export const insertSignalLikeSchema = createInsertSchema(signalLikes).omit({
  id: true,
  createdAt: true,
});

export const insertSignalCommentSchema = createInsertSchema(signalComments).omit({
  id: true,
  createdAt: true,
  likesCount: true,
});

// Citizen Initiative type exports
export type Jurisdiction = typeof jurisdictions.$inferSelect;
export type InsertJurisdiction = z.infer<typeof insertJurisdictionSchema>;
export type Ruleset = typeof rulesets.$inferSelect;
export type InsertRuleset = z.infer<typeof insertRulesetSchema>;
export type Initiative = typeof initiatives.$inferSelect;
export type InsertInitiative = z.infer<typeof insertInitiativeSchema>;
export type InitiativeVersion = typeof initiativeVersions.$inferSelect;
export type InsertInitiativeVersion = z.infer<typeof insertInitiativeVersionSchema>;
// Initiative petitions use InitiativePetition and InsertInitiativePetition types instead
export type Signature = typeof signatures.$inferSelect;
export type InsertSignature = z.infer<typeof insertSignatureSchema>;
export type ValidationEvent = typeof validationEvents.$inferSelect;
export type InsertValidationEvent = z.infer<typeof insertValidationEventSchema>;
export type Sponsor = typeof sponsors.$inferSelect;
export type InsertSponsor = z.infer<typeof insertSponsorSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;

// Invitation types
export type Invitation = typeof invitations.$inferSelect;
export type InsertInvitation = z.infer<typeof insertInvitationSchema>;

// Social/Friends types
export type Friendship = typeof friendships.$inferSelect;
export type InsertFriendship = z.infer<typeof insertFriendshipSchema>;
export type FriendGroup = typeof friendGroups.$inferSelect;
export type InsertFriendGroup = z.infer<typeof insertFriendGroupSchema>;
export type FriendGroupMember = typeof friendGroupMembers.$inferSelect;
export type InsertFriendGroupMember = z.infer<typeof insertFriendGroupMemberSchema>;
export type FriendSuggestion = typeof friendSuggestions.$inferSelect;
export type InsertFriendSuggestion = z.infer<typeof insertFriendSuggestionSchema>;
export type FriendSuggestionDismissal = typeof friendSuggestionDismissals.$inferSelect;
export type InsertFriendSuggestionDismissal = z.infer<typeof insertFriendSuggestionDismissalSchema>;
export type UserContact = typeof userContacts.$inferSelect;
export type InsertUserContact = z.infer<typeof insertUserContactSchema>;
export type ContactUpload = typeof contactUploads.$inferSelect;
export type InsertContactUpload = z.infer<typeof insertContactUploadSchema>;
export type UserReferral = typeof userReferrals.$inferSelect;
export type InsertUserReferral = z.infer<typeof insertUserReferralSchema>;

// Petitions & Unions types
export type Petition = typeof petitions.$inferSelect;
export type InsertPetition = z.infer<typeof insertPetitionSchema>;
export type PetitionSignature = typeof petitionSignatures.$inferSelect;
export type InsertPetitionSignature = z.infer<typeof insertPetitionSignatureSchema>;
export type Union = typeof unions.$inferSelect;
export type InsertUnion = z.infer<typeof insertUnionSchema>;
export type UnionMembership = typeof unionMemberships.$inferSelect;
export type InsertUnionMembership = z.infer<typeof insertUnionMembershipSchema>;
export type UnionPost = typeof unionPosts.$inferSelect;
export type InsertUnionPost = z.infer<typeof insertUnionPostSchema>;

// Initiative petition types (different from social petitions)
export type InitiativePetition = typeof initiativePetitions.$inferSelect;
export type InsertInitiativePetition = z.infer<typeof insertInitiativePetitionSchema>;

// Live Streaming types
export type LiveStream = typeof liveStreams.$inferSelect;
export type InsertLiveStream = z.infer<typeof insertLiveStreamSchema>;
export type LiveStreamViewer = typeof liveStreamViewers.$inferSelect;
export type InsertLiveStreamViewer = z.infer<typeof insertLiveStreamViewerSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

// Content Moderation types
export type FlaggedContent = typeof flaggedContent.$inferSelect;
export type InsertFlaggedContent = z.infer<typeof insertFlaggedContentSchema>;
export type BannedUser = typeof bannedUsers.$inferSelect;
export type InsertBannedUser = z.infer<typeof insertBannedUserSchema>;
export type BlockedIp = typeof blockedIps.$inferSelect;
export type InsertBlockedIp = z.infer<typeof insertBlockedIpSchema>;
export type AlgorithmSettings = typeof algorithmSettings.$inferSelect;
export type InsertAlgorithmSettings = z.infer<typeof insertAlgorithmSettingsSchema>;

// Live Stream with owner info
export type LiveStreamWithOwner = LiveStream & {
  owner: {
    username: string;
    firstName: string | null;
    lastName: string | null;
    avatar: string | null;
  } | null;
};

// Mobile Signals types
export type Signal = typeof signals.$inferSelect;
export type InsertSignal = z.infer<typeof insertSignalSchema>;
export type SignalChunk = typeof signalChunks.$inferSelect;
export type InsertSignalChunk = z.infer<typeof insertSignalChunkSchema>;
export type SignalLike = typeof signalLikes.$inferSelect;
export type InsertSignalLike = z.infer<typeof insertSignalLikeSchema>;
export type SignalComment = typeof signalComments.$inferSelect;
export type InsertSignalComment = z.infer<typeof insertSignalCommentSchema>;

// Signal with author info for feed display
export type SignalWithAuthor = Signal & {
  author: {
    id: string;
    username: string;
    firstName: string | null;
    lastName: string | null;
    avatar: string | null;
    subscriptionStatus: string | null;
  } | null;
};
