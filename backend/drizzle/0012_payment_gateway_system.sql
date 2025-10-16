-- Migration: Payment Gateway System
-- Description: Create tables for multi-gateway payment processing
-- Author: Claude Code
-- Date: 2025-10-16

-- Create payment_gateways table
CREATE TABLE IF NOT EXISTS "payment_gateways" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(100) NOT NULL,
  "slug" varchar(50) UNIQUE NOT NULL,
  "provider" varchar(50) NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "is_primary" boolean DEFAULT false NOT NULL,
  "supported_countries" text[] NOT NULL,
  "supported_currencies" text[] NOT NULL,
  "supported_methods" jsonb NOT NULL,
  "configuration" jsonb NOT NULL,
  "fees" jsonb NOT NULL,
  "webhook_url" varchar(500),
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create payment_transactions table
CREATE TABLE IF NOT EXISTS "payment_transactions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "gateway_id" uuid NOT NULL,
  "external_id" varchar(255) NOT NULL,
  "amount" numeric(15, 2) NOT NULL,
  "currency" varchar(3) NOT NULL,
  "payment_method" varchar(50) NOT NULL,
  "status" varchar(20) NOT NULL,
  "gateway_status" varchar(50),
  "gateway_response" jsonb,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "processed_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "payment_transactions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT "payment_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT "payment_transactions_gateway_id_payment_gateways_id_fk" FOREIGN KEY ("gateway_id") REFERENCES "payment_gateways"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
);

-- Create payment_methods table
CREATE TABLE IF NOT EXISTS "payment_methods" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "gateway_id" uuid NOT NULL,
  "external_id" varchar(255) NOT NULL,
  "type" varchar(50) NOT NULL,
  "last_four" varchar(4),
  "brand" varchar(50),
  "expiry_month" integer,
  "expiry_year" integer,
  "is_default" boolean DEFAULT false NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "payment_methods_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT "payment_methods_gateway_id_payment_gateways_id_fk" FOREIGN KEY ("gateway_id") REFERENCES "payment_gateways"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
);

-- Create payment_webhooks table
CREATE TABLE IF NOT EXISTS "payment_webhooks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "gateway_id" uuid NOT NULL,
  "external_id" varchar(255) NOT NULL,
  "event_type" varchar(100) NOT NULL,
  "payload" jsonb NOT NULL,
  "signature" varchar(500),
  "processed" boolean DEFAULT false NOT NULL,
  "processed_at" timestamp,
  "error_message" text,
  "retry_count" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "payment_webhooks_gateway_id_payment_gateways_id_fk" FOREIGN KEY ("gateway_id") REFERENCES "payment_gateways"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
);

-- Create payment_refunds table
CREATE TABLE IF NOT EXISTS "payment_refunds" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "transaction_id" uuid NOT NULL,
  "external_id" varchar(255) NOT NULL,
  "amount" numeric(15, 2) NOT NULL,
  "reason" varchar(100),
  "status" varchar(20) NOT NULL,
  "gateway_response" jsonb,
  "processed_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "payment_refunds_transaction_id_payment_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "payment_transactions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
);

-- Create payment_dunning table
CREATE TABLE IF NOT EXISTS "payment_dunning" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "transaction_id" uuid NOT NULL,
  "tenant_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "attempt_count" integer DEFAULT 0 NOT NULL,
  "max_attempts" integer DEFAULT 3 NOT NULL,
  "next_attempt" timestamp NOT NULL,
  "last_attempt" timestamp,
  "status" varchar(20) NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "payment_dunning_transaction_id_payment_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "payment_transactions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT "payment_dunning_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT "payment_dunning_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "idx_payment_transactions_tenant_id" ON "payment_transactions" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_payment_transactions_user_id" ON "payment_transactions" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_payment_transactions_gateway_id" ON "payment_transactions" ("gateway_id");
CREATE INDEX IF NOT EXISTS "idx_payment_transactions_status" ON "payment_transactions" ("status");
CREATE INDEX IF NOT EXISTS "idx_payment_transactions_external_id" ON "payment_transactions" ("external_id");
CREATE INDEX IF NOT EXISTS "idx_payment_transactions_created_at" ON "payment_transactions" ("created_at");

CREATE INDEX IF NOT EXISTS "idx_payment_methods_user_id" ON "payment_methods" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_payment_methods_gateway_id" ON "payment_methods" ("gateway_id");
CREATE INDEX IF NOT EXISTS "idx_payment_methods_is_default" ON "payment_methods" ("is_default");

CREATE INDEX IF NOT EXISTS "idx_payment_webhooks_gateway_id" ON "payment_webhooks" ("gateway_id");
CREATE INDEX IF NOT EXISTS "idx_payment_webhooks_processed" ON "payment_webhooks" ("processed");
CREATE INDEX IF NOT EXISTS "idx_payment_webhooks_created_at" ON "payment_webhooks" ("created_at");

CREATE INDEX IF NOT EXISTS "idx_payment_refunds_transaction_id" ON "payment_refunds" ("transaction_id");
CREATE INDEX IF NOT EXISTS "idx_payment_refunds_status" ON "payment_refunds" ("status");

CREATE INDEX IF NOT EXISTS "idx_payment_dunning_transaction_id" ON "payment_dunning" ("transaction_id");
CREATE INDEX IF NOT EXISTS "idx_payment_dunning_tenant_id" ON "payment_dunning" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_payment_dunning_status" ON "payment_dunning" ("status");
CREATE INDEX IF NOT EXISTS "idx_payment_dunning_next_attempt" ON "payment_dunning" ("next_attempt");

-- Comments for documentation
COMMENT ON TABLE "payment_gateways" IS 'Payment gateway configurations (InfinityPay, Stripe, Banco, etc.)';
COMMENT ON TABLE "payment_transactions" IS 'All payment transactions processed through any gateway';
COMMENT ON TABLE "payment_methods" IS 'Saved payment methods for users (cards, PIX keys, etc.)';
COMMENT ON TABLE "payment_webhooks" IS 'Webhook events received from payment gateways';
COMMENT ON TABLE "payment_refunds" IS 'Refund transactions';
COMMENT ON TABLE "payment_dunning" IS 'Retry logic for failed payments with exponential backoff';
