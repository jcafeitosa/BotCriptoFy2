/**
 * Tax Schema
 *
 * Gerenciamento de impostos e obrigações fiscais
 */

import {
  pgTable,
  text,
  timestamp,
  decimal,
  uuid,
  boolean,
  jsonb,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

/**
 * Tax Types (Brazilian)
 */
export type TaxType =
  | 'ICMS' // Imposto sobre Circulação de Mercadorias e Serviços
  | 'ISS' // Imposto sobre Serviços
  | 'PIS' // Programa de Integração Social
  | 'COFINS' // Contribuição para Financiamento da Seguridade Social
  | 'IPI' // Imposto sobre Produtos Industrializados
  | 'IRPJ' // Imposto de Renda Pessoa Jurídica
  | 'CSLL' // Contribuição Social sobre o Lucro Líquido
  | 'INSS' // Instituto Nacional do Seguro Social
  | 'FGTS' // Fundo de Garantia do Tempo de Serviço
  | 'IR_RETIDO' // Imposto de Renda Retido na Fonte
  | 'SIMPLES' // Simples Nacional
  | 'OTHER';

/**
 * Tax Regime (Brazilian)
 */
export type TaxRegime =
  | 'simples_nacional'
  | 'lucro_presumido'
  | 'lucro_real'
  | 'mei' // Microempreendedor Individual
  | 'other';

/**
 * Tax Filing Status
 */
export type TaxFilingStatus =
  | 'draft'
  | 'pending_review'
  | 'ready_to_file'
  | 'filed'
  | 'paid'
  | 'overdue'
  | 'amended';

/**
 * Tax Rates Table
 * Tabela de alíquotas de impostos
 */
export const taxRates = pgTable('tax_rates', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),

  // Tax identification
  name: text('name').notNull(),
  taxType: text('tax_type').notNull().$type<TaxType>(),
  description: text('description'),

  // Rate
  rate: decimal('rate', { precision: 5, scale: 2 }).notNull(), // Percentage (e.g., 18.00 = 18%)
  isCompound: boolean('is_compound').default(false), // If this tax is calculated on top of another

  // Applicability
  stateCode: text('state_code'), // For state-specific taxes (e.g., ICMS)
  cityCode: text('city_code'), // For city-specific taxes (e.g., ISS)
  productCategory: text('product_category'), // If rate varies by product
  serviceCategory: text('service_category'), // If rate varies by service

  // Effective period
  effectiveFrom: timestamp('effective_from').notNull(),
  effectiveTo: timestamp('effective_to'),

  // Status
  isActive: boolean('is_active').default(true),

  // Metadata
  legalReference: text('legal_reference'), // Law/decree reference
  notes: text('notes'),

  // Audit
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

/**
 * Tax Records Table
 * Registro de impostos a pagar/receber
 */
export const taxRecords = pgTable('tax_records', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),

  // Record identification
  recordNumber: text('record_number').notNull().unique(),
  taxType: text('tax_type').notNull().$type<TaxType>(),
  taxRateId: uuid('tax_rate_id').references(() => taxRates.id),

  // Period
  fiscalYear: text('fiscal_year').notNull(), // "2025"
  fiscalPeriod: text('fiscal_period').notNull(), // "2025-01"
  periodStartDate: timestamp('period_start_date').notNull(),
  periodEndDate: timestamp('period_end_date').notNull(),

  // Financial data
  currency: text('currency').notNull().default('BRL'),
  taxableAmount: decimal('taxable_amount', { precision: 18, scale: 2 }).notNull(), // Base de cálculo
  taxRate: decimal('tax_rate', { precision: 5, scale: 2 }).notNull(),
  taxAmount: decimal('tax_amount', { precision: 18, scale: 2 }).notNull(),
  deductions: decimal('deductions', { precision: 18, scale: 2 }).default('0.00'),
  netTaxAmount: decimal('net_tax_amount', { precision: 18, scale: 2 }).notNull(),

  // Payment tracking
  dueDate: timestamp('due_date').notNull(),
  paidAmount: decimal('paid_amount', { precision: 18, scale: 2 }).default('0.00'),
  paidDate: timestamp('paid_date'),
  paymentMethod: text('payment_method'), // DARF, GNRE, boleto, etc.
  paymentReference: text('payment_reference'), // Payment document number

  // Status
  status: text('status').notNull().default('draft').$type<TaxFilingStatus>(),

  // Source tracking
  sourceType: text('source_type'), // 'invoice', 'expense', 'payroll', 'manual'
  sourceIds: jsonb('source_ids').$type<string[]>(), // Array of source IDs

  // Additional tax data
  taxData: jsonb('tax_data').$type<{
    darfCode?: string; // DARF code
    gnreCode?: string; // GNRE code
    authenticationCode?: string; // Código de autenticação
    barcode?: string; // Boleto barcode
    federalTaxId?: string; // CNPJ/CPF
    stateRegistration?: string; // Inscrição Estadual
    cityRegistration?: string; // Inscrição Municipal
  }>(),

  // Attachments
  attachments: jsonb('attachments').$type<
    Array<{
      id: string;
      filename: string;
      url: string;
      type: string; // darf, gnre, receipt, etc.
      uploadedAt: string;
    }>
  >(),

  // Notes
  notes: text('notes'),
  internalNotes: text('internal_notes'),

  // Audit
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  createdBy: uuid('created_by').notNull(),
  updatedBy: uuid('updated_by').notNull(),
});

