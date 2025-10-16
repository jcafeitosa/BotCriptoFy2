# Testes do Sistema de Auditoria - BotCriptoFy2

## 🧪 Visão Geral

Estratégia completa de testes para o sistema de auditoria, incluindo testes unitários, integração, E2E e testes de segurança para garantir a integridade e imutabilidade dos logs de auditoria.

## 📋 Estratégia de Testes

### Pirâmide de Testes para Auditoria
- **Testes Unitários**: 60% - Lógica de auditoria, criptografia, validação
- **Testes de Integração**: 30% - APIs, banco de dados, módulos
- **Testes E2E**: 10% - Fluxos completos de auditoria

### Tipos de Testes
- **Unitários**: Classes e funções individuais
- **Integração**: APIs e banco de dados
- **E2E**: Fluxos completos de auditoria
- **Segurança**: Testes de criptografia e integridade
- **Performance**: Testes de carga e stress
- **Concorrência**: Testes de auditoria simultânea

## 🛠️ Stack de Testes

### Backend (Elysia)
- **Framework**: Bun Test
- **Assertions**: Bun built-in assertions
- **Mocks**: Mock Service Worker
- **Coverage**: c8
- **Database**: Testcontainers

### Frontend (Astro)
- **Framework**: Vitest
- **Components**: Testing Library
- **E2E**: Playwright
- **Coverage**: v8

### Mocks e Fixtures
- **Audit Mocks**: Simulação de logs de auditoria
- **User Mocks**: Simulação de usuários e tipos
- **Event Mocks**: Simulação de eventos de auditoria
- **Database Fixtures**: Dados de teste para auditoria

## 🏗️ Estrutura de Testes

```
tests/
├── unit/                           # Testes unitários
│   ├── audit-logger.test.ts       # Logger principal
│   ├── trader-audit-logger.test.ts # Logger de traders
│   ├── influencer-audit-logger.test.ts # Logger de influencers
│   ├── audit-encryptor.test.ts    # Criptografia
│   ├── audit-validator.test.ts    # Validação
│   ├── audit-retriever.test.ts    # Recuperação
│   ├── behavioral-analyzer.test.ts # Análise comportamental
│   └── risk-calculator.test.ts    # Cálculo de risco
├── integration/                    # Testes de integração
│   ├── audit-middleware.test.ts   # Middleware de auditoria
│   ├── audit-apis.test.ts         # APIs de auditoria
│   ├── module-adapters.test.ts    # Adaptadores de módulos
│   ├── event-bus.test.ts          # Event bus
│   └── audit-sync.test.ts         # Sincronização
├── e2e/                           # Testes end-to-end
│   ├── audit-profile-flows.test.ts # Fluxos de perfil
│   ├── audit-timeline-flows.test.ts # Fluxos de timeline
│   └── audit-export-flows.test.ts # Fluxos de exportação
├── security/                      # Testes de segurança
│   ├── encryption.test.ts         # Testes de criptografia
│   ├── integrity.test.ts          # Testes de integridade
│   └── immutability.test.ts       # Testes de imutabilidade
├── performance/                   # Testes de performance
│   ├── audit-load-testing.test.ts # Testes de carga
│   ├── audit-stress-testing.test.ts # Testes de stress
│   └── audit-concurrency.test.ts # Testes de concorrência
├── fixtures/                      # Dados de teste
│   ├── audit-logs.json            # Logs de auditoria
│   ├── users.json                 # Usuários de teste
│   └── events.json                # Eventos de teste
└── mocks/                         # Mocks e simulações
    ├── audit-mock.ts              # Mock de auditoria
    ├── user-mock.ts               # Mock de usuário
    └── event-mock.ts              # Mock de evento
```

## 🔧 Configuração de Testes

### 1. Setup de Testes

```typescript
// tests/setup/audit-setup.ts
import { beforeAll, afterAll, beforeEach, afterEach } from 'bun:test';
import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';

let prisma: PrismaClient;
let redis: Redis;

beforeAll(async () => {
  // Setup database de teste
  prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.TEST_DATABASE_URL,
      },
    },
  });

  // Setup Redis de teste
  redis = new Redis(process.env.TEST_REDIS_URL);

  // Executar migrações de teste
  await prisma.$executeRaw`CREATE SCHEMA IF NOT EXISTS test`;
  await prisma.$executeRaw`SET search_path TO test`;
});

afterAll(async () => {
  // Cleanup
  await prisma.$disconnect();
  await redis.disconnect();
});

beforeEach(async () => {
  // Limpar dados de teste
  await prisma.auditAlert.deleteMany();
  await prisma.auditExport.deleteMany();
  await prisma.auditEvent.deleteMany();
  await prisma.auditSession.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.traderAuditLog.deleteMany();
  await prisma.influencerAuditLog.deleteMany();
  await prisma.auditBehavioralPattern.deleteMany();
  await prisma.auditSecurityEvent.deleteMany();
  await prisma.affiliateUser.deleteMany();
  await prisma.user.deleteMany();
  await redis.flushdb();
});

export { prisma, redis };
```

### 2. Mocks do Sistema de Auditoria

