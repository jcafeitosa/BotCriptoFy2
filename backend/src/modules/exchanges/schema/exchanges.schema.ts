/**
 * Exchanges Schema
 * Database schema for exchange connections
 */

import { pgTable, uuid, varchar, text, timestamp, boolean, jsonb } from 'drizzle-orm/pg-core';

/**
 * User Exchange Connections
 * Stores API keys and configuration for exchange connections
 */
export const exchangeConnections = pgTable('exchange_connections', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  tenantId: uuid('tenant_id').notNull(),

  // Exchange Info
  exchangeId: varchar('exchange_id', { length: 50 }).notNull(), // binance, coinbase, kraken, etc
  exchangeName: varchar('exchange_name', { length: 100 }).notNull(),

  // API Credentials (encrypted)
  apiKey: text('api_key').notNull(), // Encrypted
  apiSecret: text('api_secret').notNull(), // Encrypted
  apiPassword: text('api_password'), // For some exchanges (OKX, Huobi)

  // Configuration
  sandbox: boolean('sandbox').default(false).notNull(), // Testnet/Sandbox mode
  enableTrading: boolean('enable_trading').default(false).notNull(),
  enableWithdrawal: boolean('enable_withdrawal').default(false).notNull(),

  // Status
  status: varchar('status', { length: 20 }).default('active').notNull(), // active, disabled, error
  isVerified: boolean('is_verified').default(false).notNull(),
  lastSyncAt: timestamp('last_sync_at'),

  // Metadata
  balances: jsonb('balances'), // Cached balances
  permissions: jsonb('permissions'), // API key permissions
  metadata: jsonb('metadata'),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type ExchangeConnection = typeof exchangeConnections.$inferSelect;
export type NewExchangeConnection = typeof exchangeConnections.$inferInsert;
