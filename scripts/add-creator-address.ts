import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be set in .env file");
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Adding creatorAddress column to tokens table...');
    
    // Check if column already exists
    const checkResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='tokens' AND column_name='creator_address';
    `);
    
    if (checkResult.rows.length === 0) {
      // Add the column if it doesn't exist
      await pool.query(`
        ALTER TABLE tokens
        ADD COLUMN creator_address TEXT;
      `);
      console.log('Column added successfully!');
      
      // Update existing tokens with creator wallet addresses
      console.log('Updating existing tokens with creator wallet addresses...');
      await pool.query(`
        UPDATE tokens t
        SET creator_address = u.wallet_address
        FROM users u
        WHERE t.creator_id = u.id
        AND t.creator_address IS NULL;
      `);
      console.log('Existing tokens updated successfully!');
    } else {
      console.log('Column already exists, skipping creation.');
    }
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main()
  .catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  }); 