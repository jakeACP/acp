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
  // News organization fields
  isNewsOrganization: boolean("is_news_organization").default(false),
  organizationName: text("organization_name"),
  politicalLean: decimal("political_lean", { precision: 3, scale: 2 }), // -1.00 to 1.00
  trustScore: decimal("trust_score", { precision: 3, scale: 2 }).default("0.00"),
}, (table) => ({
  politicalLeanRange: sql`CHECK (${table.politicalLean} BETWEEN -1.00 AND 1.00 OR ${table.politicalLean} IS NULL)`,
  trustScoreRange: sql`CHECK (${table.trustScore} BETWEEN 0.00 AND 1.00 OR ${table.trustScore} IS NULL)`,
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

export const posts = pgTable("posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  authorId: varchar("author_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  type: text("type").notNull().default("post"), // post, poll, announcement, charity_donation, news
  tags: text("tags").array().default([]),
  image: text("image"),
  url: text("url"), // For news articles and external links
  title: text("title"), // News headlines
  newsSourceName: text("news_source_name"), // Original news source
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
  createdAt: timestamp("created_at").defaultNow(),
});

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

// Representatives Tables for ChatGPT integration
export const representatives = pgTable("representatives", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  office: text("office").notNull(), // e.g., "President", "Senator", "Representative"
  level: text("level").notNull(), // federal, state, local
  party: text("party"),
  phone: text("phone"),
  email: text("email"),
  website: text("website"),
  address: text("address"),
  photoUrl: text("photo_url"),
  district: text("district"), // congressional district, state district, etc.
  state: text("state"),
  zipCodes: text("zip_codes").array().default([]), // Array of zip codes this rep serves
  // Election and term tracking
  electedDate: timestamp("elected_date"), // When they were last elected
  termStart: timestamp("term_start"), // When current term started
  termEnd: timestamp("term_end"), // When current term ends
  termLength: text("term_length"), // e.g., "4 years", "6 years", "2 years"
  isCurrentlyServing: boolean("is_currently_serving").default(true),
  lastVerified: timestamp("last_verified").defaultNow(), // Last time data was verified as current
  verificationSource: text("verification_source"), // "chatgpt", "official_source", "manual"
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const zipCodeLookups = pgTable("zip_code_lookups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  zipCode: text("zip_code").notNull().unique(),
  searchedAt: timestamp("searched_at").defaultNow(),
  representativeIds: text("representative_ids").array().default([]), // IDs of representatives found
});

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

export const petitions = pgTable("petitions", {
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
  petitionId: varchar("petition_id").notNull().references(() => petitions.id),
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

export const insertRepresentativeSchema = createInsertSchema(representatives).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertZipCodeLookupSchema = createInsertSchema(zipCodeLookups).omit({
  id: true,
  searchedAt: true,
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
  } | null;
};
export type Poll = typeof polls.$inferSelect;
export type InsertPoll = z.infer<typeof insertPollSchema>;
export type Group = typeof groups.$inferSelect;
export type InsertGroup = z.infer<typeof insertGroupSchema>;
export type Comment = typeof comments.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;
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

export const insertPetitionSchema = createInsertSchema(petitions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
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

// Citizen Initiative type exports
export type Jurisdiction = typeof jurisdictions.$inferSelect;
export type InsertJurisdiction = z.infer<typeof insertJurisdictionSchema>;
export type Ruleset = typeof rulesets.$inferSelect;
export type InsertRuleset = z.infer<typeof insertRulesetSchema>;
export type Initiative = typeof initiatives.$inferSelect;
export type InsertInitiative = z.infer<typeof insertInitiativeSchema>;
export type InitiativeVersion = typeof initiativeVersions.$inferSelect;
export type InsertInitiativeVersion = z.infer<typeof insertInitiativeVersionSchema>;
export type Petition = typeof petitions.$inferSelect;
export type InsertPetition = z.infer<typeof insertPetitionSchema>;
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
