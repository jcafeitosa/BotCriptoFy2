import { pgTable, uuid, varchar, text, jsonb, timestamp, boolean, decimal, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { users } from '@/modules/auth/schema/auth.schema';

/**
 * Exchanges catalog
 * Stores metadata for supported exchanges and their capabilities
 */
export const exchanges = pgTable(
  'exchanges',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    slug: varchar('slug', { length: 64 }).notNull(),
    name: varchar('name', { length: 128 }).notNull(),
    displayName: varchar('display_name', { length: 128 }).notNull(),
    country: varchar('country', { length: 64 }),
    website: varchar('website', { length: 255 }),
    apiDocsUrl: varchar('api_docs_url', { length: 255 }),
    logoUrl: varchar('logo_url', { length: 255 }),
    status: varchar('status', { length: 32 }).notNull().default('active'),
    supportedFeatures: jsonb('supported_features').$type<Record<string, boolean>>().notNull().default({}),
    tradingFees: jsonb('trading_fees').$type<Record<string, unknown>>().notNull().default({}),
    withdrawalFees: jsonb('withdrawal_fees').$type<Record<string, unknown>>().notNull().default({}),
    depositMethods: jsonb('deposit_methods').$type<string[]>().notNull().default([]),
    withdrawalMethods: jsonb('withdrawal_methods').$type<string[]>().notNull().default([]),
    supportedCurrencies: jsonb('supported_currencies').$type<string[]>().notNull().default([]),
    supportedPairs: jsonb('supported_pairs').$type<string[]>().notNull().default([]),
    rateLimits: jsonb('rate_limits').$type<Record<string, unknown>>().notNull().default({}),
    apiRequirements: jsonb('api_requirements').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => ({
    slugIdx: uniqueIndex('exchanges_slug_idx').on(table.slug),
    statusIdx: index('exchanges_status_idx').on(table.status),
    countryIdx: index('exchanges_country_idx').on(table.country),
  })
);

/**
 * User exchange configurations
 * Stores encrypted API credentials per user/tenant/exchange
 */
export const exchangeConfigurations = pgTable(
  'exchange_configurations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    tenantId: varchar('tenant_id', { length: 64 }).notNull(),
    exchangeId: uuid('exchange_id').notNull().references(() => exchanges.id, { onDelete: 'cascade' }),
    apiKeyEncrypted: text('api_key_encrypted').notNull(),
    apiSecretEncrypted: text('api_secret_encrypted').notNull(),
    passphraseEncrypted: text('passphrase_encrypted'),
    sandbox: boolean('sandbox').notNull().default(false),
    permissions: jsonb('permissions').$type<Record<string, boolean>>().notNull().default({}),
    status: varchar('status', { length: 32 }).notNull().default('active'),
    lastSyncAt: timestamp('last_sync_at', { withTimezone: true }),
    lastErrorAt: timestamp('last_error_at', { withTimezone: true }),
    lastErrorMessage: text('last_error_message'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => ({
    uniqueUserExchange: uniqueIndex('exchange_configurations_user_exchange_unique').on(
      table.userId,
      table.tenantId,
      table.exchangeId
    ),
    statusIdx: index('exchange_configurations_status_idx').on(table.status),
  })
);

/**
 * Exchange order history (optional — populated when users create orders via connectors)
 */
export const exchangeOrders = pgTable(
  'exchange_orders',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    tenantId: varchar('tenant_id', { length: 64 }).notNull(),
    exchangeId: uuid('exchange_id').notNull().references(() => exchanges.id, { onDelete: 'cascade' }),
    exchangeOrderId: varchar('exchange_order_id', { length: 255 }).notNull(),
    symbol: varchar('symbol', { length: 50 }).notNull(),
    side: varchar('side', { length: 10 }).notNull(),
    type: varchar('type', { length: 20 }).notNull(),
    amount: decimal('amount', { precision: 20, scale: 8 }).notNull(),
    price: decimal('price', { precision: 20, scale: 8 }),
    stopPrice: decimal('stop_price', { precision: 20, scale: 8 }),
    filledAmount: decimal('filled_amount', { precision: 20, scale: 8 }).default('0'),
    remainingAmount: decimal('remaining_amount', { precision: 20, scale: 8 }).default('0'),
    averagePrice: decimal('average_price', { precision: 20, scale: 8 }),
    status: varchar('status', { length: 20 }).notNull(),
    timeInForce: varchar('time_in_force', { length: 10 }).default('GTC'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
    filledAt: timestamp('filled_at', { withTimezone: true }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  },
  (table) => ({
    uniqueExchangeOrder: uniqueIndex('exchange_orders_exchange_order_unique').on(
      table.exchangeId,
      table.exchangeOrderId
    ),
    userIdx: index('exchange_orders_user_idx').on(table.userId),
    exchangeIdx: index('exchange_orders_exchange_idx').on(table.exchangeId),
    symbolIdx: index('exchange_orders_symbol_idx').on(table.symbol),
    statusIdx: index('exchange_orders_status_idx').on(table.status),
  })
);

/**
 * Exchange balances per currency
 */
export const exchangeBalances = pgTable(
  'exchange_balances',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    tenantId: varchar('tenant_id', { length: 64 }).notNull(),
    exchangeId: uuid('exchange_id').notNull().references(() => exchanges.id, { onDelete: 'cascade' }),
    currency: varchar('currency', { length: 12 }).notNull(),
    freeBalance: decimal('free_balance', { precision: 20, scale: 8 }).notNull().default('0'),
    usedBalance: decimal('used_balance', { precision: 20, scale: 8 }).notNull().default('0'),
    totalBalance: decimal('total_balance', { precision: 20, scale: 8 }).notNull().default('0'),
    lastUpdated: timestamp('last_updated', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uniqueCurrency: uniqueIndex('exchange_balances_unique').on(
      table.userId,
      table.tenantId,
      table.exchangeId,
      table.currency
    ),
    currencyIdx: index('exchange_balances_currency_idx').on(table.currency),
    updatedIdx: index('exchange_balances_updated_idx').on(table.lastUpdated),
  })
);

export type Exchange = typeof exchanges.$inferSelect;
export type ExchangeConfiguration = typeof exchangeConfigurations.$inferSelect;

// Backward compatibility alias for legacy modules still referencing exchangeConnections
export const exchangeConnections = exchangeConfigurations;
export type ExchangeConnection = ExchangeConfiguration;
