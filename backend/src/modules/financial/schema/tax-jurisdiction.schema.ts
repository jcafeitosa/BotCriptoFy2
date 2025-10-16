/**
 * Tax Jurisdiction Configuration Schema
 *
 * Gerenciamento de configuração de jurisdição tributária da plataforma
 * CEO-controlled - Afeta todos os cálculos fiscais da plataforma
 */

import {
  pgTable,
  text,
  timestamp,
  uuid,
  jsonb,
  boolean,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

/**
 * Tax Jurisdiction Codes
 */
export type TaxJurisdictionCode = 'BR' | 'EE';

/**
 * Tax Jurisdiction Status
 */
export type JurisdictionStatus = 'active' | 'inactive' | 'migrating';

/**
 * Tax Jurisdiction Configuration Table
 * Tabela de configuração de jurisdição tributária
 *
 * IMPORTANTE: Esta é uma configuração PLATFORM-WIDE
 * Somente o CEO/Super Admin pode alterar
 * Afeta todos os cálculos fiscais da plataforma
 */
export const taxJurisdictionConfig = pgTable('tax_jurisdiction_config', {
  id: uuid('id').defaultRandom().primaryKey(),

  // Jurisdiction identification
  jurisdiction: text('jurisdiction').notNull().$type<TaxJurisdictionCode>(),
  countryName: text('country_name').notNull(), // "Brazil", "Estonia"
  countryCode: text('country_code').notNull(), // "BRA", "EST"
  flag: text('flag').notNull(), // "🇧🇷", "🇪🇪"

  // Currency and locale
  currency: text('currency').notNull(), // "BRL", "EUR"
  currencySymbol: text('currency_symbol').notNull(), // "R$", "€"
  locale: text('locale').notNull(), // "pt-BR", "et-EE"

  // Tax system metadata
  taxSystem: jsonb('tax_system').notNull().$type<{
    vatRates: {
      standard: number;
      reduced?: number;
      zero?: number;
    };
    corporateTaxRates: {
      retained?: number; // For Estonia 0%
      distributed?: number; // For Estonia 20/80
      standard?: number; // For Brazil 24%
    };
    personalIncomeTax: {
      type: 'flat' | 'progressive';
      rate?: number; // For flat rate (Estonia 20%)
      brackets?: Array<{ min: number; max: number; rate: number }>; // For progressive (Brazil)
    };
    specialFeatures: string[]; // ["Zero tax on retained profits", "E-Residency support"]
    complianceRequirements: string[]; // ["NF-e", "SPED"] or ["E-Invoice", "EMTA"]
  }>(),

  // Status
  status: text('status').notNull().default('active').$type<JurisdictionStatus>(),
  isActive: boolean('is_active').notNull().default(true),

  // Configuration tracking
  configuredAt: timestamp('configured_at').notNull().defaultNow(),
  configuredBy: uuid('configured_by').notNull(), // User ID (must be CEO/Super Admin)
  configuredByRole: text('configured_by_role').notNull(), // "CEO" or "SUPER_ADMIN"

  // Previous jurisdiction (for migration tracking)
  previousJurisdiction: text('previous_jurisdiction').$type<TaxJurisdictionCode>(),
  migratedFrom: timestamp('migrated_from'),
  migrationReason: text('migration_reason'),

  // Notes
  notes: text('notes'),
  migrationNotes: text('migration_notes'),

  // Audit
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

/**
 * Tax Jurisdiction History Table
 * Histórico de mudanças de jurisdição (audit trail)
 *
 * Registra todas as mudanças de jurisdição para compliance e auditoria
 */
export const taxJurisdictionHistory = pgTable('tax_jurisdiction_history', {
  id: uuid('id').defaultRandom().primaryKey(),

  // Reference to current config
  configId: uuid('config_id')
    .notNull()
    .references(() => taxJurisdictionConfig.id),

  // Change details
  action: text('action').notNull(), // 'created', 'updated', 'activated', 'deactivated', 'migrated'
  fromJurisdiction: text('from_jurisdiction').$type<TaxJurisdictionCode>(),
  toJurisdiction: text('to_jurisdiction').notNull().$type<TaxJurisdictionCode>(),

  // Who made the change
  changedBy: uuid('changed_by').notNull(),
  changedByRole: text('changed_by_role').notNull(),

  // Change metadata
  changeReason: text('change_reason'),
  changeNotes: text('change_notes'),

  // Impact assessment
  affectedRecords: jsonb('affected_records').$type<{
    invoices: number;
    expenses: number;
    taxRecords: number;
    otherRecords: number;
  }>(),

  // Migration status (if applicable)
  migrationStarted: timestamp('migration_started'),
  migrationCompleted: timestamp('migration_completed'),
  migrationStatus: text('migration_status'), // 'pending', 'in_progress', 'completed', 'failed'
  migrationErrors: jsonb('migration_errors').$type<
    Array<{
      code: string;
      message: string;
      recordId?: string;
      recordType?: string;
    }>
  >(),

  // Approval workflow (for critical changes)
  requiresApproval: boolean('requires_approval').default(true),
  approvedBy: uuid('approved_by'),
  approvedAt: timestamp('approved_at'),
  approvalNotes: text('approval_notes'),

  // Timestamp
  changedAt: timestamp('changed_at').notNull().defaultNow(),

  // Audit
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

/**
 * Tax Jurisdiction Reports Table
 * Relatórios fiscais gerados automaticamente
 */
export const taxReports = pgTable('tax_reports', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),

  // Report identification
  reportType: text('report_type').notNull(), // 'monthly', 'quarterly', 'annual', 'custom'
  reportName: text('report_name').notNull(),
  jurisdiction: text('jurisdiction').notNull().$type<TaxJurisdictionCode>(),

  // Period
  fiscalYear: text('fiscal_year').notNull(),
  fiscalPeriod: text('fiscal_period').notNull(),
  periodStartDate: timestamp('period_start_date').notNull(),
  periodEndDate: timestamp('period_end_date').notNull(),

  // Report data
  reportData: jsonb('report_data').notNull().$type<{
    summary: {
      totalRevenue: number;
      totalExpenses: number;
      totalTaxableAmount: number;
      totalTaxAmount: number;
    };
    taxBreakdown: Array<{
      taxType: string;
      taxableAmount: number;
      rate: number;
      taxAmount: number;
    }>;
    deductions: Array<{
      type: string;
      amount: number;
      description: string;
    }>;
    additionalData?: Record<string, any>;
  }>(),

  // Generated files
  generatedFiles: jsonb('generated_files').$type<
    Array<{
      id: string;
      filename: string;
      url: string;
      format: string; // 'pdf', 'xml', 'csv', 'xlsx'
      size: number;
      generatedAt: string;
    }>
  >(),

  // Status
  status: text('status').notNull().default('draft'), // 'draft', 'ready', 'filed', 'archived'

  // Generation metadata
  generatedAt: timestamp('generated_at').notNull().defaultNow(),
  generatedBy: uuid('generated_by').notNull(),
  generationMethod: text('generation_method').notNull(), // 'automatic', 'manual', 'scheduled'

  // Filing information (if filed with authorities)
  filedAt: timestamp('filed_at'),
  filedBy: uuid('filed_by'),
  filingReference: text('filing_reference'), // Government reference number
  filingReceipt: text('filing_receipt'), // Receipt URL

  // Notes
  notes: text('notes'),

  // Audit
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

/**
 * Relations
 */
export const taxJurisdictionConfigRelations = relations(
  taxJurisdictionConfig,
  ({ many }) => ({
    history: many(taxJurisdictionHistory),
  })
);

export const taxJurisdictionHistoryRelations = relations(
  taxJurisdictionHistory,
  ({ one }) => ({
    config: one(taxJurisdictionConfig, {
      fields: [taxJurisdictionHistory.configId],
      references: [taxJurisdictionConfig.id],
    }),
  })
);

/**
 * Type Exports
 */
export type TaxJurisdictionConfig = typeof taxJurisdictionConfig.$inferSelect;
export type NewTaxJurisdictionConfig = typeof taxJurisdictionConfig.$inferInsert;
export type TaxJurisdictionHistory = typeof taxJurisdictionHistory.$inferSelect;
export type NewTaxJurisdictionHistory = typeof taxJurisdictionHistory.$inferInsert;
export type TaxReport = typeof taxReports.$inferSelect;
export type NewTaxReport = typeof taxReports.$inferInsert;
