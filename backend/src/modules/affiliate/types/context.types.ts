import type { User } from '../../auth/types/auth.types';

// Minimal route context used in affiliate routes
export interface AffiliateBaseContext {
  user: User;
  tenantId: string;
}

export type AffiliateRouteContext<P = unknown, Q = unknown, B = unknown> = AffiliateBaseContext & {
  params?: P;
  query?: Q;
  body?: B;
};

