# Serviço Central de Notificações - Implementação

## 🎯 Visão Geral

O Serviço Central de Notificações é a implementação prática do sistema de notificações, fornecendo uma interface unificada para todos os departamentos enviarem notificações de forma consistente e configurável.

## 🏗️ Arquitetura de Implementação

### Estrutura de Arquivos
```
src/
├── admin/
│   └── departments/
│       └── notificacoes/
│           ├── services/
│           │   ├── notification.service.ts
│           │   ├── template.service.ts
│           │   ├── channel.service.ts
│           │   ├── preference.service.ts
│           │   └── analytics.service.ts
│           ├── controllers/
│           │   ├── notification.controller.ts
│           │   ├── template.controller.ts
│           │   ├── preference.controller.ts
│           │   └── analytics.controller.ts
│           ├── middleware/
│           │   ├── notification.middleware.ts
│           │   └── rate-limit.middleware.ts
│           ├── providers/
│           │   ├── email.provider.ts
│           │   ├── sms.provider.ts
│           │   ├── push.provider.ts
│           │   ├── telegram.provider.ts
│           │   └── webhook.provider.ts
│           ├── templates/
│           │   ├── financeiro/
│           │   ├── marketing/
│           │   ├── vendas/
│           │   ├── seguranca/
│           │   ├── sac/
│           │   ├── auditoria/
│           │   ├── documentos/
│           │   ├── configuracoes/
│           │   └── assinaturas/
│           └── utils/
│               ├── template.parser.ts
│               ├── variable.resolver.ts
│               └── notification.validator.ts
```

## 🔧 Implementação dos Serviços

### 1. Notification Service (Core)

