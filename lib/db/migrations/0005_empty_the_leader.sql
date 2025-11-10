ALTER TABLE "activity_logs" ADD COLUMN "user_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "user_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "user_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "user_subscriptions" ADD COLUMN "user_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "activity_logs" DROP COLUMN "clerk_user_id";--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "clerk_user_id";--> statement-breakpoint
ALTER TABLE "tasks" DROP COLUMN "clerk_user_id";--> statement-breakpoint
ALTER TABLE "user_subscriptions" DROP COLUMN "clerk_user_id";