```typescript
// tests/mocks/audit-mock.ts
export class AuditMock {
  static createAuditLogData = {
    id: 'audit_123456789',
    userId: 'user_123456789',
    tenantId: 'tenant_123456789',
    sessionId: 'session_123456789',
    actionType: 'create',
    resourceType: 'user',
    resourceId: 'user_123456789',
    module: 'admin',
    description: 'User created',
    oldValues: null,
    newValues: { name: 'Test User', email: 'test@example.com' },
    metadata: { source: 'api' },
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0...',
    location: { country: 'BR', city: 'São Paulo' },
    deviceInfo: { type: 'desktop', os: 'Windows' },
    riskLevel: 'low',
    isSensitive: false,
    encryptedData: null,
    dataHash: 'hash123456789',
    createdAt: new Date()
  };

  static createTraderAuditLogData = {
    id: 'trader_audit_123456789',
    traderId: 'trader_123456789',
    sessionId: 'session_123456789',
    actionCategory: 'trading',
    actionType: 'create_transaction',
    resourceType: 'transaction',
    resourceId: 'tx_123456789',
    module: 'financeiro',
    description: 'Created trading transaction',
    oldValues: null,
    newValues: { amount: 1000, currency: 'USD' },
    metadata: { transactionType: 'buy' },
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0...',
    location: { country: 'BR', city: 'São Paulo' },
    deviceInfo: { type: 'desktop', os: 'Windows' },
    networkInfo: { isp: 'ISP', asn: 'AS123' },
    biometricData: { fingerprint: 'fp123', behavior: 'normal' },
    riskScore: 30,
    riskFactors: [],
    isSuspicious: false,
    requiresReview: false,
    encryptedData: 'encrypted_data_123',
    dataHash: 'hash123456789',
    verificationHash: 'verification_hash_123',
    createdAt: new Date()
  };

  static createInfluencerAuditLogData = {
    id: 'influencer_audit_123456789',
    influencerId: 'influencer_123456789',
    sessionId: 'session_123456789',
    actionCategory: 'content',
    actionType: 'create_post',
    resourceType: 'post',
    resourceId: 'post_123456789',
    module: 'marketing',
    description: 'Created social media post',
    oldValues: null,
    newValues: { content: 'Test post', platform: 'instagram' },
    metadata: { hashtags: ['#test'], mentions: ['@user'] },
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0...',
    location: { country: 'BR', city: 'São Paulo' },
    deviceInfo: { type: 'mobile', os: 'iOS' },
    socialContext: { platform: 'instagram', audience: 1000 },
    contentAnalysis: { sentiment: 'positive', compliance: true },
    riskScore: 20,
    riskFactors: [],
    isSuspicious: false,
    requiresReview: false,
    encryptedData: null,
    dataHash: 'hash123456789',
    verificationHash: 'verification_hash_123',
    createdAt: new Date()
  };

  static createBehavioralPatternData = {
    id: 'pattern_123456789',
    userId: 'user_123456789',
    userType: 'trader',
    patternType: 'activity',
    patternData: {
      loginTimes: [9, 10, 11],
      locations: ['São Paulo', 'Rio de Janeiro'],
      devices: ['desktop', 'mobile']
    },
    confidenceScore: 0.85,
    isAnomaly: false,
    anomalyScore: 0.2,
    createdAt: new Date()
  };

  static createSecurityEventData = {
    id: 'security_123456789',
    userId: 'user_123456789',
    userType: 'trader',
    eventType: 'suspicious_activity',
    severity: 'high',
    description: 'Suspicious trading activity detected',
    data: {
      riskScore: 85,
      factors: ['unusual_time', 'new_location']
    },
    riskScore: 85,
    isResolved: false,
    createdAt: new Date()
  };
}
```

## 🧪 Testes Unitários

### 1. Audit Logger

```typescript
// tests/unit/audit/audit-logger.test.ts
import { describe, it, expect, beforeEach } from 'bun:test';
import { AuditLogger } from '../../src/audit/audit-logger';
import { prisma } from '../setup';

describe('AuditLogger', () => {
  let auditLogger: AuditLogger;

  beforeEach(() => {
    auditLogger = new AuditLogger();
  });

  describe('logAction', () => {
    it('should create audit log for user action', async () => {
      // Criar usuário
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          name: 'Test User'
        }
      });

      const action = {
        type: 'create',
        resourceType: 'user',
        resourceId: 'user_123',
        module: 'admin',
        description: 'Created new user',
        newValues: { name: 'New User', email: 'new@example.com' }
      };

      const context = {
        sessionId: 'session_123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0...',
        location: { country: 'BR', city: 'São Paulo' }
      };

      const result = await auditLogger.logAction(user.id, action, context);

      expect(result.success).toBe(true);
      expect(result.logId).toBeDefined();

      // Verificar se log foi criado
      const log = await prisma.auditLog.findUnique({
        where: { id: result.logId! }
      });

      expect(log).toBeDefined();
      expect(log?.userId).toBe(user.id);
      expect(log?.actionType).toBe('create');
      expect(log?.module).toBe('admin');
      expect(log?.dataHash).toBeDefined();
    });

    it('should encrypt sensitive data', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          name: 'Test User'
        }
      });

      const action = {
        type: 'update',
        resourceType: 'user',
        module: 'admin',
        description: 'Updated user password',
        newValues: { password: 'secret123' }
      };

      const result = await auditLogger.logAction(user.id, action, {});

      expect(result.success).toBe(true);

      const log = await prisma.auditLog.findUnique({
        where: { id: result.logId! }
      });

      expect(log?.isSensitive).toBe(true);
      expect(log?.encryptedData).toBeDefined();
      expect(log?.newValues).toEqual({ password: '[REDACTED]' });
    });

    it('should calculate risk level correctly', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          name: 'Test User'
        }
      });

      // Criar afiliado trader (maior risco)
      await prisma.affiliateUser.create({
        data: {
          userId: user.id,
          tenantId: 'main-tenant',
          affiliateCode: 'TRADER001',
          userType: 'trader',
          inviteLimit: 5,
          isActive: true
        }
      });

      const action = {
        type: 'delete',
        resourceType: 'transaction',
        module: 'financeiro',
        description: 'Deleted financial transaction'
      };

      const result = await auditLogger.logAction(user.id, action, {});

      expect(result.success).toBe(true);

      const log = await prisma.auditLog.findUnique({
        where: { id: result.logId! }
      });

      expect(['high', 'critical']).toContain(log?.riskLevel);
    });

    it('should create security alert for high risk actions', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          name: 'Test User'
        }
      });

      const action = {
        type: 'export',
        resourceType: 'data',
        module: 'admin',
        description: 'Exported sensitive data'
      };

      const result = await auditLogger.logAction(user.id, action, {});

      expect(result.success).toBe(true);

      // Verificar se alerta de segurança foi criado
      const alert = await prisma.auditAlert.findFirst({
        where: { userId: user.id }
      });

      expect(alert).toBeDefined();
      expect(alert?.alertType).toBe('suspicious_activity');
    });
  });
});
```

