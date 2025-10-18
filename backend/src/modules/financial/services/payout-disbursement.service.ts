/**
 * Payout Disbursement Service
 * Processa pagamentos de saída (payouts) para afiliados via gateways configurados.
 */

import { db } from '@/db';
import { and, eq, sql } from 'drizzle-orm';
import { customAlphabet } from 'nanoid';
import {
  paymentGateways,
  paymentTransactions,
  type PaymentTransaction,
  type PaymentMethodType,
} from '../schema/payments.schema';

const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const genId = customAlphabet(ALPHABET, 10);

export interface DisbursementRequest {
  tenantId: string;
  userId: string;
  method: Extract<PaymentMethodType, 'pix' | 'bank_transfer' | 'digital_wallet'> | 'stripe';
  amount: number;
  currency: string;
  details?: Record<string, unknown>;
}

export interface DisbursementInitResponse {
  transactionId: string;
  externalId: string;
  status: 'pending' | 'processing';
}

export class PayoutDisbursementService {
  /** Seleciona gateway adequado conforme método */
  private static async selectGateway(method: string) {
    const provider = method === 'stripe' ? 'stripe' : 'banco';
    const [gw] = await db
      .select()
      .from(paymentGateways)
      .where(and(eq(paymentGateways.provider, provider), eq(paymentGateways.isActive, true)))
      .limit(1);
    if (!gw) throw new Error(`No active gateway for provider ${provider}`);
    return gw;
  }

  static async initiateDisbursement(req: DisbursementRequest): Promise<DisbursementInitResponse> {
    if (req.amount <= 0) throw new Error('Invalid amount');
    const gw = await this.selectGateway(req.method);

    const externalId = `OUT_${genId()}`;

    const [tx] = await db
      .insert(paymentTransactions)
      .values({
        tenantId: req.tenantId,
        userId: req.userId,
        gatewayId: gw.id,
        externalId,
        amount: req.amount.toString(),
        currency: req.currency,
        paymentMethod: req.method,
        status: 'processing',
        gatewayStatus: 'processing',
        gatewayResponse: sql`to_jsonb(${JSON.stringify(req.details || {})})`,
        metadata: sql`jsonb_build_object('direction','outbound','domain','affiliate_payout')`,
      })
      .returning();

    return { transactionId: tx.id, externalId: tx.externalId, status: 'processing' };
  }

  static async markCompleted(transactionId: string, externalId?: string): Promise<PaymentTransaction> {
    const [updated] = await db
      .update(paymentTransactions)
      .set({
        status: 'completed',
        gatewayStatus: 'completed',
        externalId: externalId || sql`${paymentTransactions.externalId}`,
        processedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(paymentTransactions.id, transactionId))
      .returning();
    if (!updated) throw new Error('Transaction not found');
    return updated;
  }

  static async getStatus(transactionId: string): Promise<'pending' | 'processing' | 'completed' | 'failed'> {
    const [tx] = await db
      .select({ status: paymentTransactions.status })
      .from(paymentTransactions)
      .where(eq(paymentTransactions.id, transactionId))
      .limit(1);
    if (!tx) throw new Error('Transaction not found');
    return tx.status as any;
  }
}

