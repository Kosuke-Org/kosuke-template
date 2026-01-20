CREATE TABLE "system_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "system_config_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE INDEX "system_config_key_idx" ON "system_config" USING btree ("key");