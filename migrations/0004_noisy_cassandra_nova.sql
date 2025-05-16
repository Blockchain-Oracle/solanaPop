ALTER TABLE "tokens" ALTER COLUMN "mint_address" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "token_claims" ADD COLUMN "reference" text;--> statement-breakpoint
ALTER TABLE "token_claims" ADD COLUMN "status" text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "tokens" ADD COLUMN "creator_address" text;--> statement-breakpoint
ALTER TABLE "tokens" ADD COLUMN "metadata_uri" text NOT NULL;