/**
 * Run Subscriptions Seed
 * Populates database with initial subscription plans and features
 */

import { db } from '@/db';
import { subscriptionPlans, subscriptionFeatures } from '../schema/subscription-plans.schema';
import { subscriptionFeaturesSeed, subscriptionPlansSeed } from './subscription-plans.seed';
import logger from '@/utils/logger';

async function runSeed() {
  try {
    logger.info('🌱 Starting subscriptions seed...');

    // 1. Insert Features
    logger.info(`📝 Inserting ${subscriptionFeaturesSeed.length} features...`);
    const insertedFeatures = await db
      .insert(subscriptionFeatures)
      .values(subscriptionFeaturesSeed)
      .returning();
    logger.info(`✅ Inserted ${insertedFeatures.length} features`);

    // 2. Insert Plans
    logger.info(`📝 Inserting ${subscriptionPlansSeed.length} plans...`);
    const insertedPlans = await db
      .insert(subscriptionPlans)
      .values(subscriptionPlansSeed)
      .returning();
    logger.info(`✅ Inserted ${insertedPlans.length} plans`);

    // 3. Show summary
    logger.info('📊 Seed Summary:');
    for (const plan of insertedPlans) {
      const featureCount = Array.isArray(plan.features) ? plan.features.length : 0;
      logger.info(`  - ${plan.displayName} (${plan.slug}): R$ ${plan.priceMonthly}/mês | R$ ${plan.priceQuarterly}/trimestre | R$ ${plan.priceYearly}/ano - ${featureCount} features`);
    }

    logger.info('✅ Seed completed successfully!');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Seed failed:', error);
    process.exit(1);
  }
}

// Run seed
runSeed();
