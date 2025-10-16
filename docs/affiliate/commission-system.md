# Sistema de Comissionamento Multi-Nível - BotCriptoFy2

## 💰 Visão Geral

Sistema de comissionamento robusto que distribui até 5% da comissão da plataforma entre afiliados em até 5 níveis, com diferentes taxas baseadas no tipo de usuário e nível de relacionamento.

## 🏗️ Arquitetura do Comissionamento

### Componentes Principais
- **Commission Calculator**: Calculadora de comissões por nível
- **Commission Distributor**: Distribuidor de comissões entre afiliados
- **Commission Validator**: Validador de comissões e limites
- **Commission Tracker**: Rastreador de comissões pagas e pendentes
- **Commission Reporter**: Gerador de relatórios de comissões

### Estratégia de Distribuição
- **Limite Total**: 5% da comissão da plataforma
- **Máximo de Níveis**: 5 níveis de comissionamento
- **Base de Cálculo**: Comissão gerada por operações com lucro
- **Distribuição**: Percentual por nível e tipo de usuário

## 📊 Estrutura de Comissionamento

### Taxas por Tipo de Usuário

#### **Traders (5 convites limitados)**
| Nível | Percentual | Descrição |
|-------|------------|-----------|
| 1º | 2.00% | Usuário direto convidado |
| 2º | 1.50% | Usuário convidado pelo 1º nível |
| 3º | 1.00% | Usuário convidado pelo 2º nível |
| 4º | 0.50% | Usuário convidado pelo 3º nível |
| 5º | 0.25% | Usuário convidado pelo 4º nível |
| **Total** | **5.25%** | **Soma máxima (limitada a 5%)** |

#### **Influencers (convites ilimitados)**
| Nível | Percentual | Descrição |
|-------|------------|-----------|
| 1º | 1.50% | Usuário direto convidado |
| 2º | 1.00% | Usuário convidado pelo 1º nível |
| 3º | 0.75% | Usuário convidado pelo 2º nível |
| 4º | 0.50% | Usuário convidado pelo 3º nível |
| 5º | 0.25% | Usuário convidado pelo 4º nível |
| **Total** | **4.00%** | **Soma máxima** |

#### **Parceiros (convites ilimitados)**
| Nível | Percentual | Descrição |
|-------|------------|-----------|
| 1º | 1.00% | Usuário direto convidado |
| 2º | 0.75% | Usuário convidado pelo 1º nível |
| 3º | 0.50% | Usuário convidado pelo 3º nível |
| 4º | 0.25% | Usuário convidado pelo 4º nível |
| 5º | 0.10% | Usuário convidado pelo 5º nível |
| **Total** | **2.60%** | **Soma máxima** |

### Limite Global de Comissão
- **Máximo Total**: 5% da comissão da plataforma
- **Validação**: Sistema valida se soma não excede 5%
- **Ajuste Automático**: Reduz percentuais proporcionalmente se exceder
- **Auditoria**: Log de todos os ajustes realizados

## 🔧 Implementação do Sistema

### 1. Commission Calculator

