CREATE TABLE "user_profiles" (
	"user_id" text PRIMARY KEY NOT NULL,
	"phone" text,
	"phone_verified" boolean DEFAULT false,
	"telegram_chat_id" text,
	"telegram_username" text,
	"device_tokens" jsonb DEFAULT '[]'::jsonb,
	"timezone" text DEFAULT 'UTC',
	"language" text DEFAULT 'en',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;