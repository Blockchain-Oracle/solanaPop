import { Pool } from 'pg';
import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

// Convert exec to Promise-based
const execAsync = promisify(exec);

// Load environment variables from .env file
config();

async function main() {
  // Connect to database
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Starting migration reset process...');
    
    // 1. Drop the Drizzle migrations tracking table if it exists
    console.log('Dropping migrations tracking table if it exists...');
    await pool.query('DROP TABLE IF EXISTS "__drizzle_migrations";');
    
    // 2. Create the migrations table
    console.log('Creating migrations tracking table...');
    await pool.query(`
      CREATE TABLE "__drizzle_migrations" (
        id TEXT PRIMARY KEY,
        hash TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now(),
        name TEXT
      );
    `);
    
    // 3. Insert records for all completed migrations
    console.log('Recording completed migrations...');
    const migrationFiles = fs.readdirSync(path.join(process.cwd(), 'migrations'))
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    for (const file of migrationFiles) {
      const migrationName = file.replace('.sql', '');
      await pool.query(`
        INSERT INTO "__drizzle_migrations" (id, hash, created_at, name)
        VALUES ($1, 'applied_manually', NOW(), $1);
      `, [migrationName]);
      console.log(`✓ Recorded migration: ${migrationName}`);
    }
    
    // 4. Verify the NOT NULL constraints on the tokens table
    console.log('Verifying NOT NULL constraints on tokens table...');
    
    const checkTokensTable = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'tokens'
      );
    `);
    
    if (checkTokensTable.rows[0].exists) {
      const checkConstraints = await pool.query(`
        SELECT column_name, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'tokens' 
        AND column_name IN ('mint_address', 'metadata_uri');
      `);
      
      const mintAddressNullable = checkConstraints.rows.find(
        row => row.column_name === 'mint_address'
      )?.is_nullable === 'YES';
      
      const metadataUriNullable = checkConstraints.rows.find(
        row => row.column_name === 'metadata_uri'
      )?.is_nullable === 'YES';
      
      if (mintAddressNullable || metadataUriNullable) {
        console.log('Fixing NULL values in tokens table...');
        
        // Update NULL values with placeholders
        await pool.query(`
          UPDATE tokens 
          SET mint_address = 'placeholder' 
          WHERE mint_address IS NULL;
          
          UPDATE tokens 
          SET metadata_uri = 'placeholder' 
          WHERE metadata_uri IS NULL;
        `);
        
        console.log('Setting NOT NULL constraints...');
        
        // Apply NOT NULL constraints
        await pool.query(`
          ALTER TABLE tokens
          ALTER COLUMN mint_address SET NOT NULL,
          ALTER COLUMN metadata_uri SET NOT NULL;
        `);
        
        console.log('NOT NULL constraints applied successfully.');
      } else {
        console.log('NOT NULL constraints are already in place.');
      }
    } else {
      console.log('Tokens table does not exist, skipping constraint check.');
    }
    
    // 5. Run database push to sync schema if needed
    console.log('\nMigration reset process completed! Your migration state has been synchronized.');
    console.log('If you need to update your schema in the future, use:');
    console.log('pnpm drizzle-kit push -- this will update your schema without running migration scripts.');
    
  } catch (error) {
    console.error('Error during migration reset:', error);
  } finally {
    await pool.end();
  }
}

main().catch(console.error); 