### 2. Trader Audit Logger

```typescript
// tests/unit/audit/trader-audit-logger.test.ts
import { describe, it, expect, beforeEach } from 'bun:test';
import { TraderAuditLogger } from '../../src/audit/trader-audit-logger';
import { prisma } from '../setup';

describe('TraderAuditLogger', () => {
  let traderAuditLogger: TraderAuditLogger;

  beforeEach(() => {
    traderAuditLogger = new TraderAuditLogger();
  });

  describe('logTraderAction', () => {
    it('should create trader audit log with high security', async () => {
      // Criar trader
      const trader = await prisma.user.create({
        data: {
          email: 'trader@example.com',
          name: 'Trader User'
        }
      });

      await prisma.affiliateUser.create({
        data: {
          userId: trader.id,
          tenantId: 'main-tenant',
          affiliateCode: 'TRADER001',
          userType: 'trader',
          inviteLimit: 5,
          isActive: true
        }
      });

      const action = {
        category: 'trading' as const,
        type: 'create_transaction',
        resourceType: 'transaction',
        resourceId: 'tx_123',
        module: 'financeiro',
        description: 'Created new trading transaction',
        newValues: { amount: 1000, currency: 'USD' }
      };

      const context = {
        sessionId: 'session_123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0...',
        location: { country: 'BR', city: 'São Paulo' },
        deviceInfo: { type: 'desktop', os: 'Windows' },
        networkInfo: { isp: 'ISP', asn: 'AS123' }
      };

      const result = await traderAuditLogger.logTraderAction(trader.id, action, context);

      expect(result.success).toBe(true);
      expect(result.logId).toBeDefined();
      expect(result.riskScore).toBeDefined();

      // Verificar se log foi criado
      const log = await prisma.traderAuditLog.findUnique({
        where: { id: result.logId! }
      });

      expect(log).toBeDefined();
      expect(log?.traderId).toBe(trader.id);
      expect(log?.actionCategory).toBe('trading');
      expect(log?.encryptedData).toBeDefined();
      expect(log?.dataHash).toBeDefined();
      expect(log?.verificationHash).toBeDefined();
    });

    it('should detect suspicious activity and create security event', async () => {
      // Criar trader
      const trader = await prisma.user.create({
        data: {
          email: 'trader@example.com',
          name: 'Trader User'
        }
      });

      await prisma.affiliateUser.create({
        data: {
          userId: trader.id,
          tenantId: 'main-tenant',
          affiliateCode: 'TRADER001',
          userType: 'trader',
          inviteLimit: 5,
          isActive: true
        }
      });

      const action = {
        category: 'financial' as const,
        type: 'delete_transaction',
        resourceType: 'transaction',
        module: 'financeiro',
        description: 'Deleted large transaction',
        oldValues: { amount: 10000, currency: 'USD' }
      };

      const context = {
        sessionId: 'session_123',
        ipAddress: '10.0.0.1', // IP suspeito
        userAgent: 'Mozilla/5.0...',
        location: { country: 'XX', city: 'Unknown' }, // Localização suspeita
        deviceInfo: { type: 'mobile', os: 'Android' }
      };

      const result = await traderAuditLogger.logTraderAction(trader.id, action, context);

      expect(result.success).toBe(true);
      expect(result.isSuspicious).toBe(true);

      // Verificar se evento de segurança foi criado
      const securityEvent = await prisma.auditSecurityEvent.findFirst({
        where: {
          userId: trader.id,
          userType: 'trader'
        }
      });

      expect(securityEvent).toBeDefined();
      expect(securityEvent?.eventType).toBe('suspicious_activity');
    });

    it('should update behavioral patterns', async () => {
      // Criar trader
      const trader = await prisma.user.create({
        data: {
          email: 'trader@example.com',
          name: 'Trader User'
        }
      });

      await prisma.affiliateUser.create({
        data: {
          userId: trader.id,
          tenantId: 'main-tenant',
          affiliateCode: 'TRADER001',
          userType: 'trader',
          inviteLimit: 5,
          isActive: true
        }
      });

      const action = {
        category: 'trading' as const,
        type: 'create_transaction',
        resourceType: 'transaction',
        module: 'financeiro',
        description: 'Created transaction'
      };

      const context = {
        sessionId: 'session_123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0...',
        location: { country: 'BR', city: 'São Paulo' },
        deviceInfo: { type: 'desktop', os: 'Windows' }
      };

      await traderAuditLogger.logTraderAction(trader.id, action, context);

      // Verificar se padrão comportamental foi atualizado
      const pattern = await prisma.auditBehavioralPattern.findFirst({
        where: {
          userId: trader.id,
          userType: 'trader'
        }
      });

      expect(pattern).toBeDefined();
      expect(pattern?.patternData).toBeDefined();
    });
  });
});
```

### 3. Audit Encryptor

