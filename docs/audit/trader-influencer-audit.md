# Auditoria Especializada para Traders e Influencers/Parceiros - BotCriptoFy2

## 🎯 Visão Geral

Sistema de auditoria especializado com atenção redobrada para traders e influencers/parceiros, garantindo rastreabilidade completa de todas as ações críticas, com dados imutáveis e acessíveis no perfil de cada usuário.

## 🔍 Estratégia de Auditoria Especializada

### Níveis de Auditoria por Tipo de Usuário

#### **Traders (Alto Risco)**
- **Auditoria Completa**: Todas as ações são auditadas
- **Criptografia Obrigatória**: Dados sensíveis sempre criptografados
- **Alertas Imediatos**: Notificações instantâneas para ações críticas
- **Retenção Estendida**: Logs mantidos por 7 anos
- **Análise Comportamental**: Detecção de padrões suspeitos

#### **Influencers/Parceiros (Médio Risco)**
- **Auditoria Seletiva**: Ações críticas e financeiras auditadas
- **Criptografia Condicional**: Dados sensíveis criptografados
- **Alertas Moderados**: Notificações para ações importantes
- **Retenção Padrão**: Logs mantidos por 3 anos
- **Monitoramento Ativo**: Acompanhamento de atividades

#### **Usuários Administrativos (Padrão)**
- **Auditoria Básica**: Ações administrativas auditadas
- **Criptografia Padrão**: Dados sensíveis criptografados
- **Alertas Normais**: Notificações para ações críticas
- **Retenção Básica**: Logs mantidos por 1 ano
- **Monitoramento Passivo**: Acompanhamento ocasional

## 📊 Estrutura de Dados Especializada

### Tabelas Específicas para Auditoria de Alto Risco

#### 1. trader_audit_logs
```sql
CREATE TABLE trader_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trader_id UUID NOT NULL REFERENCES users(id),
  session_id VARCHAR(255) NOT NULL,
  action_category VARCHAR(50) NOT NULL, -- trading, financial, affiliate, security
  action_type VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100) NOT NULL,
  resource_id VARCHAR(255),
  module VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  old_values JSONB,
  new_values JSONB,
  metadata JSONB DEFAULT '{}',
  ip_address INET NOT NULL,
  user_agent TEXT,
  location JSONB NOT NULL,
  device_info JSONB NOT NULL,
  network_info JSONB, -- {isp, asn, proxy, vpn}
  biometric_data JSONB, -- {fingerprint, behavior_pattern}
  risk_score INTEGER NOT NULL, -- 0-100
  risk_factors JSONB, -- {location_change, time_anomaly, behavior_change}
  is_suspicious BOOLEAN DEFAULT false,
  requires_review BOOLEAN DEFAULT false,
  encrypted_data TEXT NOT NULL, -- Sempre criptografado
  data_hash VARCHAR(64) NOT NULL,
  verification_hash VARCHAR(64) NOT NULL, -- Hash adicional para verificação
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE -- Retenção de 7 anos
);
```

#### 2. influencer_audit_logs
```sql
CREATE TABLE influencer_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  influencer_id UUID NOT NULL REFERENCES users(id),
  session_id VARCHAR(255) NOT NULL,
  action_category VARCHAR(50) NOT NULL, -- content, affiliate, financial, social
  action_type VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100) NOT NULL,
  resource_id VARCHAR(255),
  module VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  old_values JSONB,
  new_values JSONB,
  metadata JSONB DEFAULT '{}',
  ip_address INET NOT NULL,
  user_agent TEXT,
  location JSONB NOT NULL,
  device_info JSONB NOT NULL,
  social_context JSONB, -- {platform, audience_size, engagement}
  content_analysis JSONB, -- {sentiment, keywords, compliance}
  risk_score INTEGER NOT NULL, -- 0-100
  risk_factors JSONB,
  is_suspicious BOOLEAN DEFAULT false,
  requires_review BOOLEAN DEFAULT false,
  encrypted_data TEXT, -- Criptografado se sensível
  data_hash VARCHAR(64) NOT NULL,
  verification_hash VARCHAR(64) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE -- Retenção de 3 anos
);
```

