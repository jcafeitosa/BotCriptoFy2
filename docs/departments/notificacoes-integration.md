# Integração Central de Notificações - Todos os Departamentos

## 🎯 Visão Geral

Este documento detalha como o sistema central de notificações se integra com todos os 10 departamentos da plataforma, fornecendo um sistema unificado e consistente de comunicação.

## 🏗️ Arquitetura de Integração

### Fluxo Central de Notificações
```
Departamento → Serviço de Notificação → Template Engine → Channel Router → Delivery → Tracking
```

### Componentes de Integração
- **Notification Service**: Serviço central de notificações
- **Department Adapters**: Adaptadores específicos por departamento
- **Template Manager**: Gerenciador de templates centralizado
- **Channel Router**: Roteador inteligente de canais
- **Preference Engine**: Motor de preferências de usuário

## 📊 Integração por Departamento

### 1. Financeiro

#### Templates de Notificação
```typescript
// Templates específicos do Financeiro
const financeiroTemplates = {
  payment_success: {
    email: {
      subject: 'Pagamento Confirmado - {{amount}} {{currency}}',
      content: 'Seu pagamento foi processado com sucesso...'
    },
    sms: {
      content: 'Pagamento de {{amount}} {{currency}} confirmado. ID: {{transactionId}}'
    },
    push: {
      title: 'Pagamento Confirmado',
      body: 'Seu pagamento foi processado com sucesso'
    }
  },
  payment_failed: {
    email: {
      subject: 'Falha no Pagamento - {{amount}} {{currency}}',
      content: 'Houve um problema com seu pagamento...'
    },
    sms: {
      content: 'Falha no pagamento de {{amount}} {{currency}}. Motivo: {{reason}}'
    }
  },
  subscription_renewal: {
    email: {
      subject: 'Renovação de Assinatura - {{planName}}',
      content: 'Sua assinatura foi renovada automaticamente...'
    }
  }
};
```

#### Integração no Código
```typescript
// financeiro.service.ts
import { NotificationService } from '../notificacoes/services/notification.service';

@Injectable()
export class FinanceiroService {
  constructor(private notificationService: NotificationService) {}

  async processPayment(paymentData: PaymentData): Promise<void> {
    // Processar pagamento
    const result = await this.processPaymentInternal(paymentData);
    
    // Enviar notificação baseada no resultado
    if (result.success) {
      await this.notificationService.sendNotification({
        userId: paymentData.userId,
        departmentId: 'financeiro',
        templateKey: 'payment_success',
        variables: {
          amount: paymentData.amount,
          currency: paymentData.currency,
          transactionId: result.transactionId,
          paymentMethod: paymentData.method
        },
        priority: 'normal'
      });
    } else {
      await this.notificationService.sendNotification({
        userId: paymentData.userId,
        departmentId: 'financeiro',
        templateKey: 'payment_failed',
        variables: {
          amount: paymentData.amount,
          currency: paymentData.currency,
          reason: result.errorMessage,
          retryUrl: result.retryUrl
        },
        priority: 'high'
      });
    }
  }
}
```

### 2. Marketing

#### Templates de Notificação
```typescript
const marketingTemplates = {
  referral_success: {
    email: {
      subject: 'Referência Bem-sucedida! +{{reward}}',
      content: 'Parabéns! Você ganhou {{reward}} por indicar {{referredUser}}...'
    },
    push: {
      title: 'Referência Bem-sucedida!',
      body: '🎉 Você ganhou {{reward}} por indicar {{referredUser}}!'
    }
  },
  achievement_unlocked: {
    email: {
      subject: 'Conquista Desbloqueada: {{achievementName}}',
      content: 'Parabéns! Você desbloqueou a conquista {{achievementName}}...'
    },
    push: {
      title: 'Conquista Desbloqueada!',
      body: '🏆 {{achievementName}} - +{{points}} pontos'
    }
  },
  campaign_launch: {
    email: {
      subject: 'Nova Campanha: {{campaignName}}',
      content: 'Uma nova campanha foi lançada: {{campaignName}}...'
    }
  }
};
```

### 3. Vendas

