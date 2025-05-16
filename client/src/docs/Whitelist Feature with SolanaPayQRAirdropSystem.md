
# Comprehensive Implementation of Whitelist Feature with Solana Pay QR Airdrop System

This detailed documentation outlines how to implement a whitelist-enabled token airdrop system using Solana Pay in the SolanaPop application.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Database Implementation](#database-implementation)
3. [Backend API Implementation](#backend-api-implementation)
4. [Solana Transaction Processing](#solana-transaction-processing)
5. [Client-Side Implementation](#client-side-implementation)
6. [Testing & Validation](#testing--validation)
7. [Security Considerations](#security-considerations)

## Architecture Overview

The whitelist feature with Solana Pay QR airdrop operates on a multi-layer architecture:

![Architecture Diagram](https://mermaid.ink/img/pako:eNqFU01v2zAM_SuETjugjpNmbeHT0G7Hdsi6AUGPMzfRbAGWFFJKawT-75OdJG5Sd-1Fph_vPZKPfFa5LlGlKjXNVguHIFQl7ArRo5ViZ73Tdo2b1yc5OPAqL90nPPu0S1lrhw0YEAG2qLWHmwFNH-CZ_zfAFhuoEYuIVPOtxHXRQYl9DOAtFhgP3UDKrZUfU5Fkx0jDJfL962_y_TugQYPRyLvIZHT1kOSseDpY2t57XPE4S3UjjZ5RH6GKIeaSJ2yzARl7BxP3OYIRXbnWTh7v4kUhsX0J4WRpLsMwT6qkXcE7jYU0Qfk3cVAwwLo2K1b7-wZLlh3QUYxQeWzBhAjHDuXxdoIBWHBc262v8oNzUfnlj2b21U83C_eGn5_mC6WVHfY-rObcmvDdK7vd5_ckzw88u-LmPJIrnpjZf_k58bpWOxKlRrFYfYQc50nySN35QAa0bmzwLzxYrMw70qYgA2V3gvUmx5B3vVMjJ9Z-7Ub4C1IzNd4WnB6HWMk1EjtoLAFH_kcjD7ZXJdK1L4j16Gx97WLCS3UwNJXa9jbzRDnXWvB9bfV2GGqNGaooGRBpprLW-dJvlNa2HYMwFLfnpvpDR0nVK9uNtNNslUKH_fEoq77nXSU?type=png)

1. **Database Layer**: Store whitelist data, token metadata, and event details
2. **Backend API Layer**: Handle whitelist management and Solana Pay endpoints  
3. **Blockchain Layer**: Process transactions via Solana blockchain
4. **Client Layer**: Render QR codes and whitelist management UI

## Database Implementation

### Migration File (0003_whitelist_feature.sql)

```sql
-- migrations/0003_whitelist_feature.sql

-- Add whitelist feature to tokens and events
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS whitelist_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS whitelist_enabled BOOLEAN DEFAULT FALSE;

-- Create whitelist table
CREATE TABLE IF NOT EXISTS whitelists (
  id SERIAL PRIMARY KEY,
  token_id INTEGER REFERENCES tokens(id) ON DELETE CASCADE,
  event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Constraints to ensure either token_id or event_id is set (but not both)
  CONSTRAINT check_one_id_set CHECK (
    (token_id IS NULL AND event_id IS NOT NULL) OR
    (token_id IS NOT NULL AND event_id IS NULL)
  )
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_whitelists_token_id ON whitelists(token_id);
CREATE INDEX IF NOT EXISTS idx_whitelists_event_id ON whitelists(event_id);
CREATE INDEX IF NOT EXISTS idx_whitelists_wallet_address ON whitelists(wallet_address);
```

### Schema Update (shared/schema.ts)

```typescript
// Add to existing imports if needed
import { boolean } from "drizzle-orm/pg-core";

// Update tokens table definition
export const tokens = pgTable("tokens", {
  // Existing fields remain the same
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  symbol: text("symbol").notNull(),
  description: text("description").notNull(),
  supply: integer("supply").notNull(),
  claimed: integer("claimed").default(0),
  expiryDate: timestamp("expiry_date"),
  creatorId: integer("creator_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  mintAddress: text("mint_address"),
  // Add new field
  whitelistEnabled: boolean("whitelist_enabled").default(false),
});

// Update events table definition
export const events = pgTable("events", {
  // Existing fields remain the same
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
  // Add new field
  whitelistEnabled: boolean("whitelist_enabled").default(false),
});

// Add new whitelist table
export const whitelists = pgTable("whitelists", {
  id: serial("id").primaryKey(),
  tokenId: integer("token_id").references(() => tokens.id, { onDelete: 'cascade' }),
  eventId: integer("event_id").references(() => events.id, { onDelete: 'cascade' }),
  walletAddress: text("wallet_address").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Define relations for whitelists
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

// Update token relations to include whitelists
export const tokensRelations = relations(tokens, ({ one, many }) => ({
  creator: one(users, {
    fields: [tokens.creatorId],
    references: [users.id],
  }),
  claims: many(tokenClaims),
  events: many(events),
  whitelists: many(whitelists, { relationName: "token_whitelists" }),
}));

// Update event relations to include whitelists
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

// Create insert schema for whitelists
export const insertWhitelistSchema = createInsertSchema(whitelists).pick({
  tokenId: true,
  eventId: true,
  walletAddress: true,
});

// Add to the export types
export type InsertWhitelist = z.infer<typeof insertWhitelistSchema>;
export type Whitelist = typeof whitelists.$inferSelect;
```

## Backend API Implementation

### 1. Storage Layer Updates (server/storage.ts)

```typescript
// Import the new whitelist type
import { 
  whitelists, type Whitelist, type InsertWhitelist,
  // existing imports remain the same
} from "@shared/schema";

export interface IStorage {
  // Existing methods...
  
  // Add updateToken method
  updateToken(id: number, updateData: Partial<InsertToken>): Promise<Token | undefined>;
  
  // Whitelist methods
  createWhitelistEntry(entry: InsertWhitelist): Promise<Whitelist>;
  getWhitelistForToken(tokenId: number): Promise<Whitelist[]>;
  getWhitelistForEvent(eventId: number): Promise<Whitelist[]>;
  deleteWhitelistEntry(id: number): Promise<boolean>;
  isAddressWhitelistedForToken(tokenId: number, walletAddress: string): Promise<boolean>;
  isAddressWhitelistedForEvent(eventId: number, walletAddress: string): Promise<boolean>;
  bulkAddWhitelistEntries(entries: InsertWhitelist[]): Promise<Whitelist[]>;
}

export class DatabaseStorage implements IStorage {
  // Existing methods...
  
  // Add token update method
  async updateToken(id: number, updateData: Partial<InsertToken>): Promise<Token | undefined> {
    const [token] = await db
      .update(tokens)
      .set(updateData)
      .where(eq(tokens.id, id))
      .returning();
    
    return token;
  }
  
  // Whitelist methods implementation
  async createWhitelistEntry(entry: InsertWhitelist): Promise<Whitelist> {
    const [whitelist] = await db.insert(whitelists).values(entry).returning();
    return whitelist;
  }
  
  async getWhitelistForToken(tokenId: number): Promise<Whitelist[]> {
    return await db.select().from(whitelists)
      .where(eq(whitelists.tokenId, tokenId));
  }
  
  async getWhitelistForEvent(eventId: number): Promise<Whitelist[]> {
    return await db.select().from(whitelists)
      .where(eq(whitelists.eventId, eventId));
  }
  
  async deleteWhitelistEntry(id: number): Promise<boolean> {
    try {
      await db.delete(whitelists).where(eq(whitelists.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting whitelist entry:", error);
      return false;
    }
  }
  
  async isAddressWhitelistedForToken(tokenId: number, walletAddress: string): Promise<boolean> {
    // First check if whitelist is enabled for this token
    const [token] = await db.select().from(tokens)
      .where(eq(tokens.id, tokenId));
      
    if (!token || !token.whitelistEnabled) {
      // If whitelist is not enabled, everyone is allowed
      return true;
    }
    
    // Check if address is in whitelist
    const entry = await db.select().from(whitelists)
      .where(and(
        eq(whitelists.tokenId, tokenId),
        eq(whitelists.walletAddress, walletAddress)
      ))
      .limit(1);
      
    return entry.length > 0;
  }
  
  async isAddressWhitelistedForEvent(eventId: number, walletAddress: string): Promise<boolean> {
    // First check if whitelist is enabled for this event
    const [event] = await db.select().from(events)
      .where(eq(events.id, eventId));
      
    if (!event || !event.whitelistEnabled) {
      // If whitelist is not enabled, everyone is allowed
      return true;
    }
    
    // Check if address is in whitelist
    const entry = await db.select().from(whitelists)
      .where(and(
        eq(whitelists.eventId, eventId),
        eq(whitelists.walletAddress, walletAddress)
      ))
      .limit(1);
      
    return entry.length > 0;
  }
  
  async bulkAddWhitelistEntries(entries: InsertWhitelist[]): Promise<Whitelist[]> {
    if (entries.length === 0) return [];
    
    const result = await db.insert(whitelists)
      .values(entries)
      .returning();
      
    return result;
  }
}

// Add helper function for whitelist checks
export async function checkWhitelistAccess(tokenId: number | null, eventId: number | null, walletAddress: string): Promise<boolean> {
  try {
    if (tokenId) {
      return await storage.isAddressWhitelistedForToken(tokenId, walletAddress);
    }
    
    if (eventId) {
      return await storage.isAddressWhitelistedForEvent(eventId, walletAddress);
    }
    
    // If neither tokenId nor eventId provided, access is denied
    return false;
  } catch (error) {
    console.error('Error checking whitelist access:', error);
    throw new Error('Failed to check whitelist access');
  }
}
```

### 2. Solana Pay API Endpoint (server/api/solana-pay.ts)

```typescript
import express from 'express';
import { Connection, PublicKey, Keypair, Transaction, SystemProgram } from '@solana/web3.js';
import { encodeURL, validateTransfer, findReference } from '@solana/pay';
import BigNumber from 'bignumber.js';
import crypto from 'crypto';
import { storage } from '../storage';
import { hasUserClaimedToken } from '../storage';

const router = express.Router();

// Utility to create signed payloads
function generateSignedQrPayload(tokenId: number, expiryMinutes: number = 30): string {
  const timestamp = Date.now();
  const expiry = new Date(timestamp);
  expiry.setMinutes(expiry.getMinutes() + expiryMinutes);
  
  const payload = `${tokenId}:${timestamp}:${expiry.getTime()}`;
  const secret = process.env.QR_SIGNATURE_SECRET || "default-secret-change-me";
  
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  const signature = hmac.digest('hex');
  
  return `${payload}:${signature}`;
}

// Verify signed QR payload
function verifySignedQrPayload(signedPayload: string): { 
  isValid: boolean; 
  tokenId?: number; 
  isExpired?: boolean;
} {
  try {
    const [tokenIdStr, timestampStr, expiryStr, signature] = signedPayload.split(':');
    
    if (!tokenIdStr || !timestampStr || !expiryStr || !signature) {
      return { isValid: false };
    }
    
    const tokenId = parseInt(tokenIdStr);
    const expiry = parseInt(expiryStr);
    
    // Check if expired
    if (Date.now() > expiry) {
      return { isValid: false, tokenId, isExpired: true };
    }
    
    // Reconstruct payload and verify signature
    const payload = `${tokenIdStr}:${timestampStr}:${expiryStr}`;
    const secret = process.env.QR_SIGNATURE_SECRET || "default-secret-change-me";
    
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    const expectedSignature = hmac.digest('hex');
    
    if (signature !== expectedSignature) {
      return { isValid: false, tokenId };
    }
    
    return { isValid: true, tokenId };
  } catch (error) {
    console.error("Error verifying signed payload:", error);
    return { isValid: false };
  }
}

// Solana connection setup
const connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com', 'confirmed');

// GET handler - This gets called when a wallet scans the QR code
router.get('/api/solana-pay/token/:id', async (req, res) => {
  try {
    const tokenId = parseInt(req.params.id);
    if (isNaN(tokenId)) {
      return res.status(400).json({ error: "Invalid token ID" });
    }
    
    // Get token details
    const token = await storage.getToken(tokenId);
    if (!token) {
      return res.status(404).json({ error: "Token not found" });
    }
    
    // Return label and icon for the wallet UI
    return res.status(200).json({
      label: `Claim ${token.name} (${token.symbol})`,
      icon: "https://yourdomain.com/logo.png" // Replace with your logo URL
    });
  } catch (error) {
    console.error("Error in GET handler:", error);
    return res.status(500).json({ error: "Server error" });
  }
});

// POST handler - This is called when a user approves the transaction in their wallet
router.post('/api/solana-pay/token/:id', async (req, res) => {
  try {
    const tokenId = parseInt(req.params.id);
    if (isNaN(tokenId)) {
      return res.status(400).json({ error: "Invalid token ID" });
    }
    
    // Get account (wallet address) from the request
    const { account } = req.body;
    if (!account) {
      return res.status(400).json({ error: "Missing required parameter: account" });
    }
    
    const walletAddress = new PublicKey(account);
    
    // Get token details
    const token = await storage.getToken(tokenId);
    if (!token) {
      return res.status(404).json({ error: "Token not found" });
    }
    
    // Check if user is whitelisted (if whitelist is enabled)
    if (token.whitelistEnabled) {
      const isWhitelisted = await storage.isAddressWhitelistedForToken(tokenId, walletAddress.toString());
      if (!isWhitelisted) {
        return res.status(403).json({ 
          error: "Not whitelisted", 
          message: "Your wallet is not whitelisted for this token" 
        });
      }
    }
    
    // Check if token has already been claimed by this wallet
    const hasAlreadyClaimed = await hasUserClaimedToken(tokenId, walletAddress.toString());
    if (hasAlreadyClaimed) {
      return res.status(400).json({ 
        error: "Already claimed", 
        message: "You have already claimed this token" 
      });
    }
    
    // Create a transaction
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    
    // Create reference for tracking this transaction
    const reference = new Keypair().publicKey;
    
    const transaction = new Transaction({
      feePayer: walletAddress,
      blockhash,
      lastValidBlockHeight,
    });
    
    // If you have a token mint address, you'd add a token transfer instruction here
    // For now, we'll use a simple system instruction as a placeholder
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: walletAddress,
        toPubkey: walletAddress, // Self-transfer as a placeholder
        lamports: 0, // 0 SOL
      })
    );
    
    // Add reference to transaction for tracking
    transaction.add(
      new TransactionInstruction({
        keys: [{ pubkey: reference, isSigner: false, isWritable: false }],
        programId: SystemProgram.programId,
        data: Buffer.from([])
      })
    );
    
    // Serialize transaction
    const serializedTransaction = transaction.serialize({
      requireAllSignatures: false,
    });
    
    const base64Transaction = serializedTransaction.toString('base64');
    
    // Return transaction for signing
    return res.status(200).json({
      transaction: base64Transaction,
      message: `Claim your ${token.symbol} token!`
    });
    
  } catch (error) {
    console.error("Error in POST handler:", error);
    return res.status(500).json({ error: "Server error" });
  }
});

// Verification endpoint - This can be polled after the transaction is submitted
router.post('/api/solana-pay/verify', async (req, res) => {
  try {
    const { signature, tokenId, walletAddress } = req.body;
    
    if (!signature || !tokenId || !walletAddress) {
      return res.status(400).json({ error: "Missing required parameters" });
    }
    
    // Verify transaction on-chain
    const transactionStatus = await connection.getSignatureStatus(signature);
    if (!transactionStatus.value || transactionStatus.value.err) {
      return res.status(400).json({ error: "Invalid transaction" });
    }
    
    // Create token claim in database
    const claim = await storage.createTokenClaim({
      tokenId: parseInt(tokenId),
      userId: 0, // System user or derive from wallet
      walletAddress,
      transactionId: signature
    });
    
    return res.status(200).json({ success: true, claim });
  } catch (error) {
    console.error("Error verifying transaction:", error);
    return res.status(500).json({ error: "Failed to verify transaction" });
  }
});

export default router;
```

### 3. Whitelist API Endpoints (server/api/whitelist.ts)

```typescript
import express from 'express';
import { storage } from '../storage';
import { insertWhitelistSchema } from '@shared/schema';
import { ZodError } from 'zod';
import { fromZodError } from 'zod-validation-error';

const router = express.Router();

// Create whitelist entry
router.post('/api/whitelist', async (req, res) => {
  try {
    const entryData = insertWhitelistSchema.parse(req.body);
    
    // Validate that either tokenId or eventId is provided, but not both
    if ((entryData.tokenId && entryData.eventId) || (!entryData.tokenId && !entryData.eventId)) {
      return res.status(400).json({ error: "Exactly one of tokenId or eventId must be provided" });
    }
    
    // Create whitelist entry
    const entry = await storage.createWhitelistEntry(entryData);
    
    // If this is the first whitelist entry, enable whitelist for the token/event
    if (entryData.tokenId) {
      const token = await storage.getToken(entryData.tokenId);
      if (token && !token.whitelistEnabled) {
        await storage.updateToken(entryData.tokenId, { whitelistEnabled: true });
      }
    } else if (entryData.eventId) {
      const event = await storage.getEvent(entryData.eventId);
      if (event && !event.whitelistEnabled) {
        await storage.updateEvent(entryData.eventId, { whitelistEnabled: true });
      }
    }
    
    return res.status(201).json(entry);
  } catch (error) {
    if (error instanceof ZodError) {
      const validationError = fromZodError(error);
      return res.status(400).json({ error: validationError.message });
    }
    return res.status(500).json({ error: "Failed to create whitelist entry" });
  }
});

// Bulk upload whitelist entries
router.post('/api/whitelist/bulk', async (req, res) => {
  try {
    const { tokenId, eventId, addresses } = req.body;
    
    // Validate that either tokenId or eventId is provided, but not both
    if ((tokenId && eventId) || (!tokenId && !eventId)) {
      return res.status(400).json({ error: "Exactly one of tokenId or eventId must be provided" });
    }
    
    // Validate addresses array
    if (!Array.isArray(addresses) || addresses.length === 0) {
      return res.status(400).json({ error: "addresses must be a non-empty array" });
    }
    
    // Create entries
    const entries = addresses.map(address => ({
      tokenId: tokenId || null,
      eventId: eventId || null,
      walletAddress: address
    }));
    
    const createdEntries = await storage.bulkAddWhitelistEntries(entries);
    
    // Enable whitelist for the token/event if not already enabled
    if (tokenId) {
      const token = await storage.getToken(tokenId);
      if (token && !token.whitelistEnabled) {
        await storage.updateToken(tokenId, { whitelistEnabled: true });
      }
    } else if (eventId) {
      const event = await storage.getEvent(eventId);
      if (event && !event.whitelistEnabled) {
        await storage.updateEvent(eventId, { whitelistEnabled: true });
      }
    }
    
    return res.status(201).json(createdEntries);
  } catch (error) {
    console.error("Error adding bulk whitelist entries:", error);
    return res.status(500).json({ error: "Failed to add whitelist entries" });
  }
});

// Get whitelist for token or event
router.get('/api/whitelist', async (req, res) => {
  try {
    const { tokenId, eventId } = req.query;
    
    // Validate that either tokenId or eventId is provided, but not both
    if ((tokenId && eventId) || (!tokenId && !eventId)) {
      return res.status(400).json({ error: "Exactly one of tokenId or eventId must be provided" });
    }
    
    let entries = [];
    if (tokenId) {
      const id = parseInt(tokenId as string);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid token ID" });
      }
      entries = await storage.getWhitelistForToken(id);
    } else if (eventId) {
      const id = parseInt(eventId as string);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid event ID" });
      }
      entries = await storage.getWhitelistForEvent(id);
    }
    
    return res.json(entries);
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch whitelist entries" });
  }
});

// Delete whitelist entry
router.delete('/api/whitelist/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid whitelist entry ID" });
    }
    
    const success = await storage.deleteWhitelistEntry(id);
    if (!success) {
      return res.status(404).json({ error: "Whitelist entry not found or could not be deleted" });
    }
    
    return res.json({ success: true, message: "Whitelist entry deleted successfully" });
  } catch (error) {
    return res.status(500).json({ error: "Failed to delete whitelist entry" });
  }
});

// Check if address is whitelisted
router.get('/api/whitelist/check', async (req, res) => {
  try {
    const { tokenId, eventId, walletAddress } = req.query;
    
    // Validate that either tokenId or eventId is provided, but not both
    if ((tokenId && eventId) || (!tokenId && !eventId)) {
      return res.status(400).json({ error: "Exactly one of tokenId or eventId must be provided" });
    }
    
    if (!walletAddress) {
      return res.status(400).json({ error: "Wallet address is required" });
    }
    
    let isWhitelisted = false;
    if (tokenId) {
      const id = parseInt(tokenId as string);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid token ID" });
      }
      isWhitelisted = await storage.isAddressWhitelistedForToken(id, walletAddress as string);
    } else if (eventId) {
      const id = parseInt(eventId as string);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid event ID" });
      }
      isWhitelisted = await storage.isAddressWhitelistedForEvent(id, walletAddress as string);
    }
    
    return res.json({ isWhitelisted });
  } catch (error) {
    return res.status(500).json({ error: "Failed to check whitelist status" });
  }
});

// Toggle whitelist for token
router.post('/api/tokens/:id/whitelist/toggle', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid token ID" });
    }
    
    const { enabled } = req.body;
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: "enabled must be a boolean value" });
    }
    
    const token = await storage.updateToken(id, { whitelistEnabled: enabled });
    if (!token) {
      return res.status(404).json({ error: "Token not found" });
    }
    
    return res.json(token);
  } catch (error) {
    return res.status(500).json({ error: "Failed to update token whitelist status" });
  }
});

// Toggle whitelist for event
router.post('/api/events/:id/whitelist/toggle', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid event ID" });
    }
    
    const { enabled } = req.body;
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: "enabled must be a boolean value" });
    }
    
    const event = await storage.updateEvent(id, { whitelistEnabled: enabled });
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }
    
    return res.json(event);
  } catch (error) {
    return res.status(500).json({ error: "Failed to update event whitelist status" });
  }
});

export default router;
```

### 4. Update Routes Registration (server/routes.ts)

```typescript
import type { Express } from "express";
import { createServer, type Server } from "http";
import solanaPay from "./api/solana-pay";
import whitelist from "./api/whitelist";
import { storage } from "./storage";
import { insertTokenClaimSchema } from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

export async function registerRoutes(app: Express): Promise<Server> {
  // Register Solana Pay and Whitelist routes
  app.use(solanaPay);
  app.use(whitelist);
  
  // Update the existing claims endpoint to check whitelist
  app.post("/api/claims", async (req, res) => {
    try {
      const claimData = insertTokenClaimSchema.parse(req.body);
      
      // Verify token exists
      const token = await storage.getToken(claimData.tokenId);
      if (!token) {
        return res.status(404).json({ error: "Token not found" });
      }
      
      // Check if user is whitelisted (if whitelist is enabled)
      if (token.whitelistEnabled) {
        const isWhitelisted = await storage.isAddressWhitelistedForToken(claimData.tokenId, claimData.walletAddress);
        if (!isWhitelisted) {
          return res.status(403).json({ 
            error: "Not whitelisted", 
            message: "Your wallet is not whitelisted for this token" 
          });
        }
      }
      
      // Create claim
      const claim = await storage.createTokenClaim(claimData);
      return res.status(201).json(claim);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ error: validationError.message });
      }
      return res.status(500).json({ error: "Failed to create token claim" });
    }
  });
  
  // Other existing routes...
  
  const httpServer = createServer(app);
  return httpServer;
}
```

## Solana Transaction Processing

### 1. Create Solana Pay Utilities (client/src/lib/solana-pay.ts)

```typescript
import { PublicKey, Connection, clusterApiUrl, Transaction } from '@solana/web3.js';
import { encodeURL, createQR, parseURL, validateTransfer, findReference } from '@solana/pay';
import BigNumber from 'bignumber.js';
import { base58 } from '@project-serum/anchor/dist/cjs/utils/bytes';

// Types for QR code generation options
export type SolanaPayQROptions = {
  tokenId: number;
  baseUrl: string;
  label?: string;
  message?: string;
};

// Create a QR code for transaction request
export function createTokenClaimQR(options: SolanaPayQROptions) {
  try {
    const { tokenId, baseUrl, label, message } = options;
    
    // Create the URL for the Solana Pay transaction request
    const url = encodeURL({
      link: new URL(`${baseUrl}/api/solana-pay/token/${tokenId}`),
      label: label || "Claim Token",
      message: message || "Scan to claim your token"
    });
    
    // Generate QR code from the URL
    const qrCode = createQR(url);
    
    return qrCode;
  } catch (error) {
    console.error("Error creating QR code:", error);
    throw error;
  }
}

// Use with useQuery for SWR/React-Query to decode the QR code
export async function getQRCodeAsBase64(qrCode: any) {
  try {
    const qrBlob = await qrCode.getRawData('png');
    if (!qrBlob) return null;
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (typeof event.target?.result === 'string') {
          resolve(event.target.result);
        } else {
          reject(new Error('Failed to convert QR code to base64'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read QR code blob'));
      reader.readAsDataURL(qrBlob);
    });
  } catch (error) {
    console.error("Error converting QR to base64:", error);
    return null;
  }
}

// Function to verify a transaction after it's been submitted
export async function verifyTransaction(
  connection: Connection,
  reference: PublicKey,
  recipient?: PublicKey,
  amount?: BigNumber
) {
  try {
    // Find the transaction with the reference
    const signatureInfo = await findReference(connection, reference, { finality: 'confirmed' });
    
    // If no recipient or amount provided, just confirm the transaction exists
    if (!recipient && !amount) {
      return { signature: signatureInfo.signature, status: 'confirmed' };
    }
    
    // Validate that the transaction has the expected parameters
    const response = await validateTransfer(
      connection,
      signatureInfo.signature,
      {
        recipient: recipient!,
        amount: amount!,
        reference
      },
      { commitment: 'confirmed' }
    );
    
    return { signature: signatureInfo.signature, status: 'validated' };
  } catch (error) {
    console.error("Error verifying transaction:", error);
    throw error;
  }
}

// Function to parse a transaction from base64
export function parseTransactionFromBase64(transactionBase64: string): Transaction {
  const transactionBinary = Buffer.from(transactionBase64, 'base64');
  return Transaction.from(transactionBinary);
}
```


### 2. Create WebSocket Utilities for Transaction Status (client/src/lib/transaction-websocket.ts) (continued)

```typescript
import { Connection, PublicKey, TransactionSignature } from '@solana/web3.js';

type TransactionStatusCallback = (status: 'processing' | 'confirmed' | 'finalized' | 'error', signature?: string, error?: Error) => void;

export function subscribeToTransaction(
  connection: Connection,
  signature: TransactionSignature,
  callback: TransactionStatusCallback
) {
  // First try to get current status - might already be confirmed
  connection.getSignatureStatus(signature)
    .then(status => {
      if (status.value?.confirmationStatus === 'finalized') {
        callback('finalized', signature);
        return null; // Don't subscribe if already finalized
      }
      
      // Subscribe to transaction status
      const subscriptionId = connection.onSignature(
        signature,
        (result, context) => {
          if (result.err) {
            callback('error', signature, new Error(JSON.stringify(result.err)));
          } else {
            callback('finalized', signature);
          }
        },
        'finalized'
      );
      
      // Initial notification that we're monitoring the transaction
      callback('processing', signature);
      
      return subscriptionId;
    })
    .catch(error => {
      console.error('Error checking transaction status:', error);
      callback('error', signature, error);
      return null;
    });
}

export function unsubscribeFromTransaction(
  connection: Connection,
  subscriptionId: number
) {
  if (subscriptionId) {
    connection.removeSignatureListener(subscriptionId);
  }
}
```

## Client-Side Implementation

### 1. Whitelist Management Component (client/src/components/whitelist-manager.tsx)

```typescript
import React, { useState, useCallback, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Button, Input, Textarea } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, CheckCircle2, XCircle, Upload, Download, Trash2, Copy, Plus } from "lucide-react";
import { PublicKey } from '@solana/web3.js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Type for our props
type WhitelistManagerProps = {
  tokenId?: number;
  eventId?: number;
  title?: string;
  description?: string;
};

// Type for whitelist entries
type WhitelistEntry = {
  id: number;
  tokenId?: number | null;
  eventId?: number | null;
  walletAddress: string;
  createdAt: string;
};

// Custom hook to fetch whitelist entries
const useWhitelist = (tokenId?: number, eventId?: number) => {
  return useQuery({
    queryKey: ['whitelist', { tokenId, eventId }],
    queryFn: async () => {
      const params = tokenId ? `tokenId=${tokenId}` : `eventId=${eventId}`;
      const response = await fetch(`/api/whitelist?${params}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch whitelist');
      }
      
      return response.json() as Promise<WhitelistEntry[]>;
    },
    enabled: Boolean(tokenId || eventId),
  });
};

// Custom hook to check whitelist status
const useCheckWhitelisted = (tokenId?: number, eventId?: number, walletAddress?: string) => {
  return useQuery({
    queryKey: ['whitelistCheck', { tokenId, eventId, walletAddress }],
    queryFn: async () => {
      if (!walletAddress) return { isWhitelisted: false };
      
      const params = new URLSearchParams();
      if (tokenId) params.append('tokenId', tokenId.toString());
      if (eventId) params.append('eventId', eventId.toString());
      params.append('walletAddress', walletAddress);
      
      const response = await fetch(`/api/whitelist/check?${params}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to check whitelist status');
      }
      
      return response.json() as Promise<{ isWhitelisted: boolean }>;
    },
    enabled: Boolean((tokenId || eventId) && walletAddress),
  });
};

// Custom hook to manage whitelist settings
const useWhitelistSettings = (tokenId?: number, eventId?: number) => {
  const endpoint = tokenId 
    ? `/api/tokens/${tokenId}/whitelist/toggle` 
    : `/api/events/${eventId}/whitelist/toggle`;
  
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (enabled: boolean) => {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update whitelist settings');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['whitelist'] });
      if (tokenId) {
        queryClient.invalidateQueries({ queryKey: ['token', tokenId] });
      } else if (eventId) {
        queryClient.invalidateQueries({ queryKey: ['event', eventId] });
      }
    },
  });
};

// Component implementation
export function WhitelistManager({ tokenId, eventId, title, description }: WhitelistManagerProps) {
  const [newAddress, setNewAddress] = useState('');
  const [bulkAddresses, setBulkAddresses] = useState('');
  const [activeTab, setActiveTab] = useState('single');
  const { publicKey } = useWallet();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  
  // Fetch whitelist entries
  const { 
    data: whitelistEntries = [], 
    isLoading: isLoadingWhitelist,
    isError: isWhitelistError,
    error: whitelistError
  } = useWhitelist(tokenId, eventId);
  
  // Check if current wallet is whitelisted
  const { 
    data: whitelistStatus, 
    isLoading: isCheckingWhitelist 
  } = useCheckWhitelisted(
    tokenId, 
    eventId, 
    publicKey?.toString()
  );
  
  // Mutations
  const addAddressMutation = useMutation({
    mutationFn: async (walletAddress: string) => {
      const response = await fetch('/api/whitelist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenId: tokenId || null,
          eventId: eventId || null,
          walletAddress,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add address to whitelist');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whitelist'] });
      setNewAddress('');
      toast({
        title: "Address added to whitelist",
        description: "The wallet address has been successfully added to the whitelist.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to add address",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const bulkAddAddressesMutation = useMutation({
    mutationFn: async (addresses: string[]) => {
      const response = await fetch('/api/whitelist/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenId: tokenId || null,
          eventId: eventId || null,
          addresses,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add addresses to whitelist');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['whitelist'] });
      setBulkAddresses('');
      toast({
        title: "Addresses added to whitelist",
        description: `Successfully added ${data.length} addresses to the whitelist.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to add addresses",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const deleteEntryMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/whitelist/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete whitelist entry');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whitelist'] });
      toast({
        title: "Address removed from whitelist",
        description: "The wallet address has been successfully removed from the whitelist.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to remove address",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Settings mutation
  const whitelistSettingsMutation = useWhitelistSettings(tokenId, eventId);
  
  // Handle adding a single address
  const handleAddAddress = useCallback(() => {
    if (!newAddress) {
      toast({
        title: "Address required",
        description: "Please enter a wallet address to add to the whitelist.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Validate it's a valid Solana address
      new PublicKey(newAddress);
      addAddressMutation.mutate(newAddress);
    } catch (error) {
      toast({
        title: "Invalid address",
        description: "Please enter a valid Solana wallet address.",
        variant: "destructive",
      });
    }
  }, [newAddress, addAddressMutation, toast]);
  
  // Handle bulk adding addresses
  const handleBulkAddAddresses = useCallback(() => {
    if (!bulkAddresses.trim()) {
      toast({
        title: "Addresses required",
        description: "Please enter at least one wallet address to add to the whitelist.",
        variant: "destructive",
      });
      return;
    }
    
    // Parse addresses (comma, newline, or space separated)
    const addressList = bulkAddresses
      .split(/[\n,\s]+/)
      .map(addr => addr.trim())
      .filter(Boolean);
    
    if (addressList.length === 0) {
      toast({
        title: "No valid addresses",
        description: "No valid addresses were found in the input.",
        variant: "destructive",
      });
      return;
    }
    
    // Validate addresses
    const invalidAddresses: string[] = [];
    const validAddresses: string[] = [];
    
    addressList.forEach(address => {
      try {
        new PublicKey(address);
        validAddresses.push(address);
      } catch (error) {
        invalidAddresses.push(address);
      }
    });
    
    if (invalidAddresses.length > 0) {
      toast({
        title: "Some addresses are invalid",
        description: `${invalidAddresses.length} invalid addresses were skipped.`,
        variant: "destructive",
      });
    }
    
    if (validAddresses.length > 0) {
      bulkAddAddressesMutation.mutate(validAddresses);
    }
  }, [bulkAddresses, bulkAddAddressesMutation, toast]);
  
  // Handle file upload
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setBulkAddresses(content);
      setActiveTab('bulk');
    };
    reader.readAsText(file);
    
    // Reset the input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);
  
  // Handle copying whitelist addresses
  const handleCopyAddresses = useCallback(() => {
    const addresses = whitelistEntries.map(entry => entry.walletAddress).join('\n');
    navigator.clipboard.writeText(addresses)
      .then(() => {
        toast({
          title: "Addresses copied",
          description: "All whitelist addresses have been copied to your clipboard.",
        });
      })
      .catch(error => {
        toast({
          title: "Failed to copy addresses",
          description: "Could not copy addresses to clipboard.",
          variant: "destructive",
        });
      });
  }, [whitelistEntries, toast]);
  
  // Handle download as CSV
  const handleDownloadCSV = useCallback(() => {
    const addresses = whitelistEntries.map(entry => entry.walletAddress).join('\n');
    const blob = new Blob([addresses], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `whitelist-${tokenId || eventId}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [whitelistEntries, tokenId, eventId]);
  
  // Handle toggle whitelist setting
  const handleToggleWhitelist = useCallback((enabled: boolean) => {
    whitelistSettingsMutation.mutate(enabled);
  }, [whitelistSettingsMutation]);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title || "Whitelist Management"}</CardTitle>
        <CardDescription>
          {description || "Manage wallet addresses that are allowed to claim this token or attend this event."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Label htmlFor="whitelist-enabled">Enable Whitelist</Label>
            <Switch 
              id="whitelist-enabled" 
              checked={whitelistSettingsMutation.isPending ? undefined : !!whitelistEntries.length} 
              onCheckedChange={handleToggleWhitelist}
              disabled={whitelistSettingsMutation.isPending}
            />
          </div>
          {publicKey && (
            <div className="flex items-center space-x-2">
              <span>Your wallet:</span>
              <span className="font-mono text-sm">
                {publicKey.toString().substring(0, 4)}...{publicKey.toString().substring(publicKey.toString().length - 4)}
              </span>
              {isCheckingWhitelist ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : whitelistStatus?.isWhitelisted ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
            </div>
          )}
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="single">Add Single Address</TabsTrigger>
            <TabsTrigger value="bulk">Bulk Upload</TabsTrigger>
            <TabsTrigger value="list">View Whitelist</TabsTrigger>
          </TabsList>
          
          <TabsContent value="single">
            <div className="space-y-4">
              <div className="flex space-x-2">
                <Input
                  placeholder="Enter wallet address"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  disabled={addAddressMutation.isPending}
                />
                <Button 
                  onClick={handleAddAddress}
                  disabled={addAddressMutation.isPending || !newAddress}
                >
                  {addAddressMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Add
                </Button>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="bulk">
            <div className="space-y-4">
              <Textarea
                placeholder="Enter multiple wallet addresses (separated by commas, spaces, or new lines)"
                value={bulkAddresses}
                onChange={(e) => setBulkAddresses(e.target.value)}
                rows={6}
                className="font-mono text-sm"
                disabled={bulkAddAddressesMutation.isPending}
              />
              <div className="flex space-x-2">
                <Button 
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={bulkAddAddressesMutation.isPending}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload File
                </Button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".txt,.csv"
                  className="hidden"
                />
                <Button 
                  onClick={handleBulkAddAddresses}
                  disabled={bulkAddAddressesMutation.isPending || !bulkAddresses.trim()}
                >
                  {bulkAddAddressesMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Add Addresses
                </Button>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="list">
            <div className="space-y-4">
              <div className="flex justify-between mb-2">
                <span>Total entries: {whitelistEntries.length}</span>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" onClick={handleCopyAddresses} disabled={whitelistEntries.length === 0}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy All
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDownloadCSV} disabled={whitelistEntries.length === 0}>
                    <Download className="h-4 w-4 mr-2" />
                    Download CSV
                  </Button>
                </div>
              </div>
              
              {isLoadingWhitelist ? (
                <div className="py-4 flex justify-center">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : isWhitelistError ? (
                <div className="py-4 text-center text-red-500">
                  Error loading whitelist: {(whitelistError as Error).message}
                </div>
              ) : whitelistEntries.length === 0 ? (
                <div className="py-4 text-center text-gray-500">
                  No addresses in the whitelist yet.
                </div>
              ) : (
                <div className="border rounded-md divide-y">
                  {whitelistEntries.map((entry) => (
                    <div key={entry.id} className="p-2 flex justify-between items-center">
                      <span className="font-mono text-sm">{entry.walletAddress}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteEntryMutation.mutate(entry.id)}
                        disabled={deleteEntryMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
```

### 2. QR Code Generator Component (client/src/components/token-claim-qr.tsx)

```typescript
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Download, RefreshCw } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { createTokenClaimQR, getQRCodeAsBase64 } from '@/lib/solana-pay';

type TokenClaimQRProps = {
  tokenId: number;
  tokenName?: string;
  tokenSymbol?: string;
  expiryMinutes?: number;
  refreshInterval?: number; // in seconds
};

export function TokenClaimQR({
  tokenId,
  tokenName = '',
  tokenSymbol = '',
  expiryMinutes = 30,
  refreshInterval = 0 // 0 means no auto-refresh
}: TokenClaimQRProps) {
  const [qrTimestamp, setQrTimestamp] = useState(Date.now());
  
  // Get the base URL (protocol + host)
  const baseUrl = typeof window !== 'undefined' 
    ? `${window.location.protocol}//${window.location.host}`
    : '';
  
  // Generate QR code
  const { data: qrCode, isLoading: isGeneratingQR, refetch } = useQuery({
    queryKey: ['tokenQR', tokenId, qrTimestamp],
    queryFn: async () => {
      if (!baseUrl) return null;
      
      const qr = createTokenClaimQR({
        tokenId,
        baseUrl,
        label: `Claim ${tokenName} (${tokenSymbol})`,
        message: `Scan to claim your ${tokenSymbol} token`,
      });
      
      const base64 = await getQRCodeAsBase64(qr);
      return base64;
    },
    enabled: Boolean(baseUrl),
  });
  
  // Set up auto-refresh if enabled
  useEffect(() => {
    if (!refreshInterval || refreshInterval <= 0) return;
    
    const intervalId = setInterval(() => {
      setQrTimestamp(Date.now());
    }, refreshInterval * 1000);
    
    return () => clearInterval(intervalId);
  }, [refreshInterval]);
  
  // Handle manual refresh
  const handleRefresh = () => {
    setQrTimestamp(Date.now());
  };
  
  // Handle download QR code
  const handleDownload = () => {
    if (!qrCode) return;
    
    const a = document.createElement('a');
    a.href = qrCode;
    a.download = `token-claim-${tokenId}-${tokenSymbol || ''}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Claim Token QR Code</CardTitle>
        <CardDescription>
          Scan this QR code with a Solana Pay compatible wallet to claim your token.
          {refreshInterval > 0 && (
            <span className="block text-xs mt-1">
              QR code refreshes every {refreshInterval} seconds for security.
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex justify-center">
        {isGeneratingQR ? (
          <div className="flex flex-col items-center justify-center h-48 w-48">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="mt-2 text-sm">Generating QR code...</span>
          </div>
        ) : qrCode ? (
          <div className="relative h-48 w-48">
            <Image
              src={qrCode}
              alt={`QR code for claiming ${tokenSymbol || 'token'}`}
              fill
              style={{ objectFit: 'contain' }}
              priority
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-48 w-48 border border-dashed rounded-md">
            <span className="text-sm text-center text-gray-500">
              Could not generate QR code. Please try refreshing.
            </span>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-center space-x-2">
        <Button variant="outline" onClick={handleRefresh} disabled={isGeneratingQR}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh QR
        </Button>
        {qrCode && (
          <Button variant="outline" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
```

### 3. Token Claim Page with Whitelist and QR (client/src/pages/token/[id]/claim.tsx)

```typescript
import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, PublicKey } from '@solana/web3.js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { WhitelistManager } from '@/components/whitelist-manager';
import { TokenClaimQR } from '@/components/token-claim-qr';
import { useToast } from "@/components/ui/use-toast";
import { useQuery, useMutation } from '@tanstack/react-query';
import { Loader2, ExternalLink, AlertCircle } from 'lucide-react';

export default function TokenClaimPage() {
  const router = useRouter();
  const { id } = router.query;
  const tokenId = id ? parseInt(id as string) : undefined;
  const { publicKey, connected } = useWallet();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('claim');
  
  // Fetch token details
  const { data: token, isLoading, error } = useQuery({
    queryKey: ['token', tokenId],
    queryFn: async () => {
      if (!tokenId) throw new Error('Token ID is required');
      
      const response = await fetch(`/api/tokens/${tokenId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch token details');
      }
      
      return response.json();
    },
    enabled: !!tokenId,
  });
  
  // Check if current wallet is whitelisted
  const { data: whitelistStatus, isLoading: isCheckingWhitelist } = useQuery({
    queryKey: ['whitelistCheck', tokenId, publicKey?.toString()],
    queryFn: async () => {
      if (!tokenId || !publicKey) return { isWhitelisted: false };
      
      const params = new URLSearchParams();
      params.append('tokenId', tokenId.toString());
      params.append('walletAddress', publicKey.toString());
      
      const response = await fetch(`/api/whitelist/check?${params}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to check whitelist status');
      }
      
      return response.json() as Promise<{ isWhitelisted: boolean }>;
    },
    enabled: !!tokenId && !!publicKey,
  });
  
  // Check if token has already been claimed by this wallet
  const { data: claimStatus, isLoading: isCheckingClaim } = useQuery({
    queryKey: ['tokenClaimed', tokenId, publicKey?.toString()],
    queryFn: async () => {
      if (!tokenId || !publicKey) return { claimed: false };
      
      const params = new URLSearchParams();
      params.append('tokenId', tokenId.toString());
      params.append('walletAddress', publicKey.toString());
      
      const response = await fetch(`/api/claims/check?${params}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to check claim status');
      }
      
      return response.json() as Promise<{ claimed: boolean }>;
    },
    enabled: !!tokenId && !!publicKey,
  });
  
  // Mutation to verify a claim transaction
  const verifyMutation = useMutation({
    mutationFn: async ({ signature, walletAddress }: { signature: string, walletAddress: string }) => {
      const response = await fetch('/api/solana-pay/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signature,
          tokenId,
          walletAddress,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to verify transaction');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Token claimed successfully",
        description: "Your token has been successfully claimed.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to verify claim",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  if (isLoading) {
    return (
      <div className="container mx-auto py-10 flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  
  if (error || !token) {
    return (
      <div className="container mx-auto py-10">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : 'Failed to load token details'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  const isCreator = token.creatorId === (publicKey?.toString() || '');
  const canClaim = connected && 
    (!token.whitelistEnabled || whitelistStatus?.isWhitelisted) && 
    !claimStatus?.claimed;
  
  return (
    <div className="container mx-auto py-10">
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Token: {token.name} ({token.symbol})</CardTitle>
          <CardDescription>{token.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm font-medium mb-1">Supply</p>
              <p>{token.claimed} / {token.supply} claimed</p>
            </div>
            {token.expiryDate && (
              <div>
                <p className="text-sm font-medium mb-1">Expires</p>
                <p>{new Date(token.expiryDate).toLocaleDateString()}</p>
              </div>
            )}
            {token.whitelistEnabled && (
              <div className="col-span-2">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Whitelist Enabled</AlertTitle>
                  <AlertDescription>
                    This token requires your wallet to be whitelisted before claiming.
                    {isCheckingWhitelist && (
                      <span className="block mt-1">Checking whitelist status...</span>
                    )}
                    {!isCheckingWhitelist && publicKey && (
                      <span className="block mt-1">
                        Status: {whitelistStatus?.isWhitelisted ? 'Whitelisted ✅' : 'Not whitelisted ❌'}
                      </span>
                    )}
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="claim">Claim Token</TabsTrigger>
          {isCreator && <TabsTrigger value="whitelist">Manage Whitelist</TabsTrigger>}
        </TabsList>
        
        <TabsContent value="claim">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {!connected ? (
              <Card>
                <CardHeader>
                  <CardTitle>Connect Wallet</CardTitle>
                  <CardDescription>
                    Connect your wallet to claim this token.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Wallet connect button would be here, likely from a layout or context */}
                  <p className="text-center py-4">Please connect your wallet to continue</p>
                </CardContent>
              </Card>
            ) : claimStatus?.claimed ? (
              <Card>
                <CardHeader>
                  <CardTitle>Already Claimed</CardTitle>
                  <CardDescription>
                    You have already claimed this token.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-center py-4">
                    This token has been claimed by your wallet.
                  </p>
                </CardContent>
                {token.mintAddress && (
                  <CardFooter>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => window.open(`https://explorer.solana.com/address/${token.mintAddress}`, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View on Explorer
                    </Button>
                  </CardFooter>
                )}
              </Card>
            ) : token.whitelistEnabled && !whitelistStatus?.isWhitelisted ? (
              <Card>
                <CardHeader>
                  <CardTitle>Not Whitelisted</CardTitle>
                  <CardDescription>
                    Your wallet is not on the whitelist for this token.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-center py-4">
                    Please contact the token creator to be added to the whitelist.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <TokenClaimQR
                tokenId={tokenId!}
                tokenName={token.name}
                tokenSymbol={token.symbol}
                refreshInterval={180} // 3 minutes
              />
            )}
            
            <Card>
              <CardHeader>
                <CardTitle>How to Claim</CardTitle>
                <CardDescription>
                  Follow these steps to claim your token.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ol className="list-decimal pl-5 space-y-2">
                  <li>Connect your Solana wallet</li>
                  <li>Scan the QR code with a Solana Pay compatible wallet app</li>
                  <li>Review and approve the transaction in your wallet</li>
                  <li>Wait for the transaction to be confirmed</li>
                  <li>Your token will be recorded as claimed</li>
                </ol>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {isCreator && (
          <TabsContent value="whitelist">
            <WhitelistManager
              tokenId={tokenId}
              title={`Whitelist for ${token.name
              tokenId={tokenId}
              title={`Whitelist for ${token.name}`}
              description={`Manage wallet addresses that are allowed to claim the ${token.symbol} token.`}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
```

### 4. Update Edit Token Page (client/src/pages/token/[id]/edit.tsx)

```typescript
import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { useWallet } from '@solana/wallet-adapter-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from "@/components/ui/use-toast";
import { WhitelistManager } from '@/components/whitelist-manager';
import { TokenForm } from '@/components/token-form';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Loader2, AlertCircle } from 'lucide-react';

export default function EditTokenPage() {
  const router = useRouter();
  const { id } = router.query;
  const tokenId = id ? parseInt(id as string) : undefined;
  const { publicKey, connected } = useWallet();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('details');
  
  // Fetch token details
  const { data: token, isLoading, error } = useQuery({
    queryKey: ['token', tokenId],
    queryFn: async () => {
      if (!tokenId) throw new Error('Token ID is required');
      
      const response = await fetch(`/api/tokens/${tokenId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch token details');
      }
      
      return response.json();
    },
    enabled: !!tokenId,
  });
  
  // Check if user is token creator
  const isCreator = token && publicKey?.toString() === token.creatorAddress;
  
  if (isLoading) {
    return (
      <div className="container mx-auto py-10 flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  
  if (error || !token) {
    return (
      <div className="container mx-auto py-10">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : 'Failed to load token details'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  // Redirect if user is not token creator
  if (!isLoading && !isCreator) {
    toast({
      title: "Access Denied",
      description: "You do not have permission to edit this token.",
      variant: "destructive",
    });
    router.push(`/token/${tokenId}`);
    return null;
  }
  
  return (
    <div className="container mx-auto py-10">
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Edit Token: {token.name} ({token.symbol})</CardTitle>
          <CardDescription>Update token details and manage whitelist settings</CardDescription>
        </CardHeader>
      </Card>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="details">Token Details</TabsTrigger>
          <TabsTrigger value="whitelist">Whitelist Management</TabsTrigger>
        </TabsList>
        
        <TabsContent value="details">
          <TokenForm 
            token={token} 
            isEditing={true} 
            onSuccess={() => {
              toast({
                title: "Token Updated",
                description: "Token details have been successfully updated."
              });
            }}
          />
        </TabsContent>
        
        <TabsContent value="whitelist">
          <WhitelistManager
            tokenId={tokenId}
            title={`Whitelist for ${token.name}`}
            description={`Manage wallet addresses that are allowed to claim the ${token.symbol} token.`}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

### 5. Create API Client Utilities (client/src/lib/api-client.ts)

```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// Type for whitelist entry to add
type AddWhitelistEntryParams = {
  tokenId?: number;
  eventId?: number;
  walletAddress: string;
};

// Type for bulk whitelist addition
type BulkAddWhitelistParams = {
  tokenId?: number;
  eventId?: number;
  addresses: string[];
};

// Type for whitelist entry response
export type WhitelistEntry = {
  id: number;
  tokenId?: number | null;
  eventId?: number | null;
  walletAddress: string;
  createdAt: string;
};

// Type for toggle whitelist setting
type ToggleWhitelistParams = {
  id: number;
  type: 'token' | 'event';
  enabled: boolean;
};

// Hook to add a single address to whitelist
export function useAddToWhitelist() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ tokenId, eventId, walletAddress }: AddWhitelistEntryParams) => {
      const response = await fetch('/api/whitelist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenId: tokenId || null,
          eventId: eventId || null,
          walletAddress,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add address to whitelist');
      }
      
      return response.json() as Promise<WhitelistEntry>;
    },
    onSuccess: (_, variables) => {
      // Invalidate relevant queries
      if (variables.tokenId) {
        queryClient.invalidateQueries({ queryKey: ['whitelist', { tokenId: variables.tokenId }] });
        queryClient.invalidateQueries({ queryKey: ['token', variables.tokenId] });
      } else if (variables.eventId) {
        queryClient.invalidateQueries({ queryKey: ['whitelist', { eventId: variables.eventId }] });
        queryClient.invalidateQueries({ queryKey: ['event', variables.eventId] });
      }
    },
  });
}

// Hook to bulk add addresses to whitelist
export function useBulkAddToWhitelist() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ tokenId, eventId, addresses }: BulkAddWhitelistParams) => {
      const response = await fetch('/api/whitelist/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenId: tokenId || null,
          eventId: eventId || null,
          addresses,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add addresses to whitelist');
      }
      
      return response.json() as Promise<WhitelistEntry[]>;
    },
    onSuccess: (_, variables) => {
      // Invalidate relevant queries
      if (variables.tokenId) {
        queryClient.invalidateQueries({ queryKey: ['whitelist', { tokenId: variables.tokenId }] });
        queryClient.invalidateQueries({ queryKey: ['token', variables.tokenId] });
      } else if (variables.eventId) {
        queryClient.invalidateQueries({ queryKey: ['whitelist', { eventId: variables.eventId }] });
        queryClient.invalidateQueries({ queryKey: ['event', variables.eventId] });
      }
    },
  });
}

// Hook to remove address from whitelist
export function useRemoveFromWhitelist() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/whitelist/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to remove address from whitelist');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // We don't know which token/event this belongs to, so invalidate all whitelist queries
      queryClient.invalidateQueries({ queryKey: ['whitelist'] });
    },
  });
}

// Hook to toggle whitelist setting
export function useToggleWhitelist() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, type, enabled }: ToggleWhitelistParams) => {
      const endpoint = type === 'token' 
        ? `/api/tokens/${id}/whitelist/toggle` 
        : `/api/events/${id}/whitelist/toggle`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update whitelist setting');
      }
      
      return response.json();
    },
    onSuccess: (_, variables) => {
      // Invalidate relevant queries
      if (variables.type === 'token') {
        queryClient.invalidateQueries({ queryKey: ['whitelist', { tokenId: variables.id }] });
        queryClient.invalidateQueries({ queryKey: ['token', variables.id] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['whitelist', { eventId: variables.id }] });
        queryClient.invalidateQueries({ queryKey: ['event', variables.id] });
      }
    },
  });
}

// Hook to get whitelist entries
export function useWhitelistEntries(tokenId?: number, eventId?: number) {
  return useQuery({
    queryKey: ['whitelist', { tokenId, eventId }],
    queryFn: async () => {
      const params = tokenId ? `tokenId=${tokenId}` : `eventId=${eventId}`;
      const response = await fetch(`/api/whitelist?${params}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch whitelist entries');
      }
      
      return response.json() as Promise<WhitelistEntry[]>;
    },
    enabled: Boolean(tokenId || eventId),
  });
}

// Hook to check if address is whitelisted
export function useCheckWhitelisted(tokenId?: number, eventId?: number, walletAddress?: string) {
  return useQuery({
    queryKey: ['whitelistCheck', { tokenId, eventId, walletAddress }],
    queryFn: async () => {
      if (!walletAddress) return { isWhitelisted: false };
      
      const params = new URLSearchParams();
      if (tokenId) params.append('tokenId', tokenId.toString());
      if (eventId) params.append('eventId', eventId.toString());
      params.append('walletAddress', walletAddress);
      
      const response = await fetch(`/api/whitelist/check?${params}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to check whitelist status');
      }
      
      return response.json() as Promise<{ isWhitelisted: boolean }>;
    },
    enabled: Boolean((tokenId || eventId) && walletAddress),
  });
}
```

## Testing & Validation

### 1. Manual Testing Procedure

To ensure the whitelist feature and Solana Pay QR airdrop system work correctly, follow these test procedures:

1. **Database Migration Tests**:
   - Apply migrations and verify the database schema updates correctly
   - Check that the whitelist tables and relations are created
   - Verify that foreign key constraints work as expected

2. **API Endpoint Tests**:
   - Test creating a whitelist entry with valid input
   - Test creating a whitelist entry with invalid input (validation errors)
   - Test bulk addition of whitelist entries
   - Test retrieving whitelist entries for a token
   - Test retrieving whitelist entries for an event
   - Test checking if an address is whitelisted
   - Test toggling whitelist settings for a token and event
   - Test deleting whitelist entries

3. **Solana Pay Integration Tests**:
   - Test generating a QR code for a token claim
   - Test scanning the QR code with a Solana Pay compatible wallet
   - Test the GET and POST handlers respond correctly
   - Test that transaction verification works correctly
   - Test that claims are properly recorded in the database

4. **Whitelist Validation Tests**:
   - Test claiming a token when whitelist is disabled (should work for anyone)
   - Test claiming a token when whitelist is enabled and the address is whitelisted (should work)
   - Test claiming a token when whitelist is enabled and the address is not whitelisted (should fail)

5. **UI Tests**:
   - Test the whitelist management UI works correctly
   - Test adding a single address
   - Test bulk uploading addresses
   - Test deleting addresses
   - Test toggling whitelist settings
   - Test that the claim page shows the correct status based on whitelist settings

### 2. Automated Testing (client/src/tests/whitelist.test.ts)

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { WhitelistManager } from '@/components/whitelist-manager';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock components and hooks
vi.mock('@solana/wallet-adapter-react', () => ({
  useWallet: () => ({
    publicKey: { toString: () => 'mockWalletAddress' },
  }),
}));

vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock fetch responses
const mockWhitelistEntries = [
  { id: 1, tokenId: 1, walletAddress: 'address1', createdAt: new Date().toISOString() },
  { id: 2, tokenId: 1, walletAddress: 'address2', createdAt: new Date().toISOString() },
];

const mockWhitelistStatus = { isWhitelisted: true };

global.fetch = vi.fn();

function mockFetchResponse(data: any) {
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve(data),
  });
}

describe('WhitelistManager', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    // Mock fetch for whitelist entries
    (fetch as any).mockImplementation((url: string) => {
      if (url.includes('/api/whitelist?tokenId=1')) {
        return mockFetchResponse(mockWhitelistEntries);
      }
      if (url.includes('/api/whitelist/check')) {
        return mockFetchResponse(mockWhitelistStatus);
      }
      return mockFetchResponse({});
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders the component with whitelist entries', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <WhitelistManager tokenId={1} />
      </QueryClientProvider>
    );

    // Wait for the whitelist entries to load
    await waitFor(() => {
      expect(screen.getByText('Total entries: 2')).toBeInTheDocument();
    });

    // Check if the addresses are displayed
    expect(screen.getByText('address1')).toBeInTheDocument();
    expect(screen.getByText('address2')).toBeInTheDocument();
  });

  it('allows adding a new address', async () => {
    // Mock the POST response
    (fetch as any).mockImplementation((url: string, options: any) => {
      if (url === '/api/whitelist' && options.method === 'POST') {
        return mockFetchResponse({ id: 3, tokenId: 1, walletAddress: 'newAddress' });
      }
      if (url.includes('/api/whitelist?tokenId=1')) {
        return mockFetchResponse(mockWhitelistEntries);
      }
      if (url.includes('/api/whitelist/check')) {
        return mockFetchResponse(mockWhitelistStatus);
      }
      return mockFetchResponse({});
    });

    render(
      <QueryClientProvider client={queryClient}>
        <WhitelistManager tokenId={1} />
      </QueryClientProvider>
    );

    // Switch to the single add tab
    const singleTabTrigger = screen.getByText('Add Single Address');
    fireEvent.click(singleTabTrigger);

    // Enter a new address
    const addressInput = screen.getByPlaceholderText('Enter wallet address');
    fireEvent.change(addressInput, { target: { value: 'newAddress' } });

    // Click the add button
    const addButton = screen.getByText('Add');
    fireEvent.click(addButton);

    // Verify the fetch was called with the correct data
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/whitelist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenId: 1,
          eventId: null,
          walletAddress: 'newAddress',
        }),
      });
    });
  });

  // Add more tests for bulk upload, deleting entries, etc.
});
```

### 3. Integration Tests (server/tests/whitelist-api.test.ts)

```typescript
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { setupServer } from '../server';
import { storage } from '../storage';

// Mock storage methods
jest.mock('../storage', () => ({
  storage: {
    createWhitelistEntry: jest.fn(),
    getWhitelistForToken: jest.fn(),
    getWhitelistForEvent: jest.fn(),
    deleteWhitelistEntry: jest.fn(),
    isAddressWhitelistedForToken: jest.fn(),
    isAddressWhitelistedForEvent: jest.fn(),
    bulkAddWhitelistEntries: jest.fn(),
    getToken: jest.fn(),
    getEvent: jest.fn(),
    updateToken: jest.fn(),
    updateEvent: jest.fn(),
  },
}));

describe('Whitelist API Endpoints', () => {
  let app: express.Express;

  beforeEach(async () => {
    app = express();
    await setupServer(app);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create a whitelist entry for a token', async () => {
    const mockWhitelistEntry = {
      id: 1,
      tokenId: 1,
      eventId: null,
      walletAddress: 'testWalletAddress',
      createdAt: new Date().toISOString(),
    };

    const mockToken = {
      id: 1,
      name: 'Test Token',
      symbol: 'TEST',
      whitelistEnabled: false,
    };

    (storage.createWhitelistEntry as jest.Mock).mockResolvedValue(mockWhitelistEntry);
    (storage.getToken as jest.Mock).mockResolvedValue(mockToken);
    (storage.updateToken as jest.Mock).mockResolvedValue({ ...mockToken, whitelistEnabled: true });

    const res = await request(app)
      .post('/api/whitelist')
      .send({
        tokenId: 1,
        walletAddress: 'testWalletAddress',
      });

    expect(res.status).toBe(201);
    expect(res.body).toEqual(mockWhitelistEntry);
    expect(storage.createWhitelistEntry).toHaveBeenCalledWith({
      tokenId: 1,
      eventId: null,
      walletAddress: 'testWalletAddress',
    });
    expect(storage.getToken).toHaveBeenCalledWith(1);
    expect(storage.updateToken).toHaveBeenCalledWith(1, { whitelistEnabled: true });
  });

  it('should get whitelist entries for a token', async () => {
    const mockWhitelistEntries = [
      {
        id: 1,
        tokenId: 1,
        eventId: null,
        walletAddress: 'address1',
        createdAt: new Date().toISOString(),
      },
      {
        id: 2,
        tokenId: 1,
        eventId: null,
        walletAddress: 'address2',
        createdAt: new Date().toISOString(),
      },
    ];

    (storage.getWhitelistForToken as jest.Mock).mockResolvedValue(mockWhitelistEntries);

    const res = await request(app).get('/api/whitelist?tokenId=1');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(mockWhitelistEntries);
    expect(storage.getWhitelistForToken).toHaveBeenCalledWith(1);
  });

  it('should check if an address is whitelisted for a token', async () => {
    (storage.isAddressWhitelistedForToken as jest.Mock).mockResolvedValue(true);

    const res = await request(app).get('/api/whitelist/check?tokenId=1&walletAddress=testWalletAddress');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ isWhitelisted: true });
    expect(storage.isAddressWhitelistedForToken).toHaveBeenCalledWith(1, 'testWalletAddress');
  });

  it('should delete a whitelist entry', async () => {
    (storage.deleteWhitelistEntry as jest.Mock).mockResolvedValue(true);

    const res = await request(app).delete('/api/whitelist/1');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, message: 'Whitelist entry deleted successfully' });
    expect(storage.deleteWhitelistEntry).toHaveBeenCalledWith(1);
  });

  // Add more tests for bulk upload, error cases, etc.
});
```

## Security Considerations

### 1. Data Validation and Sanitization

Throughout this implementation, it's crucial to validate and sanitize all inputs:

1. **Wallet Address Validation**: All wallet addresses must be valid Solana public keys. Always validate them using the `PublicKey` constructor:

```typescript
try {
  new PublicKey(walletAddress); // Will throw if invalid
} catch (error) {
  throw new Error("Invalid wallet address");
}
```

2. **Input Sanitization**: Use zod schemas to validate all API inputs and ensure that only expected data is processed.

3. **Query Parameter Validation**: Always validate query parameters with proper type checking before using them in database queries.

### 2. Transaction Security

1. **Signed Payloads**: Use signed QR payloads with limited validity periods to prevent replay attacks:

```typescript
function generateSignedQrPayload(tokenId: number, expiryMinutes: number = 30): string {
  const timestamp = Date.now();
  const expiry = new Date(timestamp);
  expiry.setMinutes(expiry.getMinutes() + expiryMinutes);
  
  const payload = `${tokenId}:${timestamp}:${expiry.getTime()}`;
  const secret = process.env.QR_SIGNATURE_SECRET || "default-secret-change-me";
  
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  const signature = hmac.digest('hex');
  
  return `${payload}:${signature}`;
}
```

2. **Transaction Verification**: Always verify that transactions on the blockchain contain the expected details before recording them as claims.

3. **Reference Keys**: Use unique reference keys to track specific transactions and prevent confusion between different airdrop claims.

### 3. Access Control

1. **Whitelist Access**: Enforce proper whitelist checks on all token claim endpoints:

```typescript
// Check if user is whitelisted (if whitelist is enabled)
if (token.whitelistEnabled) {
  const isWhitelisted = await storage.isAddressWhitelistedForToken(
    tokenId, 
    walletAddress.toString()
  );
  
  if (!isWhitelisted) {
    return res.status(403).json({ 
      error: "Not whitelisted", 
      message: "Your wallet is not whitelisted for this token" 
    });
  }
}
```

2. **Creator-Only Actions**: Restrict whitelist management to token creators only:

```typescript
const isCreator = token.creatorId === publicKey?.toString();
if (!isCreator) {
  return res.status(403).json({ 
    error: "Access denied", 
    message: "Only the token creator can manage the whitelist" 
  });
}
```

3. **Feature Flags**: Use the `whitelistEnabled` flag to control access at the token/event level.

### 4. Rate Limiting

Implement rate limiting on API endpoints to prevent abuse, especially for operations like:
- Adding whitelist entries
- Checking whitelist status
- Claiming tokens

```typescript
// Example using express-rate-limit
import rateLimit from 'express-rate-limit';

const whitelistLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests, please try again later',
});

app.use('/api/whitelist', whitelistLimiter);
```

### 5. Environment Variables

Store sensitive information in environment variables and never hardcode them:

```typescript
// .env
QR_SIGNATURE_SECRET=your-secure-random-string
SOLANA_RPC_URL=https://your-rpc-endpoint.example.com

// In code
const secret = process.env.QR_SIGNATURE_SECRET || "default-secret-change-me";
const connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com', 'confirmed');
```

By following these security considerations, you can ensure that your whitelist feature and Solana Pay QR airdrop system are secure and protected against common attack vectors.