```typescript
// notification.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { TemplateService } from './template.service';
import { ChannelService } from './channel.service';
import { PreferenceService } from './preference.service';
import { EmailProvider } from '../providers/email.provider';
import { SmsProvider } from '../providers/sms.provider';
import { PushProvider } from '../providers/push.provider';
import { TelegramProvider } from '../providers/telegram.provider';

@Injectable()
export class NotificationService {
  constructor(
    private prisma: PrismaService,
    private templateService: TemplateService,
    private channelService: ChannelService,
    private preferenceService: PreferenceService,
    private emailProvider: EmailProvider,
    private smsProvider: SmsProvider,
    private pushProvider: PushProvider,
    private telegramProvider: TelegramProvider,
  ) {}

  async sendNotification(request: SendNotificationRequest): Promise<SendNotificationResponse> {
    try {
      // 1. Validar template
      const template = await this.templateService.getTemplate(
        request.departmentId,
        request.templateKey
      );

      if (!template) {
        throw new Error(`Template not found: ${request.templateKey}`);
      }

      // 2. Obter preferências do usuário
      const preferences = await this.preferenceService.getUserPreferences(
        request.userId,
        request.departmentId
      );

      // 3. Determinar canais de envio
      const channels = this.determineChannels(
        template.templateType,
        preferences,
        request.channels
      );

      // 4. Processar template com variáveis
      const processedContent = await this.templateService.processTemplate(
        template,
        request.variables || {}
      );

      // 5. Criar registro de notificação
      const notification = await this.prisma.notifications.create({
        data: {
          userId: request.userId,
          departmentId: request.departmentId,
          templateId: template.id,
          channelId: channels[0].id, // Primary channel
          notificationType: template.templateType,
          category: template.category,
          priority: request.priority || template.priority,
          subject: processedContent.subject,
          content: processedContent.content,
          variables: request.variables,
          status: 'pending',
          scheduledFor: request.scheduledFor ? new Date(request.scheduledFor) : null,
          metadata: request.metadata,
        },
      });

      // 6. Enviar para canais
      const deliveryResults = await this.sendToChannels(
        notification,
        channels,
        processedContent
      );

      // 7. Atualizar status
      await this.updateNotificationStatus(notification.id, deliveryResults);

      return {
        id: notification.id,
        status: 'success',
        message: 'Notification sent successfully',
        notificationId: notification.id,
        scheduledFor: request.scheduledFor,
        channels: deliveryResults,
      };

    } catch (error) {
      console.error('Error sending notification:', error);
      return {
        id: '',
        status: 'error',
        message: error.message,
        notificationId: '',
        channels: [],
      };
    }
  }

  async sendBulkNotification(request: SendBulkNotificationRequest): Promise<SendBulkNotificationResponse> {
    try {
      // 1. Criar campanha
      const campaign = await this.prisma.notification_campaigns.create({
        data: {
          departmentId: request.departmentId,
          campaignName: `Bulk notification - ${new Date().toISOString()}`,
          campaignType: 'broadcast',
          templateId: request.templateId,
          targetCriteria: request.targetCriteria,
          scheduledFor: request.scheduledFor ? new Date(request.scheduledFor) : null,
          status: 'draft',
          createdBy: request.createdBy,
        },
      });

      // 2. Determinar usuários alvo
      const targetUsers = await this.getTargetUsers(request.userIds, request.targetCriteria);

      // 3. Processar envios em lote
      const results = await Promise.allSettled(
        targetUsers.map(userId => 
          this.sendNotification({
            userId,
            departmentId: request.departmentId,
            templateKey: request.templateKey,
            variables: request.variables,
            channels: request.channels,
            priority: request.priority,
            scheduledFor: request.scheduledFor,
          })
        )
      );

      // 4. Atualizar campanha
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const failureCount = results.filter(r => r.status === 'rejected').length;

      await this.prisma.notification_campaigns.update({
        where: { id: campaign.id },
        data: {
          status: 'completed',
          totalRecipients: targetUsers.length,
          sentCount: successCount,
          failedCount: failureCount,
        },
      });

      return {
        campaignId: campaign.id,
        status: 'success',
        message: 'Bulk notification sent successfully',
        totalRecipients: targetUsers.length,
        scheduledFor: request.scheduledFor,
      };

    } catch (error) {
      console.error('Error sending bulk notification:', error);
      return {
        campaignId: '',
        status: 'error',
        message: error.message,
        totalRecipients: 0,
      };
    }
  }

  private async determineChannels(
    templateType: string,
    preferences: any,
    overrideChannels?: string[]
  ): Promise<any[]> {
    if (overrideChannels) {
      return await this.channelService.getChannelsByTypes(overrideChannels);
    }

    const enabledChannels = preferences
      .filter(p => p.isEnabled && p.notificationType === templateType)
      .map(p => p.notificationType);

    return await this.channelService.getChannelsByTypes(enabledChannels);
  }

  private async sendToChannels(
    notification: any,
    channels: any[],
    content: any
  ): Promise<any[]> {
    const results = [];

    for (const channel of channels) {
      try {
        let result;
        
        switch (channel.channelType) {
          case 'email':
            result = await this.emailProvider.send({
              to: notification.userId,
              subject: content.subject,
              content: content.content,
              template: channel.configuration,
            });
            break;
          case 'sms':
            result = await this.smsProvider.send({
              to: notification.userId,
              content: content.content,
              template: channel.configuration,
            });
            break;
          case 'push':
            result = await this.pushProvider.send({
              to: notification.userId,
              title: content.subject,
              body: content.content,
              data: notification.metadata,
            });
            break;
          case 'telegram':
            result = await this.telegramProvider.send({
              to: notification.userId,
              message: content.content,
              template: channel.configuration,
            });
            break;
        }

        results.push({
          channel: channel.channelType,
          status: result.success ? 'sent' : 'failed',
          message: result.message,
        });

        // Log delivery
        await this.logDelivery(notification.id, channel.id, result);

      } catch (error) {
        results.push({
          channel: channel.channelType,
          status: 'failed',
          message: error.message,
        });
      }
    }

    return results;
  }

  private async logDelivery(
    notificationId: string,
    channelId: string,
    result: any
  ): Promise<void> {
    await this.prisma.notification_delivery_logs.create({
      data: {
        notificationId,
        channelId,
        attemptNumber: 1,
        status: result.success ? 'sent' : 'failed',
        responseCode: result.statusCode,
        responseMessage: result.message,
        deliveryTimeMs: result.deliveryTime,
        externalId: result.externalId,
        errorDetails: result.error ? { error: result.error } : null,
      },
    });
  }

  private async updateNotificationStatus(
    notificationId: string,
    deliveryResults: any[]
  ): Promise<void> {
    const hasSuccess = deliveryResults.some(r => r.status === 'sent');
    const hasFailure = deliveryResults.some(r => r.status === 'failed');

    let status = 'pending';
    if (hasSuccess && !hasFailure) {
      status = 'sent';
    } else if (hasSuccess && hasFailure) {
      status = 'sent';
    } else if (!hasSuccess && hasFailure) {
      status = 'failed';
    }

    await this.prisma.notifications.update({
      where: { id: notificationId },
      data: {
        status,
        sentAt: status === 'sent' ? new Date() : null,
        failedAt: status === 'failed' ? new Date() : null,
      },
    });
  }
}
```

