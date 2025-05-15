CREATE TABLE "events" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"date" timestamp NOT NULL,
	"end_date" timestamp,
	"location" text NOT NULL,
	"capacity" integer DEFAULT 100,
	"event_type" text NOT NULL,
	"creator_id" integer NOT NULL,
	"token_id" integer,
	"is_private" boolean DEFAULT false,
	"access_code" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"whitelist_enabled" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "token_claims" (
	"id" serial PRIMARY KEY NOT NULL,
	"token_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"wallet_address" text NOT NULL,
	"claimed_at" timestamp DEFAULT now() NOT NULL,
	"transaction_id" text
);
--> statement-breakpoint
CREATE TABLE "tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"symbol" text NOT NULL,
	"description" text NOT NULL,
	"supply" integer NOT NULL,
	"claimed" integer DEFAULT 0,
	"expiry_date" timestamp,
	"creator_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"mint_address" text,
	"whitelist_enabled" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"wallet_address" text,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "whitelists" (
	"id" serial PRIMARY KEY NOT NULL,
	"token_id" integer,
	"event_id" integer,
	"wallet_address" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "whitelists" ADD CONSTRAINT "whitelists_token_id_tokens_id_fk" FOREIGN KEY ("token_id") REFERENCES "public"."tokens"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whitelists" ADD CONSTRAINT "whitelists_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;