```typescript
// tests/unit/audit/audit-encryptor.test.ts
import { describe, it, expect, beforeEach } from 'bun:test';
import { AuditEncryptor } from '../../src/audit/audit-encryptor';

describe('AuditEncryptor', () => {
  let encryptor: AuditEncryptor;

  beforeEach(() => {
    encryptor = new AuditEncryptor();
  });

  describe('encrypt', () => {
    it('should encrypt data successfully', async () => {
      const data = 'sensitive data to encrypt';
      const encrypted = await encryptor.encrypt(data);

      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(data);
      expect(encrypted.length).toBeGreaterThan(0);
    });

    it('should produce different encrypted data for same input', async () => {
      const data = 'sensitive data';
      const encrypted1 = await encryptor.encrypt(data);
      const encrypted2 = await encryptor.encrypt(data);

      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should handle empty data', async () => {
      const data = '';
      const encrypted = await encryptor.encrypt(data);

      expect(encrypted).toBeDefined();
      expect(encrypted.length).toBeGreaterThan(0);
    });

    it('should handle large data', async () => {
      const data = 'x'.repeat(10000);
      const encrypted = await encryptor.encrypt(data);

      expect(encrypted).toBeDefined();
      expect(encrypted.length).toBeGreaterThan(0);
    });
  });

  describe('decrypt', () => {
    it('should decrypt data successfully', async () => {
      const originalData = 'sensitive data to encrypt';
      const encrypted = await encryptor.encrypt(originalData);
      const decrypted = await encryptor.decrypt(encrypted);

      expect(decrypted).toBe(originalData);
    });

    it('should handle empty encrypted data', async () => {
      await expect(encryptor.decrypt('')).rejects.toThrow();
    });

    it('should handle invalid encrypted data', async () => {
      await expect(encryptor.decrypt('invalid_data')).rejects.toThrow();
    });

    it('should handle corrupted encrypted data', async () => {
      const originalData = 'sensitive data';
      const encrypted = await encryptor.encrypt(originalData);
      const corrupted = encrypted.slice(0, -10) + 'corrupted';

      await expect(encryptor.decrypt(corrupted)).rejects.toThrow();
    });
  });

  describe('verifyIntegrity', () => {
    it('should verify data integrity correctly', async () => {
      const data = 'sensitive data';
      const hash = 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3';

      const isValid = await encryptor.verifyIntegrity(data, hash);
      expect(isValid).toBe(true);
    });

    it('should detect data tampering', async () => {
      const data = 'sensitive data';
      const tamperedData = 'tampered data';
      const hash = 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3';

      const isValid = await encryptor.verifyIntegrity(tamperedData, hash);
      expect(isValid).toBe(false);
    });

    it('should handle empty data', async () => {
      const data = '';
      const hash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

      const isValid = await encryptor.verifyIntegrity(data, hash);
      expect(isValid).toBe(true);
    });
  });
});
```

## 🔗 Testes de Integração

### 1. Audit Middleware

```typescript
// tests/integration/audit-middleware.test.ts
import { describe, it, expect, beforeEach } from 'bun:test';
import { Elysia } from 'elysia';
import { auditMiddleware } from '../../src/middleware/audit.middleware';
import { prisma } from '../setup';

describe('Audit Middleware', () => {
  let app: Elysia;

  beforeEach(() => {
    app = new Elysia()
      .use(auditMiddleware)
      .get('/test', () => ({ message: 'test' }))
      .post('/test', () => ({ message: 'test' }));
  });

  it('should log audit for authenticated user', async () => {
    // Criar usuário
    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        name: 'Test User'
      }
    });

    // Mock autenticação
    const response = await app.handle(
      new Request('http://localhost:3000/test', {
        headers: {
          'authorization': 'Bearer valid-token',
          'x-session-id': 'session-123',
          'x-user-id': user.id
        }
      })
    );

    expect(response.status).toBe(200);

    // Verificar se log foi criado
    const logs = await prisma.auditLog.findMany({
      where: { userId: user.id }
    });

    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0].actionType).toBe('view');
    expect(logs[0].module).toBe('unknown');
  });

  it('should not log audit for unauthenticated user', async () => {
    const response = await app.handle(
      new Request('http://localhost:3000/test')
    );

    expect(response.status).toBe(200);

    // Verificar se nenhum log foi criado
    const logs = await prisma.auditLog.findMany();
    expect(logs.length).toBe(0);
  });

  it('should log different action types correctly', async () => {
    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        name: 'Test User'
      }
    });

    // Test GET request
    await app.handle(
      new Request('http://localhost:3000/test', {
        method: 'GET',
        headers: {
          'authorization': 'Bearer valid-token',
          'x-session-id': 'session-123',
          'x-user-id': user.id
        }
      })
    );

    // Test POST request
    await app.handle(
      new Request('http://localhost:3000/test', {
        method: 'POST',
        headers: {
          'authorization': 'Bearer valid-token',
          'x-session-id': 'session-123',
          'x-user-id': user.id,
          'content-type': 'application/json'
        },
        body: JSON.stringify({ data: 'test' })
      })
    );

    const logs = await prisma.auditLog.findMany({
      where: { userId: user.id }
    });

    expect(logs.length).toBe(2);
    expect(logs.some(log => log.actionType === 'view')).toBe(true);
    expect(logs.some(log => log.actionType === 'create')).toBe(true);
  });
});
```

### 2. Module Adapters

