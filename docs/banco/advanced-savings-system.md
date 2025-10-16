# Sistema Avançado de Poupança - BotCriptoFy2

## 🚀 Visão Geral

Sistema avançado de carteira de poupança com transferência automática de lucros, metas personalizáveis, sistema de gamificação, relatórios detalhados e notificações inteligentes.

## 🏗️ Arquitetura do Sistema Avançado

### Componentes Principais
- **Auto Profit Transfer Engine**: Motor de transferência automática de lucros
- **Savings Goals Manager**: Gerenciador de metas de poupança
- **Gamification System**: Sistema de badges e conquistas
- **Reports Generator**: Gerador de relatórios de poupança
- **Smart Notifications**: Sistema de notificações inteligentes
- **Scheduler Service**: Serviço de agendamento de transferências

### Estratégia de Funcionamento
- **Transferência Automática**: Lucros transferidos automaticamente conforme configuração
- **Metas Personalizáveis**: Usuário define metas de poupança com prazos
- **Gamificação**: Sistema de pontos, badges e conquistas
- **Relatórios Inteligentes**: Análise de progresso e performance
- **Notificações Contextuais**: Alertas baseados em comportamento e metas

## 📊 Estrutura de Dados Avançada

### Tabelas do Sistema Avançado

#### 1. user_savings_settings (Atualizada)
```sql
CREATE TABLE user_savings_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  is_savings_enabled BOOLEAN DEFAULT false,
  auto_transfer_enabled BOOLEAN DEFAULT false,
  auto_transfer_percentage DECIMAL(5,2) DEFAULT 0, -- 0-100%
  auto_transfer_threshold DECIMAL(20,8) DEFAULT 0, -- Valor mínimo para transferência automática
  auto_transfer_profits BOOLEAN DEFAULT false, -- Transferir lucros automaticamente
  auto_transfer_schedule VARCHAR(20) DEFAULT 'daily', -- daily, weekly, monthly, custom
  auto_transfer_time TIME DEFAULT '23:59:59', -- Horário da transferência
  auto_transfer_day_of_week INTEGER DEFAULT 0, -- 0-6 (domingo=0) para weekly
  auto_transfer_day_of_month INTEGER DEFAULT 31, -- 1-31 para monthly
  savings_goal DECIMAL(20,8) DEFAULT 0, -- Meta de poupança
  goal_deadline DATE, -- Prazo para atingir a meta
  notifications_enabled BOOLEAN DEFAULT true, -- Notificações de metas
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);
```

#### 2. savings_goals
```sql
CREATE TABLE savings_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  target_amount DECIMAL(20,8) NOT NULL,
  current_amount DECIMAL(20,8) DEFAULT 0,
  asset_id UUID NOT NULL REFERENCES assets(id),
  goal_type VARCHAR(20) NOT NULL, -- amount, percentage, monthly
  deadline DATE,
  is_achieved BOOLEAN DEFAULT false,
  achieved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 3. savings_achievements
```sql
CREATE TABLE savings_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  achievement_type VARCHAR(50) NOT NULL, -- first_savings, goal_achieved, streak, milestone
  achievement_name VARCHAR(100) NOT NULL,
  description TEXT,
  badge_icon VARCHAR(100),
  points_earned INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, achievement_type, achievement_name)
);
```

#### 4. savings_reports
```sql
CREATE TABLE savings_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  report_type VARCHAR(20) NOT NULL, -- daily, weekly, monthly, yearly
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_saved DECIMAL(20,8) NOT NULL,
  total_transferred DECIMAL(20,8) NOT NULL,
  total_withdrawn DECIMAL(20,8) NOT NULL,
  net_savings DECIMAL(20,8) NOT NULL,
  goals_achieved INTEGER DEFAULT 0,
  achievements_earned INTEGER DEFAULT 0,
  savings_rate DECIMAL(5,2) DEFAULT 0, -- Percentual poupado
  report_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 5. savings_notifications
```sql
CREATE TABLE savings_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  notification_type VARCHAR(50) NOT NULL, -- goal_reminder, achievement, milestone, report
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  scheduled_for TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🔧 Implementação do Sistema Avançado

### 1. Auto Profit Transfer Engine

```typescript
// backend/src/banco/auto-profit-transfer-engine.ts
import { prisma } from '../db';
import { SavingsWalletManager } from './savings-wallet-manager';
import { AuditLogger } from '../audit/audit-logger';
import { NotificationService } from '../notifications/notification-service';

export class AutoProfitTransferEngine {
  private savingsManager: SavingsWalletManager;
  private auditLogger: AuditLogger;
  private notificationService: NotificationService;

  constructor() {
    this.savingsManager = new SavingsWalletManager();
    this.auditLogger = new AuditLogger();
    this.notificationService = new NotificationService();
  }

  async processScheduledTransfers(): Promise<void> {
    try {
      console.log('Starting scheduled profit transfers...');

      // Buscar usuários com transferência automática habilitada
      const usersWithAutoTransfer = await prisma.userSavingsSetting.findMany({
        where: {
          autoTransferEnabled: true,
          isSavingsEnabled: true,
          autoTransferProfits: true
        },
        include: {
          user: true
        }
      });

      for (const settings of usersWithAutoTransfer) {
        await this.processUserProfitTransfer(settings);
      }

      console.log('Scheduled profit transfers completed');
    } catch (error) {
      console.error('Error processing scheduled transfers:', error);
    }
  }