#### 3. audit_behavioral_patterns
```sql
CREATE TABLE audit_behavioral_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  user_type VARCHAR(20) NOT NULL, -- trader, influencer, partner
  pattern_type VARCHAR(50) NOT NULL, -- login_time, location, device, activity
  pattern_data JSONB NOT NULL,
  confidence_score DECIMAL(3,2) NOT NULL, -- 0.00-1.00
  is_anomaly BOOLEAN DEFAULT false,
  anomaly_score DECIMAL(3,2), -- 0.00-1.00
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 4. audit_security_events
```sql
CREATE TABLE audit_security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  user_type VARCHAR(20) NOT NULL,
  event_type VARCHAR(50) NOT NULL, -- login_anomaly, location_change, device_change, behavior_change
  severity VARCHAR(20) NOT NULL, -- low, medium, high, critical
  description TEXT NOT NULL,
  data JSONB NOT NULL,
  risk_score INTEGER NOT NULL,
  is_resolved BOOLEAN DEFAULT false,
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🔧 Implementação Especializada

### 1. Trader Audit Logger

```typescript
// backend/src/audit/trader-audit-logger.ts
import { prisma } from '../db';
import { TraderAuditEncryptor } from './trader-audit-encryptor';
import { BehavioralAnalyzer } from './behavioral-analyzer';
import { RiskCalculator } from './risk-calculator';

export class TraderAuditLogger {
  private encryptor: TraderAuditEncryptor;
  private behavioralAnalyzer: BehavioralAnalyzer;
  private riskCalculator: RiskCalculator;

  constructor() {
    this.encryptor = new TraderAuditEncryptor();
    this.behavioralAnalyzer = new BehavioralAnalyzer();
    this.riskCalculator = new RiskCalculator();
  }

  async logTraderAction(
    traderId: string,
    action: {
      category: 'trading' | 'financial' | 'affiliate' | 'security';
      type: string;
      resourceType: string;
      resourceId?: string;
      module: string;
      description: string;
      oldValues?: any;
      newValues?: any;
      metadata?: any;
    },
    context: {
      sessionId: string;
      ipAddress: string;
      userAgent?: string;
      location: any;
      deviceInfo: any;
      networkInfo?: any;
    }
  ): Promise<{
    success: boolean;
    logId?: string;
    riskScore?: number;
    isSuspicious?: boolean;
    message: string;
  }> {
    try {
      // Analisar comportamento
      const behaviorAnalysis = await this.behavioralAnalyzer.analyzeTraderBehavior(
        traderId,
        action,
        context
      );

      // Calcular risco
      const riskAnalysis = await this.riskCalculator.calculateTraderRisk(
        traderId,
        action,
        context,
        behaviorAnalysis
      );

      // Criptografar dados (sempre para traders)
      const encryptedData = await this.encryptor.encryptTraderData({
        oldValues: action.oldValues,
        newValues: action.newValues,
        metadata: action.metadata,
        behaviorAnalysis,
        riskAnalysis
      });

      // Criar hash de verificação dupla
      const dataHash = this.createDataHash(action, context);
      const verificationHash = this.createVerificationHash(encryptedData, dataHash);

      // Criar log de auditoria
      const auditLog = await prisma.traderAuditLog.create({
        data: {
          traderId,
          sessionId: context.sessionId,
          actionCategory: action.category,
          actionType: action.type,
          resourceType: action.resourceType,
          resourceId: action.resourceId,
          module: action.module,
          description: action.description,
          oldValues: this.sanitizeForDisplay(action.oldValues),
          newValues: this.sanitizeForDisplay(action.newValues),
          metadata: action.metadata || {},
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          location: context.location,
          deviceInfo: context.deviceInfo,
          networkInfo: context.networkInfo,
          biometricData: behaviorAnalysis.biometricData,
          riskScore: riskAnalysis.score,
          riskFactors: riskAnalysis.factors,
          isSuspicious: riskAnalysis.isSuspicious,
          requiresReview: riskAnalysis.requiresReview,
          encryptedData,
          dataHash,
          verificationHash,
          expiresAt: new Date(Date.now() + 7 * 365 * 24 * 60 * 60 * 1000) // 7 anos
        }
      });

      // Criar evento de segurança se necessário
      if (riskAnalysis.isSuspicious || riskAnalysis.score >= 70) {
        await this.createSecurityEvent(traderId, action, context, riskAnalysis);
      }

      // Atualizar padrões comportamentais
      await this.updateBehavioralPatterns(traderId, behaviorAnalysis);

      return {
        success: true,
        logId: auditLog.id,
        riskScore: riskAnalysis.score,
        isSuspicious: riskAnalysis.isSuspicious,
        message: 'Trader audit log created successfully'
      };

    } catch (error) {
      console.error('Error creating trader audit log:', error);
      return {
        success: false,
        message: 'Failed to create trader audit log'
      };
    }
  }

  private createDataHash(action: any, context: any): string {
    const crypto = require('crypto');
    const dataToHash = {
      action,
      context,
      timestamp: new Date().toISOString()
    };
    return crypto.createHash('sha256').update(JSON.stringify(dataToHash)).digest('hex');
  }

  private createVerificationHash(encryptedData: string, dataHash: string): string {
    const crypto = require('crypto');
    const combined = encryptedData + dataHash;
    return crypto.createHash('sha256').update(combined).digest('hex');
  }

  private sanitizeForDisplay(data: any): any {
    if (!data) return data;

    const sensitiveFields = [
      'password', 'token', 'secret', 'key', 'credit_card',
      'ssn', 'cpf', 'rg', 'bank_account', 'private_key',
      'api_key', 'access_token', 'refresh_token'
    ];

    const sanitize = (obj: any): any => {
      if (typeof obj !== 'object' || obj === null) return obj;

      if (Array.isArray(obj)) {
        return obj.map(sanitize);
      }

      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (sensitiveFields.some(field => 
          key.toLowerCase().includes(field.toLowerCase())
        )) {
          sanitized[key] = '[REDACTED]';
        } else {
          sanitized[key] = sanitize(value);
        }
      }
      return sanitized;
    };

    return sanitize(data);
  }

  private async createSecurityEvent(
    traderId: string,
    action: any,
    context: any,
    riskAnalysis: any
  ) {
    await prisma.auditSecurityEvent.create({
      data: {
        userId: traderId,
        userType: 'trader',
        eventType: 'suspicious_activity',
        severity: riskAnalysis.score >= 90 ? 'critical' : 'high',
        description: `Suspicious trader activity: ${action.description}`,
        data: {
          action,
          context,
          riskAnalysis
        },
        riskScore: riskAnalysis.score
      }
    });
  }

  private async updateBehavioralPatterns(
    traderId: string,
    behaviorAnalysis: any
  ) {
    // Atualizar padrões comportamentais do trader
    await prisma.auditBehavioralPattern.upsert({
      where: {
        userId_patternType: {
          userId: traderId,
          patternType: 'activity'
        }
      },
      update: {
        patternData: behaviorAnalysis.patterns,
        confidenceScore: behaviorAnalysis.confidence,
        isAnomaly: behaviorAnalysis.isAnomaly,
        anomalyScore: behaviorAnalysis.anomalyScore
      },
      create: {
        userId: traderId,
        userType: 'trader',
        patternType: 'activity',
        patternData: behaviorAnalysis.patterns,
        confidenceScore: behaviorAnalysis.confidence,
        isAnomaly: behaviorAnalysis.isAnomaly,
        anomalyScore: behaviorAnalysis.anomalyScore
      }
    });
  }
}
```