```typescript
// tests/integration/audit/module-adapters.test.ts
import { describe, it, expect, beforeEach } from 'bun:test';
import { FinanceiroAuditAdapter } from '../../src/audit/adapters/financeiro-audit.adapter';
import { AffiliateAuditAdapter } from '../../src/audit/adapters/affiliate-audit.adapter';
import { prisma } from '../setup';

describe('Module Audit Adapters', () => {
  let financeiroAdapter: FinanceiroAuditAdapter;
  let affiliateAdapter: AffiliateAuditAdapter;

  beforeEach(() => {
    financeiroAdapter = new FinanceiroAuditAdapter();
    affiliateAdapter = new AffiliateAuditAdapter();
  });

  describe('FinanceiroAuditAdapter', () => {
    it('should log transaction creation', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          name: 'Test User'
        }
      });

      const transactionData = {
        id: 'tx_123',
        amount: 1000,
        currency: 'USD',
        type: 'buy'
      };

      const context = {
        sessionId: 'session_123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0...',
        location: { country: 'BR', city: 'São Paulo' }
      };

      await financeiroAdapter.logTransactionCreation(
        user.id,
        transactionData,
        context
      );

      const logs = await prisma.auditLog.findMany({
        where: { userId: user.id }
      });

      expect(logs.length).toBe(1);
      expect(logs[0].actionType).toBe('create');
      expect(logs[0].resourceType).toBe('transaction');
      expect(logs[0].module).toBe('financeiro');
    });

    it('should sanitize sensitive transaction data', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          name: 'Test User'
        }
      });

      const transactionData = {
        id: 'tx_123',
        amount: 1000,
        currency: 'USD',
        creditCard: '4111111111111111',
        cvv: '123',
        expiryDate: '12/25'
      };

      const context = {
        sessionId: 'session_123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0...',
        location: { country: 'BR', city: 'São Paulo' }
      };

      await financeiroAdapter.logTransactionCreation(
        user.id,
        transactionData,
        context
      );

      const log = await prisma.auditLog.findFirst({
        where: { userId: user.id }
      });

      expect(log?.newValues).not.toHaveProperty('creditCard');
      expect(log?.newValues).not.toHaveProperty('cvv');
      expect(log?.newValues).not.toHaveProperty('expiryDate');
    });
  });

  describe('AffiliateAuditAdapter', () => {
    it('should log trader affiliate registration', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'trader@example.com',
          name: 'Trader User'
        }
      });

      const affiliateData = {
        id: 'aff_123',
        affiliateCode: 'TRADER001',
        userType: 'trader',
        inviteLimit: 5
      };

      const context = {
        sessionId: 'session_123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0...',
        location: { country: 'BR', city: 'São Paulo' }
      };

      await affiliateAdapter.logAffiliateRegistration(
        user.id,
        'trader',
        affiliateData,
        context
      );

      const logs = await prisma.traderAuditLog.findMany({
        where: { traderId: user.id }
      });

      expect(logs.length).toBe(1);
      expect(logs[0].actionCategory).toBe('affiliate');
      expect(logs[0].actionType).toBe('register');
    });

    it('should log influencer affiliate registration', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'influencer@example.com',
          name: 'Influencer User'
        }
      });

      const affiliateData = {
        id: 'aff_123',
        affiliateCode: 'INFLUENCER001',
        userType: 'influencer',
        inviteLimit: null
      };

      const context = {
        sessionId: 'session_123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0...',
        location: { country: 'BR', city: 'São Paulo' }
      };

      await affiliateAdapter.logAffiliateRegistration(
        user.id,
        'influencer',
        affiliateData,
        context
      );

      const logs = await prisma.influencerAuditLog.findMany({
        where: { influencerId: user.id }
      });

      expect(logs.length).toBe(1);
      expect(logs[0].actionCategory).toBe('affiliate');
      expect(logs[0].actionType).toBe('register');
    });
  });
});
```

## 🎭 Testes E2E

### 1. Audit Profile Flows

```typescript
// tests/e2e/audit-profile-flows.test.ts
import { test, expect } from '@playwright/test';

test.describe('Audit Profile Flows', () => {
  test.beforeEach(async ({ page }) => {
    // Login como usuário
    await page.goto('/auth/login');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('should display audit profile for trader', async ({ page }) => {
    // Navegar para perfil de auditoria
    await page.goto('/audit/profile');
    
    // Verificar se perfil foi carregado
    await expect(page.locator('[data-testid="audit-profile"]')).toBeVisible();
    
    // Verificar métricas principais
    await expect(page.locator('[data-testid="total-actions"]')).toBeVisible();
    await expect(page.locator('[data-testid="risk-score"]')).toBeVisible();
    await expect(page.locator('[data-testid="compliance-score"]')).toBeVisible();
    
    // Verificar timeline de atividades
    await expect(page.locator('[data-testid="activity-timeline"]')).toBeVisible();
    
    // Verificar insights comportamentais (específico para traders)
    await expect(page.locator('[data-testid="behavioral-insights"]')).toBeVisible();
  });

  test('should display audit profile for influencer', async ({ page }) => {
    // Login como influencer
    await page.goto('/auth/login');
    await page.fill('[data-testid="email-input"]', 'influencer@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    // Navegar para perfil de auditoria
    await page.goto('/audit/profile');
    
    // Verificar se perfil foi carregado
    await expect(page.locator('[data-testid="audit-profile"]')).toBeVisible();
    
    // Verificar análise de conteúdo (específico para influencers)
    await expect(page.locator('[data-testid="content-analysis"]')).toBeVisible();
    
    // Verificar métricas de redes sociais
    await expect(page.locator('[data-testid="social-metrics"]')).toBeVisible();
  });

  test('should filter audit timeline', async ({ page }) => {
    await page.goto('/audit/profile');
    
    // Aplicar filtro por módulo
    await page.selectOption('[data-testid="module-filter"]', 'financeiro');
    await page.click('[data-testid="apply-filters"]');
    
    // Verificar se filtro foi aplicado
    await expect(page.locator('[data-testid="filtered-timeline"]')).toBeVisible();
    
    // Aplicar filtro por tipo de ação
    await page.selectOption('[data-testid="action-type-filter"]', 'create');
    await page.click('[data-testid="apply-filters"]');
    
    // Verificar se filtro foi aplicado
    await expect(page.locator('[data-testid="filtered-timeline"]')).toBeVisible();
  });

  test('should export audit data', async ({ page }) => {
    await page.goto('/audit/profile');
    
    // Clicar em exportar dados
    await page.click('[data-testid="export-button"]');
    
    // Selecionar formato de exportação
    await page.selectOption('[data-testid="export-format"]', 'json');
    
    // Selecionar período
    await page.selectOption('[data-testid="export-period"]', '30d');
    
    // Confirmar exportação
    await page.click('[data-testid="confirm-export"]');
    
    // Verificar se exportação foi iniciada
    await expect(page.locator('[data-testid="export-status"]')).toContainText('Exportando');
    
    // Aguardar conclusão
    await expect(page.locator('[data-testid="export-status"]')).toContainText('Concluído', { timeout: 30000 });
  });
});
```

### 2. Audit Timeline Flows

