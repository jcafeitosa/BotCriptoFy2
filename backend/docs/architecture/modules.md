# Module Structure

## Overview

BotCriptoFy2 backend is organized into **14 independent modules**, each responsible for a specific business domain. All modules follow a standardized directory structure for consistency and maintainability.

## Module Directory Structure

Each module follows this standardized structure:

```
src/modules/{module-name}/
├── index.ts                 # Barrel exports (public API)
├── README.md               # Module documentation
├── schema/                 # Database schema (Drizzle ORM)
│   └── *.schema.ts
├── types/                  # TypeScript interfaces
│   └── *.types.ts
├── services/               # Business logic
│   └── *.service.ts
├── routes/                 # API endpoints
│   └── *.routes.ts
├── controllers/            # Request handlers
│   └── *.controller.ts
├── middleware/             # Module-specific middleware
│   └── *.middleware.ts
└── utils/                  # Helper functions
    └── *.utils.ts
```

## Module List

### 1. Authentication Module (`auth`)
**Status**: ✅ Complete (Phase 0)

**Purpose**: User authentication and session management using Better-Auth.

**Key Features**:
- Email/password authentication
- Session management (7-day expiration)
- Email verification
- Password reset
- OAuth support (planned)
- Two-factor authentication (planned)

**Directory Structure**:
```
src/modules/auth/
├── index.ts                           # Exports authRoutes, authCustomRoutes
├── README.md                          # Better-Auth integration guide
├── schema/
│   └── auth.schema.ts                # users, sessions, accounts, verifications
├── types/
│   └── auth.types.ts                 # User, Session, Account interfaces
├── services/
│   └── auth.config.ts                # Better-Auth configuration
├── routes/
│   └── auth.routes.ts                # Auth endpoints (/api/auth/*)
└── middleware/
    ├── session.middleware.ts         # Session validation
    └── guards.ts                     # Auth guards (requireAuth, etc.)
```

**Key Files**:
- `auth.config.ts`: Better-Auth configuration with Drizzle adapter
- `auth.routes.ts`: Auth endpoints (sign-up, sign-in, sign-out, etc.)
- `session.middleware.ts`: Session validation middleware
- `guards.ts`: Auth guards (requireAuth, requireVerifiedEmail, optionalAuth)

**API Endpoints**:
```
POST /api/auth/sign-up/email         # Sign up with email
POST /api/auth/sign-in/email         # Sign in with email
POST /api/auth/sign-out              # Sign out
GET  /api/auth/session               # Get current session
GET  /api/auth/status                # Check authentication status
GET  /api/auth/me                    # Get current user
POST /api/auth/verify-email          # Verify email address
POST /api/auth/forget-password       # Request password reset
POST /api/auth/reset-password        # Reset password
```

**Database Tables**:
- `users`: User accounts
- `sessions`: Active sessions
- `accounts`: OAuth provider accounts
- `verifications`: Email verification tokens
- `twoFactor`: 2FA secrets
- `passkeys`: WebAuthn passkeys

---

### 2. Users Module (`users`)
**Status**: ✅ Complete (Phase 0)

**Purpose**: User profile and account management.

**Key Features**:
- User profile management
- Profile updates
- User preferences
- Account settings

**Directory Structure**:
```
src/modules/users/
├── index.ts                    # Exports userRoutes
├── types/
│   └── user.types.ts          # UserProfile, UpdateProfileInput
├── services/
│   └── user.service.ts        # Business logic for user operations
└── routes/
    └── user.routes.ts         # User endpoints (/api/user/*)
```

**API Endpoints**:
```
GET  /api/user/profile          # Get current user profile
PUT  /api/user/profile          # Update user profile
GET  /api/user/preferences      # Get user preferences
PUT  /api/user/preferences      # Update user preferences
```

**Key Services**:
- `getUserProfile(userId)`: Get user profile by ID
- `updateUserProfile(userId, data)`: Update user profile
- `deleteUser(userId)`: Soft delete user account

---

### 3. Tenants Module (`tenants`)
**Status**: ✅ Schema Complete (Phase 0)

**Purpose**: Multi-tenant management and tenant membership.

**Key Features**:
- Tenant creation and management
- Tenant membership
- Tenant roles and permissions
- Subscription management

**Directory Structure**:
```
src/modules/tenants/
├── index.ts                    # Barrel exports
├── schema/
│   └── tenants.schema.ts      # tenants, tenant_members tables
└── types/
    └── tenant.types.ts        # Tenant, TenantMember interfaces
```

**Database Tables**:
- `tenants`: Tenant definitions
- `tenant_members`: User-tenant relationships with roles

**Planned API Endpoints**:
```
GET    /api/tenants                   # List user's tenants
POST   /api/tenants                   # Create tenant
GET    /api/tenants/:id               # Get tenant details
PUT    /api/tenants/:id               # Update tenant
DELETE /api/tenants/:id               # Delete tenant
GET    /api/tenants/:id/members       # List tenant members
POST   /api/tenants/:id/members       # Add member
PUT    /api/tenants/:id/members/:uid  # Update member role
DELETE /api/tenants/:id/members/:uid  # Remove member
```