  private async processUserProfitTransfer(settings: any): Promise<void> {
    try {
      const userId = settings.userId;
      const user = settings.user;

      // Verificar se é hora de processar a transferência
      if (!this.shouldProcessTransfer(settings)) {
        return;
      }

      // Buscar carteiras do usuário
      const wallets = await prisma.wallet.findMany({
        where: {
          userId,
          isActive: true,
          OR: [
            { isPrimary: true },
            { isSavings: true }
          ]
        },
        include: {
          balances: {
            include: {
              asset: true
            }
          }
        }
      });

      const mainWallet = wallets.find(w => w.isPrimary);
      const savingsWallet = wallets.find(w => w.isSavings);

      if (!mainWallet || !savingsWallet) {
        return;
      }

      // Calcular lucros do dia
      const dailyProfits = await this.calculateDailyProfits(userId, mainWallet.id);

      if (dailyProfits.length === 0) {
        return;
      }

      // Processar transferência de cada lucro
      for (const profit of dailyProfits) {
        const transferAmount = this.calculateTransferAmount(profit, settings);
        
        if (transferAmount > 0) {
          await this.savingsManager.transferToSavings(
            userId,
            profit.assetId,
            transferAmount,
            { userId, autoTransfer: true }
          );

          // Log de auditoria
          await this.auditLogger.logAction(userId, {
            type: 'auto_transfer',
            resourceType: 'profit_transfer',
            resourceId: profit.id,
            module: 'banco',
            description: `Auto transferred ${transferAmount} ${profit.asset.symbol} profit to savings`,
            newValues: {
              assetId: profit.assetId,
              amount: transferAmount,
              profitAmount: profit.amount,
              transferPercentage: settings.autoTransferPercentage
            },
            metadata: {
              autoTransfer: true,
              schedule: settings.autoTransferSchedule
            }
          }, { userId });

          // Enviar notificação
          await this.notificationService.sendNotification({
            userId,
            type: 'profit_transfer',
            title: 'Lucro Transferido Automaticamente',
            message: `${transferAmount} ${profit.asset.symbol} foi transferido para sua poupança`,
            metadata: {
              assetId: profit.assetId,
              amount: transferAmount,
              assetSymbol: profit.asset.symbol
            }
          });
        }
      }

      // Atualizar última execução
      await prisma.userSavingsSetting.update({
        where: { userId },
        data: { updatedAt: new Date() }
      });

    } catch (error) {
      console.error(`Error processing profit transfer for user ${settings.userId}:`, error);
    }
  }

  private shouldProcessTransfer(settings: any): boolean {
    const now = new Date();
    const currentTime = now.toTimeString().split(' ')[0];
    const currentDay = now.getDay();
    const currentDate = now.getDate();

    switch (settings.autoTransferSchedule) {
      case 'daily':
        return currentTime >= settings.autoTransferTime;
      
      case 'weekly':
        return currentDay === settings.autoTransferDayOfWeek && 
               currentTime >= settings.autoTransferTime;
      
      case 'monthly':
        return currentDate === settings.autoTransferDayOfMonth && 
               currentTime >= settings.autoTransferTime;
      
      default:
        return false;
    }
  }

  private async calculateDailyProfits(userId: string, mainWalletId: string): Promise<any[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Buscar transações de trading com lucro do dia
    const profitableTrades = await prisma.tradingTransaction.findMany({
      where: {
        userId,
        createdAt: {
          gte: today,
          lt: tomorrow
        },
        profit: {
          gt: 0
        },
        status: 'completed'
      },
      include: {
        asset: true
      }
    });

    // Agrupar lucros por ativo
    const profitsByAsset = new Map();
    
    for (const trade of profitableTrades) {
      const assetId = trade.assetId;
      if (!profitsByAsset.has(assetId)) {
        profitsByAsset.set(assetId, {
          assetId,
          asset: trade.asset,
          amount: 0,
          trades: []
        });
      }
      
      const profit = profitsByAsset.get(assetId);
      profit.amount += Number(trade.profit);
      profit.trades.push(trade);
    }

    return Array.from(profitsByAsset.values());
  }

  private calculateTransferAmount(profit: any, settings: any): number {
    if (settings.autoTransferPercentage > 0) {
      return (profit.amount * settings.autoTransferPercentage) / 100;
    }
    
    if (settings.autoTransferThreshold > 0 && profit.amount >= settings.autoTransferThreshold) {
      return profit.amount;
    }
    
    return 0;
  }

  async scheduleTransfer(userId: string, schedule: any): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      await prisma.userSavingsSetting.update({
        where: { userId },
        data: {
          autoTransferSchedule: schedule.type,
          autoTransferTime: schedule.time,
          autoTransferDayOfWeek: schedule.dayOfWeek || 0,
          autoTransferDayOfMonth: schedule.dayOfMonth || 31,
          autoTransferProfits: true
        }
      });

      return {
        success: true,
        message: 'Transfer schedule updated successfully'
      };

    } catch (error) {
      console.error('Error scheduling transfer:', error);
      return {
        success: false,
        message: 'Failed to schedule transfer'
      };
    }
  }
}
```

### 2. Savings Goals Manager

```typescript
// backend/src/banco/savings-goals-manager.ts
import { prisma } from '../db';
import { AuditLogger } from '../audit/audit-logger';
import { NotificationService } from '../notifications/notification-service';

export class SavingsGoalsManager {
  private auditLogger: AuditLogger;
  private notificationService: NotificationService;

  constructor() {
    this.auditLogger = new AuditLogger();
    this.notificationService = new NotificationService();
  }

