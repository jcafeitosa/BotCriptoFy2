/**
 * P2P Marketplace Module
 *
 * Peer-to-peer cryptocurrency trading marketplace
 */

import { Elysia } from 'elysia';
import {
  p2pOrdersRoutes,
  p2pTradingRoutes,
  p2pChatRoutes,
  p2pDisputesRoutes,
  p2pReputationRoutes,
  p2pPaymentRoutes,
} from './routes';

export const p2pMarketplaceModule = new Elysia()
  .use(p2pOrdersRoutes)
  .use(p2pTradingRoutes)
  .use(p2pChatRoutes)
  .use(p2pDisputesRoutes)
  .use(p2pReputationRoutes)
  .use(p2pPaymentRoutes);

export * from './schema/p2p.schema';
export * from './services';
export * from './types/p2p.types';
export * from './utils/order-matching';
export * from './utils/escrow-calculator';
export * from './utils/reputation-score';
export * from './utils/dispute-resolver';
