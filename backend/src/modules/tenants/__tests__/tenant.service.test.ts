import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { promoteToCEO } from '../services/tenant.service';

declare const global: any;

function createDbStubWithExistingCeo() {
  return {
    select() {
      return {
        from() { return this; },
        where() { return this; },
        limit() { return [{ count: 1 }] as any; },
      };
    },
  } as any;
}

function createDbStubNoCeo(companyTenantId: string) {
  let stage = 'company';
  return {
    select() {
      return {
        from() { return this; },
        where() { return this; },
        limit() {
          if (stage === 'company') { stage = 'ceo-count'; return [{ id: companyTenantId, type: 'empresa' }] as any; }
          return [{ count: 0 }] as any;
        },
      };
    },
    insert() { return { values() { return { returning() { return [{ id: 'm1', role: 'ceo' }] as any; } }; } } as any; },
    update() { return { set() { return { where() { return { returning() { return [{ id: 'm1', role: 'ceo' }] as any; } }; } }; } } as any; },
  } as any;
}

describe('tenant.service promoteToCEO', () => {
  beforeEach(() => { global.__TENANTS_TEST_DB__ = null; });
  afterEach(() => { global.__TENANTS_TEST_DB__ = null; });

  it('bloqueia promoção quando já existe CEO', async () => {
    // primeiro select company tenant, depois count(*) retorna 1
    const dbStub = {
      select() { return { from() { return this; }, where() { return this; }, limit() { return [{ id: 'company', type: 'empresa' }] as any; } }; },
    } as any;
    const dbStub2 = createDbStubWithExistingCeo();
    // encadeia chamadas: getCompanyTenant usa dbStub; promoteToCEO count usa dbStub2
    global.__TENANTS_TEST_DB__ = new Proxy({}, {
      get(_t, prop) {
        if (prop === 'select') {
          // primeira chamada: getCompanyTenant
          const s = dbStub.select.bind(dbStub);
          // depois: count
          dbStub.select = dbStub2.select.bind(dbStub2);
          return s;
        }
        return () => ({ returning: () => [] });
      }
    });

    await expect(promoteToCEO('u1')).rejects.toThrow('CEO already exists');
  });

  it('promove para CEO quando não existe CEO', async () => {
    const dbStub = createDbStubNoCeo('company');
    global.__TENANTS_TEST_DB__ = dbStub;
    const result = await promoteToCEO('u2');
    expect(result.tenant.id).toBe('company');
    expect(result.membership.role).toBe('ceo');
  });
});
