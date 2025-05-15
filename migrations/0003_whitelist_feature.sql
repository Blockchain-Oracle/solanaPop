-- Add whitelist feature to tokens and events
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS whitelist_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS whitelist_enabled BOOLEAN DEFAULT FALSE;

-- Create whitelist table
CREATE TABLE IF NOT EXISTS whitelists (
  id SERIAL PRIMARY KEY,
  token_id INTEGER REFERENCES tokens(id) ON DELETE CASCADE,
  event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Constraints to ensure either token_id or event_id is set (but not both)
  CONSTRAINT check_one_id_set CHECK (
    (token_id IS NULL AND event_id IS NOT NULL) OR
    (token_id IS NOT NULL AND event_id IS NULL)
  )
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_whitelists_token_id ON whitelists(token_id);
CREATE INDEX IF NOT EXISTS idx_whitelists_event_id ON whitelists(event_id);
CREATE INDEX IF NOT EXISTS idx_whitelists_wallet_address ON whitelists(wallet_address); 