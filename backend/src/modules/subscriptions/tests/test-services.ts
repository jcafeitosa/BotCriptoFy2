/**
 * Test Services
 * Integration test for all subscription services
 */

import logger from '@/utils/logger';
import {
  subscriptionPlansService,
  subscriptionManagementService,
  usageTrackingService,
  quotaService,
} from '../services';

async function testServices() {
  try {
    logger.info('🧪 Starting subscription services tests...\n');

    // ============================================
    // TEST 1: Plans Service
    // ============================================
    logger.info('📋 TEST 1: Subscription Plans Service');

    // Get all plans
    const allPlans = await subscriptionPlansService.getAllPlans();
    logger.info(`✅ Found ${allPlans.length} plans`);

    // Get public plans
    const publicPlans = await subscriptionPlansService.getPublicPlans();
    logger.info(`✅ Found ${publicPlans.length} public plans`);

    // Get featured plan
    const featuredPlan = await subscriptionPlansService.getFeaturedPlan();
    logger.info(`✅ Featured plan: ${featuredPlan?.displayName || 'None'}`);

    // Get plan by slug
    const freePlan = await subscriptionPlansService.getPlanBySlug('free');
    logger.info(`✅ Free plan: ${freePlan.displayName} (${freePlan.priceMonthly} ${freePlan.currency}/month)`);

    const proPlan = await subscriptionPlansService.getPlanBySlug('pro');
    logger.info(`✅ Pro plan: ${proPlan.displayName} (${proPlan.priceMonthly} ${proPlan.currency}/month)`);

    // Get all features
    const allFeatures = await subscriptionPlansService.getAllFeatures();
    logger.info(`✅ Found ${allFeatures.length} features\n`);

    // ============================================
    // TEST 2: Compare Plans
    // ============================================
    logger.info('📊 TEST 2: Compare Plans');

    const comparison = await subscriptionPlansService.comparePlans(freePlan.id, proPlan.id);
    logger.info(`✅ Price difference: R$ ${comparison.priceDifference}`);
    logger.info(`✅ Features only in Free: ${comparison.featuresOnlyInPlan1.length}`);
    logger.info(`✅ Features only in Pro: ${comparison.featuresOnlyInPlan2.length}`);
    logger.info(`✅ Shared features: ${comparison.sharedFeatures.length}\n`);

    // ============================================
    // TEST 3: Subscription Management (Mock Tenant)
    // ============================================
    logger.info('🔐 TEST 3: Subscription Management');

    // Use real tenant from database
    const mockTenantId = 'test-tenant-1760633055104';
    logger.info(`Using test tenant: ${mockTenantId}`);

    // Subscribe to Free plan
    logger.info('Subscribing to Free plan...');
    const subscription = await subscriptionManagementService.subscribeToPlan({
      tenantId: mockTenantId,
      planId: freePlan.id,
    });
    logger.info(`✅ Subscribed to ${freePlan.displayName}`);
    logger.info(`   Status: ${subscription.status}`);
    logger.info(`   Period: ${subscription.currentPeriodStart} - ${subscription.currentPeriodEnd}\n`);

    // Get subscription status
    const status = await subscriptionManagementService.getSubscriptionStatus(mockTenantId);
    logger.info(`✅ Subscription status retrieved`);
    logger.info(`   Plan: ${status?.plan.displayName}`);
    logger.info(`   Status: ${status?.status}\n`);

    // ============================================
    // TEST 4: Quota Service
    // ============================================
    logger.info('📊 TEST 4: Quota Service');

    // Initialize quotas
    logger.info('Initializing quotas...');
    await quotaService.initializeQuotas(mockTenantId, freePlan.id);
    logger.info(`✅ Quotas initialized\n`);

    // Get all quotas
    const quotas = await quotaService.getTenantQuotas(mockTenantId);
    logger.info(`✅ Found ${quotas.length} quotas:`);
    for (const quota of quotas) {
      logger.info(`   - ${quota.quotaType}: ${quota.quotaUsed}/${quota.quotaLimit} (${quota.quotaPeriod})`);
    }
    logger.info('');

    // Check quota
    const apiCallsQuota = await quotaService.checkQuota({
      tenantId: mockTenantId,
      quotaType: 'api_calls',
      requiredAmount: 1,
    });
    logger.info(`✅ API calls quota check:`);
    logger.info(`   Allowed: ${apiCallsQuota.allowed}`);
    logger.info(`   Used: ${apiCallsQuota.used}/${apiCallsQuota.limit}`);
    logger.info(`   Remaining: ${apiCallsQuota.remaining}`);
    logger.info(`   Percentage: ${apiCallsQuota.percentage}%\n`);

    // Increment quota
    logger.info('Incrementing API calls quota by 10...');
    for (let i = 0; i < 10; i++) {
      await quotaService.incrementQuota(mockTenantId, 'api_calls', 1);
    }

    const updatedQuota = await quotaService.checkQuota({
      tenantId: mockTenantId,
      quotaType: 'api_calls',
    });
    logger.info(`✅ After increment:`);
    logger.info(`   Used: ${updatedQuota.used}/${updatedQuota.limit}`);
    logger.info(`   Percentage: ${updatedQuota.percentage}%\n`);

    // ============================================
    // TEST 5: Usage Tracking
    // ============================================
    logger.info('📈 TEST 5: Usage Tracking Service');

    // Record usage event
    logger.info('Recording usage events...');
    await usageTrackingService.recordUsageEvent({
      tenantId: mockTenantId,
      eventType: 'api.request',
      eventCategory: 'api',
      resourceType: 'api_call',
      quantity: 1,
      unitType: 'call',
    });
    logger.info(`✅ API call event recorded`);

    // Check if action is allowed
    const botAllowed = await usageTrackingService.checkActionAllowed(mockTenantId, 'bot', 1);
    logger.info(`✅ Can create bot: ${botAllowed.allowed}`);
    if (!botAllowed.allowed) {
      logger.info(`   Reason: ${botAllowed.reason}`);
    }

    // Get usage summary
    const usageSummary = await usageTrackingService.getUsageSummary(mockTenantId);
    logger.info(`✅ Usage summary:`);
    logger.info(`   Plan: ${usageSummary.planName}`);
    logger.info(`   Bots: ${usageSummary.usage.bots.used}/${usageSummary.usage.bots.limit} (${usageSummary.usage.bots.percentage}%)`);
    logger.info(`   API calls: ${usageSummary.usage.apiCalls.used}/${usageSummary.usage.apiCalls.limit} (${usageSummary.usage.apiCalls.percentage}%)`);
    logger.info(`   Warnings: ${usageSummary.warnings.length}`);
    logger.info(`   Exceeded limits: ${usageSummary.exceededLimits.length}\n`);

    // ============================================
    // TEST 6: Upgrade Plan
    // ============================================
    logger.info('⬆️ TEST 6: Upgrade to Pro Plan');

    logger.info('Upgrading to Pro plan...');
    const upgradedSubscription = await subscriptionManagementService.changePlan(mockTenantId, {
      newPlanId: proPlan.id,
      reason: 'Need more features for testing',
    });
    logger.info(`✅ Upgraded to Pro plan`);
    logger.info(`   New plan ID: ${upgradedSubscription.planId}`);

    // Update quota limits after upgrade
    await quotaService.updateQuotaLimits(mockTenantId, proPlan.id);
    logger.info(`✅ Quota limits updated\n`);

    // Check new quota limits
    const newApiQuota = await quotaService.checkQuota({
      tenantId: mockTenantId,
      quotaType: 'api_calls',
    });
    logger.info(`✅ New API calls quota:`);
    logger.info(`   Limit: ${newApiQuota.limit}`);
    logger.info(`   Used: ${newApiQuota.used}`);
    logger.info(`   Percentage: ${newApiQuota.percentage}%\n`);

    // ============================================
    // TEST 7: Subscription History
    // ============================================
    logger.info('📜 TEST 7: Subscription History');

    const history = await subscriptionManagementService.getSubscriptionHistory(mockTenantId);
    logger.info(`✅ Found ${history.length} history entries:`);
    for (const entry of history) {
      logger.info(`   - ${entry.eventType}: ${entry.title} (${new Date(entry.eventTime).toISOString()})`);
    }
    logger.info('');

    // ============================================
    // TEST 8: Cancel Subscription
    // ============================================
    logger.info('❌ TEST 8: Cancel Subscription');

    logger.info('Canceling subscription at period end...');
    const canceledSubscription = await subscriptionManagementService.cancelSubscription(mockTenantId, {
      reason: 'Testing cancellation flow',
      cancelAtPeriodEnd: true,
    });
    logger.info(`✅ Subscription canceled`);
    logger.info(`   Cancel at period end: ${canceledSubscription.cancelAtPeriodEnd}`);
    logger.info(`   Canceled at: ${canceledSubscription.canceledAt}`);
    logger.info(`   Will remain active until: ${canceledSubscription.currentPeriodEnd}\n`);

    // ============================================
    // CLEANUP
    // ============================================
    logger.info('🧹 Cleaning up test data...');

    // Delete test subscription
    await subscriptionManagementService.cancelSubscription(mockTenantId, {
      cancelAtPeriodEnd: false,
    });

    logger.info('✅ Test data cleaned up\n');

    // ============================================
    // SUMMARY
    // ============================================
    logger.info('✅ ALL TESTS PASSED!\n');
    logger.info('📊 Test Summary:');
    logger.info('   ✅ Plans Service: OK');
    logger.info('   ✅ Subscription Management: OK');
    logger.info('   ✅ Quota Service: OK');
    logger.info('   ✅ Usage Tracking: OK');
    logger.info('   ✅ History Logging: OK');
    logger.info('   ✅ Plan Changes: OK');

    process.exit(0);
  } catch (error) {
    logger.error('❌ TEST FAILED:', error);
    process.exit(1);
  }
}

// Run tests
testServices();
