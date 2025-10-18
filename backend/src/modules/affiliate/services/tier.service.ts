/**
 * Affiliate Tier Service
 */

import { getAffiliateDb } from '../test-helpers/db-access';
import { eq } from 'drizzle-orm';
import logger from '@/utils/logger';
import { NotFoundError } from '@/utils/errors';
import { affiliateTiers, affiliateProfiles, type AffiliateTier } from '../schema/affiliate.schema';
import type { TierUpgradeResult } from '../types/affiliate.types';

export class AffiliateTierService {
  /**
   * Get all active tiers
   */
  static async getAllTiers(): Promise<AffiliateTier[]> {
    return await getAffiliateDb()
      .select()
      .from(affiliateTiers)
      .where(eq(affiliateTiers.isActive, true))
      .orderBy(affiliateTiers.level);
  }

  /**
   * Check and upgrade tier if eligible
   */
  static async checkTierUpgrade(affiliateId: string): Promise<TierUpgradeResult | null> {
    const [profile] = await getAffiliateDb()
      .select()
      .from(affiliateProfiles)
      .where(eq(affiliateProfiles.id, affiliateId))
      .limit(1);

    if (!profile) {
      throw new NotFoundError('Affiliate profile not found');
    }

    const tiers = await this.getAllTiers();
    const currentTier = tiers.find((t) => t.id === profile.tierId);
    const currentLevel = currentTier?.level || 0;

    // Find highest eligible tier
    let eligibleTier: AffiliateTier | null = null;
    for (const tier of tiers.reverse()) {
      if (
        tier.level > currentLevel &&
        profile.totalConversions >= tier.minConversions &&
        parseFloat(profile.totalEarned) >= parseFloat(tier.minRevenue)
      ) {
        eligibleTier = tier;
        break;
      }
    }

    if (!eligibleTier) return null;

    // Upgrade tier
    await getAffiliateDb()
      .update(affiliateProfiles)
      .set({
        tierId: eligibleTier.id,
        tierName: eligibleTier.name,
        updatedAt: new Date(),
      })
      .where(eq(affiliateProfiles.id, affiliateId));

    logger.info('Tier upgraded', {
      affiliateId,
      from: currentTier?.name,
      to: eligibleTier.name,
    });

    return {
      upgraded: true,
      previousTier: currentTier?.name || null,
      newTier: eligibleTier.name,
      tierLevel: eligibleTier.level,
      benefits: {
        commissionRate: parseFloat(eligibleTier.commissionRate),
        bonusRate: parseFloat(eligibleTier.bonusRate || '0'),
        features: eligibleTier.features || {},
      },
    };
  }
}
