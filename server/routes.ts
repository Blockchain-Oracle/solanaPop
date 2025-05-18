import type { Express, Request, Response, NextFunction } from "express";
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
import solanaPay from "./api/solana-pay";
import whitelist from "./api/whitelist";
import tokensAPI from "./api/tokens";
import { checkWhitelistAccess } from "./storage";

// Utility to wrap async route handlers and automatically catch/forward errors
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Helper function to handle errors consistently
const handleError = (error: unknown, res: Response) => {
  // Log the error with its stack trace
  console.error("API Error:", error);
  
  // Handle validation errors
  if (error instanceof ZodError) {
    const validationError = fromZodError(error);
    return res.status(400).json({ 
      error: "Validation failed", 
      details: validationError.message 
    });
  }
  
  // Handle standard errors
  if (error instanceof Error) {
    const statusCode = error.message.includes('not found') ? 404 : 
                      error.message.includes('Database error') ? 500 : 400;
    
    return res.status(statusCode).json({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
  
  // Fallback for unknown errors
  return res.status(500).json({ 
    error: "An unexpected error occurred", 
    details: String(error)
  });
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Register API routes
  app.use(solanaPay);
  app.use(whitelist);
  app.use(tokensAPI);

  // API routes for events
  app.post("/api/events", async (req: Request, res: Response) => {
    try {
      const eventData = insertEventSchema.parse(req.body);
      const event = await storage.createEvent(eventData);
      return res.status(201).json(event);
    } catch (error) {
      return handleError(error, res);
    }
  });

  app.get("/api/events", async (req: Request, res: Response) => {
    try {
      const { creatorId } = req.query;
      
      let events;
      if (creatorId) {
        // If creatorId is provided, filter events by creator
        events = await storage.getEventsByCreator(parseInt(creatorId as string));
      } else {
        // Otherwise, return all events
        events = await storage.getAllEvents();
      }
      
      return res.status(200).json(events);
    } catch (error) {
      return handleError(error, res);
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
      return handleError(error, res);
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
      return handleError(error, res);
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
      return handleError(error, res);
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
      return handleError(error, res);
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
      return handleError(error, res);
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
      return handleError(error, res);
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
          metadataUri: string | null;
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
      return handleError(error, res);
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
      return handleError(error, res);
    }
  });

  app.get("/api/users/wallet/:walletAddress", async (req: Request, res: Response) => {
    try {
      const { walletAddress } = req.params;
      if (!walletAddress) {
        return res.status(400).json({ error: "Wallet address is required" });
      }
      
      const user = await storage.getUserByWalletAddress(walletAddress);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      return res.json(user);
    } catch (error) {
      return handleError(error, res);
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