```typescript
// backend/src/affiliate/commission-calculator.ts
export class CommissionCalculator {
  private commissionRates: Map<string, Map<number, number>>;

  constructor() {
    this.initializeRates();
  }

  private initializeRates() {
    this.commissionRates = new Map();
    
    // Traders
    this.commissionRates.set('trader', new Map([
      [1, 2.00],
      [2, 1.50],
      [3, 1.00],
      [4, 0.50],
      [5, 0.25]
    ]));

    // Influencers
    this.commissionRates.set('influencer', new Map([
      [1, 1.50],
      [2, 1.00],
      [3, 0.75],
      [4, 0.50],
      [5, 0.25]
    ]));

    // Parceiros
    this.commissionRates.set('partner', new Map([
      [1, 1.00],
      [2, 0.75],
      [3, 0.50],
      [4, 0.25],
      [5, 0.10]
    ]));
  }

  calculateCommission(
    userType: string,
    level: number,
    baseAmount: number,
    platformCommission: number
  ): {
    commissionAmount: number;
    commissionPercentage: number;
    isValid: boolean;
    adjustedPercentage?: number;
  } {
    const rates = this.commissionRates.get(userType);
    if (!rates || !rates.has(level)) {
      return {
        commissionAmount: 0,
        commissionPercentage: 0,
        isValid: false
      };
    }

    const percentage = rates.get(level)!;
    const commissionAmount = (baseAmount * percentage) / 100;
    
    // Verificar se não excede 5% da comissão da plataforma
    const maxCommission = (platformCommission * 5) / 100;
    const isValid = commissionAmount <= maxCommission;

    if (!isValid) {
      // Ajustar percentual proporcionalmente
      const adjustedPercentage = (maxCommission / baseAmount) * 100;
      const adjustedAmount = (baseAmount * adjustedPercentage) / 100;
      
      return {
        commissionAmount: adjustedAmount,
        commissionPercentage: adjustedPercentage,
        isValid: true,
        adjustedPercentage
      };
    }

    return {
      commissionAmount,
      commissionPercentage: percentage,
      isValid: true
    };
  }

  calculateMultiLevelCommission(
    affiliateChain: Array<{
      userId: string;
      userType: string;
      level: number;
    }>,
    baseAmount: number,
    platformCommission: number
  ): Array<{
    userId: string;
    userType: string;
    level: number;
    commissionAmount: number;
    commissionPercentage: number;
    isValid: boolean;
    adjustedPercentage?: number;
  }> {
    const results = [];
    let totalCommission = 0;
    const maxTotalCommission = (platformCommission * 5) / 100;

    for (const affiliate of affiliateChain) {
      const commission = this.calculateCommission(
        affiliate.userType,
        affiliate.level,
        baseAmount,
        platformCommission
      );

      // Verificar se adicionar esta comissão não excede o limite total
      if (totalCommission + commission.commissionAmount <= maxTotalCommission) {
        results.push({
          ...affiliate,
          ...commission
        });
        totalCommission += commission.commissionAmount;
      } else {
        // Ajustar para não exceder o limite total
        const remainingCommission = maxTotalCommission - totalCommission;
        const adjustedPercentage = (remainingCommission / baseAmount) * 100;
        
        results.push({
          ...affiliate,
          commissionAmount: remainingCommission,
          commissionPercentage: adjustedPercentage,
          isValid: true,
          adjustedPercentage
        });
        break;
      }
    }

    return results;
  }
}
```

### 2. Commission Distributor

