# Risk Module - Competence Invasion Analysis

**Data**: 18 de Outubro de 2025  
**Analista**: Agente-CTO  
**Status**: ⚠️ **INVASÕES IDENTIFICADAS**  

---

## 🎯 **RESUMO EXECUTIVO**

Análise completa das dependências do módulo Risk identificou **3 invasões de competência** que violam os princípios de separação de responsabilidades e Clean Architecture. Estas invasões devem ser corrigidas para manter a integridade arquitetural do sistema.

---

## 🔍 **INVASÕES IDENTIFICADAS**

### **1. INVASÃO CRÍTICA: Módulo Positions**

#### **O que está acontecendo:**
```typescript
// ❌ INVASÃO: Risk module acessando diretamente positions schema
import { positions } from '../../positions/schema/positions.schema';

// ❌ INVASÃO: Risk module fazendo queries diretas em positions
const openPositions = await db
  .select()
  .from(positions)
  .where(and(
    eq(positions.userId, userId),
    eq(positions.tenantId, tenantId),
    eq(positions.status, 'open')
  ));
```

#### **Problemas:**
- **Violação de Encapsulamento**: Risk module conhece estrutura interna de positions
- **Acoplamento Forte**: Mudanças em positions quebram risk module
- **Responsabilidade Incorreta**: Risk não deveria gerenciar dados de positions
- **Violação DDD**: Risk está invadindo domínio de positions

#### **Solução Recomendada:**
```typescript
// ✅ CORRETO: Usar interface/contrato
interface IPositionService {
  getOpenPositions(userId: string, tenantId: string): Promise<Position[]>;
  getPositionValue(position: Position): number;
  getPositionSide(position: Position): 'long' | 'short';
}

// ✅ CORRETO: Injeção de dependência
class RiskService {
  constructor(private positionService: IPositionService) {}
  
  async calculateRiskMetrics(userId: string, tenantId: string) {
    const positions = await this.positionService.getOpenPositions(userId, tenantId);
    // ... cálculos de risco
  }
}
```

---

### **2. INVASÃO CRÍTICA: Módulo Banco/Wallet**

#### **O que está acontecendo:**
```typescript
// ❌ INVASÃO: Risk module acessando diretamente wallet schema
import { wallets } from '../../banco/schema/wallet.schema';
import { walletService } from '../../banco/services/wallet.service';

// ❌ INVASÃO: Risk module fazendo queries diretas em wallets
const userWallets = await db
  .select()
  .from(wallets)
  .where(and(eq(wallets.userId, userId), eq(wallets.tenantId, tenantId)));

// ❌ INVASÃO: Risk module chamando wallet service diretamente
const summary = await walletService.getWalletSummary(userWallets[0].id);
```

#### **Problemas:**
- **Violação de Encapsulamento**: Risk module conhece estrutura interna de wallets
- **Acoplamento Forte**: Mudanças em banco quebram risk module
- **Responsabilidade Incorreta**: Risk não deveria gerenciar dados de wallet
- **Violação DDD**: Risk está invadindo domínio de banco

#### **Solução Recomendada:**
```typescript
// ✅ CORRETO: Usar interface/contrato
interface IWalletService {
  getWalletSummary(walletId: string): Promise<WalletSummary | null>;
  getTotalPortfolioValue(userId: string, tenantId: string): Promise<number>;
}

// ✅ CORRETO: Injeção de dependência
class RiskService {
  constructor(private walletService: IWalletService) {}
  
  async calculateRiskMetrics(userId: string, tenantId: string) {
    const portfolioValue = await this.walletService.getTotalPortfolioValue(userId, tenantId);
    // ... cálculos de risco
  }
}
```

---

### **3. INVASÃO MODERADA: Módulo Notifications**

#### **O que está acontecendo:**
```typescript
// ❌ INVASÃO: Risk module chamando notification service diretamente
import { sendNotification } from '../../notifications/services/notification.service';
import type { SendNotificationRequest } from '../../notifications/types/notification.types';

// ❌ INVASÃO: Risk module conhecendo tipos de notification
const request: SendNotificationRequest = {
  userId: alert.userId,
  tenantId: alert.tenantId,
  type: 'email',
  category: 'trading',
  // ...
};
```

#### **Problemas:**
- **Acoplamento Moderado**: Risk module conhece detalhes de notifications
- **Responsabilidade Incorreta**: Risk não deveria gerenciar notificações
- **Violação SRP**: Risk tem múltiplas responsabilidades

#### **Solução Recomendada:**
```typescript
// ✅ CORRETO: Usar interface/contrato
interface INotificationService {
  sendRiskAlert(alert: RiskAlert): Promise<void>;
  sendCustomNotification(userId: string, message: string): Promise<void>;
}

// ✅ CORRETO: Injeção de dependência
class RiskService {
  constructor(private notificationService: INotificationService) {}
  
  private async sendAlertNotifications(alert: RiskAlert) {
    await this.notificationService.sendRiskAlert(alert);
  }
}
```

