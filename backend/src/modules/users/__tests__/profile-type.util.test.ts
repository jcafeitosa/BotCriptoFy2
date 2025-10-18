import { describe, it, expect } from 'bun:test';
import { mapTenantTypeToProfileType } from '../utils/profile-type.util';

describe('mapTenantTypeToProfileType', () => {
  it('mapeia empresa -> company', () => {
    expect(mapTenantTypeToProfileType('empresa')).toBe('company');
  });

  it('mapeia trader -> trader', () => {
    expect(mapTenantTypeToProfileType('trader')).toBe('trader');
  });

  it('mapeia valores desconhecidos -> influencer', () => {
    expect(mapTenantTypeToProfileType('influencer')).toBe('influencer');
    expect(mapTenantTypeToProfileType('qualquer')).toBe('influencer');
    expect(mapTenantTypeToProfileType(null as any)).toBe('influencer');
    expect(mapTenantTypeToProfileType(undefined)).toBe('influencer');
  });
});

