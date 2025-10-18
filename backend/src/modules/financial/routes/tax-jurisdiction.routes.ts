/**
 * Tax Jurisdiction Routes
 * CEO-only routes for platform tax jurisdiction configuration with database persistence
 */

import { Elysia, t } from 'elysia';
import { taxJurisdictionService } from '../services/tax-jurisdiction.service';
import { sessionGuard, requireTenant } from '../../auth/middleware/session.middleware';
import { requirePermission } from '../../security/middleware/rbac.middleware';

export const taxJurisdictionRoutes = new Elysia({ prefix: '/api/v1/tax-jurisdiction' })
  .use(sessionGuard)
  .use(requireTenant)
  /**
   * Get current platform tax jurisdiction
   * Public endpoint (all users can see current configuration)
   */
  .get(
    '/current',
    { beforeHandle: [requirePermission('financial', 'read')] },
    async () => {
      const current = taxJurisdictionService.getCurrentJurisdiction();

      if (!current) {
        return {
          success: false,
          error: 'Tax jurisdiction not configured. Contact CEO to set up.',
        };
      }

      return {
        success: true,
        data: current,
      };
    },
    {
      detail: {
        tags: ['Tax Jurisdiction'],
        summary: 'Get current tax jurisdiction',
        description: 'Returns the currently configured tax jurisdiction for the platform',
      },
    },
  )

  /**
   * Get all available jurisdictions
   * Public endpoint (for selection UI)
   */
  .get(
    '/available',
    { beforeHandle: [requirePermission('financial', 'read')] },
    async () => {
      const jurisdictions = taxJurisdictionService.getAvailableJurisdictions();

      return {
        success: true,
        data: jurisdictions,
      };
    },
    {
      detail: {
        tags: ['Tax Jurisdiction'],
        summary: 'Get available jurisdictions',
        description: 'Returns all available tax jurisdictions with their features and benefits',
      },
    },
  )

  /**
   * Get specific jurisdiction info
   */
  .get(
    '/:jurisdiction',
    { beforeHandle: [requirePermission('financial', 'read')] },
    async ({ params }: any) => {
      const { jurisdiction } = params;

      if (jurisdiction !== 'BR' && jurisdiction !== 'EE') {
        return {
          success: false,
          error: 'Invalid jurisdiction. Valid options: BR, EE',
        };
      }

      const info = taxJurisdictionService.getJurisdictionInfo(jurisdiction);

      return {
        success: true,
        data: info,
      };
    },
    {
      params: t.Object({
        jurisdiction: t.String(),
      }),
      detail: {
        tags: ['Tax Jurisdiction'],
        summary: 'Get jurisdiction details',
        description: 'Returns detailed information about a specific tax jurisdiction',
      },
    },
  )

  /**
   * Set platform tax jurisdiction (CEO only)
   * CRITICAL: This affects all financial calculations platform-wide
   * NOW WITH DATABASE PERSISTENCE AND AUDIT TRAIL
   */
  .post(
    '/configure',
    { beforeHandle: [requirePermission('financial', 'manage')] },
    async ({ body, user }: any) => {
      const { jurisdiction } = body;

      // Validate jurisdiction
      if (jurisdiction !== 'BR' && jurisdiction !== 'EE') {
        return {
          success: false,
          error: 'Invalid jurisdiction. Valid options: BR (Brazil), EE (Estonia)',
        };
      }

      // Set jurisdiction (async - writes to database)
      const result = await taxJurisdictionService.setJurisdiction(jurisdiction, user.id);

      if (!result.success) {
        return result;
      }

      return {
        success: true,
        data: result.data,
        message: `Tax jurisdiction successfully set to ${jurisdiction} and persisted to database`,
      };
    },
    {
      body: t.Object({
        jurisdiction: t.String({ description: 'Tax jurisdiction code (BR or EE)' }),
      }),
      detail: {
        tags: ['Tax Jurisdiction'],
        summary: 'Configure tax jurisdiction (CEO only)',
        description: 'Sets the platform tax jurisdiction with database persistence and audit trail. Only CEO or Super Admin can perform this operation.',
      },
    },
  )

  /**
   * Get jurisdiction history (audit trail)
   * NEW: Shows all configuration changes with timestamps
   */
  .get(
    '/history',
    { beforeHandle: [requirePermission('financial', 'manage')] },
    async () => {
      const result = await taxJurisdictionService.getJurisdictionHistory();

      return result;
    },
    {
      detail: {
        tags: ['Tax Jurisdiction'],
        summary: 'Get jurisdiction history',
        description: 'Returns audit trail of all jurisdiction configuration changes (CEO/Admin only)',
      },
    },
  )

  /**
   * Test VAT calculation with current jurisdiction
   */
  .post(
    '/test/vat',
    { beforeHandle: [requirePermission('financial', 'read')] },
    async ({ body }: any) => {
      const { amount, category, stateCode, cityCode } = body;

      const result = taxJurisdictionService.calculateVAT(
        amount,
        category,
        new Date(),
        stateCode,
        cityCode,
      );

      return result;
    },
    {
      body: t.Object({
        amount: t.Number({ description: 'Amount to calculate VAT on' }),
        category: t.Optional(t.String({ description: 'VAT category (standard, reduced, zero)' })),
        stateCode: t.Optional(t.String({ description: 'State code (for Brazil ICMS)' })),
        cityCode: t.Optional(t.String({ description: 'City code (for Brazil ISS)' })),
      }),
      detail: {
        tags: ['Tax Jurisdiction'],
        summary: 'Test VAT calculation',
        description: 'Calculate VAT using the current jurisdiction configuration',
      },
    },
  )

  /**
   * Test Corporate Tax calculation with current jurisdiction
   */
  .post(
    '/test/corporate-tax',
    async ({ body }: any) => {
      const { amount, isDistribution } = body;

      const result = taxJurisdictionService.calculateCorporateTax(amount, isDistribution);

      return result;
    },
    {
      body: t.Object({
        amount: t.Number({ description: 'Amount to calculate tax on' }),
        isDistribution: t.Optional(
          t.Boolean({ description: 'Whether this is a distribution (for Estonia)' }),
        ),
      }),
      detail: {
        tags: ['Tax Jurisdiction'],
        summary: 'Test corporate tax calculation',
        description: 'Calculate corporate income tax using the current jurisdiction configuration',
      },
    },
  )

  /**
   * Validate tax ID with current jurisdiction
   */
  .post(
    '/test/validate-tax-id',
    async ({ body }: any) => {
      const { taxId, type } = body;

      const result = taxJurisdictionService.validateTaxId(
        taxId,
        type as 'personal' | 'business' | 'vat'
      );

      return result;
    },
    {
      body: t.Object({
        taxId: t.String({ description: 'Tax ID to validate' }),
        type: t.String({ description: 'Type: personal, business, or vat' }),
      }),
      detail: {
        tags: ['Tax Jurisdiction'],
        summary: 'Validate tax ID',
        description: 'Validate a tax ID using the current jurisdiction rules',
      },
    },
  )

  /**
   * Get jurisdiction configuration
   */
  .get(
    '/config',
    async () => {
      return taxJurisdictionService.getJurisdictionConfig();
    },
    {
      detail: {
        tags: ['Tax Jurisdiction'],
        summary: 'Get jurisdiction config',
        description: 'Returns the current jurisdiction configuration details',
      },
    },
  )

  /**
   * Reset jurisdiction (CEO only, for testing/migration)
   * NOW WITH DATABASE UPDATE
   */
  .delete(
    '/reset',
    async ({ headers }: any) => {
      const userId = headers['x-user-id'] || 'unknown';
      const userRole = headers['x-user-role'] || 'user';

      const result = await taxJurisdictionService.resetJurisdiction(
        userId as string,
        userRole as string,
      );

      if (!result.success) {
        return result;
      }

      return {
        success: true,
        message: 'Tax jurisdiction reset successfully in database and cache',
      };
    },
    {
      detail: {
        tags: ['Tax Jurisdiction'],
        summary: 'Reset jurisdiction (CEO only)',
        description: 'Resets the tax jurisdiction configuration in database and cache. Use with caution!',
      },
    },
  );
