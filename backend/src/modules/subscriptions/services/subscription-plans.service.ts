/**
 * Subscription Plans Service
 * Manages subscription plans CRUD operations
 */

import { db } from '@/db';
import { eq, and, or, desc, asc, ilike, gte, sql, isNotNull } from 'drizzle-orm';
import { subscriptionPlans, subscriptionFeatures } from '../schema/subscription-plans.schema';
import type {
  SubscriptionPlan,
  CreateSubscriptionPlanDTO,
  UpdateSubscriptionPlanDTO,
  SubscriptionFeature,
  CreateSubscriptionFeatureDTO,
  UpdateSubscriptionFeatureDTO,
  SubscriptionQueryFilter,
} from '../types';
import { BadRequestError, NotFoundError } from '@/utils/errors';
import logger from '@/utils/logger';

export class SubscriptionPlansService {
  // ============================================
  // PLANS CRUD
  // ============================================

  /**
   * Get all subscription plans with optional filters
   */
  async getAllPlans(filters?: SubscriptionQueryFilter): Promise<SubscriptionPlan[]> {
    try {
      let query = db.select().from(subscriptionPlans);

      // Apply filters
      const conditions = [];

      if (filters?.planId) {
        conditions.push(eq(subscriptionPlans.id, filters.planId));
      }

      if (filters?.status) {
        conditions.push(eq(subscriptionPlans.slug, filters.status));
      }

      if (filters?.isActive !== undefined) {
        conditions.push(eq(subscriptionPlans.isActive, filters.isActive));
      }

      if (filters?.search) {
        conditions.push(
          or(
            ilike(subscriptionPlans.name, `%${filters.search}%`),
            ilike(subscriptionPlans.displayName, `%${filters.search}%`),
            ilike(subscriptionPlans.description, `%${filters.search}%`)
          )
        );
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as typeof query;
      }

      // Apply sorting
      const sortField = filters?.sortBy || 'sortOrder';
      const sortDirection = filters?.sortOrder || 'asc';

      if (sortField === 'price') {
        // Sort by monthly price as default price reference
        query = (sortDirection === 'asc'
          ? query.orderBy(asc(subscriptionPlans.priceMonthly))
          : query.orderBy(desc(subscriptionPlans.priceMonthly))) as typeof query;
      } else if (sortField === 'createdAt') {
        query = (sortDirection === 'asc'
          ? query.orderBy(asc(subscriptionPlans.createdAt))
          : query.orderBy(desc(subscriptionPlans.createdAt))) as typeof query;
      } else {
        query = query.orderBy(asc(subscriptionPlans.sortOrder)) as typeof query;
      }

      const plans = await query;

      logger.info(`Retrieved ${plans.length} subscription plans`, { filters });
      return plans;
    } catch (error) {
      logger.error('Error getting subscription plans:', error);
      throw error;
    }
  }

  /**
   * Get plan by ID
   */
  async getPlanById(planId: string): Promise<SubscriptionPlan> {
    try {
      const [plan] = await db
        .select()
        .from(subscriptionPlans)
        .where(eq(subscriptionPlans.id, planId))
        .limit(1);

      if (!plan) {
        throw new NotFoundError(`Subscription plan not found: ${planId}`);
      }

      return plan;
    } catch (error) {
      logger.error('Error getting plan by ID:', error);
      throw error;
    }
  }

  /**
   * Get plan by slug (free, pro, enterprise)
   */
  async getPlanBySlug(slug: string): Promise<SubscriptionPlan> {
    try {
      const [plan] = await db
        .select()
        .from(subscriptionPlans)
        .where(eq(subscriptionPlans.slug, slug))
        .limit(1);

      if (!plan) {
        throw new NotFoundError(`Subscription plan not found: ${slug}`);
      }

      return plan;
    } catch (error) {
      logger.error('Error getting plan by slug:', error);
      throw error;
    }
  }

  /**
   * Get public plans (visible in pricing page)
   */
  async getPublicPlans(): Promise<SubscriptionPlan[]> {
    try {
      const plans = await db
        .select()
        .from(subscriptionPlans)
        .where(and(eq(subscriptionPlans.isPublic, true), eq(subscriptionPlans.isActive, true)))
        .orderBy(asc(subscriptionPlans.sortOrder));

      return plans;
    } catch (error) {
      logger.error('Error getting public plans:', error);
      throw error;
    }
  }

