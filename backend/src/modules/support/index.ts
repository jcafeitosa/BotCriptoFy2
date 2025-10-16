/**
 * Support Module
 * Comprehensive support ticket system with SLA tracking, knowledge base, and automations
 */

import { Elysia } from 'elysia';
import {
  ticketsRoutes,
  slaRoutes,
  kbRoutes,
  automationsRoutes,
  cannedResponsesRoutes,
  analyticsRoutes,
} from './routes';

/**
 * Support Module Router
 * Registers all support-related routes
 */
export const supportModule = new Elysia()
  .use(ticketsRoutes)
  .use(slaRoutes)
  .use(kbRoutes)
  .use(automationsRoutes)
  .use(cannedResponsesRoutes)
  .use(analyticsRoutes);

// Export services for internal use
export * from './services';
export * from './types';
export * from './schema';
export * from './utils';
