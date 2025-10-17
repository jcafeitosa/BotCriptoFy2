/**
 * Affiliate Routes
 * Main endpoints for affiliate program management
 */

import { Elysia, t } from 'elysia';
import { sessionGuard, requireTenant } from '../../auth/middleware/session.middleware';
import {
  AffiliateProfileService,
  AffiliateReferralService,
  AffiliateCommissionService,
  AffiliatePayoutService,
  AffiliateAnalyticsService,
} from '../services';
import logger from '@/utils/logger';

export const affiliateRoutes = new Elysia({ prefix: '/api/v1/affiliate' })
  .use(sessionGuard)
  .use(requireTenant)

  /**
   * Get affiliate profile
   * GET /api/v1/affiliate/profile
   */
  .get(
    '/profile',
    async ({ user, tenantId }: any) => {
      logger.info('Getting affiliate profile', { userId: user.id });
      const profile = await AffiliateProfileService.getProfileByUserId(user.id, tenantId);
      return { success: true, data: profile };
    },
    {
      detail: {
        tags: ['Affiliate'],
        summary: 'Get affiliate profile',
        description: 'Get current user affiliate profile with stats',
      },
    }
  )

  /**
   * Create or update affiliate profile
   * POST /api/v1/affiliate/profile
   */
  .post(
    '/profile',
    async ({ user, tenantId, body }: any) => {
      logger.info('Creating/updating affiliate profile', { userId: user.id });

      // Check if profile exists
      const existing = await AffiliateProfileService.getProfileByUserId(user.id, tenantId);

      if (existing) {
        // Update profile
        const profile = await AffiliateProfileService.updateProfile(
          existing.id,
          tenantId,
          body
        );
        return { success: true, data: profile };
      } else {
        // Create new profile
        const profile = await AffiliateProfileService.createProfile({
          userId: user.id,
          tenantId,
          ...body,
        });
        return { success: true, data: profile };
      }
    },
    {
      body: t.Object({
        phoneNumber: t.Optional(t.String()),
        company: t.Optional(t.String()),
        website: t.Optional(t.String()),
        socialMedia: t.Optional(t.Object({})),
        audienceSize: t.Optional(t.Number()),
        niche: t.Optional(t.String()),
        bio: t.Optional(t.String()),
        payoutMethod: t.Optional(t.String()),
        payoutEmail: t.Optional(t.String()),
        taxId: t.Optional(t.String()),
      }),
      detail: {
        tags: ['Affiliate'],
        summary: 'Create/update affiliate profile',
        description: 'Create or update affiliate profile information',
      },
    }
  )

  /**
   * Get referral code
   * GET /api/v1/affiliate/referral-code
   */
  .get(
    '/referral-code',
    async ({ user, tenantId }: any) => {
      logger.info('Getting referral code', { userId: user.id });
      const profile = await AffiliateProfileService.getProfileByUserId(user.id, tenantId);
      return {
        success: true,
        data: {
          code: profile?.affiliateCode,
          link: profile?.referralLink,
        },
      };
    },
    {
      detail: {
        tags: ['Affiliate'],
        summary: 'Get referral code',
        description: 'Get user referral code and link',
      },
    }
  )

  /**
   * Get referrals
   * GET /api/v1/affiliate/referrals
   */
  .get(
    '/referrals',
    async ({ user, tenantId, query }: any) => {
      logger.info('Getting referrals', { userId: user.id });

      const profile = await AffiliateProfileService.getProfileByUserId(user.id, tenantId);
      if (!profile) {
        return { success: true, data: { data: [], pagination: {} } };
      }

      const referrals = await AffiliateReferralService.listReferrals(
        { affiliateId: profile.id, status: query.status ? [query.status] : undefined },
        { page: query.page || 1, limit: query.limit || 50 }
      );
      return { success: true, data: referrals };
    },
    {
      query: t.Object({
        status: t.Optional(t.String()),
        page: t.Optional(t.Number()),
        limit: t.Optional(t.Number()),
      }),
      detail: {
        tags: ['Affiliate'],
        summary: 'Get referrals',
        description: 'Get list of user referrals with optional filters',
      },
    }
  )

  /**
   * Get commissions
   * GET /api/v1/affiliate/commissions
   */
  .get(
    '/commissions',
    async ({ user, tenantId, query }: any) => {
      logger.info('Getting commissions', { userId: user.id });

      const profile = await AffiliateProfileService.getProfileByUserId(user.id, tenantId);
      if (!profile) {
        return { success: true, data: { data: [], pagination: {} } };
      }

      const commissions = await AffiliateCommissionService.listCommissions(
        {
          affiliateId: profile.id,
          status: query.status ? [query.status] : undefined,
          dateFrom: query.from ? new Date(query.from) : undefined,
          dateTo: query.to ? new Date(query.to) : undefined,
        },
        { page: query.page || 1, limit: query.limit || 50 }
      );
      return { success: true, data: commissions };
    },
    {
      query: t.Object({
        status: t.Optional(t.String()),
        from: t.Optional(t.String()),
        to: t.Optional(t.String()),
        page: t.Optional(t.Number()),
        limit: t.Optional(t.Number()),
      }),
      detail: {
        tags: ['Affiliate'],
        summary: 'Get commissions',
        description: 'Get user commissions history with optional filters',
      },
    }
  )

  /**
   * Get payouts
   * GET /api/v1/affiliate/payouts
   */
  .get(
    '/payouts',
    async ({ user, tenantId, query }: any) => {
      logger.info('Getting payouts', { userId: user.id });

      const profile = await AffiliateProfileService.getProfileByUserId(user.id, tenantId);
      if (!profile) {
        return { success: true, data: { data: [], pagination: {} } };
      }

      const payouts = await AffiliatePayoutService.listPayouts(
        {
          affiliateId: profile.id,
          status: query.status ? [query.status] : undefined,
        },
        { page: query.page || 1, limit: query.limit || 50 }
      );
      return { success: true, data: payouts };
    },
    {
      query: t.Object({
        status: t.Optional(t.String()),
        page: t.Optional(t.Number()),
        limit: t.Optional(t.Number()),
      }),
      detail: {
        tags: ['Affiliate'],
        summary: 'Get payouts',
        description: 'Get user payout history',
      },
    }
  )

  /**
   * Request payout
   * POST /api/v1/affiliate/payouts
   */
  .post(
    '/payouts',
    async ({ user, tenantId, body }: any) => {
      logger.info('Requesting payout', { userId: user.id, amount: body.amount });

      const profile = await AffiliateProfileService.getProfileByUserId(user.id, tenantId);
      if (!profile) {
        return { success: false, error: 'Affiliate profile not found' };
      }

      const payout = await AffiliatePayoutService.requestPayout(profile.id, body);
      return { success: true, data: payout };
    },
    {
      body: t.Object({
        amount: t.Number(),
        method: t.String(),
        bankInfo: t.Optional(t.Object({})),
        notes: t.Optional(t.String()),
      }),
      detail: {
        tags: ['Affiliate'],
        summary: 'Request payout',
        description: 'Request affiliate commission payout',
      },
    }
  )

  /**
   * Get analytics
   * GET /api/v1/affiliate/analytics
   */
  .get(
    '/analytics',
    async ({ user, tenantId, query }: any) => {
      logger.info('Getting affiliate analytics', { userId: user.id });

      const profile = await AffiliateProfileService.getProfileByUserId(user.id, tenantId);
      if (!profile) {
        return { success: true, data: null };
      }

      const analytics = await AffiliateAnalyticsService.getStats(
        profile.id,
        query.period || 'last_30_days'
      );
      return { success: true, data: analytics };
    },
    {
      query: t.Object({
        period: t.Optional(t.String()),
      }),
      detail: {
        tags: ['Affiliate'],
        summary: 'Get analytics',
        description: 'Get affiliate performance analytics',
      },
    }
  )

  /**
   * Get tier info
   * GET /api/v1/affiliate/tier
   */
  .get(
    '/tier',
    async ({ user, tenantId }: any) => {
      logger.info('Getting tier info', { userId: user.id });
      const profile = await AffiliateProfileService.getProfileByUserId(user.id, tenantId);
      return {
        success: true,
        data: {
          tier: profile?.tierName,
          tierId: profile?.tierId,
        },
      };
    },
    {
      detail: {
        tags: ['Affiliate'],
        summary: 'Get tier info',
        description: 'Get current affiliate tier information',
      },
    }
  );
