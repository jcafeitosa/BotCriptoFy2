import { db } from '@/db';
import { exchangeConfigurations, exchanges } from '../schema/exchanges.schema';
import {
  encryptSecret,
  serializeEncryptedSecret,
  decryptSecret,
  deserializeEncryptedSecret,
} from '../utils/encryption.util';
import type {
  CreateExchangeConfigRequest,
  ExchangeConfigurationResponse,
  ExchangeConfigurationWithSecrets,
} from '../types/exchanges.types';
import { BadRequestError, NotFoundError } from '@/utils/errors';
import { and, eq } from 'drizzle-orm';
import logger from '@/utils/logger';

type ConfigurationRow = {
  id: string;
  exchangeId: string;
  slug: string;
  status: string;
  sandbox: boolean;
  permissions: unknown;
  createdAt: Date | null;
  updatedAt: Date | null;
  lastSyncAt: Date | null;
  lastErrorAt: Date | null;
  lastErrorMessage: string | null;
  apiKeyEncrypted: string;
  apiSecretEncrypted: string;
  passphraseEncrypted: string | null;
};

export class ExchangeConfigurationService {
  static async createConfiguration(params: {
    userId: string;
    tenantId: string;
    request: CreateExchangeConfigRequest;
  }): Promise<ExchangeConfigurationResponse> {
    const { userId, tenantId, request } = params;

    const exchangeRecord = await db
      .select({ id: exchanges.id, slug: exchanges.slug })
      .from(exchanges)
      .where(and(eq(exchanges.slug, request.exchangeSlug), eq(exchanges.status, 'active')))
      .limit(1)
      .then((rows) => rows[0]);

    if (!exchangeRecord) {
      throw new NotFoundError(`Exchange ${request.exchangeSlug} is not registered`);
    }

    const existing = await db
      .select({ id: exchangeConfigurations.id })
      .from(exchangeConfigurations)
      .where(
        and(
          eq(exchangeConfigurations.userId, userId),
          eq(exchangeConfigurations.tenantId, tenantId),
          eq(exchangeConfigurations.exchangeId, exchangeRecord.id)
        )
      )
      .limit(1)
      .then((rows) => rows[0]);

    if (existing) {
      throw new BadRequestError('Exchange configuration already exists for this tenant');
    }

    const apiKeyEncrypted = serializeEncryptedSecret(encryptSecret(request.apiKey));
    const apiSecretEncrypted = serializeEncryptedSecret(encryptSecret(request.apiSecret));
    const passphraseEncrypted = request.passphrase
      ? serializeEncryptedSecret(encryptSecret(request.passphrase))
      : null;

    let record;
    try {
      [record] = await db
        .insert(exchangeConfigurations)
        .values({
          userId,
          tenantId,
          exchangeId: exchangeRecord.id,
          apiKeyEncrypted,
          apiSecretEncrypted,
          passphraseEncrypted: passphraseEncrypted ?? undefined,
          sandbox: request.sandbox ?? false,
          permissions: request.permissions ?? {},
        })
        .returning();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('relation "exchange_configurations" does not exist')) {
        throw new BadRequestError(
          'Exchange configuration storage is not initialized. Run database migrations before storing credentials.'
        );
      }
      logger.error('Failed to create exchange configuration', { error: message });
      throw error;
    }