### 2. Template Service

```typescript
// template.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { TemplateParser } from '../utils/template.parser';
import { VariableResolver } from '../utils/variable.resolver';

@Injectable()
export class TemplateService {
  constructor(
    private prisma: PrismaService,
    private templateParser: TemplateParser,
    private variableResolver: VariableResolver,
  ) {}

  async getTemplate(departmentId: string, templateKey: string): Promise<any> {
    return await this.prisma.notification_templates.findFirst({
      where: {
        departmentId,
        templateKey,
        isActive: true,
      },
    });
  }

  async createTemplate(data: CreateTemplateRequest): Promise<any> {
    // Validar variáveis
    const variables = this.extractVariables(data.content);
    
    return await this.prisma.notification_templates.create({
      data: {
        ...data,
        variables,
      },
    });
  }

  async processTemplate(template: any, variables: Record<string, any>): Promise<any> {
    const resolvedVariables = await this.variableResolver.resolveVariables(
      variables,
      template.variables
    );

    const processedContent = this.templateParser.parseTemplate(
      template.content,
      resolvedVariables
    );

    const processedSubject = template.subject 
      ? this.templateParser.parseTemplate(template.subject, resolvedVariables)
      : null;

    return {
      content: processedContent,
      subject: processedSubject,
    };
  }

  private extractVariables(content: string): string[] {
    const variableRegex = /\{\{(\w+)\}\}/g;
    const variables = [];
    let match;

    while ((match = variableRegex.exec(content)) !== null) {
      if (!variables.includes(match[1])) {
        variables.push(match[1]);
      }
    }

    return variables;
  }
}
```

### 3. Channel Service

```typescript
// channel.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class ChannelService {
  constructor(private prisma: PrismaService) {}

  async getChannelsByTypes(types: string[]): Promise<any[]> {
    return await this.prisma.notification_channels.findMany({
      where: {
        channelType: { in: types },
        isActive: true,
      },
      orderBy: { priorityOrder: 'asc' },
    });
  }

  async getChannelById(id: string): Promise<any> {
    return await this.prisma.notification_channels.findUnique({
      where: { id },
    });
  }

  async createChannel(data: any): Promise<any> {
    return await this.prisma.notification_channels.create({
      data,
    });
  }

  async updateChannel(id: string, data: any): Promise<any> {
    return await this.prisma.notification_channels.update({
      where: { id },
      data,
    });
  }
}
```

### 4. Preference Service

