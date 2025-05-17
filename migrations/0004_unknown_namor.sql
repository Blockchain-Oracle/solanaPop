ALTER TABLE "tokens" ALTER COLUMN "mint_address" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "token_claims" ADD COLUMN "reference" text;--> statement-breakpoint
ALTER TABLE "token_claims" ADD COLUMN "status" text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "tokens" ADD COLUMN "creator_address" text;--> statement-breakpoint
ALTER TABLE "tokens" ADD COLUMN "metadata_uri" text NOT NULL;--> statement-breakpoint
ALTER TABLE "tokens" ADD COLUMN "is_compressed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "tokens" ADD COLUMN "compression_state" text DEFAULT 'uncompressed';--> statement-breakpoint
ALTER TABLE "tokens" ADD COLUMN "state_tree_id" text;--> statement-breakpoint
ALTER TABLE "tokens" ADD COLUMN "token_pool_id" text;