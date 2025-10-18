import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { getUserProfile, getUserTenants } from '../services/user.service';

// Stub encadeado mínimo para simular chamadas do Drizzle
function createDbStubForMemberProfile(member: any | null, userBasic?: any | null) {
  const chainMember = {
    innerJoin() { return this; },
    where() { return this; },
    limit() { return member ? [member] : []; },
  };
  const chainUser = {
    where() { return this; },
    limit() { return userBasic ? [userBasic] : []; },
  };
  return {
    select() {
      return {
        from() {
          return chainMember;
        },
      };
    },
    // chamada para o fallback de users
    selectFallback() {
      return {
        from() {
          return chainUser;
        },
      } as any;
    },
  } as any;
}

function createDbStubForTenants(list: any[]) {
  const chain = {
    innerJoin() { return this; },
    where() { return this; },
    orderBy() { return list; },
  };
  return {
    select() {
      return { from() { return chain; } };
    },
  } as any;
}

declare const global: any;

describe('user.service', () => {
  beforeEach(() => {
    global.__USERS_TEST_DB__ = null;
  });

  afterEach(() => {
    global.__USERS_TEST_DB__ = null;
  });

  it('retorna perfil com membership quando encontrado', async () => {
    const memberRow = {
      userId: 'u1',
      name: 'Alice',
      email: 'alice@mail.com',
      emailVerified: true,
      image: null,
      tenantId: 't1',
      tenantName: 'Empresa X',
      tenantType: 'empresa',
      tenantStatus: 'active',
      role: 'admin',
      memberStatus: 'active',
      permissions: '{}',
      joinedAt: new Date(),
    };
    const dbStub = createDbStubForMemberProfile(memberRow);

    // faz select() -> chainMember
    global.__USERS_TEST_DB__ = {
      select: dbStub.select,
      // fallback para select() de users
      selectFallback: dbStub.selectFallback,
    };

    // Monkey patch simples: user.service chama getUsersDb().select duas vezes;
    // aqui devolvemos a mesma função select, e quando precisar do fallback,
    // continuamos retornando array vazio (o primeiro caminho já retornou resultado).
    const profile = await getUserProfile('u1', 't1');
    expect(profile.userId).toBe('u1');
    expect(profile.profileType).toBe('company');
    expect(profile.role).toBe('admin');
    expect(profile.tenantId).toBe('t1');
  });

  it('retorna perfil básico quando não há membership', async () => {
    const userBasic = {
      id: 'u2', name: 'Bob', email: 'bob@mail.com', emailVerified: false, image: null,
    };
    const dbStub = createDbStubForMemberProfile(null, userBasic);

    global.__USERS_TEST_DB__ = {
      select: dbStub.select, // usado primeiro, retorna [] para membership
      from() { return { where: () => ({ limit: () => [userBasic] }) } },
      // select() de fallback
      selectFallback: dbStub.selectFallback,
    };

    const profile = await getUserProfile('u2');
    expect(profile.userId).toBe('u2');
    expect(profile.isActive).toBe(false);
    expect(profile.role).toBe('viewer');
  });

  it('lista tenants do usuário', async () => {
    const rows = [
      { tenantId: 't1', tenantName: 'Empresa X', tenantSlug: 'empresa-x', tenantType: 'empresa', tenantStatus: 'active', role: 'admin', memberStatus: 'active', joinedAt: new Date() },
      { tenantId: 't2', tenantName: 'Trader Y', tenantSlug: 'trader-y', tenantType: 'trader', tenantStatus: 'active', role: 'viewer', memberStatus: 'active', joinedAt: new Date() },
    ];
    const dbStub = createDbStubForTenants(rows);
    global.__USERS_TEST_DB__ = { select: dbStub.select };

    const tenants = await getUserTenants('u1');
    expect(tenants.length).toBe(2);
    expect(tenants[0].profileType).toBe('company');
    expect(tenants[1].profileType).toBe('trader');
  });
});