#### Templates de Notificação
```typescript
const vendasTemplates = {
  new_lead: {
    email: {
      subject: 'Novo Lead Capturado',
      content: 'Um novo lead foi capturado: {{leadName}}...'
    },
    sms: {
      content: 'Novo lead: {{leadName}} - {{leadEmail}}'
    }
  },
  lead_converted: {
    email: {
      subject: 'Lead Convertido: {{leadName}}',
      content: 'O lead {{leadName}} foi convertido com sucesso...'
    }
  },
  high_value_visitor: {
    email: {
      subject: 'Visitante de Alto Valor Detectado',
      content: 'Um visitante de alto valor foi detectado...'
    }
  }
};
```

### 4. Segurança

#### Templates de Notificação
```typescript
const segurancaTemplates = {
  security_alert: {
    email: {
      subject: '🚨 ALERTA DE SEGURANÇA - {{alertType}}',
      content: 'Foi detectada uma atividade suspeita em sua conta...'
    },
    sms: {
      content: '🚨 ALERTA: {{alertType}} - {{description}}'
    },
    push: {
      title: 'Alerta de Segurança',
      body: 'Atividade suspeita detectada: {{alertType}}'
    }
  },
  new_device_login: {
    email: {
      subject: 'Novo Dispositivo Detectado',
      content: 'Um novo dispositivo fez login em sua conta...'
    },
    sms: {
      content: 'Novo dispositivo: {{deviceName}} em {{location}}'
    }
  },
  behavior_anomaly: {
    email: {
      subject: 'Comportamento Anômalo Detectado',
      content: 'Foi detectado um comportamento anômalo em sua conta...'
    }
  }
};
```

### 5. SAC (Suporte ao Cliente)

#### Templates de Notificação
```typescript
const sacTemplates = {
  ticket_created: {
    email: {
      subject: 'Ticket Criado - #{{ticketNumber}}',
      content: 'Seu ticket de suporte foi criado com sucesso...'
    }
  },
  ticket_updated: {
    email: {
      subject: 'Ticket Atualizado - #{{ticketNumber}}',
      content: 'Seu ticket foi atualizado: {{updateMessage}}...'
    }
  },
  ticket_resolved: {
    email: {
      subject: 'Ticket Resolvido - #{{ticketNumber}}',
      content: 'Seu ticket foi resolvido com sucesso...'
    }
  }
};
```

### 6. Auditoria

#### Templates de Notificação
```typescript
const auditoriaTemplates = {
  audit_report: {
    email: {
      subject: 'Relatório de Auditoria - {{period}}',
      content: 'O relatório de auditoria para {{period}} está disponível...'
    }
  },
  compliance_alert: {
    email: {
      subject: 'Alerta de Compliance - {{complianceType}}',
      content: 'Foi detectada uma violação de compliance...'
    }
  }
};
```

### 7. Documentos

#### Templates de Notificação
```typescript
const documentosTemplates = {
  document_uploaded: {
    email: {
      subject: 'Documento Enviado - {{documentType}}',
      content: 'Seu documento {{documentType}} foi enviado com sucesso...'
    }
  },
  document_approved: {
    email: {
      subject: 'Documento Aprovado - {{documentType}}',
      content: 'Seu documento {{documentType}} foi aprovado...'
    }
  },
  document_expired: {
    email: {
      subject: 'Documento Expirado - {{documentType}}',
      content: 'Seu documento {{documentType}} expirou e precisa ser renovado...'
    }
  }
};
```

### 8. Configurações

#### Templates de Notificação
```typescript
const configuracoesTemplates = {
  setting_changed: {
    email: {
      subject: 'Configuração Alterada - {{settingName}}',
      content: 'A configuração {{settingName}} foi alterada...'
    }
  },
  system_update: {
    email: {
      subject: 'Atualização do Sistema',
      content: 'O sistema foi atualizado com novas funcionalidades...'
    }
  }
};
```

### 9. Assinaturas

