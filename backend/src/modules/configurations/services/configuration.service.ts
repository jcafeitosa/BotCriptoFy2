/**
 * Configuration Service
 * Business logic for system configuration management
 */

import { db } from '@/db';
import { systemConfigurations } from '../schema/configurations.schema';
import { eq, and } from 'drizzle-orm';
import type { ConfigurationFilter, UpdateConfigurationRequest, CreateConfigurationRequest } from '../types/configuration.types';
import { ForbiddenError, NotFoundError } from '@/utils/errors';

/**
 * Get all configurations
 */
export async function getAllConfigurations(filter?: ConfigurationFilter) {
  const conditions = [];

  if (filter?.category) {
    conditions.push(eq(systemConfigurations.category, filter.category));
  }

  if (filter?.isReadonly !== undefined) {
    conditions.push(eq(systemConfigurations.isReadonly, filter.isReadonly));
  }

  if (filter?.isSensitive !== undefined) {
    conditions.push(eq(systemConfigurations.isSensitive, filter.isSensitive));
  }

  const configs = await db
    .select()
    .from(systemConfigurations)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  // Hide sensitive values
  return configs.map((config) => ({
    ...config,
    value: config.isSensitive ? '***REDACTED***' : config.value,
  }));
}

/**
 * Get configuration by key
 */
export async function getConfigByKey(key: string) {
  const [config] = await db
    .select()
    .from(systemConfigurations)
    .where(eq(systemConfigurations.key, key))
    .limit(1);

  if (!config) {
    throw new NotFoundError('Configuration not found', { key });
  }

  return config;
}

/**
 * Create new configuration
 */
export async function createConfiguration(request: CreateConfigurationRequest) {
  // Check if key already exists
  const existing = await db
    .select()
    .from(systemConfigurations)
    .where(eq(systemConfigurations.key, request.key))
    .limit(1);

  if (existing.length > 0) {
    throw new ForbiddenError('Configuration key already exists', { key: request.key });
  }

  const [created] = await db
    .insert(systemConfigurations)
    .values({
      key: request.key,
      value: request.value,
      dataType: request.dataType,
      category: request.category,
      description: request.description,
      isEncrypted: request.isEncrypted || false,
      isSensitive: request.isSensitive || false,
      isReadonly: request.isReadonly || false,
      validationRules: request.validationRules || {},
      createdBy: request.createdBy,
    })
    .returning();

  return created;
}

/**
 * Update configuration value
 */
export async function updateConfiguration(key: string, request: UpdateConfigurationRequest) {
  const [existing] = await db
    .select()
    .from(systemConfigurations)
    .where(eq(systemConfigurations.key, key))
    .limit(1);

  if (!existing) {
    throw new NotFoundError('Configuration not found', { key });
  }

  if (existing.isReadonly) {
    throw new ForbiddenError('Cannot update readonly configuration', { key });
  }

  const [updated] = await db
    .update(systemConfigurations)
    .set({
      value: request.value,
      updatedBy: request.updatedBy,
      updatedAt: new Date(),
    })
    .where(eq(systemConfigurations.key, key))
    .returning();

  return updated;
}

/**
 * Delete configuration
 */
export async function deleteConfiguration(key: string, _userId: string) {
  const [existing] = await db
    .select()
    .from(systemConfigurations)
    .where(eq(systemConfigurations.key, key))
    .limit(1);

  if (!existing) {
    throw new NotFoundError('Configuration not found', { key });
  }

  if (existing.isReadonly) {
    throw new ForbiddenError('Cannot delete readonly configuration', { key });
  }

  await db
    .delete(systemConfigurations)
    .where(eq(systemConfigurations.key, key));

  return { success: true, message: 'Configuration deleted' };
}

/**
 * Get configuration value (typed)
 * Helper to get and parse configuration values
 */
export async function getConfigValue<T = any>(key: string): Promise<T> {
  const config = await getConfigByKey(key);

  switch (config.dataType) {
    case 'number':
      return Number(config.value) as T;
    case 'boolean':
      return (config.value === 'true') as T;
    case 'json':
    case 'array':
      return JSON.parse(config.value) as T;
    default:
      return config.value as T;
  }
}
