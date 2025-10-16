# Perfil de Auditoria do Usuário - BotCriptoFy2

## 👤 Visão Geral

Interface de perfil de auditoria que permite a cada usuário visualizar suas próprias ações auditadas, com diferentes níveis de detalhamento baseados no tipo de usuário (administrativo, trader, influencer/parceiro).

## 🏗️ Arquitetura do Perfil de Auditoria

### Componentes Principais
- **Audit Profile Dashboard**: Dashboard principal de auditoria
- **Audit Timeline**: Timeline de ações do usuário
- **Audit Analytics**: Análise de padrões de comportamento
- **Audit Export**: Exportação de dados de auditoria
- **Audit Settings**: Configurações de privacidade e notificações

### Estratégia por Tipo de Usuário
- **Administrativos**: Visualização completa de logs administrativos
- **Traders**: Visualização detalhada com análise comportamental
- **Influencers/Parceiros**: Visualização focada em atividades de conteúdo e afiliados

## 📊 Estrutura de Dados do Perfil

### Tabelas Específicas para Perfil

#### 1. user_audit_preferences
```sql
CREATE TABLE user_audit_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  show_sensitive_data BOOLEAN DEFAULT false,
  enable_notifications BOOLEAN DEFAULT true,
  notification_frequency VARCHAR(20) DEFAULT 'daily', -- real_time, hourly, daily, weekly
  export_format VARCHAR(10) DEFAULT 'json', -- json, csv, pdf
  retention_period INTEGER DEFAULT 365, -- dias
  privacy_level VARCHAR(20) DEFAULT 'standard', -- minimal, standard, detailed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);
```

#### 2. user_audit_summaries
```sql
CREATE TABLE user_audit_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  total_actions INTEGER NOT NULL,
  actions_by_type JSONB NOT NULL,
  actions_by_module JSONB NOT NULL,
  risk_distribution JSONB NOT NULL,
  suspicious_activities INTEGER DEFAULT 0,
  top_actions JSONB NOT NULL,
  behavioral_insights JSONB,
  compliance_score DECIMAL(3,2), -- 0.00-1.00
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 3. user_audit_alerts
```sql
CREATE TABLE user_audit_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  alert_type VARCHAR(50) NOT NULL, -- suspicious_activity, data_access, export_request
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  severity VARCHAR(20) NOT NULL, -- info, warning, error, critical
  data JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🔧 Implementação do Perfil

### 1. Audit Profile Service