  async createGoal(
    userId: string,
    goalData: {
      name: string;
      description?: string;
      targetAmount: number;
      assetId: string;
      goalType: 'amount' | 'percentage' | 'monthly';
      deadline?: Date;
    },
    context: any
  ): Promise<{
    success: boolean;
    goalId?: string;
    message: string;
  }> {
    try {
      const goal = await prisma.savingsGoal.create({
        data: {
          userId,
          name: goalData.name,
          description: goalData.description,
          targetAmount: goalData.targetAmount,
          assetId: goalData.assetId,
          goalType: goalData.goalType,
          deadline: goalData.deadline,
          currentAmount: 0
        }
      });

      // Log de auditoria
      await this.auditLogger.logAction(userId, {
        type: 'create',
        resourceType: 'savings_goal',
        resourceId: goal.id,
        module: 'banco',
        description: `Created savings goal: ${goalData.name}`,
        newValues: goalData,
        metadata: { goalId: goal.id }
      }, context);

      // Enviar notificação
      await this.notificationService.sendNotification({
        userId,
        type: 'goal_created',
        title: 'Meta de Poupança Criada',
        message: `Sua meta "${goalData.name}" foi criada com sucesso!`,
        metadata: {
          goalId: goal.id,
          targetAmount: goalData.targetAmount,
          deadline: goalData.deadline
        }
      });

      return {
        success: true,
        goalId: goal.id,
        message: 'Savings goal created successfully'
      };

    } catch (error) {
      console.error('Error creating savings goal:', error);
      return {
        success: false,
        message: 'Failed to create savings goal'
      };
    }
  }

  async updateGoalProgress(
    userId: string,
    goalId: string,
    amount: number,
    context: any
  ): Promise<{
    success: boolean;
    isAchieved?: boolean;
    message: string;
  }> {
    try {
      const goal = await prisma.savingsGoal.findUnique({
        where: { id: goalId }
      });

      if (!goal || goal.userId !== userId) {
        return {
          success: false,
          message: 'Goal not found'
        };
      }

      const newAmount = goal.currentAmount + amount;
      const isAchieved = newAmount >= goal.targetAmount;

      await prisma.savingsGoal.update({
        where: { id: goalId },
        data: {
          currentAmount: newAmount,
          isAchieved,
          achievedAt: isAchieved ? new Date() : null
        }
      });

      // Se meta foi atingida, processar conquista
      if (isAchieved && !goal.isAchieved) {
        await this.processGoalAchievement(userId, goal);
      }

      // Log de auditoria
      await this.auditLogger.logAction(userId, {
        type: 'update',
        resourceType: 'savings_goal',
        resourceId: goalId,
        module: 'banco',
        description: `Updated goal progress: ${amount} added`,
        oldValues: { currentAmount: goal.currentAmount },
        newValues: { currentAmount: newAmount, isAchieved },
        metadata: { goalId, amount }
      }, context);

      return {
        success: true,
        isAchieved,
        message: isAchieved ? 'Goal achieved!' : 'Goal progress updated'
      };

    } catch (error) {
      console.error('Error updating goal progress:', error);
      return {
        success: false,
        message: 'Failed to update goal progress'
      };
    }
  }

  private async processGoalAchievement(userId: string, goal: any): Promise<void> {
    // Criar conquista
    await prisma.savingsAchievement.create({
      data: {
        userId,
        achievementType: 'goal_achieved',
        achievementName: `Meta Atingida: ${goal.name}`,
        description: `Você atingiu sua meta de poupança: ${goal.name}`,
        badgeIcon: 'goal-achieved',
        pointsEarned: 100,
        metadata: {
          goalId: goal.id,
          targetAmount: goal.targetAmount,
          achievedAt: new Date()
        }
      }
    });

    // Enviar notificação de conquista
    await this.notificationService.sendNotification({
      userId,
      type: 'achievement',
      title: '🎉 Meta Atingida!',
      message: `Parabéns! Você atingiu sua meta "${goal.name}" e ganhou 100 pontos!`,
      metadata: {
        achievementType: 'goal_achieved',
        pointsEarned: 100,
        goalId: goal.id
      }
    });
  }

  async getGoals(
    userId: string,
    includeAchieved: boolean = true
  ): Promise<{
    success: boolean;
    goals?: any[];
    message: string;
  }> {
    try {
      const goals = await prisma.savingsGoal.findMany({
        where: {
          userId,
          ...(includeAchieved ? {} : { isAchieved: false })
        },
        include: {
          asset: true
        },
        orderBy: [
          { isAchieved: 'asc' },
          { deadline: 'asc' }
        ]
      });

      return {
        success: true,
        goals: goals.map(goal => ({
          id: goal.id,
          name: goal.name,
          description: goal.description,
          targetAmount: goal.targetAmount,
          currentAmount: goal.currentAmount,
          progress: (goal.currentAmount / goal.targetAmount) * 100,
          asset: goal.asset,
          goalType: goal.goalType,
          deadline: goal.deadline,
          isAchieved: goal.isAchieved,
          achievedAt: goal.achievedAt,
          createdAt: goal.createdAt
        })),
        message: 'Goals retrieved successfully'
      };

    } catch (error) {
      console.error('Error getting goals:', error);
      return {
        success: false,
        message: 'Failed to get goals'
      };
    }
  }

  async deleteGoal(
    userId: string,
    goalId: string,
    context: any
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const goal = await prisma.savingsGoal.findUnique({
        where: { id: goalId }
      });

      if (!goal || goal.userId !== userId) {
        return {
          success: false,
          message: 'Goal not found'
        };
      }

      await prisma.savingsGoal.delete({
        where: { id: goalId }
      });

      // Log de auditoria
      await this.auditLogger.logAction(userId, {
        type: 'delete',
        resourceType: 'savings_goal',
        resourceId: goalId,
        module: 'banco',
        description: `Deleted savings goal: ${goal.name}`,
        oldValues: goal,
        metadata: { goalId }
      }, context);

      return {
        success: true,
        message: 'Goal deleted successfully'
      };

    } catch (error) {
      console.error('Error deleting goal:', error);
      return {
        success: false,
        message: 'Failed to delete goal'
      };
    }
  }
}
```

### 3. Gamification System

```typescript
// backend/src/banco/gamification-system.ts
import { prisma } from '../db';
import { NotificationService } from '../notifications/notification-service';

