/**
 * Configuration Types
 */

export type ConfigDataType = 'string' | 'number' | 'boolean' | 'json' | 'array';
export type ConfigCategory = 'general' | 'security' | 'performance' | 'integration' | 'feature_flags';

export interface ConfigurationFilter {
  category?: ConfigCategory;
  isReadonly?: boolean;
  isSensitive?: boolean;
}

export interface UpdateConfigurationRequest {
  value: string;
  updatedBy: string;
}

export interface CreateConfigurationRequest {
  key: string;
  value: string;
  dataType: ConfigDataType;
  category: ConfigCategory;
  description?: string;
  isEncrypted?: boolean;
  isSensitive?: boolean;
  isReadonly?: boolean;
  validationRules?: Record<string, any>;
  createdBy: string;
}