```typescript
// tests/e2e/audit-timeline-flows.test.ts
import { test, expect } from '@playwright/test';

test.describe('Audit Timeline Flows', () => {
  test.beforeEach(async ({ page }) => {
    // Login como usuário
    await page.goto('/auth/login');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('should display audit timeline', async ({ page }) => {
    // Navegar para timeline de auditoria
    await page.goto('/audit/timeline');
    
    // Verificar se timeline foi carregada
    await expect(page.locator('[data-testid="audit-timeline"]')).toBeVisible();
    
    // Verificar se há atividades
    await expect(page.locator('[data-testid="timeline-item"]')).toHaveCount.greaterThan(0);
  });

  test('should show activity details', async ({ page }) => {
    await page.goto('/audit/timeline');
    
    // Clicar em uma atividade
    await page.click('[data-testid="timeline-item"]:first-child');
    
    // Verificar se detalhes foram exibidos
    await expect(page.locator('[data-testid="activity-details"]')).toBeVisible();
    await expect(page.locator('[data-testid="activity-description"]')).toBeVisible();
    await expect(page.locator('[data-testid="activity-metadata"]')).toBeVisible();
  });

  test('should filter timeline by risk level', async ({ page }) => {
    await page.goto('/audit/timeline');
    
    // Aplicar filtro por nível de risco
    await page.selectOption('[data-testid="risk-level-filter"]', 'high');
    await page.click('[data-testid="apply-filters"]');
    
    // Verificar se apenas atividades de alto risco são exibidas
    const riskLevels = await page.locator('[data-testid="risk-level"]').allTextContents();
    riskLevels.forEach(level => {
      expect(['high', 'critical']).toContain(level.toLowerCase());
    });
  });

  test('should search timeline by description', async ({ page }) => {
    await page.goto('/audit/timeline');
    
    // Pesquisar por descrição
    await page.fill('[data-testid="search-input"]', 'login');
    await page.click('[data-testid="search-button"]');
    
    // Verificar se apenas atividades relacionadas ao login são exibidas
    const descriptions = await page.locator('[data-testid="activity-description"]').allTextContents();
    descriptions.forEach(description => {
      expect(description.toLowerCase()).toContain('login');
    });
  });
});
```

## 🔒 Testes de Segurança

### 1. Encryption Tests

```typescript
// tests/security/encryption.test.ts
import { describe, it, expect } from 'bun:test';
import { AuditEncryptor } from '../../src/audit/audit-encryptor';

describe('Audit Encryption Security', () => {
  let encryptor: AuditEncryptor;

  beforeEach(() => {
    encryptor = new AuditEncryptor();
  });

  describe('Encryption Security', () => {
    it('should use strong encryption algorithm', async () => {
      const data = 'sensitive data';
      const encrypted = await encryptor.encrypt(data);

      // Verificar se dados estão criptografados
      expect(encrypted).not.toContain(data);
      expect(encrypted.length).toBeGreaterThan(data.length);
    });

    it('should use unique IV for each encryption', async () => {
      const data = 'sensitive data';
      const encrypted1 = await encryptor.encrypt(data);
      const encrypted2 = await encryptor.encrypt(data);

      // Verificar se IVs são únicos
      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should prevent data leakage through timing attacks', async () => {
      const shortData = 'short';
      const longData = 'x'.repeat(1000);

      const start1 = Date.now();
      await encryptor.encrypt(shortData);
      const time1 = Date.now() - start1;

      const start2 = Date.now();
      await encryptor.encrypt(longData);
      const time2 = Date.now() - start2;

      // Verificar se tempos são similares (prevenção de timing attacks)
      expect(Math.abs(time1 - time2)).toBeLessThan(100);
    });

    it('should handle special characters securely', async () => {
      const specialData = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      const encrypted = await encryptor.encrypt(specialData);
      const decrypted = await encryptor.decrypt(encrypted);

      expect(decrypted).toBe(specialData);
    });
  });

  describe('Key Management', () => {
    it('should use environment variable for encryption key', () => {
      const key = process.env.AUDIT_ENCRYPTION_KEY;
      expect(key).toBeDefined();
      expect(key?.length).toBeGreaterThan(16);
    });

    it('should not expose encryption key in logs', async () => {
      const originalLog = console.log;
      const logs: string[] = [];
      console.log = (...args) => logs.push(args.join(' '));

      await encryptor.encrypt('test data');

      console.log = originalLog;

      const keyExposed = logs.some(log => 
        log.includes(process.env.AUDIT_ENCRYPTION_KEY || '')
      );
      expect(keyExposed).toBe(false);
    });
  });
});
```

### 2. Integrity Tests

```typescript
// tests/security/integrity.test.ts
import { describe, it, expect } from 'bun:test';
import { AuditEncryptor } from '../../src/audit/audit-encryptor';
import { prisma } from '../setup';

describe('Audit Data Integrity', () => {
  let encryptor: AuditEncryptor;

  beforeEach(() => {
    encryptor = new AuditEncryptor();
  });

  describe('Hash Integrity', () => {
    it('should detect data tampering', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          name: 'Test User'
        }
      });

      // Criar log de auditoria
      const log = await prisma.auditLog.create({
        data: {
          userId: user.id,
          actionType: 'create',
          resourceType: 'user',
          module: 'admin',
          description: 'User created',
          newValues: { name: 'Test User' },
          dataHash: 'original_hash',
          riskLevel: 'low',
          isSensitive: false
        }
      });

      // Verificar integridade
      const isValid = await encryptor.verifyIntegrity(
        JSON.stringify(log),
        log.dataHash
      );

      expect(isValid).toBe(false); // Hash não corresponde aos dados
    });

    it('should maintain data integrity over time', async () => {
      const data = 'sensitive data';
      const hash = 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3';

      // Verificar integridade múltiplas vezes
      for (let i = 0; i < 10; i++) {
        const isValid = await encryptor.verifyIntegrity(data, hash);
        expect(isValid).toBe(true);
      }
    });
  });

  describe('Immutable Logs', () => {
    it('should prevent log modification', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          name: 'Test User'
        }
      });

      const log = await prisma.auditLog.create({
        data: {
          userId: user.id,
          actionType: 'create',
          resourceType: 'user',
          module: 'admin',
          description: 'User created',
          newValues: { name: 'Test User' },
          dataHash: 'hash123',
          riskLevel: 'low',
          isSensitive: false
        }
      });

      // Tentar modificar log (deve falhar)
      try {
        await prisma.auditLog.update({
          where: { id: log.id },
          data: { description: 'Modified description' }
        });
        expect.fail('Should not be able to modify audit log');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should prevent log deletion', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          name: 'Test User'
        }
      });

      const log = await prisma.auditLog.create({
        data: {
          userId: user.id,
          actionType: 'create',
          resourceType: 'user',
          module: 'admin',
          description: 'User created',
          newValues: { name: 'Test User' },
          dataHash: 'hash123',
          riskLevel: 'low',
          isSensitive: false
        }
      });

      // Tentar deletar log (deve falhar)
      try {
        await prisma.auditLog.delete({
          where: { id: log.id }
        });
        expect.fail('Should not be able to delete audit log');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });
});
```