export class GamificationSystem {
  private notificationService: NotificationService;

  constructor() {
    this.notificationService = new NotificationService();
  }

  async checkAndAwardAchievements(
    userId: string,
    action: string,
    metadata: any
  ): Promise<void> {
    try {
      const achievements = await this.getAvailableAchievements(userId, action, metadata);
      
      for (const achievement of achievements) {
        await this.awardAchievement(userId, achievement);
      }
    } catch (error) {
      console.error('Error checking achievements:', error);
    }
  }

  private async getAvailableAchievements(
    userId: string,
    action: string,
    metadata: any
  ): Promise<any[]> {
    const achievements = [];

    // Primeira poupança
    if (action === 'first_savings' && !await this.hasAchievement(userId, 'first_savings')) {
      achievements.push({
        type: 'first_savings',
        name: 'Primeira Poupança',
        description: 'Você fez sua primeira transferência para poupança!',
        badgeIcon: 'first-savings',
        pointsEarned: 50
      });
    }

    // Meta atingida
    if (action === 'goal_achieved') {
      achievements.push({
        type: 'goal_achieved',
        name: `Meta Atingida: ${metadata.goalName}`,
        description: `Parabéns! Você atingiu sua meta "${metadata.goalName}"!`,
        badgeIcon: 'goal-achieved',
        pointsEarned: 100
      });
    }

    // Sequência de poupança (7 dias)
    if (action === 'daily_savings') {
      const streak = await this.getSavingsStreak(userId);
      if (streak === 7 && !await this.hasAchievement(userId, 'weekly_streak')) {
        achievements.push({
          type: 'weekly_streak',
          name: 'Sequência Semanal',
          description: 'Você poupou por 7 dias consecutivos!',
          badgeIcon: 'weekly-streak',
          pointsEarned: 200
        });
      }
    }

    // Milestone de valor
    if (action === 'savings_milestone') {
      const totalSaved = await this.getTotalSaved(userId);
      const milestones = [
        { amount: 1000, name: 'Primeiro Milhar', points: 300 },
        { amount: 5000, name: 'Cinco Mil', points: 500 },
        { amount: 10000, name: 'Dez Mil', points: 1000 },
        { amount: 50000, name: 'Cinquenta Mil', points: 2000 },
        { amount: 100000, name: 'Cem Mil', points: 5000 }
      ];

      for (const milestone of milestones) {
        if (totalSaved >= milestone.amount && 
            !await this.hasAchievement(userId, `milestone_${milestone.amount}`)) {
          achievements.push({
            type: `milestone_${milestone.amount}`,
            name: milestone.name,
            description: `Você atingiu ${milestone.amount} em poupança!`,
            badgeIcon: 'milestone',
            pointsEarned: milestone.points
          });
        }
      }
    }

    return achievements;
  }

  private async awardAchievement(userId: string, achievement: any): Promise<void> {
    try {
      await prisma.savingsAchievement.create({
        data: {
          userId,
          achievementType: achievement.type,
          achievementName: achievement.name,
          description: achievement.description,
          badgeIcon: achievement.badgeIcon,
          pointsEarned: achievement.pointsEarned,
          metadata: {
            awardedAt: new Date()
          }
        }
      });

      // Enviar notificação
      await this.notificationService.sendNotification({
        userId,
        type: 'achievement',
        title: '🏆 Nova Conquista!',
        message: `${achievement.name} - ${achievement.description} (+${achievement.pointsEarned} pontos)`,
        metadata: {
          achievementType: achievement.type,
          pointsEarned: achievement.pointsEarned,
          badgeIcon: achievement.badgeIcon
        }
      });

    } catch (error) {
      console.error('Error awarding achievement:', error);
    }
  }

  private async hasAchievement(userId: string, achievementType: string): Promise<boolean> {
    const achievement = await prisma.savingsAchievement.findUnique({
      where: {
        userId_achievementType: {
          userId,
          achievementType
        }
      }
    });

    return !!achievement;
  }

  private async getSavingsStreak(userId: string): Promise<number> {
    // Implementar lógica para calcular sequência de poupança
    const transfers = await prisma.walletTransfer.findMany({
      where: {
        fromWallet: { userId },
        transferType: 'main_to_savings',
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Calcular sequência baseada nas transferências
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 7; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      
      const hasTransfer = transfers.some(transfer => {
        const transferDate = new Date(transfer.createdAt);
        transferDate.setHours(0, 0, 0, 0);
        return transferDate.getTime() === checkDate.getTime();
      });

      if (hasTransfer) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }

  private async getTotalSaved(userId: string): Promise<number> {
    const transfers = await prisma.walletTransfer.findMany({
      where: {
        fromWallet: { userId },
        transferType: 'main_to_savings',
        status: 'completed'
      },
      include: {
        asset: true
      }
    });

    // Converter todos os valores para USD para somar
    let totalUsd = 0;
    for (const transfer of transfers) {
      // Aqui você implementaria a conversão para USD
      // Por simplicidade, assumindo que o valor já está em USD
      totalUsd += Number(transfer.amount);
    }

    return totalUsd;
  }

  async getUserAchievements(userId: string): Promise<{
    success: boolean;
    achievements?: any[];
    totalPoints?: number;
    message: string;
  }> {
    try {
      const achievements = await prisma.savingsAchievement.findMany({
        where: { userId },
        orderBy: { earnedAt: 'desc' }
      });

      const totalPoints = achievements.reduce((sum, achievement) => 
        sum + achievement.pointsEarned, 0
      );

      return {
        success: true,
        achievements: achievements.map(achievement => ({
          id: achievement.id,
          type: achievement.achievementType,
          name: achievement.achievementName,
          description: achievement.description,
          badgeIcon: achievement.badgeIcon,
          pointsEarned: achievement.pointsEarned,
          earnedAt: achievement.earnedAt,
          metadata: achievement.metadata
        })),
        totalPoints,
        message: 'Achievements retrieved successfully'
      };

    } catch (error) {
      console.error('Error getting achievements:', error);
      return {
        success: false,
        message: 'Failed to get achievements'
      };
    }
  }

  async getLeaderboard(limit: number = 10): Promise<{
    success: boolean;
    leaderboard?: any[];
    message: string;
  }> {
    try {
      const leaderboard = await prisma.savingsAchievement.groupBy({
        by: ['userId'],
        _sum: {
          pointsEarned: true
        },
        _count: {
          id: true
        },
        orderBy: {
          _sum: {
            pointsEarned: 'desc'
          }
        },
        take: limit
      });

      // Buscar informações dos usuários
      const userIds = leaderboard.map(item => item.userId);
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, email: true }
      });

      const userMap = new Map(users.map(user => [user.id, user]));

      const result = leaderboard.map((item, index) => ({
        rank: index + 1,
        userId: item.userId,
        user: userMap.get(item.userId),
        totalPoints: item._sum.pointsEarned || 0,
        achievementsCount: item._count.id
      }));

      return {
        success: true,
        leaderboard: result,
        message: 'Leaderboard retrieved successfully'
      };

    } catch (error) {
      console.error('Error getting leaderboard:', error);
      return {
        success: false,
        message: 'Failed to get leaderboard'
      };
    }
  }
}
```

### 4. Reports Generator

```typescript
// backend/src/banco/reports-generator.ts
import { prisma } from '../db';

