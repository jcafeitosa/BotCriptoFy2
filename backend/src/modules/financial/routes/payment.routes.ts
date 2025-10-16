/**
 * Payment Routes
 *
 * Routes for payment processing, refunds, and gateway management
 */

import { Elysia, t } from 'elysia';
import { sessionGuard, requireTenant } from '../../auth/middleware/session.middleware';
import { paymentProcessor } from '../services/payment-processor.service';
import { gatewaySelector } from '../services/gateway-selector.service';
import { dunningService } from '../services/dunning.service';
import { db } from '../../../db';
import { paymentTransactions, paymentRefunds } from '../schema/payments.schema';
import { eq, and, desc } from 'drizzle-orm';

/**
 * Payment routes
 */
export const paymentRoutes = new Elysia({ prefix: '/api/v1/payments' })
  .use(sessionGuard)
  .use(requireTenant)
  /**
   * Create a new payment
   */
  .post(
    '/',
    async ({ body, user, tenantId }) => {
      const result = await paymentProcessor.processPayment({
        tenantId,
        userId: user.id,
        amount: body.amount,
        currency: body.currency,
        paymentMethod: body.paymentMethod,
        country: body.country || 'BR',
        userPreferences: body.gatewayPreferences,
        metadata: body.metadata,
        installments: body.installments,
        savePaymentMethod: body.savePaymentMethod,
      });

      if (!result.success) {
        return {
          success: false,
          error: result.error,
          code: result.code,
        };
      }

      return result.data;
    },
    {
      body: t.Object({
        amount: t.Number({ minimum: 0.01 }),
        currency: t.String({ minLength: 3, maxLength: 3 }),
        paymentMethod: t.Union([
          t.Literal('pix'),
          t.Literal('credit_card'),
          t.Literal('debit_card'),
          t.Literal('boleto'),
          t.Literal('bank_transfer'),
          t.Literal('digital_wallet'),
        ]),
        country: t.Optional(t.String({ minLength: 2, maxLength: 2 })),
        gatewayPreferences: t.Optional(t.Array(t.String())),
        metadata: t.Optional(t.Record(t.String(), t.Any())),
        installments: t.Optional(t.Number({ minimum: 1, maximum: 12 })),
        savePaymentMethod: t.Optional(t.Boolean()),
      }),
    }
  )

  /**
   * Get payment status
   */
  .get(
    '/:id',
    async ({ params, tenantId }) => {
      const result = await paymentProcessor.getPaymentStatus(params.id);

      if (!result.success) {
        return {
          success: false,
          error: result.error,
          code: result.code,
        };
      }

      // Verify transaction belongs to tenant
      if (result.data && result.data.transaction.tenantId !== tenantId) {
        return {
          success: false,
          error: 'Transaction not found',
          code: 'NOT_FOUND',
        };
      }

      return result.data;
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )

  /**
   * List payments with filters
   */
  .get(
    '/',
    async ({ query, tenantId }) => {
      const { status, limit = 50, offset = 0 } = query;

      let queryBuilder = db
        .select()
        .from(paymentTransactions)
        .where(eq(paymentTransactions.tenantId, tenantId))
        .orderBy(desc(paymentTransactions.createdAt))
        .limit(limit)
        .offset(offset);

      if (status) {
        queryBuilder = db
          .select()
          .from(paymentTransactions)
          .where(
            and(
              eq(paymentTransactions.tenantId, tenantId),
              eq(paymentTransactions.status, status)
            )
          )
          .orderBy(desc(paymentTransactions.createdAt))
          .limit(limit)
          .offset(offset);
      }

      const transactions = await queryBuilder;

      return {
        success: true,
        data: transactions,
        pagination: {
          limit,
          offset,
          total: transactions.length,
        },
      };
    },
    {
      query: t.Object({
        status: t.Optional(t.String()),
        limit: t.Optional(t.Number({ minimum: 1, maximum: 100 })),
        offset: t.Optional(t.Number({ minimum: 0 })),
      }),
    }
  )

  /**
   * Process a refund
   */
  .post(
    '/:id/refund',
    async ({ params, body, tenantId }) => {
      // Get transaction to verify ownership
      const transaction = await db
        .select()
        .from(paymentTransactions)
        .where(eq(paymentTransactions.id, params.id))
        .limit(1);

      if (transaction.length === 0 || transaction[0].tenantId !== tenantId) {
        return {
          success: false,
          error: 'Transaction not found',
          code: 'NOT_FOUND',
        };
      }

      const result = await paymentProcessor.processRefund({
        transactionId: params.id,
        amount: body.amount,
        reason: body.reason,
      });

      return result;
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        amount: t.Optional(t.Number({ minimum: 0.01 })),
        reason: t.Optional(t.String({ maxLength: 100 })),
      }),
    }
  )

  /**
   * Get refunds for a payment
   */
  .get(
    '/:id/refunds',
    async ({ params, tenantId }) => {
      // Verify transaction ownership
      const transaction = await db
        .select()
        .from(paymentTransactions)
        .where(eq(paymentTransactions.id, params.id))
        .limit(1);

      if (transaction.length === 0 || transaction[0].tenantId !== tenantId) {
        return {
          success: false,
          error: 'Transaction not found',
          code: 'NOT_FOUND',
        };
      }

      const refunds = await db
        .select()
        .from(paymentRefunds)
        .where(eq(paymentRefunds.transactionId, params.id))
        .orderBy(desc(paymentRefunds.createdAt));

      return {
        success: true,
        data: refunds,
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )

  /**
   * Get dunning status for a payment
   */
  .get(
    '/:id/dunning',
    async ({ params, tenantId }) => {
      // Verify transaction ownership
      const transaction = await db
        .select()
        .from(paymentTransactions)
        .where(eq(paymentTransactions.id, params.id))
        .limit(1);

      if (transaction.length === 0 || transaction[0].tenantId !== tenantId) {
        return {
          success: false,
          error: 'Transaction not found',
          code: 'NOT_FOUND',
        };
      }

      const dunning = await dunningService.getDunningStatus(params.id);

      return {
        success: true,
        data: dunning,
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )

  /**
   * Pause dunning for a payment
   */
  .post(
    '/:id/dunning/pause',
    async ({ params, tenantId }) => {
      // Verify transaction ownership
      const transaction = await db
        .select()
        .from(paymentTransactions)
        .where(eq(paymentTransactions.id, params.id))
        .limit(1);

      if (transaction.length === 0 || transaction[0].tenantId !== tenantId) {
        return {
          success: false,
          error: 'Transaction not found',
          code: 'NOT_FOUND',
        };
      }

      await dunningService.pauseDunning(params.id);

      return {
        success: true,
        message: 'Dunning paused',
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )

  /**
   * Resume dunning for a payment
   */
  .post(
    '/:id/dunning/resume',
    async ({ params, tenantId }) => {
      // Verify transaction ownership
      const transaction = await db
        .select()
        .from(paymentTransactions)
        .where(eq(paymentTransactions.id, params.id))
        .limit(1);

      if (transaction.length === 0 || transaction[0].tenantId !== tenantId) {
        return {
          success: false,
          error: 'Transaction not found',
          code: 'NOT_FOUND',
        };
      }

      await dunningService.resumeDunning(params.id);

      return {
        success: true,
        message: 'Dunning resumed',
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )

  /**
   * Get dunning statistics
   */
  .get(
    '/dunning/stats',
    async ({ tenantId }) => {
      const stats = await dunningService.getDunningStats(tenantId);

      return {
        success: true,
        data: stats,
      };
    }
  );

/**
 * Gateway routes
 */
export const gatewayRoutes = new Elysia({ prefix: '/api/v1/gateways' })
  .use(sessionGuard)
  /**
   * List available gateways
   */
  .get(
    '/',
    async ({ query }) => {
      const { country, currency, paymentMethod } = query;

      if (!country || !currency) {
        return {
          success: false,
          error: 'Country and currency are required',
          code: 'INVALID_REQUEST',
        };
      }

      const gateways = await gatewaySelector.getAvailableGateways(
        country,
        currency,
        paymentMethod as any
      );

      return {
        success: true,
        data: gateways.map((g) => ({
          name: g.name,
          slug: g.slug,
          provider: g.provider,
          supportedMethods: Object.keys(g.supportedMethods).filter(
            (m) => g.supportedMethods[m].enabled
          ),
          fees: g.fees,
        })),
      };
    },
    {
      query: t.Object({
        country: t.String({ minLength: 2, maxLength: 2 }),
        currency: t.String({ minLength: 3, maxLength: 3 }),
        paymentMethod: t.Optional(t.String()),
      }),
    }
  )

  /**
   * Get gateway details
   */
  .get(
    '/:slug',
    async ({ params }) => {
      const gateway = await gatewaySelector.getGatewayBySlug(params.slug);

      if (!gateway) {
        return {
          success: false,
          error: 'Gateway not found',
          code: 'NOT_FOUND',
        };
      }

      return {
        success: true,
        data: {
          name: gateway.name,
          slug: gateway.slug,
          provider: gateway.provider,
          supportedCountries: gateway.supportedCountries,
          supportedCurrencies: gateway.supportedCurrencies,
          supportedMethods: gateway.supportedMethods,
          fees: gateway.fees,
        },
      };
    },
    {
      params: t.Object({
        slug: t.String(),
      }),
    }
  );

/**
 * Webhook routes (public, no authentication)
 */
export const webhookRoutes = new Elysia({ prefix: '/api/v1/webhooks' })
  /**
   * Handle webhook from payment gateway
   */
  .post(
    '/:gateway',
    async ({ params, body, headers }) => {
      const signature = headers['x-signature'] || headers['stripe-signature'] || '';

      // Get gateway ID
      const gateway = await gatewaySelector.getGatewayBySlug(params.gateway);

      if (!gateway) {
        return {
          success: false,
          error: 'Gateway not found',
        };
      }

      const result = await paymentProcessor.processWebhook(params.gateway, {
        gatewayId: gateway.slug,
        externalId: (body as any).id || (body as any).external_id,
        eventType: (body as any).type || (body as any).event_type,
        payload: body as any,
        signature,
      });

      return result;
    },
    {
      params: t.Object({
        gateway: t.String(),
      }),
      body: t.Any(), // Accept any webhook payload
    }
  );
