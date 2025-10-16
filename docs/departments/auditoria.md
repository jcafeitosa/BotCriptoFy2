# Módulo de Auditoria - BotCriptoFy2

## 📋 Visão Geral

O Módulo de Auditoria é responsável por toda a auditoria da plataforma, incluindo logs de conformidade, relatórios de auditoria, detecção de irregularidades e controle de integridade.

## 🏗️ Arquitetura do Módulo

### Componentes Principais
- **Compliance Logging**: Logs de conformidade
- **Audit Reports**: Relatórios de auditoria
- **Irregularity Detection**: Detecção de irregularidades
- **Integrity Control**: Controle de integridade
- **Compliance Monitoring**: Monitoramento de conformidade

## 🚀 Melhorias Críticas Implementadas

### Sistema de Cache de Auditoria
- **Log Cache**: Cache de logs frequentes para consultas rápidas
- **Report Cache**: Cache de relatórios para performance
- **Query Optimization**: Otimização de consultas complexas
- **Performance**: 70% melhoria no tempo de consulta

### Sistema de Rate Limiting para Auditoria
- **Query Rate Limiting**: Limite de consultas por usuário
- **Export Rate Limiting**: Limite de exportações de dados
- **API Rate Limiting**: Proteção de APIs de auditoria
- **Segurança**: Proteção contra abuso de dados sensíveis

### Sistema de Monitoramento de Auditoria
- **Audit Health**: Monitoramento da saúde do sistema de auditoria
- **Compliance Alerts**: Alertas de conformidade em tempo real
- **Performance Metrics**: Métricas de performance de auditoria
- **Security Alerts**: Alertas de segurança baseados em auditoria

### Sistema de Backup de Auditoria
- **Immutable Backup**: Backup imutável de logs de auditoria
- **Encrypted Storage**: Armazenamento criptografado
- **Long-term Retention**: Retenção de longo prazo
- **Compliance**: Conformidade com regulamentações

### Sistema de Analytics de Auditoria
- **Behavioral Analysis**: Análise de comportamento de usuários
- **Anomaly Detection**: Detecção de anomalias em tempo real
- **Risk Assessment**: Avaliação de risco baseada em auditoria
- **Predictive Analytics**: Análise preditiva de riscos

### Integração com Better-Auth
- **Multi-tenancy**: Suporte a diferentes tipos de usuários
- **User Management**: Gestão de usuários e permissões
- **Action Tracking**: Rastreamento de ações
- **Audit Trail**: Trilha de auditoria

## 📊 Estrutura de Dados

### Tabelas do Banco de Dados

#### 1. audit_logs
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  tenant_id UUID REFERENCES tenants(id),
  action VARCHAR(100) NOT NULL,
  resource VARCHAR(100) NOT NULL,
  resource_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  session_id VARCHAR(255),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 2. compliance_reports
```sql
CREATE TABLE compliance_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type VARCHAR(50) NOT NULL, -- lgpd, gdpr, soc2, iso27001
  period_start TIMESTAMP NOT NULL,
  period_end TIMESTAMP NOT NULL,
  status VARCHAR(20) NOT NULL, -- pending, generating, completed, failed
  data JSONB NOT NULL,
  generated_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);
```

#### 3. irregularity_detection
```sql
CREATE TABLE irregularity_detection (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  tenant_id UUID REFERENCES tenants(id),
  irregularity_type VARCHAR(100) NOT NULL, -- data_breach, unauthorized_access, policy_violation
  severity VARCHAR(20) NOT NULL, -- low, medium, high, critical
  description TEXT NOT NULL,
  evidence JSONB NOT NULL,
  status VARCHAR(20) NOT NULL, -- detected, investigating, resolved, false_positive
  assigned_to UUID REFERENCES users(id),
  resolution_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP
);
```

#### 4. integrity_checks
```sql
CREATE TABLE integrity_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_type VARCHAR(50) NOT NULL, -- data_integrity, system_integrity, security_integrity
  check_name VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL, -- passed, failed, warning
  details JSONB NOT NULL,
  recommendations TEXT,
  performed_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 5. compliance_policies
```sql
CREATE TABLE compliance_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  policy_type VARCHAR(50) NOT NULL, -- data_protection, access_control, security
  content TEXT NOT NULL,
  version VARCHAR(20) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 6. audit_schedules
