export type TenantRole =
  | 'ceo'
  | 'admin'
  | 'funcionario'
  | 'trader'
  | 'influencer'
  | 'manager'
  | 'viewer';

export const TENANT_ROLES = [
  'ceo',
  'admin',
  'funcionario',
  'trader',
  'influencer',
  'manager',
  'viewer',
] as const satisfies Readonly<TenantRole[]>;