  /**
   * Get featured plan
   */
  async getFeaturedPlan(): Promise<SubscriptionPlan | null> {
    try {
      const [plan] = await db
        .select()
        .from(subscriptionPlans)
        .where(
          and(
            eq(subscriptionPlans.isFeatured, true),
            eq(subscriptionPlans.isActive, true),
            eq(subscriptionPlans.isPublic, true)
          )
        )
        .limit(1);

      return plan || null;
    } catch (error) {
      logger.error('Error getting featured plan:', error);
      throw error;
    }
  }

  /**
   * Create new subscription plan
   */
  async createPlan(data: CreateSubscriptionPlanDTO): Promise<SubscriptionPlan> {
    try {
      // Validate slug uniqueness
      const existing = await db
        .select()
        .from(subscriptionPlans)
        .where(or(eq(subscriptionPlans.slug, data.slug), eq(subscriptionPlans.name, data.name)))
        .limit(1);

      if (existing.length > 0) {
        throw new BadRequestError(`Plan with slug '${data.slug}' or name '${data.name}' already exists`);
      }

      const [newPlan] = await db
        .insert(subscriptionPlans)
        .values(data)
        .returning();

      logger.info(`Created new subscription plan: ${newPlan.displayName} (${newPlan.slug})`, {
        planId: newPlan.id,
      });

      return newPlan;
    } catch (error) {
      logger.error('Error creating subscription plan:', error);
      throw error;
    }
  }

  /**
   * Update subscription plan
   */
  async updatePlan(planId: string, data: UpdateSubscriptionPlanDTO): Promise<SubscriptionPlan> {
    try {
      // Check if plan exists
      await this.getPlanById(planId);

      const [updatedPlan] = await db
        .update(subscriptionPlans)
        .set(data as any)
        .where(eq(subscriptionPlans.id, planId))
        .returning();

      logger.info(`Updated subscription plan: ${updatedPlan.displayName}`, { planId });

      return updatedPlan;
    } catch (error) {
      logger.error('Error updating subscription plan:', error);
      throw error;
    }
  }

  /**
   * Delete subscription plan (soft delete by setting isActive = false)
   */
  async deletePlan(planId: string): Promise<void> {
    try {
      const plan = await this.getPlanById(planId);

      // Soft delete
      await db
        .update(subscriptionPlans)
        .set({ isActive: false })
        .where(eq(subscriptionPlans.id, planId));

      logger.info(`Deleted subscription plan: ${plan.displayName}`, { planId });
    } catch (error) {
      logger.error('Error deleting subscription plan:', error);
      throw error;
    }
  }

  // ============================================
  // FEATURES CRUD
  // ============================================

  /**
   * Get all features
   */
  async getAllFeatures(category?: string): Promise<SubscriptionFeature[]> {
    try {
      let query = db.select().from(subscriptionFeatures).orderBy(asc(subscriptionFeatures.sortOrder));

      if (category) {
        query = query.where(eq(subscriptionFeatures.category, category)) as typeof query;
      }

      const features = await query;
      return features;
    } catch (error) {
      logger.error('Error getting features:', error);
      throw error;
    }
  }

  /**
   * Get feature by ID
   */
  async getFeatureById(featureId: string): Promise<SubscriptionFeature> {
    try {
      const [feature] = await db
        .select()
        .from(subscriptionFeatures)
        .where(eq(subscriptionFeatures.id, featureId))
        .limit(1);

      if (!feature) {
        throw new NotFoundError(`Feature not found: ${featureId}`);
      }

      return feature;
    } catch (error) {
      logger.error('Error getting feature by ID:', error);
      throw error;
    }
  }

  /**
   * Get feature by slug
   */
  async getFeatureBySlug(slug: string): Promise<SubscriptionFeature> {
    try {
      const [feature] = await db
        .select()
        .from(subscriptionFeatures)
        .where(eq(subscriptionFeatures.slug, slug))
        .limit(1);

      if (!feature) {
        throw new NotFoundError(`Feature not found: ${slug}`);
      }

      return feature;
    } catch (error) {
      logger.error('Error getting feature by slug:', error);
      throw error;
    }
  }

