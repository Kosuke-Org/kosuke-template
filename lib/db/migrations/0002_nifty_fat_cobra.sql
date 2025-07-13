ALTER TABLE "user_subscriptions" ALTER COLUMN "subscription_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "user_subscriptions" ALTER COLUMN "product_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "user_subscriptions" ALTER COLUMN "current_period_start" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "user_subscriptions" ALTER COLUMN "current_period_end" DROP NOT NULL;