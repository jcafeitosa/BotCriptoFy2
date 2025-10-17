/**
 * P2P Order Service
 *
 * Handles CRUD operations for P2P orders
 */

import { db } from '../../../db';
import { p2pOrders } from '../schema/p2p.schema';
import { eq, and, desc } from 'drizzle-orm';
import type {
  CreateOrderRequest,
  OrderResponse,
  OrderFilters,
  ServiceResponse,
} from '../types/p2p.types';
import { logAuditEvent } from '@/modules/audit/services/audit-logger.service';

/**
 * Create a new P2P order
 */
export async function createOrder(
  request: CreateOrderRequest
): Promise<ServiceResponse<OrderResponse>> {
  try {
    // Validate amounts
    if (request.minAmount > request.maxAmount) {
      return {
        success: false,
        error: 'Minimum amount cannot be greater than maximum amount',
        code: 'INVALID_AMOUNT_RANGE',
      };
    }

    if (request.availableAmount < request.minAmount) {
      return {
        success: false,
        error: 'Available amount must be at least equal to minimum amount',
        code: 'INSUFFICIENT_AVAILABLE_AMOUNT',
      };
    }

    // Validate price type
    if (request.priceType === 'limit' && !request.price) {
      return {
        success: false,
        error: 'Price is required for limit orders',
        code: 'PRICE_REQUIRED',
      };
    }

    if (request.priceType === 'floating' && !request.priceMargin) {
      return {
        success: false,
        error: 'Price margin is required for floating price orders',
        code: 'MARGIN_REQUIRED',
      };
    }

    // Create order
    const order = await db
      .insert(p2pOrders)
      .values({
        tenantId: request.tenantId,
        userId: request.userId,
        orderType: request.orderType,
        cryptocurrency: request.cryptocurrency,
        fiatCurrency: request.fiatCurrency,
        priceType: request.priceType,
        price: request.price?.toString(),
        priceMargin: request.priceMargin?.toString(),
        minAmount: request.minAmount.toString(),
        maxAmount: request.maxAmount.toString(),
        availableAmount: request.availableAmount.toString(),
        paymentTimeLimit: request.paymentTimeLimit || 30,
        paymentMethods: request.paymentMethods,
        terms: request.terms,
        autoReply: request.autoReply,
        minTradeCount: request.minTradeCount || 0,
        minCompletionRate: request.minCompletionRate?.toString() || '0',
        verifiedUsersOnly: request.verifiedUsersOnly || false,
        expiresAt: request.expiresAt,
        status: 'active',
      })
      .returning();

    // Audit log
    await logAuditEvent({
      eventType: 'p2p.order_created',
      severity: 'low',
      status: 'success',
      userId: request.userId,
      tenantId: request.tenantId,
      resource: 'p2p_orders',
      resourceId: order[0].id,
      action: 'create',
      metadata: {
        orderType: request.orderType,
        cryptocurrency: request.cryptocurrency,
        fiatCurrency: request.fiatCurrency,
        amount: request.availableAmount,
      },
    });

    return {
      success: true,
      data: order[0] as OrderResponse,
    };
  } catch (error) {
    console.error('Error creating P2P order:', error);
    return {
      success: false,
      error: 'Failed to create order',
      code: 'CREATE_ORDER_FAILED',
    };
  }
}

/**
 * Get order by ID
 */
export async function getOrderById(
  orderId: string,
  tenantId: string
): Promise<ServiceResponse<OrderResponse>> {
  try {
    const order = await db
      .select()
      .from(p2pOrders)
      .where(and(eq(p2pOrders.id, orderId), eq(p2pOrders.tenantId, tenantId)))
      .limit(1);

    if (order.length === 0) {
      return {
        success: false,
        error: 'Order not found',
        code: 'ORDER_NOT_FOUND',
      };
    }

    return {
      success: true,
      data: order[0] as OrderResponse,
    };
  } catch (error) {
    console.error('Error fetching order:', error);
    return {
      success: false,
      error: 'Failed to fetch order',
      code: 'FETCH_ORDER_FAILED',
    };
  }
}

/**
 * List orders with filters
 */
export async function listOrders(
  tenantId: string,
  filters: OrderFilters
): Promise<ServiceResponse<{ orders: OrderResponse[]; total: number }>> {
  try {
    const conditions = [eq(p2pOrders.tenantId, tenantId)];

    // Apply filters
    if (filters.orderType) {
      conditions.push(eq(p2pOrders.orderType, filters.orderType));
    }

    if (filters.cryptocurrency) {
      conditions.push(eq(p2pOrders.cryptocurrency, filters.cryptocurrency));
    }

    if (filters.fiatCurrency) {
      conditions.push(eq(p2pOrders.fiatCurrency, filters.fiatCurrency));
    }

    if (filters.status) {
      conditions.push(eq(p2pOrders.status, filters.status));
    }

    if (filters.paymentMethods && filters.paymentMethods.length > 0) {
      // This would need a custom SQL for array overlap check
      // For now, we'll fetch all and filter in memory (not optimal for production)
    }

    const limit = Math.min(filters.limit || 50, 100);
    const offset = filters.offset || 0;

    const orders = await db
      .select()
      .from(p2pOrders)
      .where(and(...conditions))
      .orderBy(desc(p2pOrders.createdAt))
      .limit(limit)
      .offset(offset);

    // Filter by payment methods if specified
    let filteredOrders = orders;
    if (filters.paymentMethods && filters.paymentMethods.length > 0) {
      filteredOrders = orders.filter((order) =>
        filters.paymentMethods!.some((method) => order.paymentMethods.includes(method))
      );
    }

    return {
      success: true,
      data: {
        orders: filteredOrders as OrderResponse[],
        total: filteredOrders.length,
      },
    };
  } catch (error) {
    console.error('Error listing orders:', error);
    return {
      success: false,
      error: 'Failed to list orders',
      code: 'LIST_ORDERS_FAILED',
    };
  }
}