---

### 4. Departments Module (`departments`)
**Status**: ⏳ Schema Only (Phase 1 planned)

**Purpose**: Department structure for company tenant.

**Key Features**:
- Department definitions
- Department hierarchy
- Employee assignments
- Department-level permissions

**Planned Structure**:
```
src/modules/departments/
├── index.ts
├── schema/
│   └── departments.schema.ts     # departments table
├── types/
│   └── department.types.ts
├── services/
│   └── department.service.ts
└── routes/
    └── department.routes.ts
```

**Departments** (9 total):
1. CEO Dashboard
2. Financeiro (Financial)
3. Marketing
4. Vendas (Sales)
5. Segurança (Security)
6. SAC (Customer Support)
7. Auditoria (Audit)
8. Documentos (Documents)
9. Configurações (Settings)

---

### 5. Security Module (`security`)
**Status**: ⏳ Schema Only (Phase 1 planned)

**Purpose**: Security monitoring, RBAC, and access control.

**Key Features**:
- Role-based access control (RBAC)
- Permission management
- Security events monitoring
- Access logs

**Planned Tables**:
- `roles`: Role definitions
- `permissions`: Permission definitions
- `role_permissions`: Role-permission mappings
- `user_roles`: User-role assignments
- `security_events`: Security event logs

---

### 6. Subscriptions Module (`subscriptions`)
**Status**: ⏳ Schema Only (Phase 2 planned)

**Purpose**: Subscription plan management and billing.

**Key Features**:
- Plan definitions (Free, Pro, Enterprise)
- Subscription lifecycle
- Feature access control
- Usage tracking

**Subscription Plans**:
- **Free**: Basic features, 1 bot, 10 orders/day
- **Pro**: Advanced features, 5 bots, 100 orders/day
- **Enterprise**: All features, unlimited bots and orders

**Planned Tables**:
- `subscription_plans`: Plan definitions
- `subscriptions`: Tenant subscriptions
- `subscription_usage`: Usage tracking
- `invoices`: Billing history

---

### 7. Notifications Module (`notifications`)
**Status**: ⏳ Placeholder (Phase 3 planned)

**Purpose**: Multi-channel notification system.

**Key Features**:
- Email notifications
- Telegram bot notifications
- In-app notifications
- Push notifications
- Notification preferences

**Notification Types**:
- Trading alerts
- System notifications
- Security alerts
- Marketing messages

---

### 8. Support Module (`support`)
**Status**: ⏳ Placeholder (Phase 3 planned)

**Purpose**: Customer support ticketing system.

**Key Features**:
- Ticket management
- Live chat
- Knowledge base
- SLA tracking

**Planned Tables**:
- `tickets`: Support tickets
- `ticket_messages`: Ticket conversation
- `kb_articles`: Knowledge base articles
- `sla_policies`: SLA definitions

---

### 9. Audit Module (`audit`)
**Status**: ⏳ Placeholder (Phase 1 planned)

**Purpose**: Audit trail for compliance and security.

**Key Features**:
- Immutable audit logs
- User action tracking
- Compliance reports
- LGPD/GDPR compliance

**Planned Tables**:
- `audit_logs`: Audit trail (TimescaleDB hypertable)
- `audit_log_details`: Additional context

**Audit Events**:
- User authentication
- Data modifications
- Permission changes
- Security events

---

### 10. Documents Module (`documents`)
**Status**: ⏳ Placeholder (Phase 3 planned)

**Purpose**: Document management system.

**Key Features**:
- File upload/download
- Version control
- Access control
- Document search

**Planned Tables**:
- `documents`: Document metadata
- `document_versions`: Version history
- `document_shares`: Sharing permissions

---

### 11. Configurations Module (`configurations`)
**Status**: ⏳ Placeholder (Phase 3 planned)

**Purpose**: System and tenant configuration.

**Key Features**:
- System settings
- Tenant preferences
- Feature flags
- Environment variables

**Planned Tables**:
- `system_config`: Global settings
- `tenant_config`: Tenant-specific settings
- `feature_flags`: Feature toggles

---

### 12. CEO Module (`ceo`)
**Status**: ⏳ Placeholder (Phase 2 planned)

**Purpose**: Executive dashboard and reports.

**Key Features**:
- KPI dashboard
- Financial reports
- Performance metrics
- Business intelligence

**Key Metrics**:
- Revenue and profit
- User growth
- Subscription metrics
- Trading volume

---

### 13. Financial Module (`financial`)
**Status**: ⏳ Placeholder (Phase 2 planned)

**Purpose**: Financial management and accounting.

**Key Features**:
- Transaction management
- Invoice generation
- Payment processing
- Financial reports

**Planned Tables**:
- `transactions`: Financial transactions (hypertable)
- `invoices`: Invoice records
- `payments`: Payment records
- `wallets`: User wallets

---

### 14. Marketing Module (`marketing`)
**Status**: ⏳ Placeholder (Phase 3 planned)