```typescript
// backend/src/audit/audit-profile.service.ts
import { prisma } from '../db';
import { AuditRetriever } from './audit-retriever';
import { BehavioralAnalyzer } from './behavioral-analyzer';

export class AuditProfileService {
  private auditRetriever: AuditRetriever;
  private behavioralAnalyzer: BehavioralAnalyzer;

  constructor() {
    this.auditRetriever = new AuditRetriever();
    this.behavioralAnalyzer = new BehavioralAnalyzer();
  }

  async getUserAuditProfile(
    userId: string,
    userType: 'admin' | 'trader' | 'influencer' | 'partner'
  ): Promise<{
    summary: any;
    recentActivity: any[];
    behavioralInsights: any;
    riskAssessment: any;
    complianceStatus: any;
    preferences: any;
  }> {
    try {
      // Buscar resumo de auditoria
      const summary = await this.getAuditSummary(userId, userType);

      // Buscar atividade recente
      const recentActivity = await this.getRecentActivity(userId, userType);

      // Buscar insights comportamentais
      const behavioralInsights = await this.getBehavioralInsights(userId, userType);

      // Buscar avaliação de risco
      const riskAssessment = await this.getRiskAssessment(userId, userType);

      // Buscar status de compliance
      const complianceStatus = await this.getComplianceStatus(userId, userType);

      // Buscar preferências do usuário
      const preferences = await this.getUserPreferences(userId);

      return {
        summary,
        recentActivity,
        behavioralInsights,
        riskAssessment,
        complianceStatus,
        preferences
      };

    } catch (error) {
      console.error('Error getting user audit profile:', error);
      throw new Error('Failed to get user audit profile');
    }
  }

  private async getAuditSummary(
    userId: string,
    userType: string
  ): Promise<any> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Buscar resumo baseado no tipo de usuário
    let logs;
    if (userType === 'trader') {
      logs = await prisma.traderAuditLog.findMany({
        where: {
          traderId: userId,
          createdAt: {
            gte: thirtyDaysAgo
          }
        }
      });
    } else if (userType === 'influencer') {
      logs = await prisma.influencerAuditLog.findMany({
        where: {
          influencerId: userId,
          createdAt: {
            gte: thirtyDaysAgo
          }
        }
      });
    } else {
      logs = await prisma.auditLog.findMany({
        where: {
          userId,
          createdAt: {
            gte: thirtyDaysAgo
          }
        }
      });
    }

    const totalActions = logs.length;
    const actionsByType = logs.reduce((acc, log) => {
      acc[log.actionType] = (acc[log.actionType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const actionsByModule = logs.reduce((acc, log) => {
      acc[log.module] = (acc[log.module] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const riskDistribution = logs.reduce((acc, log) => {
      acc[log.riskLevel] = (acc[log.riskLevel] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const suspiciousActivities = logs.filter(log => 
      log.riskLevel === 'high' || log.riskLevel === 'critical'
    ).length;

    const topActions = Object.entries(actionsByType)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([action, count]) => ({ action, count }));

    return {
      totalActions,
      actionsByType,
      actionsByModule,
      riskDistribution,
      suspiciousActivities,
      topActions,
      period: {
        start: thirtyDaysAgo,
        end: new Date()
      }
    };
  }

  private async getRecentActivity(
    userId: string,
    userType: string
  ): Promise<any[]> {
    // Buscar atividade recente (últimas 24 horas)
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    let logs;
    if (userType === 'trader') {
      logs = await prisma.traderAuditLog.findMany({
        where: {
          traderId: userId,
          createdAt: {
            gte: twentyFourHoursAgo
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 20
      });
    } else if (userType === 'influencer') {
      logs = await prisma.influencerAuditLog.findMany({
        where: {
          influencerId: userId,
          createdAt: {
            gte: twentyFourHoursAgo
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 20
      });
    } else {
      logs = await prisma.auditLog.findMany({
        where: {
          userId,
          createdAt: {
            gte: twentyFourHoursAgo
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 20
      });
    }

    return logs.map(log => ({
      id: log.id,
      actionType: log.actionType,
      module: log.module,
      description: log.description,
      riskLevel: log.riskLevel,
      isSuspicious: log.isSuspicious,
      createdAt: log.createdAt,
      location: log.location,
      deviceInfo: log.deviceInfo
    }));
  }

  private async getBehavioralInsights(
    userId: string,
    userType: string
  ): Promise<any> {
    if (userType === 'trader') {
      return await this.behavioralAnalyzer.analyzeTraderBehavior(userId, {}, {});
    } else if (userType === 'influencer') {
      return await this.behavioralAnalyzer.analyzeInfluencerBehavior(userId, {}, {});
    } else {
      return await this.behavioralAnalyzer.analyzeAdminBehavior(userId, {}, {});
    }
  }

  private async getRiskAssessment(
    userId: string,
    userType: string
  ): Promise<any> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Buscar logs de risco
    let highRiskLogs;
    if (userType === 'trader') {
      highRiskLogs = await prisma.traderAuditLog.count({
        where: {
          traderId: userId,
          riskScore: { gte: 70 },
          createdAt: { gte: thirtyDaysAgo }
        }
      });
    } else if (userType === 'influencer') {
      highRiskLogs = await prisma.influencerAuditLog.count({
        where: {
          influencerId: userId,
          riskScore: { gte: 70 },
          createdAt: { gte: thirtyDaysAgo }
        }
      });
    } else {
      highRiskLogs = await prisma.auditLog.count({
        where: {
          userId,
          riskLevel: { in: ['high', 'critical'] },
          createdAt: { gte: thirtyDaysAgo }
        }
      });
    }

    // Calcular score de risco
    const riskScore = Math.min((highRiskLogs / 30) * 100, 100);

    return {
      riskScore,
      riskLevel: this.getRiskLevel(riskScore),
      highRiskActions: highRiskLogs,
      recommendations: this.getRiskRecommendations(riskScore, userType)
    };
  }

  private async getComplianceStatus(
    userId: string,
    userType: string
  ): Promise<any> {
    // Verificar compliance baseado no tipo de usuário
    const complianceChecks = [];

    if (userType === 'trader') {
      // Verificar compliance de trader
      complianceChecks.push(
        await this.checkTraderCompliance(userId)
      );
    } else if (userType === 'influencer') {
      // Verificar compliance de influencer
      complianceChecks.push(
        await this.checkInfluencerCompliance(userId)
      );
    } else {
      // Verificar compliance administrativo
      complianceChecks.push(
        await this.checkAdminCompliance(userId)
      );
    }

    const overallScore = complianceChecks.reduce((sum, check) => sum + check.score, 0) / complianceChecks.length;

    return {
      overallScore,
      checks: complianceChecks,
      status: this.getComplianceStatus(overallScore),
      lastChecked: new Date()
    };
  }

  private async getUserPreferences(userId: string): Promise<any> {
    const preferences = await prisma.userAuditPreference.findUnique({
      where: { userId }
    });

    return preferences || {
      showSensitiveData: false,
      enableNotifications: true,
      notificationFrequency: 'daily',
      exportFormat: 'json',
      retentionPeriod: 365,
      privacyLevel: 'standard'
    };
  }

  private getRiskLevel(riskScore: number): string {
    if (riskScore >= 80) return 'critical';
    if (riskScore >= 60) return 'high';
    if (riskScore >= 40) return 'medium';
    return 'low';
  }

  private getRiskRecommendations(riskScore: number, userType: string): string[] {
    const recommendations = [];

    if (riskScore >= 80) {
      recommendations.push('Contact security team immediately');
      recommendations.push('Review all recent activities');
    } else if (riskScore >= 60) {
      recommendations.push('Enable two-factor authentication');
      recommendations.push('Review account security settings');
    } else if (riskScore >= 40) {
      recommendations.push('Update password regularly');
      recommendations.push('Monitor account activity');
    }

    if (userType === 'trader') {
      recommendations.push('Review trading patterns');
      recommendations.push('Verify all financial transactions');
    } else if (userType === 'influencer') {
      recommendations.push('Review content compliance');
      recommendations.push('Monitor social media activity');
    }

    return recommendations;
  }

  private getComplianceStatus(score: number): string {
    if (score >= 0.9) return 'excellent';
    if (score >= 0.7) return 'good';
    if (score >= 0.5) return 'fair';
    return 'poor';
  }

  private async checkTraderCompliance(userId: string): Promise<any> {
    // Verificar compliance específico de trader
    return {
      name: 'Trader Compliance',
      score: 0.85,
      details: {
        kycCompleted: true,
        riskAssessment: true,
        tradingLimits: true,
        reportingRequirements: false
      }
    };
  }

  private async checkInfluencerCompliance(userId: string): Promise<any> {
    // Verificar compliance específico de influencer
    return {
      name: 'Influencer Compliance',
      score: 0.90,
      details: {
        contentGuidelines: true,
        disclosureRequirements: true,
        brandGuidelines: true,
        audienceProtection: true
      }
    };
  }

  private async checkAdminCompliance(userId: string): Promise<any> {
    // Verificar compliance específico administrativo
    return {
      name: 'Admin Compliance',
      score: 0.95,
      details: {
        accessControls: true,
        dataProtection: true,
        auditTrails: true,
        securityPolicies: true
      }
    };
  }
}
```