#### Templates de Notificação
```typescript
const assinaturasTemplates = {
  subscription_activated: {
    email: {
      subject: 'Assinatura Ativada - {{planName}}',
      content: 'Sua assinatura {{planName}} foi ativada com sucesso...'
    }
  },
  subscription_renewed: {
    email: {
      subject: 'Assinatura Renovada - {{planName}}',
      content: 'Sua assinatura {{planName}} foi renovada automaticamente...'
    }
  },
  subscription_cancelled: {
    email: {
      subject: 'Assinatura Cancelada - {{planName}}',
      content: 'Sua assinatura {{planName}} foi cancelada...'
    }
  },
  usage_limit_warning: {
    email: {
      subject: 'Limite de Uso Aproximando - {{resourceType}}',
      content: 'Você está próximo do limite de uso de {{resourceType}}...'
    }
  },
  usage_limit_exceeded: {
    email: {
      subject: 'Limite de Uso Excedido - {{resourceType}}',
      content: 'O limite de uso de {{resourceType}} foi excedido...'
    }
  },
  trading_usage_charged: {
    email: {
      subject: 'Cobrança por Uso - {{resourceType}}',
      content: 'Foi cobrado {{amount}} pelo uso de {{resourceType}}...'
    }
  },
  commission_collected: {
    email: {
      subject: 'Comissão Coletada - {{amount}}',
      content: 'Foi coletada uma comissão de {{amount}} da operação {{tradeId}}...'
    }
  }
};
```

## 🔧 Implementação da Integração

### 1. Serviço de Integração Central

```typescript
// notification-integration.service.ts
import { Injectable } from '@nestjs/common';
import { NotificationService } from './notification.service';

@Injectable()
export class NotificationIntegrationService {
  constructor(private notificationService: NotificationService) {}

  // Método genérico para envio de notificações
  async sendDepartmentNotification(
    departmentId: string,
    userId: string,
    templateKey: string,
    variables: Record<string, any>,
    options?: {
      priority?: 'low' | 'normal' | 'high' | 'urgent';
      channels?: string[];
      scheduledFor?: string;
    }
  ): Promise<void> {
    await this.notificationService.sendNotification({
      userId,
      departmentId,
      templateKey,
      variables,
      priority: options?.priority || 'normal',
      channels: options?.channels,
      scheduledFor: options?.scheduledFor,
    });
  }

  // Métodos específicos por departamento
  async sendFinanceiroNotification(
    userId: string,
    templateKey: string,
    variables: Record<string, any>,
    priority: 'low' | 'normal' | 'high' | 'urgent' = 'normal'
  ): Promise<void> {
    await this.sendDepartmentNotification(
      'financeiro',
      userId,
      templateKey,
      variables,
      { priority }
    );
  }

  async sendMarketingNotification(
    userId: string,
    templateKey: string,
    variables: Record<string, any>,
    priority: 'low' | 'normal' | 'high' | 'urgent' = 'normal'
  ): Promise<void> {
    await this.sendDepartmentNotification(
      'marketing',
      userId,
      templateKey,
      variables,
      { priority }
    );
  }

  // ... outros departamentos
}
```

### 2. Middleware de Integração

```typescript
// notification.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class NotificationMiddleware implements NestMiddleware {
  constructor(private notificationIntegration: NotificationIntegrationService) {}

  use(req: Request, res: Response, next: NextFunction) {
    // Adicionar serviço de notificações ao request
    req.notificationService = this.notificationIntegration;
    next();
  }
}
```

### 3. Decorator para Notificações

```typescript
// notification.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const NOTIFICATION_KEY = 'notification';

export const Notification = (
  templateKey: string,
  priority: 'low' | 'normal' | 'high' | 'urgent' = 'normal',
  channels?: string[]
) => SetMetadata(NOTIFICATION_KEY, { templateKey, priority, channels });
```

### 4. Interceptor para Notificações Automáticas

```typescript
// notification.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class NotificationInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const notificationMetadata = Reflect.getMetadata(NOTIFICATION_KEY, context.getHandler());
    
    if (notificationMetadata) {
      return next.handle().pipe(
        tap(async (result) => {
          // Enviar notificação baseada no resultado
          if (result.success && request.notificationService) {
            await request.notificationService.sendDepartmentNotification(
              request.departmentId,
              request.userId,
              notificationMetadata.templateKey,
              result.variables || {},
              {
                priority: notificationMetadata.priority,
                channels: notificationMetadata.channels
              }
            );
          }
        })
      );
    }
    
    return next.handle();
  }
}
```

