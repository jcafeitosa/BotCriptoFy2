/**
 * Affiliate Public Routes
 * Lightweight endpoints for public click tracking
 */

import { Elysia, t } from 'elysia';
import { optionalSessionGuard } from '../../auth/middleware/session.middleware';
import { AffiliateReferralService } from '../services';
import logger from '@/utils/logger';

export const affiliatePublicRoutes = new Elysia({ prefix: '/api/v1/affiliate/public' })
  .use(optionalSessionGuard)
  /**
   * Track click (public)
   * POST /api/v1/affiliate/public/click
   */
  .post(
    '/click',
    async ({ body, request }) => {
      const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0]?.trim() || undefined;
      const userAgent = request.headers.get('user-agent') || undefined;

      logger.info('Public click track', { code: body.affiliateCode });

      const click = await AffiliateReferralService.trackClick({
        affiliateCode: body.affiliateCode,
        ipAddress: body.ipAddress || ip,
        userAgent: body.userAgent || userAgent,
        refererUrl: body.refererUrl,
        landingPage: body.landingPage,
        country: body.country,
        city: body.city,
        utmSource: body.utmSource,
        utmMedium: body.utmMedium,
        utmCampaign: body.utmCampaign,
        deviceType: body.deviceType,
        browser: body.browser,
        os: body.os,
      });

      return { success: true, data: click };
    },
    {
      body: t.Object({
        affiliateCode: t.String({ minLength: 5 }),
        ipAddress: t.Optional(t.String()),
        userAgent: t.Optional(t.String()),
        refererUrl: t.Optional(t.String()),
        landingPage: t.Optional(t.String()),
        country: t.Optional(t.String()),
        city: t.Optional(t.String()),
        utmSource: t.Optional(t.String()),
        utmMedium: t.Optional(t.String()),
        utmCampaign: t.Optional(t.String()),
        deviceType: t.Optional(t.String()),
        browser: t.Optional(t.String()),
        os: t.Optional(t.String()),
      }),
      detail: {
        tags: ['Affiliate - Public'],
        summary: 'Track affiliate click',
        description: 'Records a click on an affiliate link (public endpoint)',
      },
    }
  );