## ⚡ Testes de Performance

### 1. Load Testing

```typescript
// tests/performance/audit-load-testing.test.ts
import { describe, it, expect } from 'bun:test';
import { AuditLogger } from '../../src/audit/audit-logger';
import { TraderAuditLogger } from '../../src/audit/trader-audit-logger';
import { prisma } from '../setup';

describe('Audit Load Testing', () => {
  let auditLogger: AuditLogger;
  let traderAuditLogger: TraderAuditLogger;

  beforeEach(() => {
    auditLogger = new AuditLogger();
    traderAuditLogger = new TraderAuditLogger();
  });

  it('should handle high volume of audit logs', async () => {
    // Criar usuário
    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        name: 'Test User'
      }
    });

    const startTime = Date.now();
    
    // Criar 1000 logs de auditoria
    const promises = [];
    for (let i = 0; i < 1000; i++) {
      const promise = auditLogger.logAction(user.id, {
        type: 'create',
        resourceType: 'test',
        resourceId: `test_${i}`,
        module: 'test',
        description: `Test action ${i}`,
        newValues: { id: i, data: `test_${i}` }
      }, {
        sessionId: `session_${i}`,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0...',
        location: { country: 'BR', city: 'São Paulo' }
      });
      promises.push(promise);
    }

    await Promise.all(promises);
    
    const endTime = Date.now();
    const duration = endTime - startTime;

    expect(duration).toBeLessThan(30000); // Deve completar em menos de 30 segundos

    // Verificar se todos os logs foram criados
    const logCount = await prisma.auditLog.count({
      where: { userId: user.id }
    });

    expect(logCount).toBe(1000);
  });

  it('should handle concurrent trader audit logs', async () => {
    // Criar trader
    const trader = await prisma.user.create({
      data: {
        email: 'trader@example.com',
        name: 'Trader User'
      }
    });

    await prisma.affiliateUser.create({
      data: {
        userId: trader.id,
        tenantId: 'main-tenant',
        affiliateCode: 'TRADER001',
        userType: 'trader',
        inviteLimit: 5,
        isActive: true
      }
    });

    const startTime = Date.now();
    
    // Criar 100 logs de trader concorrentemente
    const promises = [];
    for (let i = 0; i < 100; i++) {
      const promise = traderAuditLogger.logTraderAction(trader.id, {
        category: 'trading',
        type: 'create_transaction',
        resourceType: 'transaction',
        resourceId: `tx_${i}`,
        module: 'financeiro',
        description: `Created transaction ${i}`,
        newValues: { amount: i * 100, currency: 'USD' }
      }, {
        sessionId: `session_${i}`,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0...',
        location: { country: 'BR', city: 'São Paulo' },
        deviceInfo: { type: 'desktop', os: 'Windows' }
      });
      promises.push(promise);
    }

    const results = await Promise.all(promises);
    
    const endTime = Date.now();
    const duration = endTime - startTime;

    expect(duration).toBeLessThan(10000); // Deve completar em menos de 10 segundos

    // Verificar se todos os logs foram criados
    const successCount = results.filter(r => r.success).length;
    expect(successCount).toBe(100);

    // Verificar logs no banco
    const logCount = await prisma.traderAuditLog.count({
      where: { traderId: trader.id }
    });

    expect(logCount).toBe(100);
  });

  it('should handle encryption performance', async () => {
    const encryptor = new AuditEncryptor();
    const data = 'sensitive data to encrypt';
    
    const startTime = Date.now();
    
    // Criptografar 1000 vezes
    const promises = [];
    for (let i = 0; i < 1000; i++) {
      promises.push(encryptor.encrypt(`${data}_${i}`));
    }

    await Promise.all(promises);
    
    const endTime = Date.now();
    const duration = endTime - startTime;

    expect(duration).toBeLessThan(5000); // Deve completar em menos de 5 segundos
  });
});
```

### 2. Stress Testing