    return this.mapRowToResponse({
      id: record.id,
      exchangeId: record.exchangeId,
      slug: exchangeRecord.slug,
      status: record.status,
      sandbox: record.sandbox,
      permissions: record.permissions,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      lastSyncAt: record.lastSyncAt ?? null,
      lastErrorAt: record.lastErrorAt ?? null,
      lastErrorMessage: record.lastErrorMessage ?? null,
      apiKeyEncrypted: record.apiKeyEncrypted,
      apiSecretEncrypted: record.apiSecretEncrypted,
      passphraseEncrypted: record.passphraseEncrypted ?? null,
    });
  }

  static async listConfigurations(params: {
    userId: string;
    tenantId: string;
  }): Promise<ExchangeConfigurationResponse[]> {
    const { userId, tenantId } = params;

    let rows: ConfigurationRow[] = [];

    try {
      rows = await db
        .select({
          id: exchangeConfigurations.id,
          exchangeId: exchangeConfigurations.exchangeId,
          slug: exchanges.slug,
          status: exchangeConfigurations.status,
          sandbox: exchangeConfigurations.sandbox,
          permissions: exchangeConfigurations.permissions,
          createdAt: exchangeConfigurations.createdAt,
          updatedAt: exchangeConfigurations.updatedAt,
          lastSyncAt: exchangeConfigurations.lastSyncAt,
          lastErrorAt: exchangeConfigurations.lastErrorAt,
          lastErrorMessage: exchangeConfigurations.lastErrorMessage,
          apiKeyEncrypted: exchangeConfigurations.apiKeyEncrypted,
          apiSecretEncrypted: exchangeConfigurations.apiSecretEncrypted,
          passphraseEncrypted: exchangeConfigurations.passphraseEncrypted,
        })
        .from(exchangeConfigurations)
        .innerJoin(exchanges, eq(exchangeConfigurations.exchangeId, exchanges.id))
        .where(
          and(
            eq(exchangeConfigurations.userId, userId),
            eq(exchangeConfigurations.tenantId, tenantId)
          )
        );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('relation "exchange_configurations" does not exist')) {
        return [];
      }
      logger.error('Failed to list exchange configurations', { error: message });
      throw error;
    }

    return rows.map((row) => this.mapRowToResponse(row));
  }

  static async deleteConfiguration(params: {
    userId: string;
    tenantId: string;
    configurationId: string;
  }): Promise<void> {
    const { userId, tenantId, configurationId } = params;

    let removed;
    try {
      [removed] = await db
        .delete(exchangeConfigurations)
        .where(
          and(
            eq(exchangeConfigurations.id, configurationId),
            eq(exchangeConfigurations.userId, userId),
            eq(exchangeConfigurations.tenantId, tenantId)
          )
        )
        .returning();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('relation "exchange_configurations" does not exist')) {
        throw new NotFoundError('Exchange configuration storage is not initialized');
      }
      logger.error('Failed to delete exchange configuration', { error: message });
      throw error;
    }

    if (!removed) {
      throw new NotFoundError('Exchange configuration not found');
    }
  }

  static async disableConfiguration(params: {
    userId: string;
    tenantId: string;
    configurationId: string;
  }): Promise<void> {
    const { userId, tenantId, configurationId } = params;

    const [updated] = await db
      .update(exchangeConfigurations)
      .set({ status: 'disabled', updatedAt: new Date() })
      .where(
        and(
          eq(exchangeConfigurations.id, configurationId),
          eq(exchangeConfigurations.userId, userId),
          eq(exchangeConfigurations.tenantId, tenantId)
        )
      )
      .returning({ id: exchangeConfigurations.id });

    if (!updated) {
      throw new NotFoundError('Exchange configuration not found');
    }
  }

  static async getConfigurationById(params: {
    userId: string;
    tenantId: string;
    configurationId: string;
    includeDisabled?: boolean;
  }): Promise<ExchangeConfigurationResponse> {
    const row = await this.fetchConfigurationRow(params);
    if (!row) {
      throw new NotFoundError('Exchange configuration not found');
    }
    return this.mapRowToResponse(row);
  }

  static async getConfigurationWithSecrets(params: {
    userId: string;
    tenantId: string;
    configurationId: string;
    includeDisabled?: boolean;
  }): Promise<ExchangeConfigurationWithSecrets> {
    const row = await this.fetchConfigurationRow(params);
    if (!row) {
      throw new NotFoundError('Exchange configuration not found');
    }
    return {
      ...this.mapRowToResponse(row),
      apiKey: this.decryptConfigurationSecrets(row.apiKeyEncrypted),
      apiSecret: this.decryptConfigurationSecrets(row.apiSecretEncrypted),
      passphrase: row.passphraseEncrypted
        ? this.decryptConfigurationSecrets(row.passphraseEncrypted)
        : null,
    };
  }

  static async updateSyncMetadata(params: {
    configurationId: string;
    userId: string;
    tenantId: string;
    status?: string;
    lastSyncAt?: Date | null;
    lastErrorAt?: Date | null;
    lastErrorMessage?: string | null;
  }): Promise<void> {
    const { configurationId, userId, tenantId, status, lastSyncAt, lastErrorAt, lastErrorMessage } = params;
    const patch: Record<string, unknown> = { updatedAt: new Date() };

    if (typeof status === 'string') {
      patch.status = status;
    }
    if (lastSyncAt !== undefined) {
      patch.lastSyncAt = lastSyncAt;
    }
    if (lastErrorAt !== undefined) {
      patch.lastErrorAt = lastErrorAt;
    }
    if (lastErrorMessage !== undefined) {
      patch.lastErrorMessage = lastErrorMessage;
    }

    const [updated] = await db
      .update(exchangeConfigurations)
      .set(patch)
      .where(
        and(
          eq(exchangeConfigurations.id, configurationId),
          eq(exchangeConfigurations.userId, userId),
          eq(exchangeConfigurations.tenantId, tenantId)
        )
      )
      .returning({ id: exchangeConfigurations.id });

    if (!updated) {
      throw new NotFoundError('Exchange configuration not found');
    }
  }

  static decryptConfigurationSecrets(serialized: string): string {
    const decrypted = decryptSecret(deserializeEncryptedSecret(serialized));
    return decrypted;
  }

  private static async fetchConfigurationRow(params: {
    userId: string;
    tenantId: string;
    configurationId: string;
    includeDisabled?: boolean;
  }): Promise<ConfigurationRow | null> {
    const { userId, tenantId, configurationId, includeDisabled } = params;

    let condition = and(
      eq(exchangeConfigurations.id, configurationId),
      eq(exchangeConfigurations.userId, userId),
      eq(exchangeConfigurations.tenantId, tenantId)
    );

    if (!includeDisabled) {
      condition = and(condition, eq(exchangeConfigurations.status, 'active'));
    }

    try {
      return await db
        .select({
          id: exchangeConfigurations.id,
          exchangeId: exchangeConfigurations.exchangeId,
          slug: exchanges.slug,
          status: exchangeConfigurations.status,
          sandbox: exchangeConfigurations.sandbox,
          permissions: exchangeConfigurations.permissions,
          createdAt: exchangeConfigurations.createdAt,
          updatedAt: exchangeConfigurations.updatedAt,
          lastSyncAt: exchangeConfigurations.lastSyncAt,
          lastErrorAt: exchangeConfigurations.lastErrorAt,
          lastErrorMessage: exchangeConfigurations.lastErrorMessage,
          apiKeyEncrypted: exchangeConfigurations.apiKeyEncrypted,
          apiSecretEncrypted: exchangeConfigurations.apiSecretEncrypted,
          passphraseEncrypted: exchangeConfigurations.passphraseEncrypted,
        })
        .from(exchangeConfigurations)
        .innerJoin(exchanges, eq(exchangeConfigurations.exchangeId, exchanges.id))
        .where(condition)
        .limit(1)
        .then((rows) => rows[0] ?? null);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Failed to load exchange configuration', {
        configurationId,
        userId,
        tenantId,
        error: message,
      });
      throw error;
    }
  }

  private static mapRowToResponse(row: ConfigurationRow): ExchangeConfigurationResponse {
    return {
      id: row.id,
      exchangeId: row.exchangeId,
      exchangeSlug: row.slug,
      status: row.status,
      sandbox: row.sandbox,
      permissions: row.permissions as Record<string, boolean>,
      createdAt: row.createdAt ?? new Date(0),
      updatedAt: row.updatedAt ?? new Date(0),
      lastSyncAt: row.lastSyncAt,
      lastErrorAt: row.lastErrorAt,
      lastErrorMessage: row.lastErrorMessage,
    };
  }
}
