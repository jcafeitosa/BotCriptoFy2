-- Manual migration: Create subscription tables with correct types (text for tenant_id and user_id)
-- Based on 0008 but with corrected foreign key types

-- Ensure pgcrypto is available for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS "subscription_features" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"display_name" varchar(100) NOT NULL,
	"description" text,
	"slug" varchar(50) NOT NULL,
	"category" varchar(50) NOT NULL,
	"is_core" boolean DEFAULT false NOT NULL,
	"is_premium" boolean DEFAULT false NOT NULL,
	"is_enterprise" boolean DEFAULT false NOT NULL,
	"icon" varchar(50),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscription_features_name_unique" UNIQUE("name"),
	CONSTRAINT "subscription_features_slug_unique" UNIQUE("slug")
);

CREATE TABLE IF NOT EXISTS "subscription_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"display_name" varchar(100) NOT NULL,
	"description" text,
	"slug" varchar(50) NOT NULL,
	"price" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"currency" varchar(3) DEFAULT 'BRL' NOT NULL,
	"billing_period" varchar(20) DEFAULT 'monthly' NOT NULL,
	"stripe_product_id" varchar(255),
	"stripe_price_id" varchar(255),
	"limits" jsonb NOT NULL,
	"features" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_public" boolean DEFAULT true NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"trial_days" integer DEFAULT 0 NOT NULL,
	"trial_price" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscription_plans_name_unique" UNIQUE("name"),
	CONSTRAINT "subscription_plans_slug_unique" UNIQUE("slug")
);

CREATE TABLE IF NOT EXISTS "tenant_subscription_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"plan_id" uuid NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"stripe_subscription_id" varchar(255),
	"stripe_customer_id" varchar(255),
	"current_period_start" timestamp with time zone,
	"current_period_end" timestamp with time zone,
	"trial_start" timestamp with time zone,
	"trial_end" timestamp with time zone,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"canceled_at" timestamp with time zone,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "subscription_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"plan_id" uuid NOT NULL,
	"usage_date" date NOT NULL,
	"usage_month" varchar(7) NOT NULL,
	"active_bots" integer DEFAULT 0 NOT NULL,
	"active_strategies" integer DEFAULT 0 NOT NULL,
	"backtests_run" integer DEFAULT 0 NOT NULL,
	"active_exchanges" integer DEFAULT 0 NOT NULL,
	"orders_placed" integer DEFAULT 0 NOT NULL,
	"alerts_created" integer DEFAULT 0 NOT NULL,
	"api_calls" integer DEFAULT 0 NOT NULL,
	"webhook_calls" integer DEFAULT 0 NOT NULL,
	"websocket_connections" integer DEFAULT 0 NOT NULL,
	"storage_used_mb" integer DEFAULT 0 NOT NULL,
	"ai_model_calls" integer DEFAULT 0 NOT NULL,
	"report_generated" integer DEFAULT 0 NOT NULL,
	"export_actions" integer DEFAULT 0 NOT NULL,
	"limits_exceeded" jsonb DEFAULT '[]'::jsonb,
	"warnings_sent" boolean DEFAULT false NOT NULL,
	"warnings_sent_at" timestamp with time zone,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "subscription_usage_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"usage_id" uuid,
	"event_type" varchar(50) NOT NULL,
	"event_category" varchar(50) NOT NULL,
	"resource_type" varchar(50) NOT NULL,
	"resource_id" varchar(255),
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_type" varchar(50) NOT NULL,
	"status" varchar(20) DEFAULT 'success' NOT NULL,
	"blocked_reason" text,
	"user_id" text,
	"ip_address" varchar(45),
	"user_agent" text,
	"endpoint" varchar(255),
	"metadata" jsonb,
	"event_time" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "subscription_quotas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"plan_id" uuid NOT NULL,
	"quota_type" varchar(50) NOT NULL,
	"quota_period" varchar(20) NOT NULL,
	"quota_limit" integer NOT NULL,
	"quota_used" integer DEFAULT 0 NOT NULL,
	"is_exceeded" boolean DEFAULT false NOT NULL,
	"exceeded_at" timestamp with time zone,
	"current_period_start" timestamp with time zone NOT NULL,
	"current_period_end" timestamp with time zone NOT NULL,
	"next_reset_at" timestamp with time zone NOT NULL,
	"soft_limit_percentage" integer DEFAULT 80 NOT NULL,
	"soft_limit_reached" boolean DEFAULT false NOT NULL,
	"soft_limit_reached_at" timestamp with time zone,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "subscription_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"plan_id" uuid,
	"previous_plan_id" uuid,
	"user_id" text,
	"event_type" varchar(50) NOT NULL,
	"event_category" varchar(50) NOT NULL,
	"event_source" varchar(50) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"old_status" varchar(20),
	"new_status" varchar(20),
	"old_price" numeric(10, 2),
	"new_price" numeric(10, 2),
	"currency" varchar(3) DEFAULT 'BRL',
	"stripe_event_id" varchar(255),
	"stripe_subscription_id" varchar(255),
	"stripe_invoice_id" varchar(255),
	"stripe_payment_intent_id" varchar(255),
	"amount" numeric(10, 2),
	"amount_refunded" numeric(10, 2),
	"reason" text,
	"notes" text,
	"ip_address" varchar(45),
	"user_agent" text,
	"is_success" boolean DEFAULT true NOT NULL,
	"error_message" text,
	"error_code" varchar(50),
	"metadata" jsonb,
	"event_time" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "subscription_invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"plan_id" uuid,
	"stripe_invoice_id" varchar(255) NOT NULL,
	"stripe_subscription_id" varchar(255),
	"stripe_customer_id" varchar(255) NOT NULL,
	"stripe_payment_intent_id" varchar(255),
	"invoice_number" varchar(100),
	"status" varchar(20) NOT NULL,
	"subtotal" numeric(10, 2) NOT NULL,
	"tax" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"total" numeric(10, 2) NOT NULL,
	"amount_paid" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"amount_due" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"amount_remaining" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"currency" varchar(3) DEFAULT 'BRL' NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"due_date" timestamp with time zone,
	"paid" boolean DEFAULT false NOT NULL,
	"paid_at" timestamp with time zone,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"next_payment_attempt" timestamp with time zone,
	"invoice_pdf_url" text,
	"hosted_invoice_url" text,
	"last_finalization_error" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscription_invoices_stripe_invoice_id_unique" UNIQUE("stripe_invoice_id")
);