## 📊 Dashboard de Integração

### Métricas de Integração
- **Notificações por Departamento**: Distribuição de notificações
- **Taxa de Entrega por Departamento**: Performance por departamento
- **Canais Mais Utilizados**: Canais preferidos por departamento
- **Templates Mais Usados**: Templates mais utilizados
- **Tempo de Resposta**: Tempo médio de entrega

### Gráficos de Integração
- **Notificações por Departamento**: Gráfico de barras
- **Performance por Canal**: Gráfico de pizza
- **Tendências de Uso**: Gráfico de linha temporal
- **Distribuição de Prioridades**: Gráfico de pizza

## 🧪 Testes de Integração

### Testes por Departamento
```bash
# Testes de integração do Financeiro
bun test tests/integration/financeiro-notifications.test.ts

# Testes de integração do Marketing
bun test tests/integration/marketing-notifications.test.ts

# Testes de integração do Vendas
bun test tests/integration/vendas-notifications.test.ts

# Testes de integração do Segurança
bun test tests/integration/seguranca-notifications.test.ts

# Testes de integração do SAC
bun test tests/integration/sac-notifications.test.ts

# Testes de integração do Auditoria
bun test tests/integration/auditoria-notifications.test.ts

# Testes de integração do Documentos
bun test tests/integration/documentos-notifications.test.ts

# Testes de integração do Configurações
bun test tests/integration/configuracoes-notifications.test.ts

# Testes de integração do Assinaturas
bun test tests/integration/assinaturas-notifications.test.ts
```

### Testes de Integração Central
```bash
# Testes do serviço central
bun test tests/integration/notification-integration.test.ts

# Testes de templates
bun test tests/integration/notification-templates.test.ts

# Testes de canais
bun test tests/integration/notification-channels.test.ts
```

## 🔧 Configuração de Integração

### Variáveis de Ambiente
```env
# Configuração central de notificações
NOTIFICATION_CENTER_ENABLED=true
NOTIFICATION_DEFAULT_PRIORITY=normal
NOTIFICATION_RATE_LIMIT_PER_MINUTE=60
NOTIFICATION_RATE_LIMIT_PER_HOUR=1000

# Configuração por departamento
FINANCEIRO_NOTIFICATIONS_ENABLED=true
MARKETING_NOTIFICATIONS_ENABLED=true
VENDAS_NOTIFICATIONS_ENABLED=true
SEGURANCA_NOTIFICATIONS_ENABLED=true
SAC_NOTIFICATIONS_ENABLED=true
AUDITORIA_NOTIFICATIONS_ENABLED=true
DOCUMENTOS_NOTIFICATIONS_ENABLED=true
CONFIGURACOES_NOTIFICATIONS_ENABLED=true
ASSINATURAS_NOTIFICATIONS_ENABLED=true
```

### Configuração de Templates
```json
{
  "departments": {
    "financeiro": {
      "templates": {
        "payment_success": {
          "email": true,
          "sms": true,
          "push": true
        },
        "payment_failed": {
          "email": true,
          "sms": true,
          "push": true
        }
      }
    },
    "marketing": {
      "templates": {
        "referral_success": {
          "email": true,
          "push": true
        },
        "achievement_unlocked": {
          "email": true,
          "push": true
        }
      }
    }
  }
}
```

## 📈 Monitoramento de Integração

### Métricas de Performance
- **Response Time**: < 100ms para envio
- **Throughput**: 1000+ notificações/min
- **Error Rate**: < 0.1%
- **Uptime**: 99.9%

### Alertas de Integração
- **Falha de Integração**: Falha na integração com departamento
- **Template Não Encontrado**: Template não encontrado
- **Canal Inativo**: Canal de notificação inativo
- **Alta Taxa de Falha**: Taxa de falha alta por departamento

---

**Última atualização**: 2024-12-19
**Versão**: 1.0.0
**Responsável**: Agente-CTO