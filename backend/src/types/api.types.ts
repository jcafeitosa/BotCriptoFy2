/**
 * API Types Export
 *
 * This file exports type-safe API types that can be used in TypeScript clients.
 * Leverages Elysia's automatic type inference from schema definitions.
 *
 * Usage in client (e.g., frontend):
 * ```typescript
 * import type { ApiRoutes, HealthResponse, InfoResponse } from '@/types/api.types';
 *
 * // Type-safe API calls
 * const response: HealthResponse = await fetch('/').then(r => r.json());
 * ```
 */

import type { App } from '../index';

// Export the entire app type for advanced usage
export type ApiRoutes = App;

// ===========================================
// Health & Status Types
// ===========================================

export type HealthCheckResponse = {
  status: string;
  message: string;
  version: string;
  environment: string;
  timestamp: string;
};

export type DetailedHealthResponse = {
  status: string;
  checks: {
    database: string;
    redis: string;
    ollama: string;
  };
  uptime: number;
  timestamp: string;
};

// ===========================================
// API Info Types
// ===========================================

export type ApiInfoResponse = {
  name: string;
  version: string;
  description: string;
  features: string[];
};

export type VersionInfoResponse = {
  version: string;
  build: string;
  commit: string;
  buildDate: string;
};

// ===========================================
// Error Types
// ===========================================

export type ApiError = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
};

export type ValidationError = {
  success: false;
  error: {
    code: 'VALIDATION_ERROR';
    message: string;
    details: {
      type: string;
      on: string;
      summary: string;
      property?: string;
      message?: string;
      expected?: any;
      found?: any;
      errors?: any;
    };
  };
  timestamp: string;
};

// ===========================================
// Common Response Types
// ===========================================

export type ApiSuccessResponse<T = any> = {
  success: true;
  data: T;
  timestamp?: string;
};

export type PaginatedResponse<T = any> = {
  success: true;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  timestamp?: string;
};

// ===========================================
// Type Guards
// ===========================================

export function isApiError(response: any): response is ApiError {
  return response && response.success === false && 'error' in response;
}

export function isValidationError(response: any): response is ValidationError {
  return (
    isApiError(response) &&
    response.error.code === 'VALIDATION_ERROR'
  );
}

export function isApiSuccess<T>(response: any): response is ApiSuccessResponse<T> {
  return response && response.success === true && 'data' in response;
}

// ===========================================
// Future Module Types (Placeholders)
// ===========================================

// Auth Types (to be implemented)
export type LoginRequest = {
  email: string;
  password: string;
};

export type RegisterRequest = {
  email: string;
  password: string;
  name: string;
};

export type AuthResponse = {
  token: string;
  user: {
    id: number;
    email: string;
    name: string;
    role?: string;
  };
};

// User Types (to be implemented)
export type User = {
  id: number;
  email: string;
  name: string;
  role?: string;
  tenantId?: number;
  createdAt: string;
  updatedAt: string;
};

// Tenant Types (to be implemented)
export type Tenant = {
  id: number;
  name: string;
  type: 'company' | 'trader' | 'influencer';
  plan?: string;
  createdAt: string;
  updatedAt: string;
};

// Trading Types (to be implemented)
export type Order = {
  id: number;
  type: 'buy' | 'sell';
  symbol: string;
  amount: number;
  price: number;
  status: 'pending' | 'filled' | 'cancelled';
  createdAt: string;
};

export type Portfolio = {
  totalValue: number;
  assets: {
    symbol: string;
    amount: number;
    value: number;
  }[];
  performance: {
    daily: number;
    weekly: number;
    monthly: number;
  };
};