```typescript
// preference.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class PreferenceService {
  constructor(private prisma: PrismaService) {}

  async getUserPreferences(userId: string, departmentId?: string): Promise<any[]> {
    const where: any = { userId };
    if (departmentId) {
      where.departmentId = departmentId;
    }

    return await this.prisma.user_notification_preferences.findMany({
      where,
      include: {
        department: true,
      },
    });
  }

  async updateUserPreferences(
    userId: string,
    preferences: UpdatePreferencesRequest
  ): Promise<any> {
    // Atualizar preferências globais
    if (preferences.globalPreferences) {
      for (const pref of preferences.globalPreferences) {
        await this.prisma.user_notification_preferences.upsert({
          where: {
            userId_departmentId_notificationType_category: {
              userId,
              departmentId: null,
              notificationType: pref.notificationType,
              category: pref.category,
            },
          },
          update: {
            isEnabled: pref.isEnabled,
            quietHoursStart: pref.quietHoursStart,
            quietHoursEnd: pref.quietHoursEnd,
            frequency: pref.frequency,
          },
          create: {
            userId,
            departmentId: null,
            notificationType: pref.notificationType,
            category: pref.category,
            isEnabled: pref.isEnabled,
            quietHoursStart: pref.quietHoursStart,
            quietHoursEnd: pref.quietHoursEnd,
            frequency: pref.frequency,
          },
        });
      }
    }

    // Atualizar preferências por departamento
    if (preferences.departmentPreferences) {
      for (const deptPref of preferences.departmentPreferences) {
        for (const pref of deptPref.preferences) {
          await this.prisma.user_notification_preferences.upsert({
            where: {
              userId_departmentId_notificationType_category: {
                userId,
                departmentId: deptPref.departmentId,
                notificationType: pref.notificationType,
                category: pref.category,
              },
            },
            update: {
              isEnabled: pref.isEnabled,
              quietHoursStart: pref.quietHoursStart,
              quietHoursEnd: pref.quietHoursEnd,
              frequency: pref.frequency,
            },
            create: {
              userId,
              departmentId: deptPref.departmentId,
              notificationType: pref.notificationType,
              category: pref.category,
              isEnabled: pref.isEnabled,
              quietHoursStart: pref.quietHoursStart,
              quietHoursEnd: pref.quietHoursEnd,
              frequency: pref.frequency,
            },
          });
        }
      }
    }

    // Atualizar configurações globais
    if (preferences.timezone || preferences.language) {
      // Implementar atualização de configurações globais do usuário
    }

    return await this.getUserPreferences(userId);
  }
}
```

## 🔌 Integração com Departamentos

### 1. Financeiro Integration

```typescript
// financeiro-notifications.service.ts
import { Injectable } from '@nestjs/common';
import { NotificationService } from '../notificacoes/services/notification.service';

@Injectable()
export class FinanceiroNotificationsService {
  constructor(private notificationService: NotificationService) {}

  async notifyPaymentSuccess(userId: string, paymentData: any): Promise<void> {
    await this.notificationService.sendNotification({
      userId,
      departmentId: 'financeiro',
      templateKey: 'payment_success',
      variables: {
        amount: paymentData.amount,
        currency: paymentData.currency,
        paymentMethod: paymentData.method,
        transactionId: paymentData.id,
      },
      priority: 'normal',
    });
  }

  async notifyPaymentFailed(userId: string, paymentData: any): Promise<void> {
    await this.notificationService.sendNotification({
      userId,
      departmentId: 'financeiro',
      templateKey: 'payment_failed',
      variables: {
        amount: paymentData.amount,
        currency: paymentData.currency,
        reason: paymentData.reason,
        retryUrl: paymentData.retryUrl,
      },
      priority: 'high',
    });
  }

  async notifySubscriptionRenewal(userId: string, subscriptionData: any): Promise<void> {
    await this.notificationService.sendNotification({
      userId,
      departmentId: 'financeiro',
      templateKey: 'subscription_renewal',
      variables: {
        planName: subscriptionData.planName,
        amount: subscriptionData.amount,
        nextBillingDate: subscriptionData.nextBillingDate,
      },
      priority: 'normal',
    });
  }

  async notifyInvoiceGenerated(userId: string, invoiceData: any): Promise<void> {
    await this.notificationService.sendNotification({
      userId,
      departmentId: 'financeiro',
      templateKey: 'invoice_generated',
      variables: {
        invoiceNumber: invoiceData.number,
        amount: invoiceData.amount,
        dueDate: invoiceData.dueDate,
        downloadUrl: invoiceData.downloadUrl,
      },
      priority: 'normal',
    });
  }
}
```

