/**
 * Affiliate Routes Export
 */

import { Elysia } from 'elysia';
import { affiliateRoutes } from './affiliate.routes';
import { affiliateAdminRoutes } from './admin.routes';

/**
 * Affiliate Module
 * Combines all affiliate routes into a single module
 */
export const affiliateModule = new Elysia()
  .use(affiliateRoutes)
  .use(affiliateAdminRoutes);

export { affiliateRoutes, affiliateAdminRoutes };
