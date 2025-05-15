import { 
  users, type User, type InsertUser,
  tokens, type Token, type InsertToken,
  tokenClaims, type TokenClaim, type InsertTokenClaim,
  events, type Event, type InsertEvent,
  whitelists, type Whitelist, type InsertWhitelist
} from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByWalletAddress(walletAddress: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Token methods
  createToken(token: InsertToken): Promise<Token>;
  getToken(id: number): Promise<Token | undefined>;
  getTokensByCreator(creatorId: number): Promise<Token[]>;
  updateTokenClaimed(id: number): Promise<Token | undefined>;
  updateToken(id: number, updateData: Partial<InsertToken>): Promise<Token | undefined>;
  
  // Event methods
  createEvent(event: InsertEvent): Promise<Event>;
  getEvent(id: number): Promise<Event | undefined>;
  getEventsByCreator(creatorId: number): Promise<Event[]>;
  updateEvent(id: number, event: Partial<InsertEvent>): Promise<Event | undefined>;
  deleteEvent(id: number): Promise<boolean>;
  
  // Token Claim methods
  createTokenClaim(claim: InsertTokenClaim): Promise<TokenClaim>;
  getTokenClaimsByUser(userId: number): Promise<TokenClaim[]>;
  getTokenClaimsByWallet(walletAddress: string): Promise<TokenClaim[]>;

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
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByWalletAddress(walletAddress: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.walletAddress, walletAddress));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // Token methods
  async createToken(insertToken: InsertToken): Promise<Token> {
    const [token] = await db.insert(tokens).values({
      ...insertToken,
      claimed: 0
    }).returning();
    return token;
  }

  async getToken(id: number): Promise<Token | undefined> {
    const [token] = await db.select().from(tokens).where(eq(tokens.id, id));
    return token;
  }

  async getTokensByCreator(creatorId: number): Promise<Token[]> {
    return await db.select().from(tokens).where(eq(tokens.creatorId, creatorId));
  }

  async updateTokenClaimed(id: number): Promise<Token | undefined> {
    const [token] = await db.select().from(tokens).where(eq(tokens.id, id));
    
    if (token) {
      const currentClaimed = token.claimed || 0;
      const [updatedToken] = await db
        .update(tokens)
        .set({ claimed: currentClaimed + 1 })
        .where(eq(tokens.id, id))
        .returning();
      
      return updatedToken;
    }
    
    return undefined;
  }

  async updateToken(id: number, updateData: Partial<InsertToken>): Promise<Token | undefined> {
    const [token] = await db
      .update(tokens)
      .set(updateData)
      .where(eq(tokens.id, id))
      .returning();
    
    return token;
  }

  // Event methods
  async createEvent(insertEvent: InsertEvent): Promise<Event> {
    const [event] = await db.insert(events).values({
      ...insertEvent,
      updatedAt: new Date()
    }).returning();
    return event;
  }

  async getEvent(id: number): Promise<Event | undefined> {
    const [event] = await db.select().from(events).where(eq(events.id, id));
    return event;
  }

  async getEventsByCreator(creatorId: number): Promise<Event[]> {
    return await db.select().from(events).where(eq(events.creatorId, creatorId));
  }

  async updateEvent(id: number, updateData: Partial<InsertEvent>): Promise<Event | undefined> {
    const [event] = await db
      .update(events)
      .set({
        ...updateData,
        updatedAt: new Date()
      })
      .where(eq(events.id, id))
      .returning();
    
    return event;
  }

  async deleteEvent(id: number): Promise<boolean> {
    try {
      await db.delete(events).where(eq(events.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting event:", error);
      return false;
    }
  }

  // Token Claim methods
  async createTokenClaim(insertClaim: InsertTokenClaim): Promise<TokenClaim> {
    // Create the claim
    const [claim] = await db.insert(tokenClaims).values(insertClaim).returning();
    
    // Update token claimed count
    await this.updateTokenClaimed(insertClaim.tokenId);
    
    return claim;
  }

  async getTokenClaimsByUser(userId: number): Promise<TokenClaim[]> {
    return await db.select().from(tokenClaims).where(eq(tokenClaims.userId, userId));
  }

  async getTokenClaimsByWallet(walletAddress: string): Promise<TokenClaim[]> {
    return await db.select().from(tokenClaims).where(eq(tokenClaims.walletAddress, walletAddress));
  }

  // Whitelist methods
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

export const storage = new DatabaseStorage();

// Check if a token has already been claimed by a specific wallet
export async function hasUserClaimedToken(tokenId: number, walletAddress: string): Promise<boolean> {
  try {
    const existingClaim = await db.query.tokenClaims.findFirst({
      where: and(
        eq(tokenClaims.tokenId, tokenId),
        eq(tokenClaims.walletAddress, walletAddress)
      ),
    });
    
    return !!existingClaim;
  } catch (error) {
    console.error('Error checking claim status:', error);
    throw new Error('Failed to check if token has been claimed');
  }
}

// Helper function for whitelist checks
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
