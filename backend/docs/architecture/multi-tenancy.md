# Multi-Tenancy Architecture

## Overview

BotCriptoFy2 implements a **hybrid multi-tenancy model** combining two approaches:
1. **1:N (Company Model)**: One company with multiple employees (departments)
2. **1:1 (Individual Model)**: Individual traders and influencers with isolated accounts

## Tenant Types

### 1. Company Tenant (1:N)
**Type**: `company`

**Description**: Single company (BotCriptoFy2) with multiple employees across departments.

**Characteristics**:
- One tenant = multiple users
- Users organized by departments
- Shared resources and data
- Hierarchical structure (CEO → Managers → Employees)

**Departments** (9 total):
- CEO Dashboard
- Financeiro (Financial)
- Marketing
- Vendas (Sales)
- Segurança (Security)
- SAC (Customer Support)
- Auditoria (Audit)
- Documentos (Documents)
- Configurações (Settings)

### 2. Trader Tenant (1:1)
**Type**: `trader`

**Description**: Individual traders with personal trading accounts.

**Characteristics**:
- One tenant = one user (trader)
- Isolated trading data
- Subscription-based (Free, Pro, Enterprise)
- Access to trading modules

**Features**:
- Personal portfolio
- Trading bots
- Strategy builder
- Market analytics
- Risk management

### 3. Influencer Tenant (1:1)
**Type**: `influencer`

**Description**: Special access users for marketing/promotion.

**Characteristics**:
- One tenant = one influencer
- Limited platform access
- Internal plan (free)
- Promotional features

**Features**:
- Content sharing
- Affiliate tracking
- Performance metrics
- Referral management

## Database Schema

### Tenants Table
```typescript
export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(), // 'company' | 'trader' | 'influencer'
  status: varchar('status', { length: 50 }).default('active'),
  subscriptionId: uuid('subscription_id').references(() => subscriptions.id),
  ownerId: varchar('owner_id').references(() => users.id),
  settings: jsonb('settings'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
```

### Tenant Members Table
```typescript
export const tenantMembers = pgTable('tenant_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  userId: varchar('user_id').notNull().references(() => users.id),
  role: varchar('role', { length: 50 }).notNull(),
  departmentId: uuid('department_id').references(() => departments.id),
  permissions: jsonb('permissions'),
  joinedAt: timestamp('joined_at').defaultNow(),
});
```

## Tenant Identification

### Priority Order
The system identifies the current tenant using this priority:

1. **HTTP Header**: `X-Tenant-ID`
   ```bash
   curl -H "X-Tenant-ID: tenant_123" http://localhost:3000/api/...
   ```

2. **Subdomain**: `{tenant}.example.com`
   ```
   trader1.botcriptofy.com → tenant_id from subdomain
   ```

3. **Query Parameter**: `?tenant_id=xxx`
   ```bash
   http://localhost:3000/api/...?tenant_id=tenant_123
   ```

4. **User's Default Tenant**: From tenant_members table
   ```sql
   SELECT tenant_id FROM tenant_members WHERE user_id = current_user_id LIMIT 1
   ```

## Tenant Context Middleware

### Implementation
```typescript
// src/middleware/tenant.ts
export const tenantContext = new Elysia({ name: 'tenant-context' })
  .derive({ as: 'scoped' }, async (context) => {
    const { request, user } = context;

    // 1. Try X-Tenant-ID header
    let tenantId = request.headers.get('X-Tenant-ID');

    // 2. Try subdomain
    if (!tenantId) {
      const host = request.headers.get('Host');
      const subdomain = extractSubdomain(host);
      if (subdomain) {
        tenantId = await getTenantIdBySubdomain(subdomain);
      }
    }

    // 3. Try query parameter
    if (!tenantId) {
      const url = new URL(request.url);
      tenantId = url.searchParams.get('tenant_id');
    }

    // 4. Use user's default tenant
    if (!tenantId && user) {
      tenantId = await getUserDefaultTenant(user.id);
    }

    // Validate tenant exists and user has access
    if (tenantId) {
      const tenant = await validateTenantAccess(tenantId, user?.id);
      return { tenant };
    }

    return { tenant: null };
  });
```

## Tenant Guards

### 1. Require Tenant
Ensures a tenant context exists:
```typescript
export const requireTenant = new Elysia({ name: 'require-tenant' })
  .use(tenantContext)
  .derive({ as: 'scoped' }, (context: any) => {
    const { tenant, set } = context;

    if (!tenant) {
      set.status = 400;
      throw new BadRequestError('Tenant context required');
    }

    return {};
  });
```

