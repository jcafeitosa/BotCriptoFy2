/**
 * Affiliate Referral Service
 * Manages referrals and click tracking
 */

import { getAffiliateDb } from '../test-helpers/db-access';
import { eq, and, desc, sql, inArray, gte, lte } from 'drizzle-orm';
import logger from '@/utils/logger';
import { NotFoundError } from '@/utils/errors';
import {
  affiliateReferrals,
  affiliateClicks,
  affiliateProfiles,
  type AffiliateReferral,
  type NewAffiliateReferral,
  type AffiliateClick,
  type NewAffiliateClick,
} from '../schema/affiliate.schema';
import { AffiliateProfileService } from './profile.service';
import type {
  TrackClickData,
  CreateReferralData,
  ReferralFilters,
  PaginationOptions,
  PaginatedResponse,
} from '../types/affiliate.types';

export class AffiliateReferralService {
  private static readonly CACHE_TTL = 300;

  /**
   * Track affiliate click
   */
  static async trackClick(data: TrackClickData): Promise<AffiliateClick> {
    logger.info('Tracking affiliate click', { affiliateCode: data.affiliateCode });

    // Get affiliate profile
    const profile = await AffiliateProfileService.getProfileByCode(data.affiliateCode);
    if (!profile) {
      throw new NotFoundError('Affiliate not found');
    }

    // Create click record
    const newClick: NewAffiliateClick = {
      affiliateId: profile.id,
      affiliateCode: data.affiliateCode,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      refererUrl: data.refererUrl,
      landingPage: data.landingPage,
      country: data.country,
      city: data.city,
      utmSource: data.utmSource,
      utmMedium: data.utmMedium,
      utmCampaign: data.utmCampaign,
      deviceType: data.deviceType,
      browser: data.browser,
      os: data.os,
    };

    const [click] = await getAffiliateDb().insert(affiliateClicks).values(newClick).returning();

    // Update profile metrics
    await getAffiliateDb()
      .update(affiliateProfiles)
      .set({
        totalClicks: sql`${affiliateProfiles.totalClicks} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(affiliateProfiles.id, profile.id));

    logger.info('Click tracked', { clickId: click.id, affiliateId: profile.id });

    return click;
  }

  /**
   * Create referral
   */
  static async createReferral(data: CreateReferralData): Promise<AffiliateReferral> {
    logger.info('Creating affiliate referral', { affiliateCode: data.affiliateCode });

    // Get affiliate profile
    const profile = await AffiliateProfileService.getProfileByCode(data.affiliateCode);
    if (!profile) {
      throw new NotFoundError('Affiliate not found');
    }

    // Create referral
    const newReferral: NewAffiliateReferral = {
      affiliateId: profile.id,
      referredUserId: data.referredUserId,
      referralCode: data.affiliateCode,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      refererUrl: data.refererUrl,
      utmSource: data.utmSource,
      utmMedium: data.utmMedium,
      utmCampaign: data.utmCampaign,
      utmContent: data.utmContent,
      utmTerm: data.utmTerm,
      status: data.referredUserId ? 'signed_up' : 'pending',
      signedUpAt: data.referredUserId ? new Date() : null,
    };

    const [referral] = await getAffiliateDb().insert(affiliateReferrals).values(newReferral).returning();

    // Update profile metrics
    if (data.referredUserId) {
      await getAffiliateDb()
        .update(affiliateProfiles)
        .set({
          totalSignups: sql`${affiliateProfiles.totalSignups} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(affiliateProfiles.id, profile.id));
    }

    logger.info('Referral created', { referralId: referral.id });

    return referral;
  }

