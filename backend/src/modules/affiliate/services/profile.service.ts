/**
 * Affiliate Profile Service
 * Manages affiliate profiles and registration
 */

import { db } from '@/db';
import { eq, and, desc, sql, gte, lte, like, or, inArray } from 'drizzle-orm';
import logger from '@/utils/logger';
import { cacheManager } from '@/cache/cache-manager';
import { CacheNamespace } from '@/cache/types';
import { NotFoundError, ConflictError } from '@/utils/errors';
import {
  affiliateProfiles,
  affiliateTiers,
  type AffiliateProfile,
  type NewAffiliateProfile,
} from '../schema/affiliate.schema';
import { generateAffiliateCode, generateReferralLink } from '../utils/referral-code';
import type {
  CreateAffiliateData,
  UpdateAffiliateData,
  AffiliateFilters,
  PaginationOptions,
  PaginatedResponse,
} from '../types/affiliate.types';

export class AffiliateProfileService {
  private static readonly CACHE_TTL = 300; // 5 minutes
  private static readonly BASE_URL = process.env.APP_URL || 'https://app.botcriptofy.com';

  /**
   * Create affiliate profile
   */
  static async createProfile(data: CreateAffiliateData): Promise<AffiliateProfile> {
    logger.info('Creating affiliate profile', { userId: data.userId, tenantId: data.tenantId });

    // Check if user already has an affiliate profile
    const existing = await db
      .select()
      .from(affiliateProfiles)
      .where(
        and(
          eq(affiliateProfiles.userId, data.userId),
          eq(affiliateProfiles.tenantId, data.tenantId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      throw new ConflictError('User already has an affiliate profile');
    }

    // Generate unique affiliate code
    let affiliateCode = generateAffiliateCode();
    let codeExists = true;
    let attempts = 0;
    const maxAttempts = 10;

    while (codeExists && attempts < maxAttempts) {
      const check = await db
        .select({ id: affiliateProfiles.id })
        .from(affiliateProfiles)
        .where(eq(affiliateProfiles.affiliateCode, affiliateCode))
        .limit(1);

      if (check.length === 0) {
        codeExists = false;
      } else {
        affiliateCode = generateAffiliateCode();
        attempts++;
      }
    }

    if (codeExists) {
      throw new ConflictError('Failed to generate unique affiliate code');
    }

    // Generate referral link
    const referralLink = generateReferralLink(this.BASE_URL, affiliateCode);

    // Get default tier (Bronze)
    const [defaultTier] = await db
      .select()
      .from(affiliateTiers)
      .where(eq(affiliateTiers.level, 1))
      .limit(1);

    // Create profile
    const newProfile: NewAffiliateProfile = {
      userId: data.userId,
      tenantId: data.tenantId,
      affiliateCode,
      referralLink,
      status: 'pending',
      tierId: defaultTier?.id,
      tierName: defaultTier?.name || 'Bronze',
      phoneNumber: data.phoneNumber,
      company: data.company,
      website: data.website,
      socialMedia: data.socialMedia,
      audienceSize: data.audienceSize || 0,
      niche: data.niche,
      bio: data.bio,
      payoutMethod: data.payoutMethod || 'stripe',
      payoutEmail: data.payoutEmail,
      taxId: data.taxId,
      acceptedTermsAt: new Date(),
    };

    const [profile] = await db.insert(affiliateProfiles).values(newProfile).returning();

    // Invalidate cache
    await this.invalidateCache(data.tenantId);

    logger.info('Affiliate profile created', {
      profileId: profile.id,
      affiliateCode: profile.affiliateCode,
    });

    return profile;
  }

  /**
   * Get profile by ID
   */
  static async getProfileById(
    id: string,
    tenantId: string
  ): Promise<AffiliateProfile | null> {
    const cacheKey = `profile:${id}`;

    // Check cache
    const cached = await cacheManager.get<AffiliateProfile>(
      CacheNamespace.USERS,
      cacheKey
    );
    if (cached) return cached;

    // Query database
    const [profile] = await db
      .select()
      .from(affiliateProfiles)
      .where(
        and(
          eq(affiliateProfiles.id, id),
          eq(affiliateProfiles.tenantId, tenantId)
        )
      )
      .limit(1);

    if (profile) {
      await cacheManager.set(
        CacheNamespace.USERS,
        cacheKey,
        profile,
        this.CACHE_TTL
      );
    }

    return profile || null;
  }

  /**
   * Get profile by user ID
   */
  static async getProfileByUserId(
    userId: string,
    tenantId: string
  ): Promise<AffiliateProfile | null> {
    const cacheKey = `profile:user:${userId}`;

    // Check cache
    const cached = await cacheManager.get<AffiliateProfile>(
      CacheNamespace.USERS,
      cacheKey
    );
    if (cached) return cached;

    // Query database
    const [profile] = await db
      .select()
      .from(affiliateProfiles)
      .where(
        and(
          eq(affiliateProfiles.userId, userId),
          eq(affiliateProfiles.tenantId, tenantId)
        )
      )
      .limit(1);

    if (profile) {
      await cacheManager.set(
        CacheNamespace.USERS,
        cacheKey,
        profile,
        this.CACHE_TTL
      );
    }

    return profile || null;
  }

  /**
   * Get profile by affiliate code
   */
  static async getProfileByCode(affiliateCode: string): Promise<AffiliateProfile | null> {
    const cacheKey = `profile:code:${affiliateCode}`;

    // Check cache
    const cached = await cacheManager.get<AffiliateProfile>(
      CacheNamespace.USERS,
      cacheKey
    );
    if (cached) return cached;

    // Query database
    const [profile] = await db
      .select()
      .from(affiliateProfiles)
      .where(eq(affiliateProfiles.affiliateCode, affiliateCode))
      .limit(1);

    if (profile) {
      await cacheManager.set(
        CacheNamespace.USERS,
        cacheKey,
        profile,
        this.CACHE_TTL
      );
    }

    return profile || null;
  }

  /**
   * Update profile
   */
  static async updateProfile(
    id: string,
    tenantId: string,
    data: UpdateAffiliateData
  ): Promise<AffiliateProfile> {
    logger.info('Updating affiliate profile', { profileId: id });

    // Verify profile exists
    const existing = await this.getProfileById(id, tenantId);
    if (!existing) {
      throw new NotFoundError('Affiliate profile not found');
    }

    // Update profile - convert number fields to strings for decimal columns
    const updateData: any = { ...data };
    if (updateData.payoutMinimum !== undefined) {
      updateData.payoutMinimum = updateData.payoutMinimum.toString();
    }

    const [updated] = await db
      .update(affiliateProfiles)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(affiliateProfiles.id, id),
          eq(affiliateProfiles.tenantId, tenantId)
        )
      )
      .returning();

    // Invalidate cache
    await this.invalidateCache(tenantId);
    await cacheManager.delete(CacheNamespace.USERS, `profile:${id}`);
    await cacheManager.delete(CacheNamespace.USERS, `profile:user:${existing.userId}`);
    await cacheManager.delete(CacheNamespace.USERS, `profile:code:${existing.affiliateCode}`);

    logger.info('Affiliate profile updated', { profileId: id });

    return updated;
  }

