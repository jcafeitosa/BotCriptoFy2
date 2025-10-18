/**
 * Exchange Markets Schema
 * Stores normalized markets per tenant/exchange for auditing/performance
 */

import { pgTable, uuid, varchar, boolean, jsonb, timestamp } from 'drizzle-orm/pg-core';

export const exchangeMarkets = pgTable('exchange_markets', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  exchangeId: varchar('exchange_id', { length: 50 }).notNull(),
  sandbox: boolean('sandbox').default(false).notNull(),
  // Market fields
  symbol: varchar('symbol', { length: 100 }).notNull(),
  base: varchar('base', { length: 50 }).notNull(),
  quote: varchar('quote', { length: 50 }).notNull(),
  active: boolean('active').default(true).notNull(),
  type: varchar('type', { length: 20 }).notNull(), // spot|future|swap
  precision: jsonb('precision'),
  limits: jsonb('limits'),
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type ExchangeMarketRow = typeof exchangeMarkets.$inferSelect;
export type NewExchangeMarketRow = typeof exchangeMarkets.$inferInsert;