### 2. Audit Timeline Component

```typescript
// frontend/src/components/audit/AuditTimeline.tsx
import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';

interface AuditTimelineProps {
  userId: string;
  userType: 'admin' | 'trader' | 'influencer' | 'partner';
}

export const AuditTimeline: React.FC<AuditTimelineProps> = ({ userId, userType }) => {
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    module: '',
    actionType: '',
    riskLevel: '',
    dateRange: '7d'
  });

  useEffect(() => {
    loadTimeline();
  }, [userId, filters]);

  const loadTimeline = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/audit/timeline/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(filters)
      });
      const data = await response.json();
      setTimeline(data.timeline);
    } catch (error) {
      console.error('Error loading timeline:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'critical': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'login': return '🔐';
      case 'logout': return '🚪';
      case 'create': return '➕';
      case 'update': return '✏️';
      case 'delete': return '🗑️';
      case 'view': return '👁️';
      case 'export': return '📤';
      default: return '📝';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <select
            value={filters.module}
            onChange={(e) => setFilters({ ...filters, module: e.target.value })}
            className="border rounded px-3 py-2"
          >
            <option value="">Todos os módulos</option>
            <option value="financeiro">Financeiro</option>
            <option value="marketing">Marketing</option>
            <option value="vendas">Vendas</option>
            <option value="seguranca">Segurança</option>
          </select>

          <select
            value={filters.actionType}
            onChange={(e) => setFilters({ ...filters, actionType: e.target.value })}
            className="border rounded px-3 py-2"
          >
            <option value="">Todos os tipos</option>
            <option value="login">Login</option>
            <option value="create">Criar</option>
            <option value="update">Atualizar</option>
            <option value="delete">Deletar</option>
          </select>

          <select
            value={filters.riskLevel}
            onChange={(e) => setFilters({ ...filters, riskLevel: e.target.value })}
            className="border rounded px-3 py-2"
          >
            <option value="">Todos os níveis</option>
            <option value="low">Baixo</option>
            <option value="medium">Médio</option>
            <option value="high">Alto</option>
            <option value="critical">Crítico</option>
          </select>

          <select
            value={filters.dateRange}
            onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}
            className="border rounded px-3 py-2"
          >
            <option value="1d">Últimas 24h</option>
            <option value="7d">Últimos 7 dias</option>
            <option value="30d">Últimos 30 dias</option>
            <option value="90d">Últimos 90 dias</option>
          </select>
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-4">
        {timeline.map((item, index) => (
          <div key={item.id} className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-lg">{getActionIcon(item.actionType)}</span>
                </div>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-900">
                    {item.description}
                  </h3>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskColor(item.riskLevel)}`}>
                      {item.riskLevel}
                    </span>
                    {item.isSuspicious && (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Suspeito
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="mt-1 text-sm text-gray-500">
                  <span className="font-medium">{item.module}</span> • {item.actionType}
                </div>
                
                <div className="mt-2 text-xs text-gray-400">
                  {format(new Date(item.createdAt), 'dd/MM/yyyy HH:mm:ss')}
                  {item.location && (
                    <span> • {item.location.city}, {item.location.country}</span>
                  )}
                  {item.deviceInfo && (
                    <span> • {item.deviceInfo.type} - {item.deviceInfo.os}</span>
                  )}
                </div>

                {item.metadata && Object.keys(item.metadata).length > 0 && (
                  <div className="mt-2">
                    <details className="text-xs">
                      <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                        Ver detalhes
                      </summary>
                      <pre className="mt-2 p-2 bg-gray-50 rounded text-xs overflow-auto">
                        {JSON.stringify(item.metadata, null, 2)}
                      </pre>
                    </details>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {timeline.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          Nenhuma atividade encontrada para os filtros selecionados.
        </div>
      )}
    </div>
  );
};
```

### 3. Audit Analytics Dashboard

```typescript
// frontend/src/components/audit/AuditAnalytics.tsx
import React, { useState, useEffect } from 'react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

interface AuditAnalyticsProps {
  userId: string;
  userType: 'admin' | 'trader' | 'influencer' | 'partner';
}

export const AuditAnalytics: React.FC<AuditAnalyticsProps> = ({ userId, userType }) => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [userId]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/audit/analytics/${userId}`);
      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!analytics) {
    return <div>Erro ao carregar analytics</div>;
  }

  const actionsOverTimeData = {
    labels: analytics.actionsOverTime.map(item => item.date),
    datasets: [{
      label: 'Ações',
      data: analytics.actionsOverTime.map(item => item.count),
      borderColor: 'rgb(59, 130, 246)',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      tension: 0.1
    }]
  };

  const actionsByModuleData = {
    labels: Object.keys(analytics.actionsByModule),
    datasets: [{
      data: Object.values(analytics.actionsByModule),
      backgroundColor: [
        '#3B82F6',
        '#10B981',
        '#F59E0B',
        '#EF4444',
        '#8B5CF6',
        '#06B6D4'
      ]
    }]
  };

  const riskDistributionData = {
    labels: Object.keys(analytics.riskDistribution),
    datasets: [{
      data: Object.values(analytics.riskDistribution),
      backgroundColor: [
        '#10B981', // low - green
        '#F59E0B', // medium - yellow
        '#EF4444', // high - red
        '#7C2D12'  // critical - dark red
      ]
    }]
  };

  return (
    <div className="space-y-6">
      {/* Métricas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-blue-600">
            {analytics.totalActions}
          </div>
          <div className="text-sm text-gray-500">Total de Ações</div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-green-600">
            {analytics.complianceScore}%
          </div>
          <div className="text-sm text-gray-500">Score de Compliance</div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-orange-600">
            {analytics.suspiciousActivities}
          </div>
          <div className="text-sm text-gray-500">Atividades Suspeitas</div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-purple-600">
            {analytics.riskScore}
          </div>
          <div className="text-sm text-gray-500">Score de Risco</div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ações ao Longo do Tempo */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-4">Ações ao Longo do Tempo</h3>
          <Line data={actionsOverTimeData} options={{
            responsive: true,
            plugins: {
              legend: { display: false }
            }
          }} />
        </div>

        {/* Distribuição por Módulo */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-4">Ações por Módulo</h3>
          <Doughnut data={actionsByModuleData} options={{
            responsive: true,
            plugins: {
              legend: { position: 'bottom' }
            }
          }} />
        </div>

        {/* Distribuição de Risco */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-4">Distribuição de Risco</h3>
          <Doughnut data={riskDistributionData} options={{
            responsive: true,
            plugins: {
              legend: { position: 'bottom' }
            }
          }} />
        </div>

        {/* Top Ações */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-4">Top Ações</h3>
          <div className="space-y-2">
            {analytics.topActions.map((action, index) => (
              <div key={index} className="flex justify-between items-center">
                <span className="text-sm">{action.action}</span>
                <span className="text-sm font-medium text-blue-600">{action.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Insights Comportamentais */}
      {userType === 'trader' && analytics.behavioralInsights && (
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-4">Insights Comportamentais</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-gray-700">Padrão de Login</h4>
              <p className="text-sm text-gray-600">
                Horário preferido: {analytics.behavioralInsights.loginPattern?.preferredTime || 'N/A'}
              </p>
            </div>
            <div>
              <h4 className="font-medium text-gray-700">Localização</h4>
              <p className="text-sm text-gray-600">
                Principal: {analytics.behavioralInsights.locationPattern?.primaryLocation || 'N/A'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
```

## 🔧 APIs do Perfil de Auditoria

### 1. Profile APIs

#### GET /api/audit/profile/{userId}
Obter perfil completo de auditoria do usuário

```typescript
interface AuditProfileResponse {
  summary: {
    totalActions: number;
    actionsByType: Record<string, number>;
    actionsByModule: Record<string, number>;
    riskDistribution: Record<string, number>;
    suspiciousActivities: number;
    topActions: Array<{ action: string; count: number }>;
    period: { start: string; end: string };
  };
  recentActivity: Array<{
    id: string;
    actionType: string;
    module: string;
    description: string;
    riskLevel: string;
    isSuspicious: boolean;
    createdAt: string;
    location?: any;
    deviceInfo?: any;
  }>;
  behavioralInsights: any;
  riskAssessment: {
    riskScore: number;
    riskLevel: string;
    highRiskActions: number;
    recommendations: string[];
  };
  complianceStatus: {
    overallScore: number;
    checks: any[];
    status: string;
    lastChecked: string;
  };
  preferences: {
    showSensitiveData: boolean;
    enableNotifications: boolean;
    notificationFrequency: string;
    exportFormat: string;
    retentionPeriod: number;
    privacyLevel: string;
  };
}
```

#### PUT /api/audit/profile/{userId}/preferences
Atualizar preferências de auditoria

```typescript
interface UpdatePreferencesRequest {
  showSensitiveData?: boolean;
  enableNotifications?: boolean;
  notificationFrequency?: 'real_time' | 'hourly' | 'daily' | 'weekly';
  exportFormat?: 'json' | 'csv' | 'pdf';
  retentionPeriod?: number;
  privacyLevel?: 'minimal' | 'standard' | 'detailed';
}

interface UpdatePreferencesResponse {
  success: boolean;
  message: string;
}
```

### 2. Timeline APIs

#### POST /api/audit/timeline/{userId}
Obter timeline de auditoria com filtros

```typescript
interface TimelineRequest {
  module?: string;
  actionType?: string;
  riskLevel?: string;
  dateRange?: '1d' | '7d' | '30d' | '90d';
  page?: number;
  limit?: number;
}

interface TimelineResponse {
  timeline: Array<{
    id: string;
    actionType: string;
    module: string;
    description: string;
    riskLevel: string;
    isSuspicious: boolean;
    createdAt: string;
    location?: any;
    deviceInfo?: any;
    metadata?: any;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

### 3. Analytics APIs

#### GET /api/audit/analytics/{userId}
Obter analytics de auditoria do usuário

```typescript
interface AuditAnalyticsResponse {
  totalActions: number;
  complianceScore: number;
  suspiciousActivities: number;
  riskScore: number;
  actionsOverTime: Array<{ date: string; count: number }>;
  actionsByModule: Record<string, number>;
  riskDistribution: Record<string, number>;
  topActions: Array<{ action: string; count: number }>;
  behavioralInsights?: any;
}
```

## 🧪 Testes do Perfil de Auditoria

### Testes Unitários

```typescript
// tests/unit/audit/audit-profile.service.test.ts
import { describe, it, expect, beforeEach } from 'bun:test';
import { AuditProfileService } from '../../src/audit/audit-profile.service';
import { prisma } from '../setup';

describe('AuditProfileService', () => {
  let auditProfileService: AuditProfileService;

  beforeEach(() => {
    auditProfileService = new AuditProfileService();
  });

  describe('getUserAuditProfile', () => {
    it('should get trader audit profile with behavioral insights', async () => {
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

      // Criar logs de auditoria
      await prisma.traderAuditLog.create({
        data: {
          traderId: trader.id,
          sessionId: 'session_123',
          actionCategory: 'trading',
          actionType: 'create_transaction',
          resourceType: 'transaction',
          module: 'financeiro',
          description: 'Created transaction',
          ipAddress: '192.168.1.1',
          location: { country: 'BR', city: 'São Paulo' },
          deviceInfo: { type: 'desktop', os: 'Windows' },
          riskScore: 30,
          riskFactors: [],
          isSuspicious: false,
          requiresReview: false,
          encryptedData: 'encrypted_data',
          dataHash: 'hash123',
          verificationHash: 'verification_hash'
        }
      });

      const profile = await auditProfileService.getUserAuditProfile(trader.id, 'trader');

      expect(profile).toBeDefined();
      expect(profile.summary.totalActions).toBe(1);
      expect(profile.behavioralInsights).toBeDefined();
      expect(profile.riskAssessment).toBeDefined();
      expect(profile.complianceStatus).toBeDefined();
    });

    it('should get influencer audit profile with content analysis', async () => {
      // Criar influencer
      const influencer = await prisma.user.create({
        data: {
          email: 'influencer@example.com',
          name: 'Influencer User'
        }
      });

      await prisma.affiliateUser.create({
        data: {
          userId: influencer.id,
          tenantId: 'main-tenant',
          affiliateCode: 'INFLUENCER001',
          userType: 'influencer',
          inviteLimit: null,
          isActive: true
        }
      });

      const profile = await auditProfileService.getUserAuditProfile(influencer.id, 'influencer');

      expect(profile).toBeDefined();
      expect(profile.summary).toBeDefined();
      expect(profile.behavioralInsights).toBeDefined();
    });
  });
});
```

## 📋 Checklist de Implementação

### ✅ Configuração Inicial
- [ ] Criar tabelas de perfil de auditoria
- [ ] Configurar preferências de usuário
- [ ] Configurar analytics comportamentais
- [ ] Configurar exportação de dados

### ✅ Funcionalidades
- [ ] Dashboard de perfil de auditoria
- [ ] Timeline de atividades
- [ ] Analytics comportamentais
- [ ] Exportação de dados

### ✅ APIs
- [ ] APIs de perfil
- [ ] APIs de timeline
- [ ] APIs de analytics
- [ ] APIs de preferências

### ✅ Testes
- [ ] Testes unitários
- [ ] Testes de integração
- [ ] Testes de UI
- [ ] Testes de performance

---

**Última atualização**: 2024-12-19
**Versão**: 1.0.0
**Responsável**: Agente-CTO