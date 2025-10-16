/**
 * Tax Report Routes
 * API endpoints for automated fiscal report generation
 * Supports Brazil (ICMS, ISS, PIS, COFINS, IRPJ, CSLL) and Estonia (VAT, CIT)
 */

import { Elysia, t } from 'elysia';
import { taxReportService } from '../services/tax-report.service';

export const taxReportRoutes = new Elysia({ prefix: '/api/v1/tax-reports' })
  /**
   * Generate new tax report
   * Automatically calculates all taxes based on current jurisdiction
   */
  .post(
    '/generate',
    async ({ body, headers }) => {
      // Extract user info from headers (in production, use JWT)
      const tenantId = headers['x-tenant-id'];
      const userId = headers['x-user-id'] || 'unknown';

      if (!tenantId) {
        return {
          success: false,
          error: 'Tenant ID is required',
        };
      }

      const {
        reportType,
        fiscalYear,
        fiscalPeriod,
        periodStartDate,
        periodEndDate,
        generationMethod,
      } = body;

      // Generate report
      const result = await taxReportService.generateReport({
        tenantId: tenantId as string,
        reportType: reportType as 'monthly' | 'quarterly' | 'annual' | 'custom',
        fiscalYear,
        fiscalPeriod,
        periodStartDate: new Date(periodStartDate),
        periodEndDate: new Date(periodEndDate),
        generatedBy: userId as string,
        generationMethod: (generationMethod || 'manual') as 'automatic' | 'manual' | 'scheduled',
      });

      if (!result.success) {
        return result;
      }

      return {
        success: true,
        data: result.data,
        message: 'Tax report generated successfully',
      };
    },
    {
      body: t.Object({
        reportType: t.String({
          description: 'Report type: monthly, quarterly, annual, or custom',
        }),
        fiscalYear: t.String({ description: 'Fiscal year (e.g., "2025")' }),
        fiscalPeriod: t.String({ description: 'Fiscal period (e.g., "2025-01", "2025-Q1")' }),
        periodStartDate: t.String({ description: 'Period start date (ISO 8601)' }),
        periodEndDate: t.String({ description: 'Period end date (ISO 8601)' }),
        generationMethod: t.Optional(
          t.String({ description: 'Generation method: automatic, manual, or scheduled' }),
        ),
      }),
      detail: {
        tags: ['Tax Reports'],
        summary: 'Generate tax report',
        description:
          'Generates comprehensive tax report based on current jurisdiction configuration. Automatically calculates all applicable taxes.',
      },
    },
  )

  /**
   * Generate quick monthly report
   * Convenience endpoint for current month
   */
  .post(
    '/generate/monthly',
    async ({ body, headers }) => {
      const tenantId = headers['x-tenant-id'];
      const userId = headers['x-user-id'] || 'unknown';

      if (!tenantId) {
        return {
          success: false,
          error: 'Tenant ID is required',
        };
      }

      const { year, month } = body;

      // Calculate period dates
      const periodStartDate = new Date(year, month - 1, 1);
      const periodEndDate = new Date(year, month, 0); // Last day of month

      const fiscalPeriod = `${year}-${String(month).padStart(2, '0')}`;

      // Generate report
      const result = await taxReportService.generateReport({
        tenantId: tenantId as string,
        reportType: 'monthly',
        fiscalYear: String(year),
        fiscalPeriod,
        periodStartDate,
        periodEndDate,
        generatedBy: userId as string,
        generationMethod: 'manual',
      });

      if (!result.success) {
        return result;
      }

      return {
        success: true,
        data: result.data,
        message: `Monthly tax report for ${fiscalPeriod} generated successfully`,
      };
    },
    {
      body: t.Object({
        year: t.Number({ description: 'Year (e.g., 2025)' }),
        month: t.Number({ description: 'Month (1-12)' }),
      }),
      detail: {
        tags: ['Tax Reports'],
        summary: 'Generate monthly report (quick)',
        description: 'Convenience endpoint to generate report for a specific month',
      },
    },
  )

  /**
   * Get all reports for tenant
   */
  .get(
    '/',
    async ({ query, headers }) => {
      const tenantId = headers['x-tenant-id'];

      if (!tenantId) {
        return {
          success: false,
          error: 'Tenant ID is required',
        };
      }

      const limit = query.limit ? parseInt(query.limit) : 50;

      const result = await taxReportService.getReports(tenantId as string, limit);

      return result;
    },
    {
      query: t.Object({
        limit: t.Optional(t.String({ description: 'Maximum number of reports to return' })),
      }),
      detail: {
        tags: ['Tax Reports'],
        summary: 'Get all reports',
        description: 'Returns all tax reports for the current tenant',
      },
    },
  )

  /**
   * Get specific report by ID
   */
  .get(
    '/:reportId',
    async ({ params, headers }) => {
      const tenantId = headers['x-tenant-id'];
      const { reportId } = params;

      if (!tenantId) {
        return {
          success: false,
          error: 'Tenant ID is required',
        };
      }

      const result = await taxReportService.getReportById(reportId, tenantId as string);

      return result;
    },
    {
      params: t.Object({
        reportId: t.String({ description: 'Report ID (UUID)' }),
      }),
      detail: {
        tags: ['Tax Reports'],
        summary: 'Get report by ID',
        description: 'Returns detailed information about a specific tax report',
      },
    },
  )

  /**
   * Mark report as filed with tax authorities
   */
  .post(
    '/:reportId/file',
    async ({ params, body, headers }) => {
      const tenantId = headers['x-tenant-id'];
      const userId = headers['x-user-id'] || 'unknown';
      const { reportId } = params;
      const { filingReference } = body;

      if (!tenantId) {
        return {
          success: false,
          error: 'Tenant ID is required',
        };
      }

      const result = await taxReportService.markAsFiled(
        reportId,
        tenantId as string,
        userId as string,
        filingReference,
      );

      if (!result.success) {
        return result;
      }

      return {
        success: true,
        message: 'Report marked as filed successfully',
      };
    },
    {
      params: t.Object({
        reportId: t.String({ description: 'Report ID (UUID)' }),
      }),
      body: t.Object({
        filingReference: t.Optional(
          t.String({ description: 'Government filing reference number' }),
        ),
      }),
      detail: {
        tags: ['Tax Reports'],
        summary: 'Mark report as filed',
        description: 'Updates report status to "filed" with optional government reference',
      },
    },
  )

  /**
   * Delete report
   */
  .delete(
    '/:reportId',
    async ({ params, headers }) => {
      const tenantId = headers['x-tenant-id'];
      const { reportId } = params;

      if (!tenantId) {
        return {
          success: false,
          error: 'Tenant ID is required',
        };
      }

      const result = await taxReportService.deleteReport(reportId, tenantId as string);

      if (!result.success) {
        return result;
      }

      return {
        success: true,
        message: 'Report deleted successfully',
      };
    },
    {
      params: t.Object({
        reportId: t.String({ description: 'Report ID (UUID)' }),
      }),
      detail: {
        tags: ['Tax Reports'],
        summary: 'Delete report',
        description: 'Permanently deletes a tax report',
      },
    },
  )

  /**
   * Get report statistics
   */
  .get(
    '/stats/summary',
    async ({ headers }) => {
      const tenantId = headers['x-tenant-id'];

      if (!tenantId) {
        return {
          success: false,
          error: 'Tenant ID is required',
        };
      }

      // Get all reports for statistics
      const result = await taxReportService.getReports(tenantId as string, 100);

      if (!result.success || !result.data) {
        return {
          success: false,
          error: 'Failed to fetch statistics',
        };
      }

      const reports = result.data;

      // Calculate statistics
      const totalReports = reports.length;
      const draftReports = reports.filter((r) => r.status === 'draft').length;
      const readyReports = reports.filter((r) => r.status === 'ready').length;
      const filedReports = reports.filter((r) => r.status === 'filed').length;

      // Calculate total tax amounts
      let totalTaxAmount = 0;
      reports.forEach((report) => {
        if (report.reportData && typeof report.reportData === 'object') {
          const data = report.reportData as any;
          if (data.summary && data.summary.totalTaxAmount) {
            totalTaxAmount += data.summary.totalTaxAmount;
          }
        }
      });

      // Get latest report
      const latestReport = reports.length > 0 ? reports[0] : null;

      return {
        success: true,
        data: {
          totalReports,
          reportsByStatus: {
            draft: draftReports,
            ready: readyReports,
            filed: filedReports,
          },
          totalTaxAmount: Math.round(totalTaxAmount * 100) / 100,
          latestReport: latestReport
            ? {
                id: latestReport.id,
                reportName: latestReport.reportName,
                fiscalPeriod: latestReport.fiscalPeriod,
                generatedAt: latestReport.generatedAt,
                status: latestReport.status,
              }
            : null,
        },
      };
    },
    {
      detail: {
        tags: ['Tax Reports'],
        summary: 'Get report statistics',
        description: 'Returns summary statistics about tax reports for the tenant',
      },
    },
  );
