var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  insertTokenClaimSchema: () => insertTokenClaimSchema,
  insertTokenSchema: () => insertTokenSchema,
  insertUserSchema: () => insertUserSchema,
  tokenClaims: () => tokenClaims,
  tokenClaimsRelations: () => tokenClaimsRelations,
  tokens: () => tokens,
  tokensRelations: () => tokensRelations,
  users: () => users,
  usersRelations: () => usersRelations
});
import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  walletAddress: text("wallet_address")
});
var tokens = pgTable("tokens", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  symbol: text("symbol").notNull(),
  description: text("description").notNull(),
  supply: integer("supply").notNull(),
  claimed: integer("claimed").default(0),
  expiryDate: timestamp("expiry_date"),
  creatorId: integer("creator_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  mintAddress: text("mint_address")
});
var tokenClaims = pgTable("token_claims", {
  id: serial("id").primaryKey(),
  tokenId: integer("token_id").notNull(),
  userId: integer("user_id").notNull(),
  walletAddress: text("wallet_address").notNull(),
  claimedAt: timestamp("claimed_at").defaultNow().notNull(),
  transactionId: text("transaction_id")
});
var usersRelations = relations(users, ({ many }) => ({
  tokens: many(tokens),
  tokenClaims: many(tokenClaims)
}));
var tokensRelations = relations(tokens, ({ one, many }) => ({
  creator: one(users, {
    fields: [tokens.creatorId],
    references: [users.id]
  }),
  claims: many(tokenClaims)
}));
var tokenClaimsRelations = relations(tokenClaims, ({ one }) => ({
  token: one(tokens, {
    fields: [tokenClaims.tokenId],
    references: [tokens.id]
  }),
  user: one(users, {
    fields: [tokenClaims.userId],
    references: [users.id]
  })
}));
var insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  walletAddress: true
});
var insertTokenSchema = createInsertSchema(tokens).pick({
  name: true,
  symbol: true,
  description: true,
  supply: true,
  expiryDate: true,
  creatorId: true,
  mintAddress: true
});
var insertTokenClaimSchema = createInsertSchema(tokenClaims).pick({
  tokenId: true,
  userId: true,
  walletAddress: true,
  transactionId: true
});

// server/db.ts
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?"
  );
}
var isNeonDatabase = process.env.DATABASE_URL.includes("neon");
if (isNeonDatabase) {
  neonConfig.webSocketConstructor = ws;
}
var pool = new Pool({ connectionString: process.env.DATABASE_URL });
var db = drizzle({ client: pool, schema: schema_exports });

// server/storage.ts
import { eq } from "drizzle-orm";
var DatabaseStorage = class {
  // User methods
  async getUser(id) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  async getUserByUsername(username) {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }
  async getUserByWalletAddress(walletAddress) {
    const [user] = await db.select().from(users).where(eq(users.walletAddress, walletAddress));
    return user;
  }
  async createUser(insertUser) {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }
  // Token methods
  async createToken(insertToken) {
    const [token] = await db.insert(tokens).values({
      ...insertToken,
      claimed: 0
    }).returning();
    return token;
  }
  async getToken(id) {
    const [token] = await db.select().from(tokens).where(eq(tokens.id, id));
    return token;
  }
  async getTokensByCreator(creatorId) {
    return await db.select().from(tokens).where(eq(tokens.creatorId, creatorId));
  }
  async updateTokenClaimed(id) {
    const [token] = await db.select().from(tokens).where(eq(tokens.id, id));
    if (token) {
      const currentClaimed = token.claimed || 0;
      const [updatedToken] = await db.update(tokens).set({ claimed: currentClaimed + 1 }).where(eq(tokens.id, id)).returning();
      return updatedToken;
    }
    return void 0;
  }
  // Token Claim methods
  async createTokenClaim(insertClaim) {
    const [claim] = await db.insert(tokenClaims).values(insertClaim).returning();
    await this.updateTokenClaimed(insertClaim.tokenId);
    return claim;
  }
  async getTokenClaimsByUser(userId) {
    return await db.select().from(tokenClaims).where(eq(tokenClaims.userId, userId));
  }
  async getTokenClaimsByWallet(walletAddress) {
    return await db.select().from(tokenClaims).where(eq(tokenClaims.walletAddress, walletAddress));
  }
};
var storage = new DatabaseStorage();

// server/routes.ts
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { eq as eq2 } from "drizzle-orm";
async function registerRoutes(app2) {
  app2.post("/api/tokens", async (req, res) => {
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
  app2.get("/api/tokens/:id", async (req, res) => {
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
  app2.get("/api/tokens/creator/:creatorId", async (req, res) => {
    try {
      const creatorId = parseInt(req.params.creatorId);
      if (isNaN(creatorId)) {
        return res.status(400).json({ error: "Invalid creator ID" });
      }
      const tokens2 = await storage.getTokensByCreator(creatorId);
      return res.json(tokens2);
    } catch (error) {
      return res.status(500).json({ error: "Failed to fetch tokens" });
    }
  });
  app2.post("/api/claims", async (req, res) => {
    try {
      const claimData = insertTokenClaimSchema.parse(req.body);
      const token = await storage.getToken(claimData.tokenId);
      if (!token) {
        return res.status(404).json({ error: "Token not found" });
      }
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
  app2.get("/api/claims/wallet/:walletAddress", async (req, res) => {
    try {
      const { walletAddress } = req.params;
      if (!walletAddress) {
        return res.status(400).json({ error: "Wallet address is required" });
      }
      const claims = await storage.getTokenClaimsByWallet(walletAddress);
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
  app2.get("/api/claims/wallet/:walletAddress/with-tokens", async (req, res) => {
    try {
      const { walletAddress } = req.params;
      if (!walletAddress) {
        return res.status(400).json({ error: "Wallet address is required" });
      }
      const claims = await db.select({
        claim: tokenClaims,
        token: tokens
      }).from(tokenClaims).innerJoin(tokens, eq2(tokenClaims.tokenId, tokens.id)).where(eq2(tokenClaims.walletAddress, walletAddress));
      const formattedClaims = claims.map((result) => ({
        ...result.claim,
        token: result.token
      }));
      return res.json(formattedClaims);
    } catch (error) {
      console.error("Error fetching claims with tokens:", error);
      return res.status(500).json({ error: "Failed to fetch token claims with tokens" });
    }
  });
  app2.post("/api/users", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
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
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = 5e3;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