```typescript
// backend/src/affiliate/commission-distributor.ts
import { prisma } from '../db';
import { CommissionCalculator } from './commission-calculator';

export class CommissionDistributor {
  private calculator: CommissionCalculator;

  constructor() {
    this.calculator = new CommissionCalculator();
  }

  async distributeCommission(
    transactionId: string,
    referredUserId: string,
    baseAmount: number,
    platformCommission: number
  ) {
    // Buscar cadeia de afiliados
    const affiliateChain = await this.getAffiliateChain(referredUserId);
    
    if (affiliateChain.length === 0) {
      return { success: false, message: 'No affiliate chain found' };
    }

    // Calcular comissões
    const commissions = this.calculator.calculateMultiLevelCommission(
      affiliateChain,
      baseAmount,
      platformCommission
    );

    // Criar registros de comissão
    const commissionRecords = [];
    for (const commission of commissions) {
      const record = await prisma.affiliateCommission.create({
        data: {
          affiliateUserId: commission.userId,
          referredUserId,
          level: commission.level,
          transactionId,
          commissionAmount: commission.commissionAmount,
          commissionPercentage: commission.commissionPercentage,
          baseAmount,
          status: 'pending'
        }
      });

      commissionRecords.push(record);

      // Atualizar total de ganhos do afiliado
      await prisma.affiliateUser.update({
        where: { id: commission.userId },
        data: {
          totalEarnings: {
            increment: commission.commissionAmount
          }
        }
      });
    }

    return {
      success: true,
      commissions: commissionRecords,
      totalDistributed: commissions.reduce((sum, c) => sum + c.commissionAmount, 0)
    };
  }

  private async getAffiliateChain(userId: string): Promise<Array<{
    userId: string;
    userType: string;
    level: number;
  }>> {
    const chain = [];
    let currentUserId = userId;
    let level = 1;

    while (level <= 5) {
      const relationship = await prisma.affiliateRelationship.findFirst({
        where: {
          referredUserId: currentUserId,
          isActive: true
        },
        include: {
          affiliateUser: {
            include: {
              user: true
            }
          }
        }
      });

      if (!relationship) {
        break;
      }

      chain.push({
        userId: relationship.affiliateUserId,
        userType: relationship.affiliateUser.userType,
        level
      });

      currentUserId = relationship.affiliateUserId;
      level++;
    }

    return chain;
  }

  async processCommissionPayment(commissionId: string) {
    const commission = await prisma.affiliateCommission.findUnique({
      where: { id: commissionId },
      include: {
        affiliateUser: true
      }
    });

    if (!commission) {
      throw new Error('Commission not found');
    }

    if (commission.status !== 'pending') {
      throw new Error('Commission already processed');
    }

    // Processar pagamento via gateway de pagamento
    const paymentResult = await this.processPayment({
      affiliateUserId: commission.affiliateUserId,
      amount: commission.commissionAmount,
      paymentMethod: 'pix' // Método padrão
    });

    if (paymentResult.success) {
      // Atualizar status da comissão
      await prisma.affiliateCommission.update({
        where: { id: commissionId },
        data: {
          status: 'paid',
          paidAt: new Date(),
          paymentReference: paymentResult.paymentId
        }
      });

      // Atualizar total de comissões pagas
      await prisma.affiliateUser.update({
        where: { id: commission.affiliateUserId },
        data: {
          totalCommissionsPaid: {
            increment: commission.commissionAmount
          }
        }
      });
    }

    return paymentResult;
  }

  private async processPayment(paymentData: {
    affiliateUserId: string;
    amount: number;
    paymentMethod: string;
  }) {
    // Integração com sistema de pagamentos
    // Implementar lógica de pagamento via gateway
    return {
      success: true,
      paymentId: `pay_${Date.now()}`,
      status: 'completed'
    };
  }
}
```

### 3. Commission Validator

```typescript
// backend/src/affiliate/commission-validator.ts
export class CommissionValidator {
  async validateCommission(
    affiliateUserId: string,
    level: number,
    baseAmount: number,
    platformCommission: number
  ): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors = [];
    const warnings = [];

    // Validar se o afiliado existe e está ativo
    const affiliate = await prisma.affiliateUser.findUnique({
      where: { id: affiliateUserId }
    });

    if (!affiliate) {
      errors.push('Affiliate user not found');
    } else if (!affiliate.isActive) {
      errors.push('Affiliate user is not active');
    }

    // Validar nível
    if (level < 1 || level > 5) {
      errors.push('Invalid commission level');
    }

    // Validar valor base
    if (baseAmount <= 0) {
      errors.push('Invalid base amount');
    }

    // Validar comissão da plataforma
    if (platformCommission <= 0) {
      errors.push('Invalid platform commission');
    }

    // Validar se não excede limite de 5%
    const maxCommission = (platformCommission * 5) / 100;
    const calculatedCommission = (baseAmount * this.getRate(affiliate?.userType, level)) / 100;
    
    if (calculatedCommission > maxCommission) {
      warnings.push('Commission exceeds 5% limit, will be adjusted');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private getRate(userType: string, level: number): number {
    const rates = {
      trader: { 1: 2.00, 2: 1.50, 3: 1.00, 4: 0.50, 5: 0.25 },
      influencer: { 1: 1.50, 2: 1.00, 3: 0.75, 4: 0.50, 5: 0.25 },
      partner: { 1: 1.00, 2: 0.75, 3: 0.50, 4: 0.25, 5: 0.10 }
    };

    return rates[userType]?.[level] || 0;
  }
}
```

## 📊 Relatórios de Comissão

### 1. Relatório de Comissões por Afiliado