### 2. Require Tenant Member
Ensures user is a member of the tenant:
```typescript
export const requireTenantMember = new Elysia({ name: 'require-tenant-member' })
  .use(requireAuth)
  .use(tenantContext)
  .derive({ as: 'scoped' }, async (context: any) => {
    const { user, tenant, set } = context;

    const isMember = await checkTenantMembership(tenant.id, user.id);

    if (!isMember) {
      set.status = 403;
      throw new ForbiddenError('Not a member of this tenant');
    }

    return {};
  });
```

### 3. Require Tenant Role
Ensures user has specific role in tenant:
```typescript
export const requireTenantRole = (requiredRole: string) => {
  return new Elysia({ name: `require-tenant-role-${requiredRole}` })
    .use(requireTenantMember)
    .derive({ as: 'scoped' }, async (context: any) => {
      const { user, tenant, set } = context;

      const member = await getTenantMember(tenant.id, user.id);

      if (member.role !== requiredRole) {
        set.status = 403;
        throw new ForbiddenError(`Required role: ${requiredRole}`);
      }

      return {};
    });
};
```

### 4. Require Tenant Owner
Ensures user is the owner of the tenant:
```typescript
export const requireTenantOwner = new Elysia({ name: 'require-tenant-owner' })
  .use(tenantContext)
  .derive({ as: 'scoped' }, (context: any) => {
    const { user, tenant, set } = context;

    if (tenant.ownerId !== user.id) {
      set.status = 403;
      throw new ForbiddenError('Only tenant owner can perform this action');
    }

    return {};
  });
```

## Usage Examples

### Example 1: Company Tenant Endpoint
```typescript
// CEO Dashboard endpoint - only accessible by CEO
app.get(
  '/api/ceo/dashboard',
  async ({ user, tenant }) => {
    // Automatically scoped to company tenant
    const stats = await getCEOStats(tenant.id);
    return { success: true, data: stats };
  },
  {
    beforeHandle: [
      requireAuth,
      requireTenant,
      requireTenantRole('ceo')
    ]
  }
);
```

### Example 2: Trader Tenant Endpoint
```typescript
// Trading portfolio endpoint - scoped to trader's tenant
app.get(
  '/api/trading/portfolio',
  async ({ user, tenant }) => {
    // Automatically scoped to trader's tenant (1:1)
    const portfolio = await getPortfolio(tenant.id);
    return { success: true, data: portfolio };
  },
  {
    beforeHandle: [
      requireAuth,
      requireTenant,
      requireTenantMember
    ]
  }
);
```

### Example 3: Cross-Tenant Query (Admin Only)
```typescript
// Admin endpoint to query across tenants
app.get(
  '/api/admin/tenants',
  async ({ user }) => {
    // No tenant context - queries all tenants
    const tenants = await getAllTenants();
    return { success: true, data: tenants };
  },
  {
    beforeHandle: [
      requireAuth,
      requireRole('admin')
    ]
  }
);
```

## Tenant Roles

### Company Tenant Roles
- `ceo`: CEO with full access
- `admin`: Department admin
- `manager`: Department manager
- `funcionario`: Employee (staff member)
- `viewer`: Read-only access

### Trader Tenant Roles
- `trader`: Owner of trading account (full access)
- `viewer`: Read-only access (for shared accounts)

### Influencer Tenant Roles
- `influencer`: Owner of influencer account (full access)
- `viewer`: Read-only access

## Tenant Permissions

### Company Permissions
```typescript
{
  departments: {
    view: ['ceo', 'admin', 'manager', 'funcionario'],
    create: ['ceo', 'admin'],
    update: ['ceo', 'admin', 'manager'],
    delete: ['ceo', 'admin']
  },
  financial: {
    view: ['ceo', 'admin:financial'],
    create: ['ceo', 'admin:financial'],
    approve: ['ceo']
  },
  // ... more permissions
}
```

### Trader Permissions
```typescript
{
  trading: {
    view: ['trader', 'viewer'],
    create: ['trader'],
    update: ['trader'],
    delete: ['trader']
  },
  portfolio: {
    view: ['trader', 'viewer'],
    manage: ['trader']
  }
}
```

## Data Isolation

### Database-Level Isolation
All multi-tenant tables include `tenant_id` foreign key:
```typescript
export const orders = pgTable('orders', {
  id: uuid('id').primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  // ... other fields
});
```

