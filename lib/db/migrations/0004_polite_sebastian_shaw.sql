ALTER TYPE "public"."chat_message_role" ADD VALUE 'system';--> statement-breakpoint
CREATE TABLE "llm_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"endpoint" text NOT NULL,
	"model" text NOT NULL,
	"system_prompt" text,
	"user_prompt" text,
	"response" text,
	"tokens_used" integer,
	"prompt_tokens" integer,
	"completion_tokens" integer,
	"reasoning_tokens" integer,
	"cached_input_tokens" integer,
	"response_time_ms" integer,
	"finish_reason" text,
	"error_message" text,
	"user_id" uuid,
	"organization_id" uuid,
	"chat_session_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chat_messages" RENAME COLUMN "content" TO "parts";--> statement-breakpoint
ALTER TABLE "chat_messages" RENAME COLUMN "grounding_metadata" TO "metadata";--> statement-breakpoint
ALTER TABLE "llm_logs" ADD CONSTRAINT "llm_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "llm_logs" ADD CONSTRAINT "llm_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "llm_logs" ADD CONSTRAINT "llm_logs_chat_session_id_chat_sessions_id_fk" FOREIGN KEY ("chat_session_id") REFERENCES "public"."chat_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_llm_logs_timestamp" ON "llm_logs" USING btree ("timestamp" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_llm_logs_endpoint" ON "llm_logs" USING btree ("endpoint");--> statement-breakpoint
CREATE INDEX "idx_llm_logs_user_id" ON "llm_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_llm_logs_org_id" ON "llm_logs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_llm_logs_chat_session_id" ON "llm_logs" USING btree ("chat_session_id");