```typescript
// backend/src/affiliate/reports/commission-report.ts
export class CommissionReport {
  async generateAffiliateReport(
    affiliateUserId: string,
    startDate: Date,
    endDate: Date
  ) {
    const commissions = await prisma.affiliateCommission.findMany({
      where: {
        affiliateUserId,
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        referredUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        transaction: {
          select: {
            id: true,
            amount: true,
            currency: true,
            description: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const summary = {
      totalCommissions: commissions.length,
      totalAmount: commissions.reduce((sum, c) => sum + c.commissionAmount, 0),
      pendingAmount: commissions
        .filter(c => c.status === 'pending')
        .reduce((sum, c) => sum + c.commissionAmount, 0),
      paidAmount: commissions
        .filter(c => c.status === 'paid')
        .reduce((sum, c) => sum + c.commissionAmount, 0)
    };

    const byLevel = commissions.reduce((acc, commission) => {
      const level = commission.level;
      if (!acc[level]) {
        acc[level] = {
          count: 0,
          amount: 0
        };
      }
      acc[level].count++;
      acc[level].amount += commission.commissionAmount;
      return acc;
    }, {});

    const byMonth = commissions.reduce((acc, commission) => {
      const month = commission.createdAt.toISOString().substring(0, 7);
      if (!acc[month]) {
        acc[month] = {
          count: 0,
          amount: 0
        };
      }
      acc[month].count++;
      acc[month].amount += commission.commissionAmount;
      return acc;
    }, {});

    return {
      summary,
      byLevel,
      byMonth,
      commissions: commissions.map(c => ({
        id: c.id,
        level: c.level,
        referredUser: c.referredUser,
        transaction: c.transaction,
        commissionAmount: c.commissionAmount,
        commissionPercentage: c.commissionPercentage,
        status: c.status,
        createdAt: c.createdAt,
        paidAt: c.paidAt
      }))
    };
  }
}
```

### 2. Relatório Global de Comissões

```typescript
// backend/src/affiliate/reports/global-commission-report.ts
export class GlobalCommissionReport {
  async generateGlobalReport(startDate: Date, endDate: Date) {
    const commissions = await prisma.affiliateCommission.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        affiliateUser: {
          select: {
            userType: true,
            affiliateCode: true
          }
        }
      }
    });

    const summary = {
      totalCommissions: commissions.length,
      totalAmount: commissions.reduce((sum, c) => sum + c.commissionAmount, 0),
      totalAffiliates: new Set(commissions.map(c => c.affiliateUserId)).size,
      averageCommission: 0
    };

    summary.averageCommission = summary.totalAmount / summary.totalCommissions;

    const byUserType = commissions.reduce((acc, commission) => {
      const userType = commission.affiliateUser.userType;
      if (!acc[userType]) {
        acc[userType] = {
          count: 0,
          amount: 0,
          affiliates: new Set()
        };
      }
      acc[userType].count++;
      acc[userType].amount += commission.commissionAmount;
      acc[userType].affiliates.add(commission.affiliateUserId);
      return acc;
    }, {});

    // Converter Set para número
    Object.keys(byUserType).forEach(userType => {
      byUserType[userType].affiliates = byUserType[userType].affiliates.size;
    });

    const byLevel = commissions.reduce((acc, commission) => {
      const level = commission.level;
      if (!acc[level]) {
        acc[level] = {
          count: 0,
          amount: 0
        };
      }
      acc[level].count++;
      acc[level].amount += commission.commissionAmount;
      return acc;
    }, {});

    return {
      summary,
      byUserType,
      byLevel,
      topAffiliates: await this.getTopAffiliates(startDate, endDate)
    };
  }

  private async getTopAffiliates(startDate: Date, endDate: Date) {
    const topAffiliates = await prisma.affiliateCommission.groupBy({
      by: ['affiliateUserId'],
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      _sum: {
        commissionAmount: true
      },
      _count: {
        id: true
      },
      orderBy: {
        _sum: {
          commissionAmount: 'desc'
        }
      },
      take: 10
    });

    const affiliateDetails = await Promise.all(
      topAffiliates.map(async (affiliate) => {
        const user = await prisma.affiliateUser.findUnique({
          where: { id: affiliate.affiliateUserId },
          include: {
            user: {
              select: {
                name: true,
                email: true
              }
            }
          }
        });

        return {
          affiliateId: affiliate.affiliateUserId,
          affiliateCode: user?.affiliateCode,
          userName: user?.user.name,
          userEmail: user?.user.email,
          userType: user?.userType,
          totalCommissions: affiliate._sum.commissionAmount || 0,
          commissionCount: affiliate._count.id
        };
      })
    );

    return affiliateDetails;
  }
}
```

