-- Better-Auth Alignment Migration
-- Align DB schema with Better-Auth expectations and add useful indexes

-- Ensure pgcrypto is available for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1) Sessions: add session token and helpful index
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'token'
  ) THEN
    ALTER TABLE "sessions" ADD COLUMN "token" text NOT NULL DEFAULT gen_random_uuid()::text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'sessions_user_id_idx'
  ) THEN
    CREATE INDEX "sessions_user_id_idx" ON "sessions" ("user_id");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'sessions_token_unique'
  ) THEN
    ALTER TABLE "sessions" ADD CONSTRAINT "sessions_token_unique" UNIQUE("token");
  END IF;
END $$;

-- 2) Users: add Stripe customer id used by Better-Auth Stripe plugin
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'stripe_customer_id'
  ) THEN
    ALTER TABLE "users" ADD COLUMN "stripe_customer_id" text;
  END IF;
END $$;

-- 3) Subscriptions table for Better-Auth Stripe plugin (if not present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'subscriptions'
  ) THEN
    CREATE TABLE "subscriptions" (
      "id" text PRIMARY KEY NOT NULL,
      "plan" text NOT NULL,
      "reference_id" text NOT NULL,
      "stripe_customer_id" text NOT NULL,
      "stripe_subscription_id" text NOT NULL,
      "status" text NOT NULL,
      "period_start" timestamp NOT NULL,
      "period_end" timestamp NOT NULL,
      "cancel_at_period_end" boolean DEFAULT false NOT NULL,
      "seats" integer DEFAULT 1,
      "trial_start" timestamp,
      "trial_end" timestamp,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    );
  END IF;
END $$;

-- 4) Helpful indexes for performance
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'accounts_user_id_idx'
  ) THEN
    CREATE INDEX "accounts_user_id_idx" ON "accounts" ("user_id");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'verifications_identifier_idx'
  ) THEN
    CREATE INDEX "verifications_identifier_idx" ON "verifications" ("identifier");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'user_roles_user_id_idx'
  ) THEN
    CREATE INDEX "user_roles_user_id_idx" ON "user_roles" ("user_id");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'passkeys_user_id_idx'
  ) THEN
    CREATE INDEX "passkeys_user_id_idx" ON "passkeys" ("user_id");
  END IF;
END $$;