/**
 * Tax Obligations Table
 * Obrigações fiscais acessórias (declarações)
 */
export const taxObligations = pgTable('tax_obligations', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),

  // Obligation identification
  name: text('name').notNull(), // "SPED Fiscal", "SPED Contribuições", "DCTF", etc.
  code: text('code').notNull(), // Official code
  description: text('description'),

  // Frequency
  frequency: text('frequency').notNull(), // 'monthly', 'quarterly', 'yearly', 'annual'
  dueDay: text('due_day').notNull(), // Day of month (e.g., "20" for 20th day)

  // Applicability
  taxRegime: text('tax_regime').$type<TaxRegime>(), // Which regime requires this
  companySize: text('company_size'), // 'mei', 'small', 'medium', 'large'
  hasEmployees: boolean('has_employees'), // Required only if company has employees

  // Legal reference
  legalReference: text('legal_reference'),
  governmentSystem: text('government_system'), // URL or name of filing system

  // Notification settings
  reminderDaysBefore: decimal('reminder_days_before', { precision: 5, scale: 0 }).default('7'),
  notifyUsers: jsonb('notify_users').$type<string[]>(), // User IDs to notify

  // Status
  isActive: boolean('is_active').default(true),

  // Audit
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

/**
 * Tax Filings Table
 * Entregas de obrigações acessórias
 */
export const taxFilings = pgTable('tax_filings', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  obligationId: uuid('obligation_id')
    .notNull()
    .references(() => taxObligations.id),

  // Filing period
  fiscalYear: text('fiscal_year').notNull(),
  fiscalPeriod: text('fiscal_period').notNull(),
  periodStartDate: timestamp('period_start_date').notNull(),
  periodEndDate: timestamp('period_end_date').notNull(),

  // Due date
  dueDate: timestamp('due_date').notNull(),

  // Status
  status: text('status').notNull().default('pending_review').$type<TaxFilingStatus>(),

  // Filing details
  filedDate: timestamp('filed_date'),
  filedBy: uuid('filed_by'),
  receiptNumber: text('receipt_number'), // Government receipt number
  protocolNumber: text('protocol_number'), // Filing protocol number

  // Generated files
  generatedFiles: jsonb('generated_files').$type<
    Array<{
      id: string;
      filename: string;
      url: string;
      fileType: string; // xml, txt, pdf
      generatedAt: string;
    }>
  >(),

  // Validation
  hasErrors: boolean('has_errors').default(false),
  validationErrors: jsonb('validation_errors').$type<
    Array<{
      code: string;
      message: string;
      field?: string;
    }>
  >(),

  // Notes
  notes: text('notes'),

  // Audit
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

/**
 * Tax Exemptions Table
 * Isenções e benefícios fiscais
 */
export const taxExemptions = pgTable('tax_exemptions', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),

  // Exemption details
  name: text('name').notNull(),
  description: text('description'),
  exemptionType: text('exemption_type').notNull(), // 'full', 'partial', 'deferral'
  taxType: text('tax_type').notNull().$type<TaxType>(),

  // Exemption amount
  exemptionPercent: decimal('exemption_percent', { precision: 5, scale: 2 }), // For partial exemptions
  exemptionAmount: decimal('exemption_amount', { precision: 18, scale: 2 }), // Fixed amount exemption

  // Applicability
  productCategory: text('product_category'),
  serviceCategory: text('service_category'),
  stateCode: text('state_code'),
  cityCode: text('city_code'),

  // Validity period
  effectiveFrom: timestamp('effective_from').notNull(),
  effectiveTo: timestamp('effective_to'),

  // Legal reference
  legalReference: text('legal_reference').notNull(),
  governmentDocument: text('government_document'), // URL to official document

  // Status
  isActive: boolean('is_active').default(true),
  requiresApproval: boolean('requires_approval').default(false),
  approvedBy: uuid('approved_by'),
  approvedAt: timestamp('approved_at'),

  // Audit
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

/**
 * Relations
 */
export const taxRatesRelations = relations(taxRates, ({ many }) => ({
  records: many(taxRecords),
}));

export const taxRecordsRelations = relations(taxRecords, ({ one }) => ({
  taxRate: one(taxRates, {
    fields: [taxRecords.taxRateId],
    references: [taxRates.id],
  }),
}));

export const taxObligationsRelations = relations(taxObligations, ({ many }) => ({
  filings: many(taxFilings),
}));

export const taxFilingsRelations = relations(taxFilings, ({ one }) => ({
  obligation: one(taxObligations, {
    fields: [taxFilings.obligationId],
    references: [taxObligations.id],
  }),
}));

/**
 * Type Exports
 */
export type TaxRate = typeof taxRates.$inferSelect;
export type NewTaxRate = typeof taxRates.$inferInsert;
export type TaxRecord = typeof taxRecords.$inferSelect;
export type NewTaxRecord = typeof taxRecords.$inferInsert;
export type TaxObligation = typeof taxObligations.$inferSelect;
export type NewTaxObligation = typeof taxObligations.$inferInsert;
export type TaxFiling = typeof taxFilings.$inferSelect;
export type NewTaxFiling = typeof taxFilings.$inferInsert;
export type TaxExemption = typeof taxExemptions.$inferSelect;
export type NewTaxExemption = typeof taxExemptions.$inferInsert;