---

## 📊 **ANÁLISE DE IMPACTO**

### **Severidade das Invasões**

| Módulo Invadido | Severidade | Impacto | Prioridade |
|-----------------|------------|---------|------------|
| **Positions** | 🔴 **CRÍTICA** | Alto | P0 |
| **Banco/Wallet** | 🔴 **CRÍTICA** | Alto | P0 |
| **Notifications** | 🟡 **MODERADA** | Médio | P1 |

### **Riscos Identificados**

1. **Fragilidade Arquitetural**
   - Mudanças em positions/banco quebram risk
   - Difícil manutenção e evolução
   - Violação de princípios SOLID

2. **Acoplamento Excessivo**
   - Risk module não é independente
   - Testes complexos (muitos mocks)
   - Reutilização limitada

3. **Responsabilidades Confusas**
   - Risk module faz mais que gestão de risco
   - Violação do Single Responsibility Principle
   - Dificulta entendimento do código

---

## 🛠️ **PLANO DE CORREÇÃO**

### **Fase 1: Refatoração Crítica (P0)**

#### **1.1 Criar Interfaces de Contrato**
```typescript
// src/modules/risk/contracts/position.contract.ts
export interface IPositionService {
  getOpenPositions(userId: string, tenantId: string): Promise<Position[]>;
  getPositionValue(position: Position): number;
  getPositionSide(position: Position): 'long' | 'short';
  getPositionAsset(position: Position): string;
}

// src/modules/risk/contracts/wallet.contract.ts
export interface IWalletService {
  getWalletSummary(walletId: string): Promise<WalletSummary | null>;
  getTotalPortfolioValue(userId: string, tenantId: string): Promise<number>;
  getCashBalance(userId: string, tenantId: string): Promise<number>;
}

// src/modules/risk/contracts/notification.contract.ts
export interface INotificationService {
  sendRiskAlert(alert: RiskAlert): Promise<void>;
  sendCustomNotification(userId: string, message: string): Promise<void>;
}
```

#### **1.2 Refatorar RiskService**
```typescript
// src/modules/risk/services/risk.service.ts
export class RiskService implements IRiskService {
  constructor(
    private positionService: IPositionService,
    private walletService: IWalletService,
    private notificationService: INotificationService,
    private repositories: IRiskRepositoryFactory
  ) {}

  async calculateRiskMetrics(userId: string, tenantId: string): Promise<RiskMetrics> {
    // ✅ Usar serviços injetados
    const positions = await this.positionService.getOpenPositions(userId, tenantId);
    const portfolioValue = await this.walletService.getTotalPortfolioValue(userId, tenantId);
    const cashBalance = await this.walletService.getCashBalance(userId, tenantId);
    
    // ... cálculos de risco
  }
}
```

#### **1.3 Criar Factory de Dependências**
```typescript
// src/modules/risk/factories/risk-dependencies.factory.ts
export class RiskDependenciesFactory {
  static createPositionService(): IPositionService {
    // Retornar implementação real ou mock
    return new PositionService();
  }

  static createWalletService(): IWalletService {
    // Retornar implementação real ou mock
    return new WalletService();
  }

  static createNotificationService(): INotificationService {
    // Retornar implementação real ou mock
    return new NotificationService();
  }

  static createRiskService(): RiskService {
    return new RiskService(
      this.createPositionService(),
      this.createWalletService(),
      this.createNotificationService(),
      getRiskRepositoryFactory()
    );
  }
}
```

### **Fase 2: Implementação de Contratos (P1)**

#### **2.1 Implementar PositionService**
```typescript
// src/modules/positions/services/position.service.ts
export class PositionService implements IPositionService {
  async getOpenPositions(userId: string, tenantId: string): Promise<Position[]> {
    // Implementação real usando positions module
  }

  getPositionValue(position: Position): number {
    return parseFloat(position.currentPrice) * parseFloat(position.remainingQuantity);
  }

  getPositionSide(position: Position): 'long' | 'short' {
    return position.side;
  }

  getPositionAsset(position: Position): string {
    return position.asset;
  }
}
```

#### **2.2 Implementar WalletService**
```typescript
// src/modules/banco/services/wallet.service.ts
export class WalletService implements IWalletService {
  async getWalletSummary(walletId: string): Promise<WalletSummary | null> {
    // Implementação real usando banco module
  }

  async getTotalPortfolioValue(userId: string, tenantId: string): Promise<number> {
    // Implementação real usando banco module
  }

  async getCashBalance(userId: string, tenantId: string): Promise<number> {
    // Implementação real usando banco module
  }
}
```

