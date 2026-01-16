CREATE TABLE "org_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"stripe_subscription_id" text,
	"stripe_customer_id" text,
	"stripe_price_id" text,
	"status" text NOT NULL,
	"tier" text NOT NULL,
	"current_period_start" timestamp,
	"current_period_end" timestamp,
	"cancel_at_period_end" text DEFAULT 'false' NOT NULL,
	"scheduled_downgrade_tier" text,
	"canceled_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "org_subscriptions_organization_id_unique" UNIQUE("organization_id"),
	CONSTRAINT "org_subscriptions_stripe_subscription_id_unique" UNIQUE("stripe_subscription_id")
);
--> statement-breakpoint
ALTER TABLE "user_subscriptions" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "user_subscriptions" CASCADE;--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_stripe_customer_id_unique";--> statement-breakpoint
ALTER TABLE "org_memberships" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "stripe_customer_id" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "active_organization_role" "org_role";--> statement-breakpoint
ALTER TABLE "org_subscriptions" ADD CONSTRAINT "org_subscriptions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "stripe_customer_id";--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_stripe_customer_id_unique" UNIQUE("stripe_customer_id");