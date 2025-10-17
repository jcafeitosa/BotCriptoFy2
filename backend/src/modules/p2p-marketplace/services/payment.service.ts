/**
 * P2P Payment Methods Service
 */

import { db } from '../../../db';
import { p2pPaymentMethods } from '../schema/p2p.schema';
import { eq, and } from 'drizzle-orm';
import type { CreatePaymentMethodRequest, PaymentMethodResponse, ServiceResponse } from '../types/p2p.types';

export async function createPaymentMethod(request: CreatePaymentMethodRequest): Promise<ServiceResponse<PaymentMethodResponse>> {
  try {
    const method = await db.insert(p2pPaymentMethods).values({
      tenantId: request.tenantId,
      userId: request.userId,
      methodType: request.methodType,
      methodName: request.methodName,
      details: request.details,
      isActive: true,
      isVerified: false,
      timesUsed: 0,
    }).returning();

    return { success: true, data: method[0] as PaymentMethodResponse };
  } catch (error) {
    return { success: false, error: 'Failed to create payment method', code: 'CREATE_METHOD_FAILED' };
  }
}

export async function getUserPaymentMethods(userId: string, tenantId: string): Promise<ServiceResponse<PaymentMethodResponse[]>> {
  try {
    const methods = await db.select().from(p2pPaymentMethods)
      .where(and(eq(p2pPaymentMethods.userId, userId), eq(p2pPaymentMethods.tenantId, tenantId)));

    return { success: true, data: methods as PaymentMethodResponse[] };
  } catch (error) {
    return { success: false, error: 'Failed to get payment methods', code: 'GET_METHODS_FAILED' };
  }
}