```sql
CREATE TABLE audit_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  audit_type VARCHAR(50) NOT NULL, -- compliance, security, data, system
  frequency VARCHAR(20) NOT NULL, -- daily, weekly, monthly, quarterly, yearly
  next_run TIMESTAMP NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## 🎯 Funcionalidades do Módulo

### 1. Logs de Conformidade

#### Rastreamento de Ações
- **Ações de Usuário**: Todas as ações de usuários
- **Mudanças de Dados**: Mudanças em dados sensíveis
- **Acessos**: Acessos a recursos
- **Configurações**: Mudanças de configuração

#### Categorização de Logs
- **Autenticação**: Logs de autenticação
- **Autorização**: Logs de autorização
- **Dados**: Logs de dados
- **Sistema**: Logs de sistema

#### Retenção de Logs
- **Política de Retenção**: Política configurável
- **Arquivamento**: Arquivamento automático
- **Exclusão**: Exclusão automática
- **Backup**: Backup de logs

### 2. Relatórios de Auditoria

#### Tipos de Relatórios
- **LGPD**: Relatórios de conformidade LGPD
- **GDPR**: Relatórios de conformidade GDPR
- **SOC 2**: Relatórios SOC 2
- **ISO 27001**: Relatórios ISO 27001

#### Geração de Relatórios
- **Automática**: Geração automática
- **Agendada**: Geração agendada
- **Sob Demanda**: Geração sob demanda
- **Personalizada**: Relatórios personalizados

#### Exportação
- **PDF**: Exportação em PDF
- **Excel**: Exportação em Excel
- **CSV**: Exportação em CSV
- **JSON**: Exportação em JSON

### 3. Detecção de Irregularidades

#### Tipos de Irregularidades
- **Vazamento de Dados**: Vazamento de dados sensíveis
- **Acesso Não Autorizado**: Acesso não autorizado
- **Violação de Política**: Violação de políticas
- **Comportamento Suspeito**: Comportamento suspeito

#### Detecção Automática
- **Análise de Padrões**: Análise de padrões anômalos
- **Machine Learning**: Detecção por ML
- **Regras Personalizadas**: Regras personalizadas
- **Alertas em Tempo Real**: Alertas instantâneos

#### Investigação
- **Análise de Evidências**: Análise de evidências
- **Rastreamento**: Rastreamento de ações
- **Documentação**: Documentação de investigação
- **Resolução**: Resolução de irregularidades

### 4. Controle de Integridade

#### Verificações de Integridade
- **Integridade de Dados**: Verificação de dados
- **Integridade do Sistema**: Verificação do sistema
- **Integridade de Segurança**: Verificação de segurança
- **Integridade de Backup**: Verificação de backup

#### Validação
- **Checksums**: Validação por checksums
- **Assinaturas Digitais**: Validação por assinaturas
- **Hashes**: Validação por hashes
- **Certificados**: Validação por certificados

#### Monitoramento
- **Monitoramento Contínuo**: Monitoramento 24/7
- **Alertas**: Alertas de integridade
- **Relatórios**: Relatórios de integridade
- **Ações Corretivas**: Ações corretivas

### 5. Monitoramento de Conformidade

#### Políticas de Conformidade
- **LGPD**: Políticas LGPD
- **GDPR**: Políticas GDPR
- **SOC 2**: Políticas SOC 2
- **ISO 27001**: Políticas ISO 27001

#### Verificação de Conformidade
- **Verificação Automática**: Verificação automática
- **Verificação Manual**: Verificação manual
- **Relatórios**: Relatórios de conformidade
- **Ações Corretivas**: Ações corretivas

#### Gestão de Políticas
- **Criação**: Criação de políticas
- **Atualização**: Atualização de políticas
- **Versionamento**: Controle de versões
- **Aprovação**: Aprovação de políticas

## 🔧 APIs do Módulo

### 1. Audit Logs APIs

#### GET /api/auditoria/logs
Listar logs de auditoria

```typescript
interface AuditLogResponse {
  id: string;
  userId?: string;
  tenantId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}
