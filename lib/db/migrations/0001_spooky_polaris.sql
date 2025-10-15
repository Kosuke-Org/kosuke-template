ALTER TABLE "user_subscriptions" DROP CONSTRAINT "user_subscriptions_subscription_id_unique";--> statement-breakpoint
ALTER TABLE "user_subscriptions" ADD COLUMN "stripe_subscription_id" text;--> statement-breakpoint
ALTER TABLE "user_subscriptions" ADD COLUMN "stripe_customer_id" text;--> statement-breakpoint
ALTER TABLE "user_subscriptions" ADD COLUMN "stripe_price_id" text;--> statement-breakpoint
ALTER TABLE "user_subscriptions" ADD COLUMN "cancel_at_period_end" text DEFAULT 'false' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "stripe_customer_id" text;--> statement-breakpoint
ALTER TABLE "user_subscriptions" DROP COLUMN "subscription_id";--> statement-breakpoint
ALTER TABLE "user_subscriptions" DROP COLUMN "product_id";--> statement-breakpoint
ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_stripe_subscription_id_unique" UNIQUE("stripe_subscription_id");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_stripe_customer_id_unique" UNIQUE("stripe_customer_id");