/**
 * Sales Forecasts Schema
 * Revenue predictions and forecasting
 */

import { pgTable, uuid, text, varchar, decimal, integer, timestamp, date, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tenants } from '../../tenants/schema/tenants.schema';
import { users } from '../../auth/schema/auth.schema';

/**
 * Forecast Period
 */
export type ForecastPeriod = 'monthly' | 'quarterly' | 'yearly';

/**
 * Forecast Methodology
 */
export type ForecastMethodology = 'weighted_pipeline' | 'historical' | 'linear_regression' | 'moving_average';

/**
 * Sales Forecasts Table
 * Store revenue predictions and forecast data
 */
export const salesForecasts = pgTable(
  'sales_forecasts',
  {
    // Primary Key
    id: uuid('id').primaryKey().defaultRandom(),

    // Foreign Keys
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    createdBy: text('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),

    // Forecast Period
    period: varchar('period', { length: 20 }).notNull().$type<ForecastPeriod>(),
    forecastDate: date('forecast_date').notNull(), // Date this forecast is for

    // Predictions
    predictedRevenue: decimal('predicted_revenue', { precision: 15, scale: 2 }).notNull(),
    weightedRevenue: decimal('weighted_revenue', { precision: 15, scale: 2 }).notNull(), // With probability
    bestCase: decimal('best_case', { precision: 15, scale: 2 }).notNull(), // Optimistic
    worstCase: decimal('worst_case', { precision: 15, scale: 2 }).notNull(), // Pessimistic

    // Confidence
    confidenceLevel: integer('confidence_level').notNull(), // 0-100

    // Methodology
    methodology: varchar('methodology', { length: 100 })
      .notNull()
      .$type<ForecastMethodology>(),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('sales_forecasts_tenant_id_idx').on(table.tenantId),
    periodIdx: index('sales_forecasts_period_idx').on(table.period),
    forecastDateIdx: index('sales_forecasts_forecast_date_idx').on(table.forecastDate),
    tenantPeriodIdx: index('sales_forecasts_tenant_period_idx').on(table.tenantId, table.period),
    tenantDateIdx: index('sales_forecasts_tenant_date_idx').on(table.tenantId, table.forecastDate),
  })
);

/**
 * Relations
 */
export const salesForecastsRelations = relations(salesForecasts, ({ one }) => ({
  tenant: one(tenants, {
    fields: [salesForecasts.tenantId],
    references: [tenants.id],
  }),
  creator: one(users, {
    fields: [salesForecasts.createdBy],
    references: [users.id],
  }),
}));

/**
 * Type Exports
 */
export type SalesForecast = typeof salesForecasts.$inferSelect;
export type NewSalesForecast = typeof salesForecasts.$inferInsert;