### 2. Marketing Integration

```typescript
// marketing-notifications.service.ts
import { Injectable } from '@nestjs/common';
import { NotificationService } from '../notificacoes/services/notification.service';

@Injectable()
export class MarketingNotificationsService {
  constructor(private notificationService: NotificationService) {}

  async notifyReferralSuccess(userId: string, referralData: any): Promise<void> {
    await this.notificationService.sendNotification({
      userId,
      departmentId: 'marketing',
      templateKey: 'referral_success',
      variables: {
        referredUser: referralData.referredUser,
        reward: referralData.reward,
        totalReferrals: referralData.totalReferrals,
      },
      priority: 'normal',
    });
  }

  async notifyGamificationAchievement(userId: string, achievementData: any): Promise<void> {
    await this.notificationService.sendNotification({
      userId,
      departmentId: 'marketing',
      templateKey: 'achievement_unlocked',
      variables: {
        achievementName: achievementData.name,
        points: achievementData.points,
        level: achievementData.level,
        badge: achievementData.badge,
      },
      priority: 'normal',
    });
  }

  async notifyCampaignLaunch(userId: string, campaignData: any): Promise<void> {
    await this.notificationService.sendNotification({
      userId,
      departmentId: 'marketing',
      templateKey: 'campaign_launch',
      variables: {
        campaignName: campaignData.name,
        description: campaignData.description,
        startDate: campaignData.startDate,
        endDate: campaignData.endDate,
      },
      priority: 'normal',
    });
  }
}
```

### 3. Segurança Integration

```typescript
// seguranca-notifications.service.ts
import { Injectable } from '@nestjs/common';
import { NotificationService } from '../notificacoes/services/notification.service';

@Injectable()
export class SegurancaNotificationsService {
  constructor(private notificationService: NotificationService) {}

  async notifySecurityAlert(userId: string, alertData: any): Promise<void> {
    await this.notificationService.sendNotification({
      userId,
      departmentId: 'seguranca',
      templateKey: 'security_alert',
      variables: {
        alertType: alertData.type,
        severity: alertData.severity,
        description: alertData.description,
        actionRequired: alertData.actionRequired,
        timestamp: alertData.timestamp,
      },
      priority: 'urgent',
      channels: ['email', 'sms', 'push'], // Múltiplos canais para segurança
    });
  }

  async notifySuspiciousActivity(userId: string, activityData: any): Promise<void> {
    await this.notificationService.sendNotification({
      userId,
      departmentId: 'seguranca',
      templateKey: 'suspicious_activity',
      variables: {
        activityType: activityData.type,
        location: activityData.location,
        device: activityData.device,
        timestamp: activityData.timestamp,
        actionRequired: activityData.actionRequired,
      },
      priority: 'high',
    });
  }

  async notifyLoginFromNewDevice(userId: string, deviceData: any): Promise<void> {
    await this.notificationService.sendNotification({
      userId,
      departmentId: 'seguranca',
      templateKey: 'new_device_login',
      variables: {
        deviceName: deviceData.name,
        location: deviceData.location,
        ipAddress: deviceData.ipAddress,
        timestamp: deviceData.timestamp,
        confirmUrl: deviceData.confirmUrl,
      },
      priority: 'high',
    });
  }
}
```