  /**
   * Approve affiliate
   */
  static async approveAffiliate(
    id: string,
    tenantId: string,
    approvedBy: string
  ): Promise<AffiliateProfile> {
    logger.info('Approving affiliate', { profileId: id, approvedBy });

    const [updated] = await db
      .update(affiliateProfiles)
      .set({
        status: 'active',
        approvedAt: new Date(),
        approvedBy,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(affiliateProfiles.id, id),
          eq(affiliateProfiles.tenantId, tenantId)
        )
      )
      .returning();

    if (!updated) {
      throw new NotFoundError('Affiliate profile not found');
    }

    // Invalidate cache
    await this.invalidateCache(tenantId);

    logger.info('Affiliate approved', { profileId: id });

    return updated;
  }

  /**
   * Suspend affiliate
   */
  static async suspendAffiliate(
    id: string,
    tenantId: string,
    reason?: string
  ): Promise<AffiliateProfile> {
    logger.info('Suspending affiliate', { profileId: id, reason });

    const [updated] = await db
      .update(affiliateProfiles)
      .set({
        status: 'suspended',
        metadata: sql`jsonb_set(COALESCE(metadata, '{}'), '{suspendedReason}', ${JSON.stringify(reason)})`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(affiliateProfiles.id, id),
          eq(affiliateProfiles.tenantId, tenantId)
        )
      )
      .returning();

    if (!updated) {
      throw new NotFoundError('Affiliate profile not found');
    }

    // Invalidate cache
    await this.invalidateCache(tenantId);

    logger.info('Affiliate suspended', { profileId: id });

    return updated;
  }

