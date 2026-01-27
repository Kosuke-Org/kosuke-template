ALTER TYPE "public"."task_priority" ADD VALUE 'urgent';--> statement-breakpoint
ALTER TABLE "tasks" ALTER COLUMN "priority" SET DEFAULT 'high';