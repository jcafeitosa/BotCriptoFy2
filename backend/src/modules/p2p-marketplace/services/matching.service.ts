/**
 * P2P Order Matching Service
 */

import { db } from '../../../db';
import { p2pOrders } from '../schema/p2p.schema';
import { eq, and } from 'drizzle-orm';
import type { OrderResponse, OrderMatchingResult, ServiceResponse } from '../types/p2p.types';
import { matchOrders } from '../utils/order-matching';
import { getUserStats } from './reputation.service';

export async function findMatchingOrders(
  buyerRequest: {
    amount: number;
    fiatCurrency: string;
    cryptocurrency: string;
    paymentMethods: string[];
  },
  tenantId: string
): Promise<ServiceResponse<OrderMatchingResult[]>> {
  try {
    // Get sell orders
    const sellOrders = await db.select().from(p2pOrders).where(
      and(
        eq(p2pOrders.tenantId, tenantId),
        eq(p2pOrders.orderType, 'sell'),
        eq(p2pOrders.cryptocurrency, buyerRequest.cryptocurrency),
        eq(p2pOrders.fiatCurrency, buyerRequest.fiatCurrency),
        eq(p2pOrders.status, 'active')
      )
    );

    // Get stats for each seller
    const sellerStats = new Map();
    for (const order of sellOrders) {
      const stats = await getUserStats(order.userId, tenantId);
      if (stats.success && stats.data) {
        sellerStats.set(order.userId, stats.data);
      }
    }

    // Match orders
    const matches = matchOrders(buyerRequest, sellOrders as OrderResponse[], sellerStats);

    return { success: true, data: matches };
  } catch (error) {
    return { success: false, error: 'Failed to match orders', code: 'MATCHING_FAILED' };
  }
}
