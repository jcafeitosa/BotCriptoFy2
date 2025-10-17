/**
 * MMN Routes Export
 */

import { Elysia } from 'elysia';
import { mmnRoutes } from './mmn.routes';
import { adminRoutes } from './admin.routes';
import { visualizationRoutes } from './visualization.routes';

/**
 * MMN Module
 * Combines all MMN routes into a single module
 */
export const mmnModule = new Elysia()
  .use(mmnRoutes)
  .use(adminRoutes)
  .use(visualizationRoutes);