/**
 * Update order
 */
export async function updateOrder(
  orderId: string,
  tenantId: string,
  userId: string,
  updates: Partial<CreateOrderRequest>
): Promise<ServiceResponse<OrderResponse>> {
  try {
    // Verify ownership
    const existing = await getOrderById(orderId, tenantId);
    if (!existing.success || !existing.data) {
      return existing;
    }

    if (existing.data.userId !== userId) {
      return {
        success: false,
        error: 'Unauthorized to update this order',
        code: 'UNAUTHORIZED',
      };
    }

    // Update order
    const updated = await db
      .update(p2pOrders)
      .set({
        price: updates.price?.toString(),
        priceMargin: updates.priceMargin?.toString(),
        minAmount: updates.minAmount?.toString(),
        maxAmount: updates.maxAmount?.toString(),
        availableAmount: updates.availableAmount?.toString(),
        paymentMethods: updates.paymentMethods,
        terms: updates.terms,
        autoReply: updates.autoReply,
        updatedAt: new Date(),
      })
      .where(eq(p2pOrders.id, orderId))
      .returning();

    // Audit log
    await logAuditEvent({
      eventType: 'p2p.order_updated',
      severity: 'low',
      status: 'success',
      userId,
      tenantId,
      resource: 'p2p_orders',
      resourceId: orderId,
      action: 'update',
      metadata: updates,
    });

    return {
      success: true,
      data: updated[0] as OrderResponse,
    };
  } catch (error) {
    console.error('Error updating order:', error);
    return {
      success: false,
      error: 'Failed to update order',
      code: 'UPDATE_ORDER_FAILED',
    };
  }
}

/**
 * Cancel order
 */
export async function cancelOrder(
  orderId: string,
  tenantId: string,
  userId: string
): Promise<ServiceResponse<OrderResponse>> {
  try {
    // Verify ownership
    const existing = await getOrderById(orderId, tenantId);
    if (!existing.success || !existing.data) {
      return existing;
    }

    if (existing.data.userId !== userId) {
      return {
        success: false,
        error: 'Unauthorized to cancel this order',
        code: 'UNAUTHORIZED',
      };
    }

    // Cancel order
    const cancelled = await db
      .update(p2pOrders)
      .set({
        status: 'cancelled',
        updatedAt: new Date(),
      })
      .where(eq(p2pOrders.id, orderId))
      .returning();

    // Audit log
    await logAuditEvent({
      eventType: 'p2p.order_cancelled',
      severity: 'low',
      status: 'success',
      userId,
      tenantId,
      resource: 'p2p_orders',
      resourceId: orderId,
      action: 'cancel',
    });

    return {
      success: true,
      data: cancelled[0] as OrderResponse,
    };
  } catch (error) {
    console.error('Error cancelling order:', error);
    return {
      success: false,
      error: 'Failed to cancel order',
      code: 'CANCEL_ORDER_FAILED',
    };
  }
}

/**
 * Deduct available amount from order
 */
export async function deductAvailableAmount(
  orderId: string,
  amount: number
): Promise<ServiceResponse<OrderResponse>> {
  try {
    const order = await db.query.p2pOrders.findFirst({
      where: eq(p2pOrders.id, orderId),
    });

    if (!order) {
      return {
        success: false,
        error: 'Order not found',
        code: 'ORDER_NOT_FOUND',
      };
    }

    const currentAvailable = parseFloat(order.availableAmount);
    const newAvailable = currentAvailable - amount;

    if (newAvailable < 0) {
      return {
        success: false,
        error: 'Insufficient available amount',
        code: 'INSUFFICIENT_AMOUNT',
      };
    }

    const updated = await db
      .update(p2pOrders)
      .set({
        availableAmount: newAvailable.toString(),
        updatedAt: new Date(),
      })
      .where(eq(p2pOrders.id, orderId))
      .returning();

    return {
      success: true,
      data: updated[0] as OrderResponse,
    };
  } catch (error) {
    console.error('Error deducting available amount:', error);
    return {
      success: false,
      error: 'Failed to deduct amount',
      code: 'DEDUCT_AMOUNT_FAILED',
    };
  }
}