### 2. Influencer Audit Logger

```typescript
// backend/src/audit/influencer-audit-logger.ts
import { prisma } from '../db';
import { InfluencerAuditEncryptor } from './influencer-audit-encryptor';
import { ContentAnalyzer } from './content-analyzer';
import { SocialMediaMonitor } from './social-media-monitor';

export class InfluencerAuditLogger {
  private encryptor: InfluencerAuditEncryptor;
  private contentAnalyzer: ContentAnalyzer;
  private socialMediaMonitor: SocialMediaMonitor;

  constructor() {
    this.encryptor = new InfluencerAuditEncryptor();
    this.contentAnalyzer = new ContentAnalyzer();
    this.socialMediaMonitor = new SocialMediaMonitor();
  }

  async logInfluencerAction(
    influencerId: string,
    action: {
      category: 'content' | 'affiliate' | 'financial' | 'social';
      type: string;
      resourceType: string;
      resourceId?: string;
      module: string;
      description: string;
      oldValues?: any;
      newValues?: any;
      metadata?: any;
    },
    context: {
      sessionId: string;
      ipAddress: string;
      userAgent?: string;
      location: any;
      deviceInfo: any;
      socialContext?: any;
    }
  ): Promise<{
    success: boolean;
    logId?: string;
    riskScore?: number;
    isSuspicious?: boolean;
    message: string;
  }> {
    try {
      // Analisar conteúdo se aplicável
      let contentAnalysis = null;
      if (action.category === 'content' && action.newValues) {
        contentAnalysis = await this.contentAnalyzer.analyzeContent(
          action.newValues,
          context.socialContext
        );
      }

      // Monitorar atividade em redes sociais
      const socialMonitoring = await this.socialMediaMonitor.monitorActivity(
        influencerId,
        action,
        context
      );

      // Calcular risco
      const riskScore = this.calculateInfluencerRisk(
        action,
        context,
        contentAnalysis,
        socialMonitoring
      );

      // Criptografar dados se sensíveis
      let encryptedData = null;
      if (this.isSensitiveInfluencerData(action)) {
        encryptedData = await this.encryptor.encryptInfluencerData({
          oldValues: action.oldValues,
          newValues: action.newValues,
          metadata: action.metadata,
          contentAnalysis,
          socialMonitoring
        });
      }

      // Criar hash de verificação
      const dataHash = this.createDataHash(action, context);
      const verificationHash = this.createVerificationHash(encryptedData, dataHash);

      // Criar log de auditoria
      const auditLog = await prisma.influencerAuditLog.create({
        data: {
          influencerId,
          sessionId: context.sessionId,
          actionCategory: action.category,
          actionType: action.type,
          resourceType: action.resourceType,
          resourceId: action.resourceId,
          module: action.module,
          description: action.description,
          oldValues: this.sanitizeForDisplay(action.oldValues),
          newValues: this.sanitizeForDisplay(action.newValues),
          metadata: action.metadata || {},
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          location: context.location,
          deviceInfo: context.deviceInfo,
          socialContext: context.socialContext,
          contentAnalysis,
          riskScore,
          riskFactors: this.identifyRiskFactors(action, contentAnalysis, socialMonitoring),
          isSuspicious: riskScore >= 70,
          requiresReview: riskScore >= 50,
          encryptedData,
          dataHash,
          verificationHash,
          expiresAt: new Date(Date.now() + 3 * 365 * 24 * 60 * 60 * 1000) // 3 anos
        }
      });

      // Criar evento de segurança se necessário
      if (riskScore >= 70) {
        await this.createSecurityEvent(influencerId, action, context, riskScore);
      }

      return {
        success: true,
        logId: auditLog.id,
        riskScore,
        isSuspicious: riskScore >= 70,
        message: 'Influencer audit log created successfully'
      };

    } catch (error) {
      console.error('Error creating influencer audit log:', error);
      return {
        success: false,
        message: 'Failed to create influencer audit log'
      };
    }
  }

  private isSensitiveInfluencerData(action: any): boolean {
    const sensitiveFields = [
      'password', 'token', 'secret', 'key', 'credit_card',
      'bank_account', 'private_key', 'api_key', 'access_token',
      'personal_data', 'contact_info', 'financial_data'
    ];

    const dataString = JSON.stringify(action);
    return sensitiveFields.some(field => 
      dataString.toLowerCase().includes(field.toLowerCase())
    );
  }

  private calculateInfluencerRisk(
    action: any,
    context: any,
    contentAnalysis: any,
    socialMonitoring: any
  ): number {
    let riskScore = 0;

    // Risco baseado no tipo de ação
    const highRiskActions = ['delete', 'export', 'financial_transaction', 'content_publish'];
    if (highRiskActions.includes(action.type)) {
      riskScore += 20;
    }

    // Risco baseado na análise de conteúdo
    if (contentAnalysis) {
      if (contentAnalysis.sentiment === 'negative') riskScore += 15;
      if (contentAnalysis.complianceIssues.length > 0) riskScore += 25;
      if (contentAnalysis.riskKeywords.length > 0) riskScore += 20;
    }

    // Risco baseado no monitoramento social
    if (socialMonitoring) {
      if (socialMonitoring.suspiciousActivity) riskScore += 30;
      if (socialMonitoring.unusualEngagement) riskScore += 15;
    }

    // Risco baseado na localização
    if (context.location && !this.isExpectedLocation(context.location)) {
      riskScore += 20;
    }

    return Math.min(riskScore, 100);
  }

  private identifyRiskFactors(
    action: any,
    contentAnalysis: any,
    socialMonitoring: any
  ): any {
    const factors = [];

    if (contentAnalysis?.complianceIssues?.length > 0) {
      factors.push('content_compliance_issues');
    }

    if (socialMonitoring?.suspiciousActivity) {
      factors.push('suspicious_social_activity');
    }

    if (action.type === 'financial_transaction') {
      factors.push('financial_action');
    }

    return factors;
  }

  private createDataHash(action: any, context: any): string {
    const crypto = require('crypto');
    const dataToHash = {
      action,
      context,
      timestamp: new Date().toISOString()
    };
    return crypto.createHash('sha256').update(JSON.stringify(dataToHash)).digest('hex');
  }

  private createVerificationHash(encryptedData: string | null, dataHash: string): string {
    const crypto = require('crypto');
    const combined = (encryptedData || '') + dataHash;
    return crypto.createHash('sha256').update(combined).digest('hex');
  }

  private sanitizeForDisplay(data: any): any {
    if (!data) return data;

    const sensitiveFields = [
      'password', 'token', 'secret', 'key', 'credit_card',
      'ssn', 'cpf', 'rg', 'bank_account', 'private_key',
      'api_key', 'access_token', 'refresh_token'
    ];

    const sanitize = (obj: any): any => {
      if (typeof obj !== 'object' || obj === null) return obj;

      if (Array.isArray(obj)) {
        return obj.map(sanitize);
      }

      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (sensitiveFields.some(field => 
          key.toLowerCase().includes(field.toLowerCase())
        )) {
          sanitized[key] = '[REDACTED]';
        } else {
          sanitized[key] = sanitize(value);
        }
      }
      return sanitized;
    };

    return sanitize(data);
  }

  private async createSecurityEvent(
    influencerId: string,
    action: any,
    context: any,
    riskScore: number
  ) {
    await prisma.auditSecurityEvent.create({
      data: {
        userId: influencerId,
        userType: 'influencer',
        eventType: 'suspicious_activity',
        severity: riskScore >= 90 ? 'critical' : 'high',
        description: `Suspicious influencer activity: ${action.description}`,
        data: {
          action,
          context,
          riskScore
        },
        riskScore
      }
    });
  }

  private isExpectedLocation(location: any): boolean {
    // Implementar lógica para verificar se localização é esperada
    return true; // Placeholder
  }
}
```

