/**
 * Payment Routes
 *
 * Routes for payment processing, refunds, and gateway management
 */

import { Elysia, t } from 'elysia';
import { sessionGuard, requireTenant } from '../../auth/middleware/session.middleware';
import { requirePermission } from '../../security/middleware/rbac.middleware';
import { paymentProcessor } from '../services/payment-processor.service';
import { gatewaySelector } from '../services/gateway-selector.service';
import { dunningService } from '../services/dunning.service';
import type { PaymentListFilters } from '../types/payment.types';

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
    { beforeHandle: [requirePermission('financial', 'write')] },
    async ({ body, user, tenantId }: any) => {
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
    { beforeHandle: [requirePermission('financial', 'read')] },
    async ({ params, tenantId }: any) => {
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
    { beforeHandle: [requirePermission('financial', 'read')] },
    async ({ query, tenantId }: any) => {
      const page = query.page ? parseInt(query.page) : 1;
      const pageSize = query.pageSize ? parseInt(query.pageSize) : 50;

      const filters = {
        status: query.status as any,
        paymentMethod: query.paymentMethod as any,
        gateway: query.gateway,
        dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
        dateTo: query.dateTo ? new Date(query.dateTo) : undefined,
      } satisfies PaymentListFilters;

      const result = await paymentProcessor.listTransactions(tenantId, filters, page, pageSize);

      if (!result.success || !result.data) {
        return {
          success: false,
          error: result.error || 'Failed to list transactions',
          code: result.code,
        };
      }

      return {
        success: true,
        data: result.data,
      };
    },
    {
      query: t.Object({
        status: t.Optional(t.String()),
        paymentMethod: t.Optional(t.String()),
        gateway: t.Optional(t.String()),
        dateFrom: t.Optional(t.String()),
        dateTo: t.Optional(t.String()),
        page: t.Optional(t.String()),
        pageSize: t.Optional(t.String()),
      }),
    }
  )
  .get(
    '/analytics',
    { beforeHandle: [requirePermission('financial', 'read')] },
    async ({ query, tenantId }: any) => {
      const result = await paymentProcessor.getAnalytics(tenantId, {
        dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
        dateTo: query.dateTo ? new Date(query.dateTo) : undefined,
      });

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Failed to compute analytics',
          code: result.code,
        };
      }

      return {
        success: true,
        data: result.data,
      };
    },
    {
      query: t.Object({
        dateFrom: t.Optional(t.String()),
        dateTo: t.Optional(t.String()),
      }),
      detail: {
        tags: ['Financeiro - Pagamentos'],
        summary: 'Resumo analítico de pagamentos',
        description: 'Retorna totais, breakdown por status/método e métricas de dunning',
      },
    }
  )
  .get(
    '/:id/detail',
    { beforeHandle: [requirePermission('financial', 'read')] },
    async ({ params, tenantId }: any) => {
      const detail = await paymentProcessor.getTransactionDetail(params.id, tenantId);

      if (!detail.success || !detail.data) {
        return {
          success: false,
          error: detail.error || 'Transaction not found',
          code: detail.code || 'NOT_FOUND',
        };
      }

      return {
        success: true,
        data: detail.data,
      };
    },
    {
      params: t.Object({ id: t.String() }),
      detail: {
        tags: ['Financeiro - Pagamentos'],
        summary: 'Detalhes completos de um pagamento',
        description: 'Inclui transação, reembolsos, webhooks e status de dunning',
      },
    }
  )

  /**
   * Process a refund
   */
  .post(
    '/:id/refund',
    { beforeHandle: [requirePermission('financial', 'manage')] },
    async ({ params, body, tenantId }: any) => {
      const transactionStatus = await paymentProcessor.getPaymentStatus(params.id);

      if (!transactionStatus.success || transactionStatus.data?.transaction.tenantId !== tenantId) {
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
    { beforeHandle: [requirePermission('financial', 'read')] },
    async ({ params, tenantId }: any) => {
      const detail = await paymentProcessor.getTransactionDetail(params.id, tenantId);

      if (!detail.success || !detail.data) {
        return {
          success: false,
          error: detail.error || 'Transaction not found',
          code: detail.code || 'NOT_FOUND',
        };
      }

      return {
        success: true,
        data: detail.data.refunds,
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
    { beforeHandle: [requirePermission('financial', 'read')] },
    async ({ params, tenantId }: any) => {
      const status = await paymentProcessor.getPaymentStatus(params.id);

      if (!status.success || status.data?.transaction.tenantId !== tenantId) {
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
    { beforeHandle: [requirePermission('financial', 'manage')] },
    async ({ params, tenantId }: any) => {
      const status = await paymentProcessor.getPaymentStatus(params.id);

      if (!status.success || status.data?.transaction.tenantId !== tenantId) {
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
    { beforeHandle: [requirePermission('financial', 'manage')] },
    async ({ params, tenantId }: any) => {
      const status = await paymentProcessor.getPaymentStatus(params.id);

      if (!status.success || status.data?.transaction.tenantId !== tenantId) {
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
    { beforeHandle: [requirePermission('financial', 'read')] },
    async ({ tenantId }: any) => {
      const stats = await dunningService.getDunningStats(tenantId);

      return {
        success: true,
        data: stats,
      };
    }
  )
  .post(
    '/dunning/process',
    { beforeHandle: [requirePermission('financial', 'manage')] },
    async () => {
      const result = await dunningService.processDueDunning();
      return { success: true, data: result };
    }
  );

/**
 * Gateway routes
 */
export const gatewayRoutes = new Elysia({ prefix: '/api/v1/gateways' })
  .use(sessionGuard)
  .use(requireTenant)
  /**
   * List available gateways
   */
  .get(
    '/',
    { beforeHandle: [requirePermission('financial', 'read')] },
    async ({ query }: any) => {
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
    async ({ params }: any) => {
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
    async ({ params, body, headers }: any) => {
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
