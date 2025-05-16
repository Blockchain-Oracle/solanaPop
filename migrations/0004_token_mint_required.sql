-- Update tokens table to make mintAddress and metadataUri required
ALTER TABLE "tokens" 
  ALTER COLUMN "mint_address" SET NOT NULL,
  ALTER COLUMN "metadata_uri" SET NOT NULL;

-- Comment: This migration makes the mintAddress and metadataUri fields required
-- to ensure all tokens have an associated on-chain token mint and metadata 