### 3. Behavioral Analyzer

```typescript
// backend/src/audit/behavioral-analyzer.ts
export class BehavioralAnalyzer {
  async analyzeTraderBehavior(
    traderId: string,
    action: any,
    context: any
  ): Promise<{
    patterns: any;
    confidence: number;
    isAnomaly: boolean;
    anomalyScore: number;
    biometricData: any;
  }> {
    // Buscar padrões históricos do trader
    const historicalPatterns = await this.getHistoricalPatterns(traderId);
    
    // Analisar padrão de login
    const loginPattern = this.analyzeLoginPattern(traderId, context);
    
    // Analisar padrão de localização
    const locationPattern = this.analyzeLocationPattern(traderId, context);
    
    // Analisar padrão de dispositivo
    const devicePattern = this.analyzeDevicePattern(traderId, context);
    
    // Analisar padrão de atividade
    const activityPattern = this.analyzeActivityPattern(traderId, action);
    
    // Detectar anomalias
    const anomalyDetection = this.detectAnomalies(
      historicalPatterns,
      {
        login: loginPattern,
        location: locationPattern,
        device: devicePattern,
        activity: activityPattern
      }
    );

    return {
      patterns: {
        login: loginPattern,
        location: locationPattern,
        device: devicePattern,
        activity: activityPattern
      },
      confidence: this.calculateConfidence(historicalPatterns),
      isAnomaly: anomalyDetection.isAnomaly,
      anomalyScore: anomalyDetection.score,
      biometricData: {
        deviceFingerprint: this.generateDeviceFingerprint(context),
        behaviorSignature: this.generateBehaviorSignature(action, context)
      }
    };
  }

  private async getHistoricalPatterns(traderId: string): Promise<any> {
    // Buscar padrões históricos dos últimos 30 dias
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const logs = await prisma.traderAuditLog.findMany({
      where: {
        traderId,
        createdAt: {
          gte: thirtyDaysAgo
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 1000
    });

    return this.aggregatePatterns(logs);
  }

  private analyzeLoginPattern(traderId: string, context: any): any {
    // Analisar horários de login, frequência, etc.
    return {
      timeOfDay: new Date().getHours(),
      dayOfWeek: new Date().getDay(),
      frequency: 'normal' // normal, high, low
    };
  }

  private analyzeLocationPattern(traderId: string, context: any): any {
    // Analisar padrões de localização
    return {
      country: context.location?.country,
      city: context.location?.city,
      isNewLocation: false, // Verificar se é nova localização
      distanceFromLast: 0 // Distância da última localização
    };
  }

  private analyzeDevicePattern(traderId: string, context: any): any {
    // Analisar padrões de dispositivo
    return {
      deviceType: context.deviceInfo?.type,
      os: context.deviceInfo?.os,
      browser: context.deviceInfo?.browser,
      isNewDevice: false // Verificar se é novo dispositivo
    };
  }

  private analyzeActivityPattern(traderId: string, action: any): any {
    // Analisar padrões de atividade
    return {
      actionType: action.type,
      module: action.module,
      timeOfDay: new Date().getHours(),
      frequency: 'normal'
    };
  }

  private detectAnomalies(historical: any, current: any): {
    isAnomaly: boolean;
    score: number;
  } {
    let anomalyScore = 0;

    // Verificar anomalias de horário
    if (this.isTimeAnomaly(historical.login, current.login)) {
      anomalyScore += 30;
    }

    // Verificar anomalias de localização
    if (this.isLocationAnomaly(historical.location, current.location)) {
      anomalyScore += 40;
    }

    // Verificar anomalias de dispositivo
    if (this.isDeviceAnomaly(historical.device, current.device)) {
      anomalyScore += 35;
    }

    // Verificar anomalias de atividade
    if (this.isActivityAnomaly(historical.activity, current.activity)) {
      anomalyScore += 25;
    }

    return {
      isAnomaly: anomalyScore >= 50,
      score: Math.min(anomalyScore, 100)
    };
  }

  private isTimeAnomaly(historical: any, current: any): boolean {
    // Verificar se horário atual é muito diferente do histórico
    return false; // Placeholder
  }

  private isLocationAnomaly(historical: any, current: any): boolean {
    // Verificar se localização atual é muito diferente do histórico
    return false; // Placeholder
  }

  private isDeviceAnomaly(historical: any, current: any): boolean {
    // Verificar se dispositivo atual é muito diferente do histórico
    return false; // Placeholder
  }

  private isActivityAnomaly(historical: any, current: any): boolean {
    // Verificar se atividade atual é muito diferente do histórico
    return false; // Placeholder
  }

  private calculateConfidence(historical: any): number {
    // Calcular confiança baseada na quantidade de dados históricos
    return 0.8; // Placeholder
  }

  private generateDeviceFingerprint(context: any): string {
    const crypto = require('crypto');
    const fingerprint = {
      userAgent: context.userAgent,
      screen: context.deviceInfo?.screen,
      timezone: context.deviceInfo?.timezone,
      language: context.deviceInfo?.language
    };
    return crypto.createHash('sha256').update(JSON.stringify(fingerprint)).digest('hex');
  }

  private generateBehaviorSignature(action: any, context: any): string {
    const crypto = require('crypto');
    const signature = {
      actionType: action.type,
      module: action.module,
      timeOfDay: new Date().getHours(),
      dayOfWeek: new Date().getDay()
    };
    return crypto.createHash('sha256').update(JSON.stringify(signature)).digest('hex');
  }

  private aggregatePatterns(logs: any[]): any {
    // Agregar padrões dos logs históricos
    return {
      login: {},
      location: {},
      device: {},
      activity: {}
    };
  }
}
```