**Purpose**: Marketing automation and campaigns.

**Key Features**:
- Campaign management
- Email marketing
- Analytics and metrics
- Lead tracking

**Planned Tables**:
- `campaigns`: Marketing campaigns
- `campaign_emails`: Email templates
- `campaign_analytics`: Performance metrics
- `leads`: Lead tracking

---

## Module Development Workflow

### Phase 0 (Complete) ✅
- Auth module: Authentication and session management
- Users module: User profile management
- Tenants module: Multi-tenancy schema

### Phase 1 (Next)
- Departments module
- Security module (RBAC)
- Audit module

### Phase 2
- Subscriptions module
- CEO module
- Financial module

### Phase 3
- Notifications module
- Support module
- Documents module
- Configurations module
- Marketing module

## Creating a New Module

### Step 1: Create Directory Structure
```bash
mkdir -p src/modules/my-module/{schema,types,services,routes,controllers,utils}
touch src/modules/my-module/index.ts
touch src/modules/my-module/README.md
```

### Step 2: Define Schema
```typescript
// src/modules/my-module/schema/my-module.schema.ts
import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';

export const myTable = pgTable('my_table', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
```

### Step 3: Define Types
```typescript
// src/modules/my-module/types/my-module.types.ts
import { myTable } from '../schema/my-module.schema';
import { InferSelectModel, InferInsertModel } from 'drizzle-orm';

export type MyEntity = InferSelectModel<typeof myTable>;
export type CreateMyEntityInput = InferInsertModel<typeof myTable>;
```

### Step 4: Create Service
```typescript
// src/modules/my-module/services/my-module.service.ts
import { db } from '@/db';
import { myTable } from '../schema/my-module.schema';
import { eq } from 'drizzle-orm';

export class MyModuleService {
  async findById(id: string) {
    const [entity] = await db
      .select()
      .from(myTable)
      .where(eq(myTable.id, id))
      .limit(1);
    return entity;
  }

  async create(data: CreateMyEntityInput) {
    const [entity] = await db
      .insert(myTable)
      .values(data)
      .returning();
    return entity;
  }
}

export const myModuleService = new MyModuleService();
```

### Step 5: Create Routes
```typescript
// src/modules/my-module/routes/my-module.routes.ts
import { Elysia, t } from 'elysia';
import { myModuleService } from '../services/my-module.service';
import { requireAuth } from '@/modules/auth/middleware/session.middleware';

export const myModuleRoutes = new Elysia({ prefix: '/api/my-module' })
  .use(requireAuth)
  .get('/:id', async ({ params }) => {
    const entity = await myModuleService.findById(params.id);
    return { success: true, data: entity };
  }, {
    detail: {
      tags: ['MyModule'],
      summary: 'Get entity by ID',
    }
  })
  .post('/', async ({ body }) => {
    const entity = await myModuleService.create(body);
    return { success: true, data: entity };
  }, {
    body: t.Object({
      name: t.String()
    }),
    detail: {
      tags: ['MyModule'],
      summary: 'Create entity',
    }
  });
```

### Step 6: Create Index (Barrel Export)
```typescript
// src/modules/my-module/index.ts
export * from './schema/my-module.schema';
export * from './types/my-module.types';
export * from './services/my-module.service';
export * from './routes/my-module.routes';
```

### Step 7: Register in Main App
```typescript
// src/index.ts
import { myModuleRoutes } from './modules/my-module';

const app = new Elysia()
  // ... other middleware
  .use(myModuleRoutes) // Add module routes
  // ... other routes
```

### Step 8: Generate Migration
```bash
bun run db:generate
bun run db:migrate
```

### Step 9: Document Module
Update this file and create module-specific README.md

## Module Communication

### Direct Service Calls
```typescript
// In user service
import { tenantService } from '@/modules/tenants';

async function getUserWithTenant(userId: string) {
  const user = await userService.findById(userId);
  const tenant = await tenantService.findById(user.tenantId);
  return { user, tenant };
}
```

### Event-Based Communication (Future)
```typescript
// Emit event
eventBus.emit('user.created', { userId, email });

// Listen to event
eventBus.on('user.created', async (data) => {
  await notificationService.sendWelcomeEmail(data.email);
});
```

## Best Practices

### 1. Single Responsibility
Each module should have a single, well-defined responsibility.

### 2. Clear Boundaries
Modules should have clear interfaces and minimal coupling.

### 3. Consistent Structure
Follow the standardized directory structure for all modules.

### 4. Type Safety
Use TypeScript types and Drizzle ORM for compile-time safety.

### 5. Documentation
Every module should have a README.md explaining its purpose and usage.

### 6. Testing
Each module should have comprehensive unit and integration tests.

### 7. Error Handling
Use custom error classes and proper error handling in all services.

### 8. Logging
Use structured logging with context for all operations.

## Next Steps
- [Authentication Module](../authentication/better-auth.md)
- [Database Schema](../database/schema.md)
- [API Endpoints](../api/endpoints.md)
