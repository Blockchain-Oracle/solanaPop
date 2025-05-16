import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  walletAddress: text("wallet_address"),
});

export const tokens = pgTable("tokens", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  symbol: text("symbol").notNull(),
  description: text("description").notNull(),
  supply: integer("supply").notNull(),
  claimed: integer("claimed").default(0),
  expiryDate: timestamp("expiry_date"),
  creatorId: integer("creator_id").notNull(),
  creatorAddress: text("creator_address"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  mintAddress: text("mint_address").notNull(),
  metadataUri: text("metadata_uri").notNull(),
  whitelistEnabled: boolean("whitelist_enabled").default(false),
});

// New events table
export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  date: timestamp("date").notNull(),
  endDate: timestamp("end_date"),
  location: text("location").notNull(),
  capacity: integer("capacity").default(100),
  eventType: text("event_type").notNull(),
  creatorId: integer("creator_id").notNull(),
  tokenId: integer("token_id"),
  isPrivate: boolean("is_private").default(false),
  accessCode: text("access_code"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  whitelistEnabled: boolean("whitelist_enabled").default(false),
});

export const tokenClaims = pgTable("token_claims", {
  id: serial("id").primaryKey(),
  tokenId: integer("token_id").notNull(),
  userId: integer("user_id").notNull(),
  walletAddress: text("wallet_address").notNull(),
  claimedAt: timestamp("claimed_at").defaultNow().notNull(),
  transactionId: text("transaction_id"),
  reference: text("reference"),
  status: text("status").default('pending').notNull(),
});

// Whitelist table
export const whitelists = pgTable("whitelists", {
  id: serial("id").primaryKey(),
  tokenId: integer("token_id").references(() => tokens.id, { onDelete: 'cascade' }),
  eventId: integer("event_id").references(() => events.id, { onDelete: 'cascade' }),
  walletAddress: text("wallet_address").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Define relations after all tables are defined to avoid circular dependencies
export const usersRelations = relations(users, ({ many }) => ({
  tokens: many(tokens),
  tokenClaims: many(tokenClaims),
  events: many(events),
}));

export const tokensRelations = relations(tokens, ({ one, many }) => ({
  creator: one(users, {
    fields: [tokens.creatorId],
    references: [users.id],
  }),
  claims: many(tokenClaims),
  events: many(events),
  whitelists: many(whitelists, { relationName: "token_whitelists" }),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  creator: one(users, {
    fields: [events.creatorId],
    references: [users.id],
  }),
  token: one(tokens, {
    fields: [events.tokenId],
    references: [tokens.id],
  }),
  whitelists: many(whitelists, { relationName: "event_whitelists" }),
}));

export const tokenClaimsRelations = relations(tokenClaims, ({ one }) => ({
  token: one(tokens, {
    fields: [tokenClaims.tokenId],
    references: [tokens.id],
  }),
  user: one(users, {
    fields: [tokenClaims.userId],
    references: [users.id],
  }),
}));

export const whitelistsRelations = relations(whitelists, ({ one }) => ({
  token: one(tokens, {
    fields: [whitelists.tokenId],
    references: [tokens.id],
    relationName: "token_whitelists",
  }),
  event: one(events, {
    fields: [whitelists.eventId],
    references: [events.id],
    relationName: "event_whitelists",
  }),
}));

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  walletAddress: true,
});

export const insertTokenSchema = createInsertSchema(tokens)
  .pick({
    name: true,
    symbol: true,
    description: true,
    supply: true,
    creatorId: true,
    creatorAddress: true,
    mintAddress: true,
    metadataUri: true,
    whitelistEnabled: true,
  })
  .extend({
    // Accept either a Date object or an ISO string for expiryDate
    expiryDate: z.union([z.date(), z.string()]).optional().transform(val => 
      val ? (typeof val === 'string' ? new Date(val) : val) : undefined
    ),
  });

export const insertEventSchema = createInsertSchema(events).pick({
  name: true,
  description: true,
  location: true,
  capacity: true,
  eventType: true,
  creatorId: true,
  tokenId: true,
  isPrivate: true,
  accessCode: true,
  whitelistEnabled: true,
}).extend({
  date: z.union([z.date(), z.string()]).transform(val => 
    typeof val === 'string' ? new Date(val) : val
  ),
  endDate: z.union([z.date(), z.string()]).optional().transform(val => 
    val ? (typeof val === 'string' ? new Date(val) : val) : undefined
  ),
});

export const insertTokenClaimSchema = createInsertSchema(tokenClaims).pick({
  tokenId: true,
  userId: true,
  walletAddress: true,
  transactionId: true,
  reference: true,
  status: true,
});

export const insertWhitelistSchema = createInsertSchema(whitelists).pick({
  tokenId: true,
  eventId: true,
  walletAddress: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertToken = z.infer<typeof insertTokenSchema>;
export type Token = typeof tokens.$inferSelect;

export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof events.$inferSelect;

export type InsertTokenClaim = z.infer<typeof insertTokenClaimSchema>;
export type TokenClaim = typeof tokenClaims.$inferSelect;

export type InsertWhitelist = z.infer<typeof insertWhitelistSchema>;
export type Whitelist = typeof whitelists.$inferSelect;
