/**
 * Affiliate Admin Routes
 * Administrative endpoints for affiliate program management
 */

import { Elysia, t } from 'elysia';
import { sessionGuard, requireTenant } from '../../auth/middleware/session.middleware';
import { requireAnyRole } from '../../security/middleware/rbac.middleware';
import {
  AffiliateProfileService,
  AffiliatePayoutService,
  AffiliateTierService,
} from '../services';
import logger from '@/utils/logger';

export const affiliateAdminRoutes = new Elysia({ prefix: '/api/v1/affiliate/admin' })
  .use(sessionGuard)
  .use(requireTenant)
  .use(requireAnyRole(['super_admin', 'admin']))

  /**
   * Get all affiliates
   * GET /api/v1/affiliate/admin/affiliates
   */
  .get(
    '/affiliates',
    async ({ tenantId, query }: any) => {
      logger.info('Getting all affiliates', { tenantId });

      const affiliates = await AffiliateProfileService.listAffiliates(
        {
          status: query.status ? [query.status] : undefined,
          tierName: query.tier ? [query.tier] : undefined,
          search: query.search,
        },
        tenantId,
        { page: query.page || 1, limit: query.limit || 50 }
      );

      return { success: true, data: affiliates };
    },
    {
      query: t.Object({
        status: t.Optional(t.String()),
        tier: t.Optional(t.String()),
        search: t.Optional(t.String()),
        page: t.Optional(t.Number()),
        limit: t.Optional(t.Number()),
      }),
      detail: {
        tags: ['Affiliate - Admin'],
        summary: 'Get all affiliates',
        description: 'Get list of all affiliates with optional filters (admin only)',
      },
    }
  )

  /**
   * Approve affiliate
   * POST /api/v1/affiliate/admin/affiliates/:id/approve
   */
  .post(
    '/affiliates/:id/approve',
    async ({ params, user, tenantId }: any) => {
      logger.info('Approving affiliate', { affiliateId: params.id });

      const profile = await AffiliateProfileService.approveAffiliate(
        params.id,
        tenantId,
        user.id
      );

      return { success: true, data: profile };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      detail: {
        tags: ['Affiliate - Admin'],
        summary: 'Approve affiliate',
        description: 'Approve affiliate application (admin only)',
      },
    }
  )

  /**
   * Suspend affiliate
   * POST /api/v1/affiliate/admin/affiliates/:id/suspend
   */
  .post(
    '/affiliates/:id/suspend',
    async ({ params, tenantId, body }: any) => {
      logger.info('Suspending affiliate', { affiliateId: params.id });

      const profile = await AffiliateProfileService.suspendAffiliate(
        params.id,
        tenantId,
        body.reason
      );

      return { success: true, data: profile };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        reason: t.Optional(t.String()),
      }),
      detail: {
        tags: ['Affiliate - Admin'],
        summary: 'Suspend affiliate',
        description: 'Suspend affiliate account (admin only)',
      },
    }
  )

  /**
   * Get pending payouts
   * GET /api/v1/affiliate/admin/payouts/pending
   */
  .get(
    '/payouts/pending',
    async ({ tenantId, query }: any) => {
      logger.info('Getting pending payouts', { tenantId });

      const payouts = await AffiliatePayoutService.listPayouts(
        { status: ['pending'] },
        { page: query.page || 1, limit: query.limit || 50 }
      );

      return { success: true, data: payouts };
    },
    {
      query: t.Object({
        page: t.Optional(t.Number()),
        limit: t.Optional(t.Number()),
      }),
      detail: {
        tags: ['Affiliate - Admin'],
        summary: 'Get pending payouts',
        description: 'Get all pending affiliate payouts (admin only)',
      },
    }
  )

  /**
   * Process payout
   * POST /api/v1/affiliate/admin/payouts/:id/process
   */
  .post(
    '/payouts/:id/process',
    async ({ params }: any) => {
      logger.info('Processing payout', { payoutId: params.id });

      const payout = await AffiliatePayoutService.processPayout(params.id);

      return { success: true, data: payout };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      detail: {
        tags: ['Affiliate - Admin'],
        summary: 'Process payout',
        description: 'Start processing affiliate payout (admin only)',
      },
    }
  )

  /**
   * Complete payout
   * POST /api/v1/affiliate/admin/payouts/:id/complete
   */
  .post(
    '/payouts/:id/complete',
    async ({ params, body }: any) => {
      logger.info('Completing payout', { payoutId: params.id });

      const payout = await AffiliatePayoutService.completePayout(
        params.id,
        body.stripeTransferId
      );

      return { success: true, data: payout };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        stripeTransferId: t.Optional(t.String()),
      }),
      detail: {
        tags: ['Affiliate - Admin'],
        summary: 'Complete payout',
        description: 'Mark affiliate payout as completed (admin only)',
      },
    }
  )

  /**
   * Update affiliate tier
   * PUT /api/v1/affiliate/admin/affiliates/:id/tier
   */
  .put(
    '/affiliates/:id/tier',
    async ({ params, tenantId, body }: any) => {
      logger.info('Updating affiliate tier', { affiliateId: params.id, tier: body.tierName });

      // Get affiliate profile
      const profile = await AffiliateProfileService.getProfileById(params.id, tenantId);
      if (!profile) {
        return { success: false, error: 'Affiliate not found' };
      }

      // Get tier by name
      const tiers = await AffiliateTierService.getAllTiers();
      const newTier = tiers.find((t) => t.name === body.tierName);
      if (!newTier) {
        return { success: false, error: 'Tier not found' };
      }

      // Update profile (using any because UpdateAffiliateData doesn't include tier fields)
      const updated = await AffiliateProfileService.updateProfile(params.id, tenantId, {
        tierId: newTier.id,
        tierName: newTier.name,
      } as any);

      return { success: true, data: updated };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        tierName: t.String(),
      }),
      detail: {
        tags: ['Affiliate - Admin'],
        summary: 'Update affiliate tier',
        description: 'Manually update affiliate tier (admin only)',
      },
    }
  )

  /**
   * Get all tiers
   * GET /api/v1/affiliate/admin/tiers
   */
  .get(
    '/tiers',
    async () => {
      logger.info('Getting all tiers');

      const tiers = await AffiliateTierService.getAllTiers();

      return { success: true, data: tiers };
    },
    {
      detail: {
        tags: ['Affiliate - Admin'],
        summary: 'Get all tiers',
        description: 'Get all affiliate tier configurations (admin only)',
      },
    }
  );