  /**
   * List affiliates with filters
   */
  static async listAffiliates(
    filters: AffiliateFilters,
    tenantId: string,
    pagination?: PaginationOptions
  ): Promise<PaginatedResponse<AffiliateProfile>> {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 50;
    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions = [eq(affiliateProfiles.tenantId, tenantId)];

    if (filters.status && filters.status.length > 0) {
      conditions.push(inArray(affiliateProfiles.status, filters.status));
    }

    if (filters.tierName && filters.tierName.length > 0) {
      conditions.push(inArray(affiliateProfiles.tierName, filters.tierName));
    }

    if (filters.minEarned !== undefined) {
      conditions.push(gte(affiliateProfiles.totalEarned, filters.minEarned.toString()));
    }

    if (filters.maxEarned !== undefined) {
      conditions.push(lte(affiliateProfiles.totalEarned, filters.maxEarned.toString()));
    }

    if (filters.minConversions !== undefined) {
      conditions.push(gte(affiliateProfiles.totalConversions, filters.minConversions));
    }

    if (filters.dateFrom) {
      conditions.push(gte(affiliateProfiles.createdAt, filters.dateFrom));
    }

    if (filters.dateTo) {
      conditions.push(lte(affiliateProfiles.createdAt, filters.dateTo));
    }

    if (filters.search) {
      // Search in company, niche, bio
      conditions.push(
        or(
          like(affiliateProfiles.company, `%${filters.search}%`),
          like(affiliateProfiles.niche, `%${filters.search}%`),
          like(affiliateProfiles.bio, `%${filters.search}%`)
        )!
      );
    }

    // Count total
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(affiliateProfiles)
      .where(and(...conditions));

    // Query with pagination
    const results = await db
      .select()
      .from(affiliateProfiles)
      .where(and(...conditions))
      .orderBy(desc(affiliateProfiles.createdAt))
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
   * Update performance metrics
   */
  static async updateMetrics(
    id: string,
    metrics: {
      totalClicks?: number;
      totalSignups?: number;
      totalConversions?: number;
      totalEarned?: number;
      totalPaid?: number;
      pendingBalance?: number;
    }
  ): Promise<void> {
    // Convert number fields to strings for decimal columns
    const updateData: any = {};
    if (metrics.totalClicks !== undefined) updateData.totalClicks = metrics.totalClicks;
    if (metrics.totalSignups !== undefined) updateData.totalSignups = metrics.totalSignups;
    if (metrics.totalConversions !== undefined) updateData.totalConversions = metrics.totalConversions;
    if (metrics.totalEarned !== undefined) updateData.totalEarned = metrics.totalEarned.toString();
    if (metrics.totalPaid !== undefined) updateData.totalPaid = metrics.totalPaid.toString();
    if (metrics.pendingBalance !== undefined) updateData.pendingBalance = metrics.pendingBalance.toString();

    await db
      .update(affiliateProfiles)
      .set({
        ...updateData,
        conversionRate:
          metrics.totalClicks && metrics.totalConversions
            ? sql`ROUND((${metrics.totalConversions}::numeric / ${metrics.totalClicks}::numeric * 100), 2)`
            : undefined,
        updatedAt: new Date(),
      })
      .where(eq(affiliateProfiles.id, id));
  }

  /**
   * Invalidate cache
   */
  private static async invalidateCache(tenantId: string): Promise<void> {
    await cacheManager.invalidate({
      namespace: CacheNamespace.USERS,
      pattern: `affiliates:${tenantId}:*`,
    });
    await cacheManager.invalidate({
      namespace: CacheNamespace.USERS,
      pattern: 'profile:*',
    });
  }
}