## 🧪 Testes do Sistema de Comissionamento

### Testes Unitários

```typescript
// tests/unit/affiliate/commission-calculator.test.ts
import { describe, it, expect } from 'bun:test';
import { CommissionCalculator } from '../../src/affiliate/commission-calculator';

describe('CommissionCalculator', () => {
  let calculator: CommissionCalculator;

  beforeEach(() => {
    calculator = new CommissionCalculator();
  });

  describe('calculateCommission', () => {
    it('should calculate trader commission correctly', () => {
      const result = calculator.calculateCommission('trader', 1, 1000, 100);
      
      expect(result.commissionAmount).toBe(20); // 2% de 1000
      expect(result.commissionPercentage).toBe(2.00);
      expect(result.isValid).toBe(true);
    });

    it('should calculate influencer commission correctly', () => {
      const result = calculator.calculateCommission('influencer', 2, 1000, 100);
      
      expect(result.commissionAmount).toBe(10); // 1% de 1000
      expect(result.commissionPercentage).toBe(1.00);
      expect(result.isValid).toBe(true);
    });

    it('should adjust commission when exceeds 5% limit', () => {
      const result = calculator.calculateCommission('trader', 1, 1000, 10);
      
      expect(result.commissionAmount).toBe(0.5); // 5% de 10
      expect(result.isValid).toBe(true);
      expect(result.adjustedPercentage).toBeDefined();
    });

    it('should return invalid for unsupported user type', () => {
      const result = calculator.calculateCommission('invalid', 1, 1000, 100);
      
      expect(result.isValid).toBe(false);
      expect(result.commissionAmount).toBe(0);
    });
  });

  describe('calculateMultiLevelCommission', () => {
    it('should calculate multi-level commission correctly', () => {
      const affiliateChain = [
        { userId: 'aff1', userType: 'trader', level: 1 },
        { userId: 'aff2', userType: 'trader', level: 2 },
        { userId: 'aff3', userType: 'trader', level: 3 }
      ];

      const results = calculator.calculateMultiLevelCommission(
        affiliateChain,
        1000,
        100
      );

      expect(results).toHaveLength(3);
      expect(results[0].commissionAmount).toBe(20); // 2%
      expect(results[1].commissionAmount).toBe(15); // 1.5%
      expect(results[2].commissionAmount).toBe(10); // 1%
    });

    it('should stop when total exceeds 5% limit', () => {
      const affiliateChain = [
        { userId: 'aff1', userType: 'trader', level: 1 },
        { userId: 'aff2', userType: 'trader', level: 2 },
        { userId: 'aff3', userType: 'trader', level: 3 },
        { userId: 'aff4', userType: 'trader', level: 4 },
        { userId: 'aff5', userType: 'trader', level: 5 }
      ];

      const results = calculator.calculateMultiLevelCommission(
        affiliateChain,
        1000,
        10 // 5% = 0.5
      );

      expect(results).toHaveLength(1);
      expect(results[0].commissionAmount).toBe(0.5);
      expect(results[0].adjustedPercentage).toBeDefined();
    });
  });
});
```

## 📋 Checklist de Implementação

### ✅ Configuração Inicial
- [ ] Criar tabelas de comissionamento
- [ ] Configurar taxas por tipo e nível
- [ ] Configurar limite de 5%
- [ ] Implementar validações

### ✅ Funcionalidades
- [ ] Calculadora de comissões
- [ ] Distribuidor de comissões
- [ ] Validador de comissões
- [ ] Processamento de pagamentos

### ✅ Relatórios
- [ ] Relatório por afiliado
- [ ] Relatório global
- [ ] Relatório por nível
- [ ] Relatório por período

### ✅ Testes
- [ ] Testes unitários
- [ ] Testes de integração
- [ ] Testes de validação
- [ ] Testes de limite

---

**Última atualização**: 2024-12-19
**Versão**: 1.0.0
**Responsável**: Agente-CTO