## 📊 APIs Especializadas

### 1. Trader Audit APIs

#### GET /api/audit/trader/logs
Listar logs de auditoria do trader

```typescript
interface TraderAuditLogsResponse {
  logs: {
    id: string;
    actionCategory: string;
    actionType: string;
    resourceType: string;
    resourceId?: string;
    module: string;
    description: string;
    oldValues?: any;
    newValues?: any;
    metadata: any;
    ipAddress: string;
    userAgent?: string;
    location: any;
    deviceInfo: any;
    networkInfo?: any;
    biometricData: any;
    riskScore: number;
    riskFactors: any;
    isSuspicious: boolean;
    requiresReview: boolean;
    createdAt: string;
  }[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

#### GET /api/audit/trader/behavior
Obter análise comportamental do trader

```typescript
interface TraderBehaviorResponse {
  patterns: {
    login: any;
    location: any;
    device: any;
    activity: any;
  };
  confidence: number;
  isAnomaly: boolean;
  anomalyScore: number;
  biometricData: any;
  lastUpdated: string;
}
```

### 2. Influencer Audit APIs

#### GET /api/audit/influencer/logs
Listar logs de auditoria do influencer

```typescript
interface InfluencerAuditLogsResponse {
  logs: {
    id: string;
    actionCategory: string;
    actionType: string;
    resourceType: string;
    resourceId?: string;
    module: string;
    description: string;
    oldValues?: any;
    newValues?: any;
    metadata: any;
    ipAddress: string;
    userAgent?: string;
    location: any;
    deviceInfo: any;
    socialContext?: any;
    contentAnalysis?: any;
    riskScore: number;
    riskFactors: any;
    isSuspicious: boolean;
    requiresReview: boolean;
    createdAt: string;
  }[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

#### GET /api/audit/influencer/content-analysis
Obter análise de conteúdo do influencer

```typescript
interface InfluencerContentAnalysisResponse {
  sentiment: string;
  keywords: string[];
  complianceIssues: string[];
  riskKeywords: string[];
  engagement: {
    likes: number;
    shares: number;
    comments: number;
  };
  lastAnalyzed: string;
}
```

## 🧪 Testes Especializados

### Testes de Auditoria de Traders

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
  });
});
```

## 📋 Checklist de Implementação

### ✅ Configuração Inicial
- [ ] Criar tabelas especializadas para traders e influencers
- [ ] Configurar criptografia avançada
- [ ] Configurar análise comportamental
- [ ] Configurar retenção diferenciada

### ✅ Funcionalidades
- [ ] Logger especializado para traders
- [ ] Logger especializado para influencers
- [ ] Análise comportamental
- [ ] Detecção de anomalias

### ✅ APIs
- [ ] APIs de auditoria para traders
- [ ] APIs de auditoria para influencers
- [ ] APIs de análise comportamental
- [ ] APIs de eventos de segurança

### ✅ Testes
- [ ] Testes unitários especializados
- [ ] Testes de criptografia avançada
- [ ] Testes de análise comportamental
- [ ] Testes de detecção de anomalias

---

**Última atualização**: 2024-12-19
**Versão**: 1.0.0
**Responsável**: Agente-CTO