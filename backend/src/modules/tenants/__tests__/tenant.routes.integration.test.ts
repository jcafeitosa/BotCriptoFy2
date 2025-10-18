import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { Elysia } from 'elysia';
import { tenantRoutes } from '../routes/tenant.routes';
import { auth } from '../../auth/services/auth.config';

declare const global: any;

describe('tenant.routes integration', () => {
  const originalGetSession = (auth as any).api.getSession;

  beforeAll(() => {
    // Stub auth session
    (auth as any).api.getSession = async () => ({
      user: { id: 'u1', emailVerified: true, name: 'Alice', email: 'alice@mail.com' },
      session: { id: 's1', activeOrganizationId: 't1' },
    });

    // Minimal DB stub for tenants service chains
    let selectCall = 0;
    global.__TENANTS_TEST_DB__ = {
      select: () => ({
        from() {
          return {
            innerJoin() { return this; },
            where() { return this; },
            orderBy() {
              // For getUserTenants (me)
              return [{ tenant: { id: 't1', name: 'Empresa X', type: 'empresa', status: 'active' }, membership: { role: 'admin', status: 'active', joinedAt: new Date() } }];
            },
            limit() {
              // ensureTenantMember and getTenantById
              selectCall++;
              if (selectCall === 1) {
                // company tenant in getCompanyTenant (id + type)
                return [{ id: 'tCompany', type: 'empresa', status: 'active' }];
              }
              if (selectCall === 2) {
                // ensureTenantMember returns a row with role
                return [{ tenantId: 't1', userId: 'u1', role: 'admin' }];
              }
              if (selectCall === 3) {
                // getTenantById via cache
                return [{ id: 't1', name: 'Empresa X', type: 'empresa', status: 'active' }];
              }
              // count(*) for pagination (members)
              return [{ count: 1 }];
            },
            offset() {
              // getTenantMembersPaginated rows
              return [{ userId: 'u2', role: 'viewer', status: 'active' }];
            },
          };
        },
      }),
      // For write/update paths not used in these tests
      update() { return { set() { return { where() { return { returning() { return [{}] as any; } }; } }; } } as any; },
      delete() { return { where() { return; } } as any; },
      insert() { return { values() { return { returning() { return [{}] as any; } }; } } as any; },
    };
  });

  afterAll(() => {
    (auth as any).api.getSession = originalGetSession;
    global.__TENANTS_TEST_DB__ = null;
  });

  it('GET /api/v1/tenants/me retorna { success, data }', async () => {
    const app = new Elysia().use(tenantRoutes);
    const res = await app.handle(new Request('http://localhost/api/v1/tenants/me'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data[0].tenant.id).toBe('t1');
  });

  it('GET /api/v1/tenants/t1 retorna { success, data } com membership', async () => {
    const app = new Elysia().use(tenantRoutes);
    const res = await app.handle(new Request('http://localhost/api/v1/tenants/t1'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.id).toBe('t1');
  });

  it('GET /api/v1/tenants/t1/members paginação retorna { success, data, pagination }', async () => {
    const app = new Elysia().use(tenantRoutes);
    const res = await app.handle(new Request('http://localhost/api/v1/tenants/t1/members?page=1&limit=1'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.pagination.page).toBe(1);
    expect(json.pagination.limit).toBe(1);
    expect(json.pagination.total).toBeGreaterThan(0);
  });
});

