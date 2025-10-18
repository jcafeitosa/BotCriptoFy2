/**
 * Utilitário para mapear tenants.type para ProfileType
 * 'empresa' -> 'company', 'trader' -> 'trader', outros -> 'influencer'
 */
import type { ProfileType } from '../types/user.types';

export function mapTenantTypeToProfileType(tenantType?: string | null): ProfileType {
  if (tenantType === 'empresa') return 'company';
  if (tenantType === 'trader') return 'trader';
  return 'influencer';
}

