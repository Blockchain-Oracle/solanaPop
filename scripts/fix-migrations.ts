import { Pool } from 'pg';
import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables from .env file
config();

async function main() {
  // Connect to database
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Starting migration fix process...');
    
    // 1. Check if __drizzle_migrations table exists
    const checkTable = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = '__drizzle_migrations'
      );
    `);
    
    const tableExists = checkTable.rows[0].exists;
    
    if (tableExists) {
      console.log('Drizzle migrations table found.');
      
      // 2. Check if our migration is already applied
      const checkMigration = await pool.query(`
        SELECT * FROM __drizzle_migrations 
        WHERE name = '0004_token_mint_required';
      `);
      
      if (checkMigration.rows.length > 0) {
        console.log('Migration 0004_token_mint_required is already applied.');
      } else {
        console.log('Inserting migration record for 0004_token_mint_required...');
        
        // 3. Insert the migration manually
        await pool.query(`
          INSERT INTO __drizzle_migrations (id, hash, created_at, name)
          VALUES (
            '0004_token_mint_required', 
            'placeholder_hash',
            NOW(),
            '0004_token_mint_required'
          );
        `);
        console.log('Migration record inserted successfully.');
      }
    } else {
      console.log('Drizzle migrations table does not exist, creating it...');
      
      // Create the migrations table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
          id TEXT PRIMARY KEY,
          hash TEXT NOT NULL,
          created_at TIMESTAMPTZ DEFAULT now(),
          name TEXT
        );
      `);
      
      console.log('Migrations table created, inserting records for all migrations...');
      
      // Get migration files from the migrations directory
      const migrationFiles = fs.readdirSync(path.join(process.cwd(), 'migrations'))
        .filter(file => file.endsWith('.sql'))
        .sort();
      
      // Insert migration records for all migration files
      for (const file of migrationFiles) {
        const migrationName = file.replace('.sql', '');
        await pool.query(`
          INSERT INTO "__drizzle_migrations" (id, hash, created_at, name)
          VALUES ($1, 'placeholder_hash', NOW(), $1);
        `, [migrationName]);
        console.log(`Inserted migration record for: ${migrationName}`);
      }
    }
    
    // 4. Check constraints on tokens table
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
      console.log('NOT NULL constraints are already applied.');
    }
    
    console.log('Migration fix process completed successfully!');
  } catch (error) {
    console.error('Error fixing migrations:', error);
  } finally {
    await pool.end();
  }
}

main().catch(console.error); 