-- Update tokens table to make mintAddress and metadataUri required
-- Check if the columns are nullable first to avoid errors
DO $$
BEGIN
    -- Only try to set NOT NULL if the columns exist and are currently nullable
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'tokens' 
        AND column_name = 'mint_address' 
        AND is_nullable = 'YES'
    ) THEN
        ALTER TABLE "tokens" ALTER COLUMN "mint_address" SET NOT NULL;
    END IF;
    
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'tokens' 
        AND column_name = 'metadata_uri' 
        AND is_nullable = 'YES'
    ) THEN
        ALTER TABLE "tokens" ALTER COLUMN "metadata_uri" SET NOT NULL;
    END IF;
END $$;

-- Comment: This migration makes the mintAddress and metadataUri fields required
-- to ensure all tokens have an associated on-chain token mint and metadata 