export class ReportsGenerator {
  async generateDailyReport(userId: string, date: Date): Promise<{
    success: boolean;
    report?: any;
    message: string;
  }> {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const transfers = await this.getTransfersInPeriod(userId, startOfDay, endOfDay);
      const goals = await this.getGoalsProgress(userId, startOfDay, endOfDay);
      const achievements = await this.getAchievementsInPeriod(userId, startOfDay, endOfDay);

      const report = {
        userId,
        reportType: 'daily',
        periodStart: startOfDay,
        periodEnd: endOfDay,
        totalSaved: transfers.totalTransferred,
        totalWithdrawn: transfers.totalWithdrawn,
        netSavings: transfers.totalTransferred - transfers.totalWithdrawn,
        goalsAchieved: goals.achieved,
        achievementsEarned: achievements.length,
        savingsRate: this.calculateSavingsRate(transfers),
        reportData: {
          transfers: transfers.details,
          goals: goals.details,
          achievements: achievements
        }
      };

      // Salvar relatório
      await prisma.savingsReport.create({
        data: report
      });

      return {
        success: true,
        report,
        message: 'Daily report generated successfully'
      };

    } catch (error) {
      console.error('Error generating daily report:', error);
      return {
        success: false,
        message: 'Failed to generate daily report'
      };
    }
  }

  async generateWeeklyReport(userId: string, weekStart: Date): Promise<{
    success: boolean;
    report?: any;
    message: string;
  }> {
    try {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      const transfers = await this.getTransfersInPeriod(userId, weekStart, weekEnd);
      const goals = await this.getGoalsProgress(userId, weekStart, weekEnd);
      const achievements = await this.getAchievementsInPeriod(userId, weekStart, weekEnd);

      const report = {
        userId,
        reportType: 'weekly',
        periodStart: weekStart,
        periodEnd: weekEnd,
        totalSaved: transfers.totalTransferred,
        totalWithdrawn: transfers.totalWithdrawn,
        netSavings: transfers.totalTransferred - transfers.totalWithdrawn,
        goalsAchieved: goals.achieved,
        achievementsEarned: achievements.length,
        savingsRate: this.calculateSavingsRate(transfers),
        reportData: {
          dailyBreakdown: await this.getDailyBreakdown(userId, weekStart, weekEnd),
          transfers: transfers.details,
          goals: goals.details,
          achievements: achievements
        }
      };

      await prisma.savingsReport.create({
        data: report
      });

      return {
        success: true,
        report,
        message: 'Weekly report generated successfully'
      };

    } catch (error) {
      console.error('Error generating weekly report:', error);
      return {
        success: false,
        message: 'Failed to generate weekly report'
      };
    }
  }

  async generateMonthlyReport(userId: string, monthStart: Date): Promise<{
    success: boolean;
    report?: any;
    message: string;
  }> {
    try {
      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthEnd.getMonth() + 1);
      monthEnd.setDate(0); // Último dia do mês
      monthEnd.setHours(23, 59, 59, 999);

      const transfers = await this.getTransfersInPeriod(userId, monthStart, monthEnd);
      const goals = await this.getGoalsProgress(userId, monthStart, monthEnd);
      const achievements = await this.getAchievementsInPeriod(userId, monthStart, monthEnd);

      const report = {
        userId,
        reportType: 'monthly',
        periodStart: monthStart,
        periodEnd: monthEnd,
        totalSaved: transfers.totalTransferred,
        totalWithdrawn: transfers.totalWithdrawn,
        netSavings: transfers.totalTransferred - transfers.totalWithdrawn,
        goalsAchieved: goals.achieved,
        achievementsEarned: achievements.length,
        savingsRate: this.calculateSavingsRate(transfers),
        reportData: {
          weeklyBreakdown: await this.getWeeklyBreakdown(userId, monthStart, monthEnd),
          transfers: transfers.details,
          goals: goals.details,
          achievements: achievements,
          trends: await this.calculateTrends(userId, monthStart, monthEnd)
        }
      };

      await prisma.savingsReport.create({
        data: report
      });

      return {
        success: true,
        report,
        message: 'Monthly report generated successfully'
      };

    } catch (error) {
      console.error('Error generating monthly report:', error);
      return {
        success: false,
        message: 'Failed to generate monthly report'
      };
    }
  }

  private async getTransfersInPeriod(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<any> {
    const transfers = await prisma.walletTransfer.findMany({
      where: {
        fromWallet: { userId },
        createdAt: {
          gte: startDate,
          lte: endDate
        },
        status: 'completed'
      },
      include: {
        asset: true,
        fromWallet: true,
        toWallet: true
      }
    });

    const totalTransferred = transfers
      .filter(t => t.transferType === 'main_to_savings')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const totalWithdrawn = transfers
      .filter(t => t.transferType === 'savings_to_main')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    return {
      totalTransferred,
      totalWithdrawn,
      details: transfers
    };
  }

  private async getGoalsProgress(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<any> {
    const goals = await prisma.savingsGoal.findMany({
      where: {
        userId,
        OR: [
          { achievedAt: { gte: startDate, lte: endDate } },
          { createdAt: { gte: startDate, lte: endDate } }
        ]
      },
      include: {
        asset: true
      }
    });

    const achieved = goals.filter(g => g.isAchieved).length;

    return {
      achieved,
      total: goals.length,
      details: goals
    };
  }

  private async getAchievementsInPeriod(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<any[]> {
    return await prisma.savingsAchievement.findMany({
      where: {
        userId,
        earnedAt: {
          gte: startDate,
          lte: endDate
        }
      }
    });
  }

  private calculateSavingsRate(transfers: any): number {
    if (transfers.totalTransferred === 0) return 0;
    return (transfers.totalTransferred / (transfers.totalTransferred + transfers.totalWithdrawn)) * 100;
  }

  private async getDailyBreakdown(
    userId: string,
    weekStart: Date,
    weekEnd: Date
  ): Promise<any[]> {
    const breakdown = [];
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart);
      day.setDate(day.getDate() + i);
      
      const dayTransfers = await this.getTransfersInPeriod(
        userId,
        new Date(day.setHours(0, 0, 0, 0)),
        new Date(day.setHours(23, 59, 59, 999))
      );
      
      breakdown.push({
        date: day,
        saved: dayTransfers.totalTransferred,
        withdrawn: dayTransfers.totalWithdrawn,
        net: dayTransfers.totalTransferred - dayTransfers.totalWithdrawn
      });
    }
    
    return breakdown;
  }

  private async getWeeklyBreakdown(
    userId: string,
    monthStart: Date,
    monthEnd: Date
  ): Promise<any[]> {
    const breakdown = [];
    const currentWeek = new Date(monthStart);
    
    while (currentWeek <= monthEnd) {
      const weekEnd = new Date(currentWeek);
      weekEnd.setDate(weekEnd.getDate() + 6);
      
      const weekTransfers = await this.getTransfersInPeriod(
        userId,
        currentWeek,
        weekEnd
      );
      
      breakdown.push({
        weekStart: new Date(currentWeek),
        weekEnd: new Date(weekEnd),
        saved: weekTransfers.totalTransferred,
        withdrawn: weekTransfers.totalWithdrawn,
        net: weekTransfers.totalTransferred - weekTransfers.totalWithdrawn
      });
      
      currentWeek.setDate(currentWeek.getDate() + 7);
    }
    
    return breakdown;
  }

  private async calculateTrends(
    userId: string,
    monthStart: Date,
    monthEnd: Date
  ): Promise<any> {
    // Implementar cálculo de tendências
    // Por exemplo: crescimento semanal, consistência, etc.
    return {
      weeklyGrowth: 0,
      consistency: 0,
      averageDaily: 0
    };
  }
}
```

## 🎨 Interface do Usuário Avançada

### 1. Dashboard de Poupança Avançado

```typescript
// frontend/src/components/savings/AdvancedSavingsDashboard.tsx
import React, { useState, useEffect } from 'react';

