import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { 
  insertTokenSchema, 
  insertTokenClaimSchema, 
  insertUserSchema,
  insertEventSchema,
  tokens,
  tokenClaims,
  events
} from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { eq } from "drizzle-orm";

export async function registerRoutes(app: Express): Promise<Server> {
  // API routes for token operations
  app.post("/api/tokens", async (req: Request, res: Response) => {
    try {
      const tokenData = insertTokenSchema.parse(req.body);
      const token = await storage.createToken(tokenData);
      return res.status(201).json(token);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ error: validationError.message });
      }
      return res.status(500).json({ error: "Failed to create token" });
    }
  });

  app.get("/api/tokens/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid token ID" });
      }
      
      const token = await storage.getToken(id);
      if (!token) {
        return res.status(404).json({ error: "Token not found" });
      }
      
      return res.json(token);
    } catch (error) {
      return res.status(500).json({ error: "Failed to fetch token" });
    }
  });

  app.get("/api/tokens/creator/:creatorId", async (req: Request, res: Response) => {
    try {
      const creatorId = parseInt(req.params.creatorId);
      if (isNaN(creatorId)) {
        return res.status(400).json({ error: "Invalid creator ID" });
      }
      
      const tokens = await storage.getTokensByCreator(creatorId);
      return res.json(tokens);
    } catch (error) {
      return res.status(500).json({ error: "Failed to fetch tokens" });
    }
  });

  // API routes for events
  app.post("/api/events", async (req: Request, res: Response) => {
    try {
      const eventData = insertEventSchema.parse(req.body);
      const event = await storage.createEvent(eventData);
      return res.status(201).json(event);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ error: validationError.message });
      }
      console.error("Error creating event:", error);
      return res.status(500).json({ error: "Failed to create event" });
    }
  });

  app.get("/api/events/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid event ID" });
      }
      
      const event = await storage.getEvent(id);
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }
      
      return res.json(event);
    } catch (error) {
      return res.status(500).json({ error: "Failed to fetch event" });
    }
  });

  app.get("/api/events/creator/:creatorId", async (req: Request, res: Response) => {
    try {
      const creatorId = parseInt(req.params.creatorId);
      if (isNaN(creatorId)) {
        return res.status(400).json({ error: "Invalid creator ID" });
      }
      
      const events = await storage.getEventsByCreator(creatorId);
      return res.json(events);
    } catch (error) {
      return res.status(500).json({ error: "Failed to fetch events" });
    }
  });

  app.put("/api/events/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid event ID" });
      }
      
      // Get existing event to verify it exists
      const existingEvent = await storage.getEvent(id);
      if (!existingEvent) {
        return res.status(404).json({ error: "Event not found" });
      }
      
      // Only validate fields that are provided
      const updateData = req.body;
      const updatedEvent = await storage.updateEvent(id, updateData);
      
      return res.json(updatedEvent);
    } catch (error) {
      console.error("Error updating event:", error);
      return res.status(500).json({ error: "Failed to update event" });
    }
  });

  app.delete("/api/events/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid event ID" });
      }
      
      const success = await storage.deleteEvent(id);
      if (!success) {
        return res.status(404).json({ error: "Event not found or could not be deleted" });
      }
      
      return res.json({ success: true, message: "Event deleted successfully" });
    } catch (error) {
      return res.status(500).json({ error: "Failed to delete event" });
    }
  });

  // API routes for token claims
  app.post("/api/claims", async (req: Request, res: Response) => {
    try {
      const claimData = insertTokenClaimSchema.parse(req.body);
      
      // Verify token exists
      const token = await storage.getToken(claimData.tokenId);
      if (!token) {
        return res.status(404).json({ error: "Token not found" });
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

  app.get("/api/claims/wallet/:walletAddress", async (req: Request, res: Response) => {
    try {
      const { walletAddress } = req.params;
      if (!walletAddress) {
        return res.status(400).json({ error: "Wallet address is required" });
      }
      
      // Get all claims for this wallet address
      const claims = await storage.getTokenClaimsByWallet(walletAddress);
      
      // Get token details for each claim
      const claimsWithTokens = await Promise.all(
        claims.map(async (claim) => {
          const token = await storage.getToken(claim.tokenId);
          return { ...claim, token };
        })
      );
      
      return res.json(claimsWithTokens);
    } catch (error) {
      return res.status(500).json({ error: "Failed to fetch token claims" });
    }
  });
  
  // Enhanced endpoint that uses db directly to leverage relations
  app.get("/api/claims/wallet/:walletAddress/with-tokens", async (req: Request, res: Response) => {
    try {
      const { walletAddress } = req.params;
      if (!walletAddress) {
        return res.status(400).json({ error: "Wallet address is required" });
      }
      
      type ClaimResult = {
        claim: {
          id: number;
          tokenId: number;
          userId: number;
          walletAddress: string;
          claimedAt: Date;
          transactionId: string | null;
        };
        token: {
          id: number;
          name: string;
          symbol: string;
          description: string;
          supply: number;
          claimed: number | null;
          expiryDate: Date | null;
          creatorId: number;
          createdAt: Date;
          mintAddress: string | null;
        };
      };
      
      const claims = await db
        .select({
          claim: tokenClaims,
          token: tokens
        })
        .from(tokenClaims)
        .innerJoin(tokens, eq(tokenClaims.tokenId, tokens.id))
        .where(eq(tokenClaims.walletAddress, walletAddress));
        
      // Format result for client
      const formattedClaims = claims.map((result: ClaimResult) => ({
        ...result.claim,
        token: result.token
      }));
      
      return res.json(formattedClaims);
    } catch (error) {
      console.error("Error fetching claims with tokens:", error);
      return res.status(500).json({ error: "Failed to fetch token claims with tokens" });
    }
  });

  // API routes for users
  app.post("/api/users", async (req: Request, res: Response) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user with this wallet already exists
      if (userData.walletAddress) {
        const existingUser = await storage.getUserByWalletAddress(userData.walletAddress);
        if (existingUser) {
          return res.json(existingUser);
        }
      }
      
      const user = await storage.createUser(userData);
      return res.status(201).json(user);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ error: validationError.message });
      }
      return res.status(500).json({ error: "Failed to create user" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