#### **2.3 Implementar NotificationService**
```typescript
// src/modules/notifications/services/notification.service.ts
export class NotificationService implements INotificationService {
  async sendRiskAlert(alert: RiskAlert): Promise<void> {
    // Implementação real usando notifications module
  }

  async sendCustomNotification(userId: string, message: string): Promise<void> {
    // Implementação real usando notifications module
  }
}
```

### **Fase 3: Testes e Validação (P1)**

#### **3.1 Atualizar Testes**
```typescript
// src/modules/risk/__tests__/risk.service.test.ts
describe('RiskService', () => {
  let mockPositionService: jest.Mocked<IPositionService>;
  let mockWalletService: jest.Mocked<IWalletService>;
  let mockNotificationService: jest.Mocked<INotificationService>;

  beforeEach(() => {
    mockPositionService = {
      getOpenPositions: jest.fn(),
      getPositionValue: jest.fn(),
      getPositionSide: jest.fn(),
      getPositionAsset: jest.fn(),
    };

    mockWalletService = {
      getWalletSummary: jest.fn(),
      getTotalPortfolioValue: jest.fn(),
      getCashBalance: jest.fn(),
    };

    mockNotificationService = {
      sendRiskAlert: jest.fn(),
      sendCustomNotification: jest.fn(),
    };

    riskService = new RiskService(
      mockPositionService,
      mockWalletService,
      mockNotificationService,
      mockRepositories
    );
  });
});
```

---

## 📈 **BENEFÍCIOS DA CORREÇÃO**

### **Arquitetura**
- ✅ **Separação de Responsabilidades** - Cada módulo tem sua responsabilidade
- ✅ **Baixo Acoplamento** - Módulos independentes
- ✅ **Alta Coesão** - Funcionalidades relacionadas juntas
- ✅ **Testabilidade** - Fácil mock de dependências

### **Manutenibilidade**
- ✅ **Evolução Independente** - Mudanças isoladas
- ✅ **Reutilização** - Serviços podem ser reutilizados
- ✅ **Debugging** - Mais fácil identificar problemas
- ✅ **Documentação** - Contratos claros

### **Performance**
- ✅ **Lazy Loading** - Carregamento sob demanda
- ✅ **Caching** - Cache independente por módulo
- ✅ **Escalabilidade** - Módulos podem escalar independentemente

---

## 🎯 **CRONOGRAMA DE IMPLEMENTAÇÃO**

### **Semana 1: Fase 1 (P0)**
- [ ] Criar interfaces de contrato
- [ ] Refatorar RiskService
- [ ] Criar factory de dependências
- [ ] Testes unitários

### **Semana 2: Fase 2 (P1)**
- [ ] Implementar PositionService
- [ ] Implementar WalletService
- [ ] Implementar NotificationService
- [ ] Integração

### **Semana 3: Fase 3 (P1)**
- [ ] Testes de integração
- [ ] Validação de performance
- [ ] Documentação atualizada
- [ ] Deploy

---

## ⚠️ **RISCOS E MITIGAÇÕES**

### **Riscos**
1. **Breaking Changes** - Mudanças podem quebrar funcionalidades existentes
2. **Performance Impact** - Adição de camadas pode impactar performance
3. **Complexity** - Código pode ficar mais complexo inicialmente

### **Mitigações**
1. **Testes Abrangentes** - Cobertura de testes antes das mudanças
2. **Feature Flags** - Implementação gradual com flags
3. **Monitoring** - Monitoramento de performance durante transição
4. **Rollback Plan** - Plano de rollback em caso de problemas

---

## 📋 **CHECKLIST DE VALIDAÇÃO**

### **Antes da Implementação**
- [ ] Interfaces de contrato definidas
- [ ] Factory de dependências criada
- [ ] Testes unitários atualizados
- [ ] Documentação atualizada

### **Durante a Implementação**
- [ ] RiskService refatorado
- [ ] Serviços implementados
- [ ] Testes passando
- [ ] Performance validada

### **Após a Implementação**
- [ ] Funcionalidades mantidas
- [ ] Performance mantida ou melhorada
- [ ] Código mais limpo e maintível
- [ ] Documentação atualizada

---

## 🎉 **CONCLUSÃO**

As invasões de competência identificadas são **críticas** e devem ser corrigidas para manter a integridade arquitetural do sistema. A refatoração proposta seguirá os princípios de Clean Architecture e SOLID, resultando em um código mais maintível, testável e escalável.

**Prioridade**: 🔴 **ALTA** - Implementar imediatamente  
**Esforço**: 🟡 **MÉDIO** - 2-3 semanas  
**Benefício**: 🟢 **ALTO** - Arquitetura limpa e maintível  

---

**Documento Gerado**: 18 de Outubro de 2025  
**Analista**: Agente-CTO  
**Status**: ⚠️ Aguardando Aprovação para Implementação