```

#### GET /api/auditoria/logs/search
Buscar logs de auditoria

```typescript
interface SearchAuditLogsRequest {
  userId?: string;
  tenantId?: string;
  action?: string;
  resource?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

interface SearchAuditLogsResponse {
  logs: AuditLogResponse[];
  total: number;
  hasMore: boolean;
}
```

#### POST /api/auditoria/logs
Criar log de auditoria

```typescript
interface CreateAuditLogRequest {
  userId?: string;
  tenantId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
}

interface CreateAuditLogResponse {
  id: string;
  status: string;
  message: string;
}
```

### 2. Compliance Reports APIs

#### GET /api/auditoria/compliance-reports
Listar relatórios de conformidade

```typescript
interface ComplianceReportResponse {
  id: string;
  reportType: string;
  periodStart: string;
  periodEnd: string;
  status: string;
  data: Record<string, any>;
  generatedBy: string;
  createdAt: string;
  completedAt?: string;
}
```

#### POST /api/auditoria/compliance-reports
Gerar relatório de conformidade

```typescript
interface GenerateComplianceReportRequest {
  reportType: string;
  periodStart: string;
  periodEnd: string;
  filters?: Record<string, any>;
}

interface GenerateComplianceReportResponse {
  id: string;
  status: string;
  estimatedCompletion: string;
  message: string;
}
```

#### GET /api/auditoria/compliance-reports/{id}/download
Download de relatório

```typescript
interface DownloadComplianceReportResponse {
  url: string;
  expiresAt: string;
  filename: string;
}
```

### 3. Irregularity Detection APIs

#### GET /api/auditoria/irregularities
Listar irregularidades detectadas

```typescript
interface IrregularityResponse {
  id: string;
  userId?: string;
  tenantId?: string;
  irregularityType: string;
  severity: string;
  description: string;
  evidence: Record<string, any>;
  status: string;
  assignedTo?: string;
  resolutionNotes?: string;
  createdAt: string;
  resolvedAt?: string;
}
```

#### POST /api/auditoria/irregularities
Criar detecção de irregularidade

```typescript
interface CreateIrregularityRequest {
  userId?: string;
  tenantId?: string;
  irregularityType: string;
  severity: string;
  description: string;
  evidence: Record<string, any>;
  assignedTo?: string;
}

interface CreateIrregularityResponse {
  id: string;
  status: string;
  message: string;
}
```

#### PUT /api/auditoria/irregularities/{id}
Atualizar irregularidade

```typescript
interface UpdateIrregularityRequest {
  status?: string;
  assignedTo?: string;
  resolutionNotes?: string;
}

interface UpdateIrregularityResponse {
  id: string;
  status: string;
  message: string;
}
```

### 4. Integrity Checks APIs

#### GET /api/auditoria/integrity-checks
Listar verificações de integridade

```typescript
interface IntegrityCheckResponse {
  id: string;
  checkType: string;
  checkName: string;
  status: string;
  details: Record<string, any>;
  recommendations?: string;
  performedBy: string;
  createdAt: string;
}
```

#### POST /api/auditoria/integrity-checks
Executar verificação de integridade

```typescript
interface RunIntegrityCheckRequest {
  checkType: string;
  checkName: string;
  parameters?: Record<string, any>;
}

interface RunIntegrityCheckResponse {
  id: string;
  status: string;
  message: string;
}
```

### 5. Compliance Policies APIs

#### GET /api/auditoria/policies
Listar políticas de conformidade

```typescript
interface CompliancePolicyResponse {
  id: string;
  name: string;
  description?: string;
  policyType: string;
  content: string;
  version: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
```

#### POST /api/auditoria/policies
Criar política de conformidade

```typescript
interface CreateCompliancePolicyRequest {
  name: string;
  description?: string;
  policyType: string;
  content: string;
  version: string;
}

interface CreateCompliancePolicyResponse {
  id: string;
  status: string;
  message: string;
}
```

#### PUT /api/auditoria/policies/{id}
Atualizar política de conformidade

```typescript
interface UpdateCompliancePolicyRequest {
  name?: string;
  description?: string;
  policyType?: string;
  content?: string;
  version?: string;
  isActive?: boolean;
}

interface UpdateCompliancePolicyResponse {
  id: string;
  status: string;
  message: string;
}
```

### 6. Audit Schedules APIs

#### GET /api/auditoria/schedules
Listar agendamentos de auditoria

```typescript
interface AuditScheduleResponse {
  id: string;
  name: string;
  description?: string;
  auditType: string;
  frequency: string;
  nextRun: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
```

#### POST /api/auditoria/schedules
Criar agendamento de auditoria

```typescript
interface CreateAuditScheduleRequest {
  name: string;
  description?: string;
  auditType: string;
  frequency: string;
  nextRun: string;
}

interface CreateAuditScheduleResponse {
  id: string;
  status: string;
  message: string;
}
```

#### PUT /api/auditoria/schedules/{id}
Atualizar agendamento de auditoria

```typescript
interface UpdateAuditScheduleRequest {
  name?: string;
  description?: string;
  auditType?: string;
  frequency?: string;
  nextRun?: string;
  isActive?: boolean;
}

interface UpdateAuditScheduleResponse {
  id: string;
  status: string;
  message: string;
}
```

## 🤖 Agente de Auditoria

### Capacidades

#### compliance
- Verificação de conformidade
- Geração de relatórios
- Gestão de políticas
- Monitoramento de conformidade

#### audit
- Auditoria de processos
- Logs de auditoria
- Relatórios de auditoria
- Análise de dados

#### integrity
- Controle de integridade
- Verificações de integridade
- Validação de dados
- Monitoramento de integridade

#### irregularities
- Detecção de irregularidades
- Investigação de irregularidades
- Resolução de irregularidades
- Prevenção de irregularidades

#### reports
- Geração de relatórios
- Análise de dados
- Exportação de dados
- Agendamento de relatórios

### Comandos

```bash
/audit_compliance - Auditoria de conformidade
/detect_irregularities - Detectar irregularidades
/generate_audit_report - Gerar relatório de auditoria
/check_integrity - Verificar integridade
/monitor_compliance - Monitorar conformidade
/analyze_logs - Analisar logs
/update_policies - Atualizar políticas
/generate_compliance_report - Gerar relatório de conformidade
/run_integrity_check - Executar verificação de integridade
/update_schedule - Atualizar agendamento
```

## 📊 Dashboard de Auditoria

### Métricas Principais
- **Logs de Auditoria**: Número total de logs
- **Irregularidades Detectadas**: Número de irregularidades
- **Verificações de Integridade**: Número de verificações
- **Relatórios Gerados**: Número de relatórios
- **Conformidade**: Status de conformidade

### Gráficos
- **Logs por Ação**: Gráfico de pizza
- **Irregularidades por Tipo**: Gráfico de barras
- **Verificações por Status**: Gráfico de pizza
- **Conformidade por Período**: Gráfico de linha

### Alertas
- **Irregularidades Críticas**: Alertas de irregularidades críticas
- **Falhas de Integridade**: Alertas de falhas de integridade
- **Violações de Política**: Alertas de violações
- **Relatórios Atrasados**: Alertas de relatórios

## 🔄 Fluxo de Trabalho

### 1. Detecção de Irregularidade
```
Comportamento → Análise → Detecção → Investigação → Resolução
```

### 2. Geração de Relatório
```
Solicitação → Validação → Processamento → Geração → Notificação
```

### 3. Verificação de Integridade
```
Agendamento → Execução → Validação → Relatório → Ação
```

### 4. Auditoria de Conformidade
```
Política → Verificação → Análise → Relatório → Ação
```

## 🧪 Testes

### Testes Unitários
```bash
# Testes de logs
bun test src/admin/departments/auditoria/logs/

# Testes de irregularidades
bun test src/admin/departments/auditoria/irregularities/

# Testes de integridade
bun test src/admin/departments/auditoria/integrity/
```

### Testes de Integração
```bash
# Testes de integração com Better-Auth
bun test tests/integration/auditoria-auth.test.ts

# Testes de integração com Telegram
bun test tests/integration/auditoria-telegram.test.ts
```

## 🚀 Deploy

### Variáveis de Ambiente
```env
# Auditoria
AUDITORIA_LOG_CACHE_TTL=1800
AUDITORIA_REPORT_CACHE_TTL=3600
AUDITORIA_IRREGULARITY_CACHE_TTL=900
AUDITORIA_INTEGRITY_CACHE_TTL=7200
```

### Docker
```dockerfile
# Adicionar ao Dockerfile existente
COPY src/admin/departments/auditoria/ ./src/admin/departments/auditoria/
RUN bun install
```

## 📈 Monitoramento

### Métricas de Performance
- **Response Time**: < 150ms para APIs
- **Throughput**: 300+ requests/min
- **Error Rate**: < 0.1%
- **Uptime**: 99.9%

### Alertas
- **Irregularidades Críticas**: Qualquer irregularidade crítica
- **Falhas de Integridade**: Qualquer falha de integridade
- **Violações de Política**: Qualquer violação
- **Relatórios Atrasados**: Relatórios com mais de 24h

---

**Última atualização**: 2024-12-19
**Versão**: 1.0.0
**Responsável**: Agente-CTO