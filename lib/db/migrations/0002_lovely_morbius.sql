ALTER TABLE "team_memberships" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "teams" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tasks" DROP CONSTRAINT "tasks_team_id_teams_id_fk";--> statement-breakpoint
ALTER TABLE "tasks" DROP COLUMN "team_id";--> statement-breakpoint
DROP TABLE "team_memberships" CASCADE;--> statement-breakpoint
DROP TABLE "teams" CASCADE;--> statement-breakpoint
DROP TYPE "public"."team_role";