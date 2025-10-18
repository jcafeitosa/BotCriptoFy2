/**
 * Affiliate Routes Export
 */

import { Elysia } from 'elysia';
import { affiliateRoutes } from './affiliate.routes';
import { affiliateAdminRoutes } from './admin.routes';
import { affiliatePublicRoutes } from './public.routes';

/**
 * Affiliate Module
 * Combines all affiliate routes into a single module
 */
export const affiliateModule = new Elysia()
  .use(affiliatePublicRoutes)
  .use(affiliateRoutes)
  .use(affiliateAdminRoutes);

export { affiliateRoutes, affiliateAdminRoutes, affiliatePublicRoutes };