```typescript
// tests/performance/audit-stress-testing.test.ts
import { describe, it, expect } from 'bun:test';
import { AuditLogger } from '../../src/audit/audit-logger';
import { prisma } from '../setup';

describe('Audit Stress Testing', () => {
  let auditLogger: AuditLogger;

  beforeEach(() => {
    auditLogger = new AuditLogger();
  });

  it('should handle stress test with large data', async () => {
    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        name: 'Test User'
      }
    });

    const largeData = {
      largeArray: Array(1000).fill(0).map((_, i) => ({ id: i, data: `item_${i}` })),
      largeString: 'x'.repeat(10000),
      nestedObject: {
        level1: {
          level2: {
            level3: {
              data: 'deep nested data'
            }
          }
        }
      }
    };

    const startTime = Date.now();
    
    // Criar 100 logs com dados grandes
    const promises = [];
    for (let i = 0; i < 100; i++) {
      const promise = auditLogger.logAction(user.id, {
        type: 'create',
        resourceType: 'large_data',
        resourceId: `large_${i}`,
        module: 'test',
        description: `Large data test ${i}`,
        newValues: { ...largeData, id: i }
      }, {
        sessionId: `session_${i}`,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0...',
        location: { country: 'BR', city: 'São Paulo' }
      });
      promises.push(promise);
    }

    const results = await Promise.all(promises);
    
    const endTime = Date.now();
    const duration = endTime - startTime;

    expect(duration).toBeLessThan(60000); // Deve completar em menos de 60 segundos

    // Verificar se todos os logs foram criados
    const successCount = results.filter(r => r.success).length;
    expect(successCount).toBe(100);
  });

  it('should handle memory pressure', async () => {
    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        name: 'Test User'
      }
    });

    const initialMemory = process.memoryUsage().heapUsed;
    
    // Criar muitos logs para testar pressão de memória
    const promises = [];
    for (let i = 0; i < 5000; i++) {
      const promise = auditLogger.logAction(user.id, {
        type: 'create',
        resourceType: 'memory_test',
        resourceId: `memory_${i}`,
        module: 'test',
        description: `Memory test ${i}`,
        newValues: { id: i, data: `test_${i}` }
      }, {
        sessionId: `session_${i}`,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0...',
        location: { country: 'BR', city: 'São Paulo' }
      });
      promises.push(promise);
    }

    await Promise.all(promises);
    
    const finalMemory = process.memoryUsage().heapUsed;
    const memoryIncrease = finalMemory - initialMemory;

    // Verificar se aumento de memória é razoável (menos de 100MB)
    expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
  });
});
```

## 📊 Coverage e Relatórios

### 1. Coverage Configuration

```json
// package.json
{
  "scripts": {
    "test:audit": "bun test tests/unit/audit/ tests/integration/audit/",
    "test:audit:coverage": "bun test --coverage tests/unit/audit/ tests/integration/audit/",
    "test:audit:e2e": "playwright test tests/e2e/audit-*.test.ts",
    "test:audit:security": "bun test tests/security/",
    "test:audit:performance": "bun test tests/performance/audit-*.test.ts"
  }
}
```

### 2. Coverage Thresholds

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      thresholds: {
        global: {
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85,
        },
        './src/audit/': {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90,
        },
      },
    },
  },
});
```

## 🚀 CI/CD Integration

### 1. GitHub Actions

```yaml
# .github/workflows/audit-tests.yml
name: Audit System Tests

on:
  push:
    paths: ['src/audit/**', 'tests/**/audit*']
  pull_request:
    paths: ['src/audit/**', 'tests/**/audit*']

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Bun
      uses: oven-sh/setup-bun@v1
    
    - name: Install dependencies
      run: bun install
    
    - name: Run unit tests
      run: bun test tests/unit/audit/ --coverage
    
    - name: Upload coverage
      uses: codecov/codecov-action@v3

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: timescale/timescaledb:16.0-pg16
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
      
      redis:
        image: redis:7.2-alpine
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Bun
      uses: oven-sh/setup-bun@v1
    
    - name: Install dependencies
      run: bun install
    
    - name: Run integration tests
      run: bun test tests/integration/audit/
      env:
        DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test
        REDIS_URL: redis://localhost:6379

  security-tests:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Bun
      uses: oven-sh/setup-bun@v1
    
    - name: Install dependencies
      run: bun install
    
    - name: Run security tests
      run: bun test tests/security/

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Bun
      uses: oven-sh/setup-bun@v1
    
    - name: Install dependencies
      run: bun install
    
    - name: Install Playwright
      run: bunx playwright install --with-deps
    
    - name: Build application
      run: |
        cd backend && bun run build
        cd ../frontend && bun run build
    
    - name: Run E2E tests
      run: bunx playwright test tests/e2e/audit-*.test.ts
      env:
        CI: true
```

## 📋 Checklist de Testes

### ✅ Testes Unitários
- [ ] Audit Logger testado
- [ ] Trader Audit Logger testado
- [ ] Influencer Audit Logger testado
- [ ] Audit Encryptor testado
- [ ] Audit Validator testado
- [ ] Audit Retriever testado
- [ ] Behavioral Analyzer testado
- [ ] Risk Calculator testado

### ✅ Testes de Integração
- [ ] Audit Middleware testado
- [ ] Module Adapters testados
- [ ] Event Bus testado
- [ ] Audit APIs testadas
- [ ] Sync Service testado

### ✅ Testes E2E
- [ ] Audit Profile Flows testados
- [ ] Audit Timeline Flows testados
- [ ] Audit Export Flows testados
- [ ] Responsividade testada

### ✅ Testes de Segurança
- [ ] Encryption tests executados
- [ ] Integrity tests executados
- [ ] Immutability tests executados
- [ ] Key management testado

### ✅ Testes de Performance
- [ ] Load testing executado
- [ ] Stress testing executado
- [ ] Memory pressure testado
- [ ] Concurrency testado

## 🚨 Troubleshooting

### Problemas Comuns

#### 1. Testes de Criptografia Falhando
```bash
# Verificar variáveis de ambiente
echo $AUDIT_ENCRYPTION_KEY

# Executar testes de criptografia isoladamente
bun test tests/unit/audit/audit-encryptor.test.ts
```

#### 2. Problemas de Integridade
```bash
# Verificar logs de integridade
bun test --verbose tests/security/integrity.test.ts

# Verificar configuração do banco
bun test --verbose tests/integration/audit-middleware.test.ts
```

#### 3. Problemas de Performance
```bash
# Executar testes de performance
bun test tests/performance/audit-load-testing.test.ts

# Verificar métricas de memória
bun test --verbose tests/performance/audit-stress-testing.test.ts
```

## 📞 Suporte

Para problemas de testes de auditoria:
1. Verificar logs: `bun test --verbose tests/unit/audit/`
2. Executar testes específicos: `bun test tests/integration/audit-middleware.test.ts`
3. Verificar cobertura: `bun test --coverage tests/unit/audit/`
4. Contatar equipe de QA

---

**Última atualização**: 2024-12-19
**Versão**: 1.0.0
**Responsável**: Agente-CTO