CREATE TABLE "subscription_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"user_id" text,
	"notification_type" varchar(50) NOT NULL,
	"notification_category" varchar(50) NOT NULL,
	"priority" varchar(20) DEFAULT 'normal' NOT NULL,
	"title" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"action_url" text,
	"action_label" varchar(100),
	"is_read" boolean DEFAULT false NOT NULL,
	"read_at" timestamp with time zone,
	"is_sent" boolean DEFAULT false NOT NULL,
	"sent_at" timestamp with time zone,
	"channels" jsonb DEFAULT '["in_app"]'::jsonb NOT NULL,
	"email_sent" boolean DEFAULT false NOT NULL,
	"email_sent_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Add foreign key constraints
ALTER TABLE "tenant_subscription_plans" ADD CONSTRAINT "tenant_subscription_plans_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "tenant_subscription_plans" ADD CONSTRAINT "tenant_subscription_plans_plan_id_subscription_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plans"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "subscription_usage" ADD CONSTRAINT "subscription_usage_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "subscription_usage" ADD CONSTRAINT "subscription_usage_plan_id_subscription_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plans"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "subscription_usage_events" ADD CONSTRAINT "subscription_usage_events_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "subscription_usage_events" ADD CONSTRAINT "subscription_usage_events_usage_id_subscription_usage_id_fk" FOREIGN KEY ("usage_id") REFERENCES "public"."subscription_usage"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "subscription_quotas" ADD CONSTRAINT "subscription_quotas_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "subscription_quotas" ADD CONSTRAINT "subscription_quotas_plan_id_subscription_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plans"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "subscription_history" ADD CONSTRAINT "subscription_history_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "subscription_history" ADD CONSTRAINT "subscription_history_plan_id_subscription_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plans"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "subscription_history" ADD CONSTRAINT "subscription_history_previous_plan_id_subscription_plans_id_fk" FOREIGN KEY ("previous_plan_id") REFERENCES "public"."subscription_plans"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "subscription_history" ADD CONSTRAINT "subscription_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "subscription_invoices" ADD CONSTRAINT "subscription_invoices_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "subscription_invoices" ADD CONSTRAINT "subscription_invoices_plan_id_subscription_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plans"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "subscription_notifications" ADD CONSTRAINT "subscription_notifications_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "subscription_notifications" ADD CONSTRAINT "subscription_notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
