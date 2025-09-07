import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, json, decimal } from "drizzle-orm/pg-core";
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
});

export const posts = pgTable("posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  authorId: varchar("author_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  type: text("type").notNull().default("post"), // post, poll, announcement, charity_donation
  tags: text("tags").array().default([]),
  image: text("image"),
  likesCount: integer("likes_count").default(0),
  commentsCount: integer("comments_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

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

export const insertPostSchema = createInsertSchema(posts).omit({
  id: true,
  createdAt: true,
  likesCount: true,
  commentsCount: true,
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

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Post = typeof posts.$inferSelect;
export type InsertPost = z.infer<typeof insertPostSchema>;
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