interface AdvancedSavingsDashboardProps {
  userId: string;
}

export const AdvancedSavingsDashboard: React.FC<AdvancedSavingsDashboardProps> = ({ userId }) => {
  const [dashboardData, setDashboardData] = useState(null);
  const [goals, setGoals] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [userId]);

  const loadDashboardData = async () => {
    try {
      const [balanceResponse, goalsResponse, achievementsResponse, reportsResponse] = await Promise.all([
        fetch('/api/banco/savings/combined-balance'),
        fetch('/api/banco/savings/goals'),
        fetch('/api/banco/savings/achievements'),
        fetch('/api/banco/savings/reports?limit=5')
      ]);

      const balanceData = await balanceResponse.json();
      const goalsData = await goalsResponse.json();
      const achievementsData = await achievementsResponse.json();
      const reportsData = await reportsResponse.json();

      if (balanceData.success) setDashboardData(balanceData.combinedBalance);
      if (goalsData.success) setGoals(goalsData.goals);
      if (achievementsData.success) setAchievements(achievementsData.achievements);
      if (reportsData.success) setReports(reportsData.reports);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Carregando...</div>;

  return (
    <div className="advanced-savings-dashboard">
      <h2>💰 Dashboard de Poupança Avançado</h2>
      
      {/* Resumo Financeiro */}
      <div className="financial-summary">
        <div className="total-balance">
          <h3>Saldo Total</h3>
          <div className="balance-amount">
            ${dashboardData?.totalUsdValue.toLocaleString()}
          </div>
          <div className="balance-btc">
            {dashboardData?.totalBtcValue.toFixed(8)} BTC
          </div>
        </div>

        <div className="savings-stats">
          <div className="stat-item">
            <span className="stat-label">Meta Atual</span>
            <span className="stat-value">
              {goals.filter(g => !g.isAchieved).length} ativa(s)
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Conquistas</span>
            <span className="stat-value">
              {achievements.length} conquistada(s)
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Pontos</span>
            <span className="stat-value">
              {achievements.reduce((sum, a) => sum + a.pointsEarned, 0)}
            </span>
          </div>
        </div>
      </div>

      {/* Metas de Poupança */}
      <div className="savings-goals">
        <h3>🎯 Metas de Poupança</h3>
        <div className="goals-list">
          {goals.map(goal => (
            <div key={goal.id} className={`goal-item ${goal.isAchieved ? 'achieved' : ''}`}>
              <div className="goal-header">
                <h4>{goal.name}</h4>
                <span className="goal-status">
                  {goal.isAchieved ? '✅ Atingida' : '🔄 Em andamento'}
                </span>
              </div>
              <div className="goal-progress">
                <div className="progress-bar">
                  <div 
                    className="progress-fill"
                    style={{ width: `${goal.progress}%` }}
                  ></div>
                </div>
                <span className="progress-text">
                  {goal.currentAmount.toFixed(8)} / {goal.targetAmount.toFixed(8)} {goal.asset.symbol}
                  ({goal.progress.toFixed(1)}%)
                </span>
              </div>
              {goal.deadline && (
                <div className="goal-deadline">
                  Prazo: {new Date(goal.deadline).toLocaleDateString()}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Conquistas */}
      <div className="achievements">
        <h3>🏆 Conquistas</h3>
        <div className="achievements-grid">
          {achievements.map(achievement => (
            <div key={achievement.id} className="achievement-item">
              <div className="achievement-icon">
                {achievement.badgeIcon}
              </div>
              <div className="achievement-info">
                <h4>{achievement.name}</h4>
                <p>{achievement.description}</p>
                <span className="achievement-points">
                  +{achievement.pointsEarned} pontos
                </span>
              </div>
              <div className="achievement-date">
                {new Date(achievement.earnedAt).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Relatórios Recentes */}
      <div className="recent-reports">
        <h3>📊 Relatórios Recentes</h3>
        <div className="reports-list">
          {reports.map(report => (
            <div key={report.id} className="report-item">
              <div className="report-header">
                <h4>Relatório {report.reportType}</h4>
                <span className="report-date">
                  {new Date(report.periodStart).toLocaleDateString()} - 
                  {new Date(report.periodEnd).toLocaleDateString()}
                </span>
              </div>
              <div className="report-stats">
                <div className="stat">
                  <span className="stat-label">Poupado</span>
                  <span className="stat-value">${report.totalSaved.toLocaleString()}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Taxa de Poupança</span>
                  <span className="stat-value">{report.savingsRate.toFixed(1)}%</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Metas Atingidas</span>
                  <span className="stat-value">{report.goalsAchieved}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
```

### 2. Configurações Avançadas de Poupança

```typescript
// frontend/src/components/savings/AdvancedSavingsSettings.tsx
import React, { useState, useEffect } from 'react';

interface AdvancedSavingsSettingsProps {
  userId: string;
}

export const AdvancedSavingsSettings: React.FC<AdvancedSavingsSettingsProps> = ({ userId }) => {
  const [settings, setSettings] = useState({
    isSavingsEnabled: false,
    autoTransferEnabled: false,
    autoTransferPercentage: 0,
    autoTransferThreshold: 0,
    autoTransferProfits: false,
    autoTransferSchedule: 'daily',
    autoTransferTime: '23:59:59',
    autoTransferDayOfWeek: 0,
    autoTransferDayOfMonth: 31,
    notificationsEnabled: true
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [userId]);

  const loadSettings = async () => {
    try {
      const response = await fetch(`/api/banco/savings/settings`);
      const data = await response.json();
      
      if (data.success) {
        setSettings(data.settings);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/banco/savings/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      
      const data = await response.json();
      if (data.success) {
        alert('Configurações salvas com sucesso!');
      } else {
        alert('Erro ao salvar configurações');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Carregando...</div>;

  return (
    <div className="advanced-savings-settings">
      <h3>⚙️ Configurações Avançadas de Poupança</h3>
      
      {/* Configurações Básicas */}
      <div className="settings-section">
        <h4>Configurações Básicas</h4>
        
        <div className="setting-item">
          <label>
            <input
              type="checkbox"
              checked={settings.isSavingsEnabled}
              onChange={(e) => setSettings({
                ...settings,
                isSavingsEnabled: e.target.checked
              })}
            />
            Habilitar Carteira de Poupança
          </label>
        </div>

        <div className="setting-item">
          <label>
            <input
              type="checkbox"
              checked={settings.notificationsEnabled}
              onChange={(e) => setSettings({
                ...settings,
                notificationsEnabled: e.target.checked
              })}
            />
            Habilitar Notificações
          </label>
        </div>
      </div>

      {/* Transferência Automática */}
      {settings.isSavingsEnabled && (
        <div className="settings-section">
          <h4>Transferência Automática</h4>
          
          <div className="setting-item">
            <label>
              <input
                type="checkbox"
                checked={settings.autoTransferEnabled}
                onChange={(e) => setSettings({
                  ...settings,
                  autoTransferEnabled: e.target.checked
                })}
              />
              Habilitar Transferência Automática
            </label>
          </div>

          {settings.autoTransferEnabled && (
            <>
              <div className="setting-item">
                <label>
                  <input
                    type="checkbox"
                    checked={settings.autoTransferProfits}
                    onChange={(e) => setSettings({
                      ...settings,
                      autoTransferProfits: e.target.checked
                    })}
                  />
                  Transferir Lucros Automaticamente
                </label>
                <p className="help-text">
                  Todos os lucros de trading serão transferidos automaticamente para poupança
                </p>
              </div>

              <div className="setting-item">
                <label>
                  Percentual de Transferência (%):
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={settings.autoTransferPercentage}
                    onChange={(e) => setSettings({
                      ...settings,
                      autoTransferPercentage: Number(e.target.value)
                    })}
                  />
                </label>
              </div>

              <div className="setting-item">
                <label>
                  Valor Mínimo para Transferência:
                  <input
                    type="number"
                    min="0"
                    step="0.00000001"
                    value={settings.autoTransferThreshold}
                    onChange={(e) => setSettings({
                      ...settings,
                      autoTransferThreshold: Number(e.target.value)
                    })}
                  />
                </label>
              </div>

              <div className="setting-item">
                <label>
                  Frequência da Transferência:
                  <select
                    value={settings.autoTransferSchedule}
                    onChange={(e) => setSettings({
                      ...settings,
                      autoTransferSchedule: e.target.value
                    })}
                  >
                    <option value="daily">Diária</option>
                    <option value="weekly">Semanal</option>
                    <option value="monthly">Mensal</option>
                  </select>
                </label>
              </div>

              <div className="setting-item">
                <label>
                  Horário da Transferência:
                  <input
                    type="time"
                    value={settings.autoTransferTime}
                    onChange={(e) => setSettings({
                      ...settings,
                      autoTransferTime: e.target.value
                    })}
                  />
                </label>
              </div>

              {settings.autoTransferSchedule === 'weekly' && (
                <div className="setting-item">
                  <label>
                    Dia da Semana:
                    <select
                      value={settings.autoTransferDayOfWeek}
                      onChange={(e) => setSettings({
                        ...settings,
                        autoTransferDayOfWeek: Number(e.target.value)
                      })}
                    >
                      <option value="0">Domingo</option>
                      <option value="1">Segunda</option>
                      <option value="2">Terça</option>
                      <option value="3">Quarta</option>
                      <option value="4">Quinta</option>
                      <option value="5">Sexta</option>
                      <option value="6">Sábado</option>
                    </select>
                  </label>
                </div>
              )}

              {settings.autoTransferSchedule === 'monthly' && (
                <div className="setting-item">
                  <label>
                    Dia do Mês:
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={settings.autoTransferDayOfMonth}
                      onChange={(e) => setSettings({
                        ...settings,
                        autoTransferDayOfMonth: Number(e.target.value)
                      })}
                    />
                  </label>
                </div>
              )}
            </>
          )}
        </div>
      )}

      <button
        onClick={saveSettings}
        disabled={saving}
        className="save-button"
      >
        {saving ? 'Salvando...' : 'Salvar Configurações'}
      </button>
    </div>
  );
};
```

## 🧪 Testes do Sistema Avançado

### 1. Testes de Transferência Automática

```typescript
// tests/unit/banco/auto-profit-transfer-engine.test.ts
import { describe, it, expect, beforeEach } from 'bun:test';
import { AutoProfitTransferEngine } from '../../src/banco/auto-profit-transfer-engine';
import { prisma } from '../setup';

describe('AutoProfitTransferEngine', () => {
  let transferEngine: AutoProfitTransferEngine;

  beforeEach(() => {
    transferEngine = new AutoProfitTransferEngine();
  });

  describe('processScheduledTransfers', () => {
    it('should process transfers for users with auto transfer enabled', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          name: 'Test User'
        }
      });

      await prisma.userSavingsSetting.create({
        data: {
          userId: user.id,
          autoTransferEnabled: true,
          autoTransferProfits: true,
          autoTransferSchedule: 'daily',
          autoTransferTime: '23:59:59'
        }
      });

      // Mock profitable trades
      await prisma.tradingTransaction.create({
        data: {
          userId: user.id,
          assetId: 'asset_123',
          amount: 1.0,
          profit: 100,
          status: 'completed',
          type: 'buy'
        }
      });

      await transferEngine.processScheduledTransfers();

      // Verificar se transferência foi processada
      const transfers = await prisma.walletTransfer.findMany({
        where: {
          fromWallet: { userId: user.id },
          transferType: 'main_to_savings'
        }
      });

      expect(transfers.length).toBeGreaterThan(0);
    });
  });

  describe('scheduleTransfer', () => {
    it('should schedule transfer for user', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          name: 'Test User'
        }
      });

      const result = await transferEngine.scheduleTransfer(user.id, {
        type: 'daily',
        time: '18:00:00'
      });

      expect(result.success).toBe(true);

      const settings = await prisma.userSavingsSetting.findUnique({
        where: { userId: user.id }
      });

      expect(settings?.autoTransferSchedule).toBe('daily');
      expect(settings?.autoTransferTime).toBe('18:00:00');
    });
  });
});
```

## 📋 Checklist de Implementação Avançada

### ✅ Transferência Automática de Lucros
- [ ] Auto Profit Transfer Engine
- [ ] Agendamento de transferências
- [ ] Processamento de lucros diários
- [ ] Configuração de horários
- [ ] Notificações de transferência

### ✅ Sistema de Metas
- [ ] Savings Goals Manager
- [ ] Criação de metas personalizáveis
- [ ] Acompanhamento de progresso
- [ ] Notificações de metas
- [ ] Relatórios de metas

### ✅ Gamificação
- [ ] Sistema de conquistas
- [ ] Badges e pontos
- [ ] Leaderboard
- [ ] Notificações de conquistas
- [ ] Análise de comportamento

### ✅ Relatórios Avançados
- [ ] Reports Generator
- [ ] Relatórios diários/semanais/mensais
- [ ] Análise de tendências
- [ ] Breakdown detalhado
- [ ] Exportação de dados

### ✅ Notificações Inteligentes
- [ ] Sistema de notificações
- [ ] Alertas de metas
- [ ] Lembretes de poupança
- [ ] Notificações de conquistas
- [ ] Relatórios automáticos

---

**Última atualização**: 2024-12-19
**Versão**: 2.0.0
**Responsável**: Agente-CTO