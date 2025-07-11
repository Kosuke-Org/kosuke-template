CREATE TABLE "activity_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"stackauth_user_id" text NOT NULL,
	"action" text NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"ip_address" varchar(45),
	"metadata" text
);
--> statement-breakpoint
CREATE TABLE "user_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"stackauth_user_id" text NOT NULL,
	"subscription_id" text NOT NULL,
	"product_id" text NOT NULL,
	"status" text NOT NULL,
	"tier" text NOT NULL,
	"current_period_start" timestamp NOT NULL,
	"current_period_end" timestamp NOT NULL,
	"canceled_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_subscriptions_subscription_id_unique" UNIQUE("subscription_id")
);