### Query-Level Isolation
All queries automatically scoped to tenant:
```typescript
// Service method
async function getOrders(tenantId: string) {
  return await db
    .select()
    .from(orders)
    .where(eq(orders.tenantId, tenantId));
}

// In route handler
const tenantOrders = await getOrders(context.tenant.id);
```

### Insert-Level Isolation
All inserts include tenant_id:
```typescript
async function createOrder(tenantId: string, data: OrderInput) {
  return await db
    .insert(orders)
    .values({
      tenantId, // Always include tenant_id
      ...data
    })
    .returning();
}
```

## Subscription Management

### Tenant Subscription
```typescript
export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  plan: varchar('plan', { length: 50 }).notNull(), // 'free', 'pro', 'enterprise'
  status: varchar('status', { length: 50 }).default('active'),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date'),
  // ... billing fields
});
```

### Plan Limits
```typescript
const planLimits = {
  free: {
    maxBots: 1,
    maxOrders: 10,
    features: ['basic-trading']
  },
  pro: {
    maxBots: 5,
    maxOrders: 100,
    features: ['basic-trading', 'advanced-analytics', 'automation']
  },
  enterprise: {
    maxBots: -1, // unlimited
    maxOrders: -1,
    features: ['all']
  }
};
```

### Limit Enforcement
```typescript
async function checkTenantLimits(tenantId: string, resource: string) {
  const subscription = await getSubscription(tenantId);
  const limits = planLimits[subscription.plan];

  const currentUsage = await getUsage(tenantId, resource);

  if (limits[resource] !== -1 && currentUsage >= limits[resource]) {
    throw new ForbiddenError(`Plan limit reached for ${resource}`);
  }
}
```

## Best Practices

### 1. Always Include Tenant Context
```typescript
// ❌ Bad - no tenant context
async function getOrders() {
  return await db.select().from(orders);
}

// ✅ Good - tenant-scoped
async function getOrders(tenantId: string) {
  return await db
    .select()
    .from(orders)
    .where(eq(orders.tenantId, tenantId));
}
```

### 2. Validate Tenant Access
```typescript
// ✅ Always validate user has access to tenant
async function validateTenantAccess(tenantId: string, userId: string) {
  const member = await db
    .select()
    .from(tenantMembers)
    .where(
      and(
        eq(tenantMembers.tenantId, tenantId),
        eq(tenantMembers.userId, userId)
      )
    )
    .limit(1);

  if (!member) {
    throw new ForbiddenError('Access denied to this tenant');
  }

  return member;
}
```

### 3. Use Tenant Guards
```typescript
// ✅ Use middleware guards for tenant protection
app.get('/api/resource',
  async ({ tenant }) => {
    // tenant is guaranteed to exist here
    return await getResource(tenant.id);
  },
  {
    beforeHandle: [requireTenant, requireTenantMember]
  }
);
```

### 4. Audit Tenant Actions
```typescript
// ✅ Log all tenant-scoped actions
async function createOrder(tenantId: string, userId: string, data: OrderInput) {
  const order = await db.insert(orders).values({ tenantId, ...data });

  await auditLog({
    tenantId,
    userId,
    action: 'order.create',
    resource: 'order',
    resourceId: order.id
  });

  return order;
}
```

## Testing Multi-Tenancy

### Unit Tests
```typescript
describe('Tenant Isolation', () => {
  it('should not allow access to other tenant data', async () => {
    const tenant1 = await createTenant({ name: 'Tenant 1' });
    const tenant2 = await createTenant({ name: 'Tenant 2' });

    const order1 = await createOrder(tenant1.id, { amount: 100 });

    const orders = await getOrders(tenant2.id);

    expect(orders).not.toContain(order1);
  });
});
```

### Integration Tests
```typescript
describe('Tenant Context Middleware', () => {
  it('should extract tenant from header', async () => {
    const response = await app.handle(
      new Request('http://localhost/api/resource', {
        headers: { 'X-Tenant-ID': 'tenant_123' }
      })
    );

    // Verify tenant context was set
  });
});
```

## Troubleshooting

### Common Issues

#### 1. Missing Tenant Context
**Error**: "Tenant context required"

**Solution**: Ensure tenant is identified via header, subdomain, or query param.

#### 2. Access Denied
**Error**: "Not a member of this tenant"

**Solution**: Verify user has membership in tenant_members table.

#### 3. Cross-Tenant Data Leak
**Issue**: Seeing data from other tenants

**Solution**: Always include tenant_id in WHERE clauses.

## Next Steps
- [Module Structure](./modules.md)
- [Auth Guards](../authentication/guards.md)
- [Database Schema](../database/schema.md)
