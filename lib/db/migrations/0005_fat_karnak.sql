CREATE TABLE "rag_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"system_prompt" text,
	"max_output_tokens" integer,
	"temperature" real,
	"top_p" real,
	"top_k" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "llm_logs" ADD COLUMN "generation_config" text;--> statement-breakpoint
ALTER TABLE "rag_settings" ADD CONSTRAINT "rag_settings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;