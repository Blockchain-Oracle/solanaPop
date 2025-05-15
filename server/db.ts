import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import dotenv from "dotenv";

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Check if we're using Neon (production) or local PostgreSQL (development)
const isNeonDatabase = process.env.DATABASE_URL.includes('neon');

if (isNeonDatabase) {
  // For Neon database connections (production)
  neonConfig.webSocketConstructor = ws;
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool, schema });