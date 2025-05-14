import { 
  users, type User, type InsertUser,
  tokens, type Token, type InsertToken,
  tokenClaims, type TokenClaim, type InsertTokenClaim
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
  
  // Token Claim methods
  createTokenClaim(claim: InsertTokenClaim): Promise<TokenClaim>;
  getTokenClaimsByUser(userId: number): Promise<TokenClaim[]>;
  getTokenClaimsByWallet(walletAddress: string): Promise<TokenClaim[]>;
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
}

export const storage = new DatabaseStorage();