## 📊 Templates por Departamento

### 1. Financeiro Templates

```typescript
// templates/financeiro/payment_success.email.ts
export const paymentSuccessEmailTemplate = {
  templateKey: 'payment_success',
  templateType: 'email',
  subject: 'Pagamento Confirmado - {{amount}} {{currency}}',
  content: `
    <h2>Pagamento Confirmado!</h2>
    <p>Olá {{userName}},</p>
    <p>Seu pagamento foi processado com sucesso:</p>
    <ul>
      <li><strong>Valor:</strong> {{amount}} {{currency}}</li>
      <li><strong>Método:</strong> {{paymentMethod}}</li>
      <li><strong>ID da Transação:</strong> {{transactionId}}</li>
      <li><strong>Data:</strong> {{date}}</li>
    </ul>
    <p>Obrigado por usar nossos serviços!</p>
  `,
  variables: ['userName', 'amount', 'currency', 'paymentMethod', 'transactionId', 'date'],
};
```

### 2. Marketing Templates

```typescript
// templates/marketing/referral_success.push.ts
export const referralSuccessPushTemplate = {
  templateKey: 'referral_success',
  templateType: 'push',
  subject: 'Referência Bem-sucedida!',
  content: `
    🎉 Parabéns! Você ganhou {{reward}} por indicar {{referredUser}}!
    
    Total de referências: {{totalReferrals}}
    
    Continue indicando e ganhando mais recompensas!
  `,
  variables: ['referredUser', 'reward', 'totalReferrals'],
};
```

### 3. Segurança Templates

```typescript
// templates/seguranca/security_alert.sms.ts
export const securityAlertSmsTemplate = {
  templateKey: 'security_alert',
  templateType: 'sms',
  content: `
    🚨 ALERTA DE SEGURANÇA 🚨
    
    Tipo: {{alertType}}
    Severidade: {{severity}}
    
    {{description}}
    
    Ação necessária: {{actionRequired}}
    
    Acesse sua conta para mais detalhes.
  `,
  variables: ['alertType', 'severity', 'description', 'actionRequired'],
};
```

## 🔧 Middleware de Integração

```typescript
// notification.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class NotificationMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Adicionar serviço de notificações ao request
    req.notificationService = this.notificationService;
    next();
  }
}
```

## 📈 Analytics e Monitoramento

```typescript
// analytics.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getNotificationAnalytics(period: { start: Date; end: Date }): Promise<any> {
    const notifications = await this.prisma.notifications.findMany({
      where: {
        createdAt: {
          gte: period.start,
          lte: period.end,
        },
      },
      include: {
        department: true,
        channel: true,
        deliveryLogs: true,
      },
    });

    const metrics = this.calculateMetrics(notifications);
    const byDepartment = this.groupByDepartment(notifications);
    const byChannel = this.groupByChannel(notifications);
    const trends = this.calculateTrends(notifications, period);

    return {
      period,
      metrics,
      byDepartment,
      byChannel,
      trends,
    };
  }

  private calculateMetrics(notifications: any[]): any {
    const total = notifications.length;
    const sent = notifications.filter(n => n.status === 'sent').length;
    const delivered = notifications.filter(n => n.deliveryLogs.some(log => log.status === 'delivered')).length;
    const failed = notifications.filter(n => n.status === 'failed').length;
    const read = notifications.filter(n => n.readAt).length;

    return {
      totalSent: total,
      totalDelivered: delivered,
      totalFailed: failed,
      totalRead: read,
      deliveryRate: total > 0 ? (delivered / total) * 100 : 0,
      readRate: delivered > 0 ? (read / delivered) * 100 : 0,
      failureRate: total > 0 ? (failed / total) * 100 : 0,
    };
  }
}
```

---

**Última atualização**: 2024-12-19
**Versão**: 1.0.0
**Responsável**: Agente-CTO