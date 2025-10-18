import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { Elysia } from 'elysia';
import { userRoutes } from '../routes/user.routes';
import { auth } from '../../auth/services/auth.config';
import { UsersProfileService } from '../services/user-profile-cache.service';
import { UsersTenantsCacheService } from '../services/user-tenants-cache.service';

describe('user.routes integration', () => {
  const originalGetSession = (auth as any).api.getSession;
  const originalGetProfile = (UsersProfileService as any).getProfile;
  const originalGetTenants = (UsersTenantsCacheService as any).getTenants;

  beforeAll(() => {
    // Stub auth session
    (auth as any).api.getSession = async () => ({
      user: { id: 'u1', emailVerified: true, name: 'Alice', email: 'alice@mail.com' },
      session: { id: 's1', activeOrganizationId: 't1' },
    });

    // Stub profile cache service
    (UsersProfileService as any).getProfile = async (userId: string, tenantId?: string) => ({
      userId,
      role: 'admin',
      profileType: 'company',
      isActive: true,
      name: 'Alice',
      email: 'alice@mail.com',
      emailVerified: true,
      tenantId,
      tenantName: 'Empresa X',
      tenantStatus: 'active',
    });

    // Stub tenants cache service
    (UsersTenantsCacheService as any).getTenants = async (userId: string) => ([
      { id: 't1', name: 'Empresa X', slug: 'empresa-x', type: 'empresa', status: 'active', role: 'admin', memberStatus: 'active', joinedAt: new Date(), profileType: 'company' },
    ]);
  });

  afterAll(() => {
    (auth as any).api.getSession = originalGetSession;
    (UsersProfileService as any).getProfile = originalGetProfile;
    (UsersTenantsCacheService as any).getTenants = originalGetTenants;
  });

  it('GET /api/v1/user/profile retorna { success, data }', async () => {
    const app = new Elysia().use(userRoutes);
    const res = await app.handle(new Request('http://localhost/api/v1/user/profile'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.userId).toBe('u1');
  });

  it('GET /api/v1/user/tenants retorna { success, data, total }', async () => {
    const app = new Elysia().use(userRoutes);
    const res = await app.handle(new Request('http://localhost/api/v1/user/tenants'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.total).toBe(1);
  });

  it('GET /api/v1/user/active-tenant retorna { success, data }', async () => {
    const app = new Elysia().use(userRoutes);
    const res = await app.handle(new Request('http://localhost/api/v1/user/active-tenant'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.id).toBe('t1');
  });
});

