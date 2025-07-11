CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"stackauth_user_id" text NOT NULL,
	"email" text NOT NULL,
	"display_name" text,
	"profile_image_url" text,
	"last_synced_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_stackauth_user_id_unique" UNIQUE("stackauth_user_id")
);