  /**
   * Get features by category
   */
  async getFeaturesByCategory(category: string): Promise<SubscriptionFeature[]> {
    try {
      const features = await db
        .select()
        .from(subscriptionFeatures)
        .where(eq(subscriptionFeatures.category, category))
        .orderBy(asc(subscriptionFeatures.sortOrder));

      return features;
    } catch (error) {
      logger.error('Error getting features by category:', error);
      throw error;
    }
  }

  /**
   * Create new feature
   */
  async createFeature(data: CreateSubscriptionFeatureDTO): Promise<SubscriptionFeature> {
    try {
      // Validate slug uniqueness
      const existing = await db
        .select()
        .from(subscriptionFeatures)
        .where(or(eq(subscriptionFeatures.slug, data.slug), eq(subscriptionFeatures.name, data.name)))
        .limit(1);

      if (existing.length > 0) {
        throw new BadRequestError(`Feature with slug '${data.slug}' or name '${data.name}' already exists`);
      }

      const [newFeature] = await db
        .insert(subscriptionFeatures)
        .values(data)
        .returning();

      logger.info(`Created new feature: ${newFeature.displayName} (${newFeature.slug})`, {
        featureId: newFeature.id,
      });

      return newFeature;
    } catch (error) {
      logger.error('Error creating feature:', error);
      throw error;
    }
  }

  /**
   * Update feature
   */
  async updateFeature(featureId: string, data: UpdateSubscriptionFeatureDTO): Promise<SubscriptionFeature> {
    try {
      // Check if feature exists
      await this.getFeatureById(featureId);

      const [updatedFeature] = await db
        .update(subscriptionFeatures)
        .set(data)
        .where(eq(subscriptionFeatures.id, featureId))
        .returning();

      logger.info(`Updated feature: ${updatedFeature.displayName}`, { featureId });

      return updatedFeature;
    } catch (error) {
      logger.error('Error updating feature:', error);
      throw error;
    }
  }

