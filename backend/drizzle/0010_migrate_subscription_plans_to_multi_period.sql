-- Migration: Transform subscription_plans from single price to multi-period pricing
-- Changes:
-- - Remove: price, billing_period, stripe_price_id
-- - Add: price_monthly, price_quarterly, price_yearly
-- - Add: stripe_price_id_monthly, stripe_price_id_quarterly, stripe_price_id_yearly

-- Step 1: Add new columns
ALTER TABLE "subscription_plans"
ADD COLUMN "price_monthly" numeric(10, 2) DEFAULT '0.00' NOT NULL,
ADD COLUMN "price_quarterly" numeric(10, 2) DEFAULT '0.00' NOT NULL,
ADD COLUMN "price_yearly" numeric(10, 2) DEFAULT '0.00' NOT NULL,
ADD COLUMN "stripe_price_id_monthly" varchar(255),
ADD COLUMN "stripe_price_id_quarterly" varchar(255),
ADD COLUMN "stripe_price_id_yearly" varchar(255);

-- Step 2: Migrate existing data
-- For existing records, copy price to price_monthly
UPDATE "subscription_plans"
SET "price_monthly" = "price"
WHERE "billing_period" = 'monthly';

UPDATE "subscription_plans"
SET "price_yearly" = "price"
WHERE "billing_period" = 'yearly';

-- Copy stripe_price_id to appropriate column based on billing_period
UPDATE "subscription_plans"
SET "stripe_price_id_monthly" = "stripe_price_id"
WHERE "billing_period" = 'monthly';

UPDATE "subscription_plans"
SET "stripe_price_id_yearly" = "stripe_price_id"
WHERE "billing_period" = 'yearly';

-- Step 3: Remove old columns
ALTER TABLE "subscription_plans"
DROP COLUMN "price",
DROP COLUMN "billing_period",
DROP COLUMN "stripe_price_id";

-- Step 4: If there are duplicates (same plan with different billing periods),
-- we need to consolidate them into single records with all three prices.
-- This is handled at application level during seeding.
