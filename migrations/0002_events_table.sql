-- Create events table
CREATE TABLE IF NOT EXISTS "events" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "date" TIMESTAMP NOT NULL,
  "end_date" TIMESTAMP,
  "location" TEXT NOT NULL,
  "capacity" INTEGER DEFAULT 100,
  "event_type" TEXT NOT NULL,
  "creator_id" INTEGER NOT NULL,
  "token_id" INTEGER,
  "is_private" BOOLEAN DEFAULT FALSE,
  "access_code" TEXT,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY ("creator_id") REFERENCES "users"("id"),
  FOREIGN KEY ("token_id") REFERENCES "tokens"("id")
);

-- Add index for faster lookup by creator
CREATE INDEX IF NOT EXISTS "events_creator_id_idx" ON "events"("creator_id");
-- Add index for faster lookup by token
CREATE INDEX IF NOT EXISTS "events_token_id_idx" ON "events"("token_id"); 