  /**
   * Delete feature
   */
  async deleteFeature(featureId: string): Promise<void> {
    try {
      const feature = await this.getFeatureById(featureId);

      await db.delete(subscriptionFeatures).where(eq(subscriptionFeatures.id, featureId));

      logger.info(`Deleted feature: ${feature.displayName}`, { featureId });
    } catch (error) {
      logger.error('Error deleting feature:', error);
      throw error;
    }
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Get plan features with details
   */
  async getPlanFeaturesWithDetails(planId: string): Promise<SubscriptionFeature[]> {
    try {
      const plan = await this.getPlanById(planId);

      if (!plan.features || plan.features.length === 0) {
        return [];
      }

      // Get all features
      const allFeatures = await this.getAllFeatures();

      // Filter features that are in the plan
      const planFeatures = allFeatures.filter((feature) => {
        return Array.isArray(plan.features) && plan.features.includes(feature.slug);
      });

      return planFeatures;
    } catch (error) {
      logger.error('Error getting plan features:', error);
      throw error;
    }
  }

  /**
   * Check if plan has specific feature
   */
  async planHasFeature(planId: string, featureSlug: string): Promise<boolean> {
    try {
      const plan = await this.getPlanById(planId);

      if (!plan.features || !Array.isArray(plan.features)) {
        return false;
      }

      return plan.features.includes(featureSlug);
    } catch (error) {
      logger.error('Error checking plan feature:', error);
      throw error;
    }
  }

  /**
   * Compare two plans (for upgrade/downgrade UI)
   */
  async comparePlans(planId1: string, planId2: string): Promise<{
    plan1: SubscriptionPlan;
    plan2: SubscriptionPlan;
    priceDifference: number;
    featuresOnlyInPlan1: string[];
    featuresOnlyInPlan2: string[];
    sharedFeatures: string[];
  }> {
    try {
      const plan1 = await this.getPlanById(planId1);
      const plan2 = await this.getPlanById(planId2);

      const features1 = Array.isArray(plan1.features) ? plan1.features : [];
      const features2 = Array.isArray(plan2.features) ? plan2.features : [];

      const featuresOnlyInPlan1 = features1.filter((f) => !features2.includes(f));
      const featuresOnlyInPlan2 = features2.filter((f) => !features1.includes(f));
      const sharedFeatures = features1.filter((f) => features2.includes(f));

      // Compare monthly prices by default
      const price1 = parseFloat(plan1.priceMonthly);
      const price2 = parseFloat(plan2.priceMonthly);
      const priceDifference = price2 - price1;

      return {
        plan1,
        plan2,
        priceDifference,
        featuresOnlyInPlan1,
        featuresOnlyInPlan2,
        sharedFeatures,
      };
    } catch (error) {
      logger.error('Error comparing plans:', error);
      throw error;
    }
  }

  /**
   * Get subscription analytics (MRR, ARR, churn, active subscriptions, etc.)
   */
  async getSubscriptionAnalytics(): Promise<any> {
    try {
      // Import tenantSubscriptionPlans here to avoid circular dependency
      const { tenantSubscriptionPlans } = await import('../schema/subscription-plans.schema');

      // Get all active subscriptions
      const activeSubscriptions = await db
        .select()
        .from(tenantSubscriptionPlans)
        .where(eq(tenantSubscriptionPlans.status, 'active'));

      // Get subscriptions by status
      const subscriptionsByStatus = await db
        .select({
          status: tenantSubscriptionPlans.status,
          count: sql<number>`cast(count(*) as int)`,
        })
        .from(tenantSubscriptionPlans)
        .groupBy(tenantSubscriptionPlans.status);

      // Calculate MRR (Monthly Recurring Revenue) and plan breakdown
      let mrr = 0;
      const planRevenueMap = new Map<string, { count: number; mrr: number; planName: string; planSlug: string }>();

      for (const subscription of activeSubscriptions) {
        const plan = await this.getPlanById(subscription.planId);

        // Get price based on subscription's billing period
        let monthlyRevenue = 0;
        if (subscription.billingPeriod === 'monthly') {
          monthlyRevenue = parseFloat(plan.priceMonthly);
        } else if (subscription.billingPeriod === 'quarterly') {
          monthlyRevenue = parseFloat(plan.priceQuarterly) / 3;
        } else if (subscription.billingPeriod === 'yearly') {
          monthlyRevenue = parseFloat(plan.priceYearly) / 12;
        }

        mrr += monthlyRevenue;

        // Track MRR per plan
        const existing = planRevenueMap.get(subscription.planId);
        if (existing) {
          existing.count += 1;
          existing.mrr += monthlyRevenue;
        } else {
          planRevenueMap.set(subscription.planId, {
            count: 1,
            mrr: monthlyRevenue,
            planName: plan.displayName,
            planSlug: plan.slug,
          });
        }
      }

      // Calculate ARR (Annual Recurring Revenue)
      const arr = mrr * 12;

      // Convert plan revenue map to array
      const planBreakdown = Array.from(planRevenueMap.entries()).map(([planId, data]) => ({
        planId,
        planName: data.planName,
        planSlug: data.planSlug,
        count: data.count,
        revenue: Math.round(data.mrr * 100) / 100, // MRR for this plan
      }));

      // Calculate churn (canceled in last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const canceledLast30Days = await db
        .select({
          count: sql<number>`cast(count(*) as int)`,
        })
        .from(tenantSubscriptionPlans)
        .where(
          and(
            eq(tenantSubscriptionPlans.status, 'canceled'),
            isNotNull(tenantSubscriptionPlans.canceledAt), gte(tenantSubscriptionPlans.canceledAt, thirtyDaysAgo)
          )
        );

      const totalActive = activeSubscriptions.length;
      const churnCount = canceledLast30Days[0]?.count || 0;
      const churnRate = totalActive > 0 ? (churnCount / (totalActive + churnCount)) * 100 : 0;

      return {
        revenue: {
          mrr: Math.round(mrr * 100) / 100,
          arr: Math.round(arr * 100) / 100,
          currency: 'BRL',
        },
        subscriptions: {
          total: activeSubscriptions.length + churnCount,
          active: activeSubscriptions.length,
          trialing: subscriptionsByStatus.find((s) => s.status === 'trialing')?.count || 0,
          pastDue: subscriptionsByStatus.find((s) => s.status === 'past_due')?.count || 0,
          canceled: subscriptionsByStatus.find((s) => s.status === 'canceled')?.count || 0,
        },
        churn: {
          rate: Math.round(churnRate * 100) / 100,
          count: churnCount,
          period: 'last_30_days',
        },
        planBreakdown,
        generatedAt: new Date(),
      };
    } catch (error) {
      logger.error('Error getting subscription analytics:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const subscriptionPlansService = new SubscriptionPlansService();