  /**
   * Mark referral as converted
   */
  static async markAsConverted(
    referralId: string,
    subscriptionPlanId?: string,
    firstPaymentAmount?: number
  ): Promise<AffiliateReferral> {
    logger.info('Marking referral as converted', { referralId });

    const [updated] = await getAffiliateDb()
      .update(affiliateReferrals)
      .set({
        status: 'converted',
        convertedAt: new Date(),
        subscriptionPlanId,
        firstPaymentAmount: firstPaymentAmount?.toString(),
        updatedAt: new Date(),
      })
      .where(eq(affiliateReferrals.id, referralId))
      .returning();

    if (!updated) {
      throw new NotFoundError('Referral not found');
    }

    // Update affiliate metrics
    await getAffiliateDb()
      .update(affiliateProfiles)
      .set({
        totalConversions: sql`${affiliateProfiles.totalConversions} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(affiliateProfiles.id, updated.affiliateId));

    return updated;
  }

  /**
   * Get referral by ID
   */
  static async getReferralById(id: string): Promise<AffiliateReferral | null> {
    const [referral] = await getAffiliateDb()
      .select()
      .from(affiliateReferrals)
      .where(eq(affiliateReferrals.id, id))
      .limit(1);

    return referral || null;
  }

  /**
   * Get referral by user ID
   */
  static async getReferralByUserId(userId: string): Promise<AffiliateReferral | null> {
    const [referral] = await getAffiliateDb()
      .select()
      .from(affiliateReferrals)
      .where(eq(affiliateReferrals.referredUserId, userId))
      .orderBy(desc(affiliateReferrals.createdAt))
      .limit(1);

    return referral || null;
  }

  /**
   * List referrals
   */
  static async listReferrals(
    filters: ReferralFilters,
    pagination?: PaginationOptions
  ): Promise<PaginatedResponse<AffiliateReferral>> {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 50;
    const offset = (page - 1) * limit;

    const conditions = [];

    if (filters.affiliateId) {
      conditions.push(eq(affiliateReferrals.affiliateId, filters.affiliateId));
    }

    if (filters.status && filters.status.length > 0) {
      conditions.push(inArray(affiliateReferrals.status, filters.status));
    }

    if (filters.dateFrom) {
      conditions.push(gte(affiliateReferrals.createdAt, filters.dateFrom));
    }

    if (filters.dateTo) {
      conditions.push(lte(affiliateReferrals.createdAt, filters.dateTo));
    }

    if (filters.utmSource) {
      conditions.push(eq(affiliateReferrals.utmSource, filters.utmSource));
    }

    if (filters.utmCampaign) {
      conditions.push(eq(affiliateReferrals.utmCampaign, filters.utmCampaign));
    }

    const [{ count }] = await getAffiliateDb()
      .select({ count: sql<number>`count(*)::int` })
      .from(affiliateReferrals)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const results = await getAffiliateDb()
      .select()
      .from(affiliateReferrals)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(affiliateReferrals.createdAt))
      .limit(limit)
      .offset(offset);

    const totalPages = Math.ceil(count / limit);

    return {
      data: results,
      pagination: {
        page,
        limit,
        total: count,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Get click stats
   */
  static async getClickStats(affiliateId: string, days: number = 30): Promise<{
    totalClicks: number;
    uniqueClicks: number;
    clicksBySource: Array<{ source: string; count: number }>;
    clicksByDevice: Array<{ device: string; count: number }>;
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [stats] = await getAffiliateDb()
      .select({
        totalClicks: sql<number>`count(*)::int`,
        uniqueClicks: sql<number>`count(DISTINCT ${affiliateClicks.ipAddress})::int`,
      })
      .from(affiliateClicks)
      .where(
        and(
          eq(affiliateClicks.affiliateId, affiliateId),
          gte(affiliateClicks.createdAt, startDate)
        )
      );

    const clicksBySource = await getAffiliateDb()
      .select({
        source: affiliateClicks.utmSource,
        count: sql<number>`count(*)::int`,
      })
      .from(affiliateClicks)
      .where(
        and(
          eq(affiliateClicks.affiliateId, affiliateId),
          gte(affiliateClicks.createdAt, startDate)
        )
      )
      .groupBy(affiliateClicks.utmSource)
      .orderBy(desc(sql`count(*)`))
      .limit(10);

    const clicksByDevice = await getAffiliateDb()
      .select({
        device: affiliateClicks.deviceType,
        count: sql<number>`count(*)::int`,
      })
      .from(affiliateClicks)
      .where(
        and(
          eq(affiliateClicks.affiliateId, affiliateId),
          gte(affiliateClicks.createdAt, startDate)
        )
      )
      .groupBy(affiliateClicks.deviceType);

    return {
      totalClicks: stats.totalClicks,
      uniqueClicks: stats.uniqueClicks,
      clicksBySource: clicksBySource.map(row => ({
        source: row.source || 'direct',
        count: row.count,
      })),
      clicksByDevice: clicksByDevice.map(row => ({
        device: row.device || 'unknown',
        count: row.count,
      })),
    };
  }
}
