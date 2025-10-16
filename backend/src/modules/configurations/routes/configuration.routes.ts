/**
 * Configuration Routes
 * API endpoints for system configuration management
 */

import { Elysia, t } from 'elysia';
import { sessionGuard } from '../../auth/middleware/session.middleware';
import {
  getAllConfigurations,
  getConfigByKey,
  createConfiguration,
  updateConfiguration,
  deleteConfiguration,
} from '../services/configuration.service';
import type { ConfigDataType, ConfigCategory } from '../types/configuration.types';

/**
 * Configuration routes plugin
 * Requires authentication - only admins should access these
 */
export const configurationRoutes = new Elysia({ prefix: '/api/configurations', name: 'configuration-routes' })
  .use(sessionGuard)

  // Get all configurations
  .get(
    '/',
    async ({ query }) => {
      const configs = await getAllConfigurations({
        category: query.category as any,
        isReadonly: query.isReadonly === 'true',
        isSensitive: query.isSensitive === 'true',
      });

      return {
        success: true,
        data: configs,
        total: configs.length,
      };
    },
    {
      query: t.Object({
        category: t.Optional(t.String()),
        isReadonly: t.Optional(t.String()),
        isSensitive: t.Optional(t.String()),
      }),
      detail: {
        tags: ['Configurations'],
        summary: 'List all configurations',
        description: 'Get list of system configurations (admin only)',
      },
    }
  )

  // Get configuration by key
  .get(
    '/:key',
    async ({ params }) => {
      const config = await getConfigByKey(params.key);

      return {
        success: true,
        data: config,
      };
    },
    {
      params: t.Object({
        key: t.String(),
      }),
      detail: {
        tags: ['Configurations'],
        summary: 'Get configuration',
        description: 'Get configuration by key',
      },
    }
  )

  // Create new configuration
  .post(
    '/',
    async ({ user, body }) => {
      const config = await createConfiguration({
        ...body,
        dataType: body.dataType as ConfigDataType,
        category: body.category as ConfigCategory,
        createdBy: user.id,
      });

      return {
        success: true,
        message: 'Configuration created successfully',
        data: config,
      };
    },
    {
      body: t.Object({
        key: t.String(),
        value: t.String(),
        dataType: t.String(),
        category: t.String(),
        description: t.Optional(t.String()),
        isEncrypted: t.Optional(t.Boolean()),
        isSensitive: t.Optional(t.Boolean()),
        isReadonly: t.Optional(t.Boolean()),
        validationRules: t.Optional(t.Record(t.String(), t.Any())),
      }),
      detail: {
        tags: ['Configurations'],
        summary: 'Create configuration',
        description: 'Create a new system configuration',
      },
    }
  )

  // Update configuration
  .put(
    '/:key',
    async ({ user, params, body }) => {
      const config = await updateConfiguration(params.key, {
        value: body.value,
        updatedBy: user.id,
      });

      return {
        success: true,
        message: 'Configuration updated successfully',
        data: config,
      };
    },
    {
      params: t.Object({
        key: t.String(),
      }),
      body: t.Object({
        value: t.String(),
      }),
      detail: {
        tags: ['Configurations'],
        summary: 'Update configuration',
        description: 'Update configuration value',
      },
    }
  )

  // Delete configuration
  .delete(
    '/:key',
    async ({ user, params }) => {
      const result = await deleteConfiguration(params.key, user.id);

      return result;
    },
    {
      params: t.Object({
        key: t.String(),
      }),
      detail: {
        tags: ['Configurations'],
        summary: 'Delete configuration',
        description: 'Delete a configuration',
      },
    }
  );
