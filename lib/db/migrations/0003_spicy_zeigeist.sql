ALTER TABLE "users" ADD COLUMN "role" text DEFAULT 'user' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "image_url" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "marketing_emails" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "deleted_at" timestamp;