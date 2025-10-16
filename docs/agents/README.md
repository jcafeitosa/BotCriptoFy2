# Agentes Autônomos - BotCriptoFy2

## 🤖 Visão Geral

O BotCriptoFy2 utiliza agentes autônomos baseados em Mastra.ai para gerenciar cada departamento de forma independente e proativa.

## 🏗️ Arquitetura dos Agentes

### Stack Tecnológica
- **Framework**: Mastra.ai v1.0.0
- **LLM**: Ollama (Qwen3:0.6b)
- **Comunicação**: Telegram Bot API
- **Dados**: TimescaleDB + Redis Cache
- **Runtime**: Bun v1.0.0

### Características dos Agentes
- **Autonomia**: Decisões independentes baseadas em dados
- **Proatividade**: Ações preventivas e preditivas
- **Tempo Real**: Acesso instantâneo aos dados
- **Comunicação**: Telegram entre equipes
- **Aprendizado**: Melhoria contínua baseada em resultados

## 🎯 Agentes por Departamento

### 1. CEO Agent
**Responsabilidades:**
- Coordenação geral da empresa
- Tomada de decisões estratégicas
- Análise de performance global
- Relatórios executivos
- Gestão de crises

**Capacidades:**
- `coordination`: Coordenação entre departamentos
- `decision_making`: Tomada de decisões estratégicas
- `reporting`: Geração de relatórios executivos
- `crisis_management`: Gestão de situações críticas

**Comandos Disponíveis:**
```bash
/analyze_performance - Análise de performance global
/generate_report - Gerar relatório executivo
/coordinate_departments - Coordenar ações entre departamentos
/manage_crisis - Gerenciar situação de crise
```

### 2. Financeiro Agent
**Responsabilidades:**
- Gestão de billing e pagamentos
- Análise de receitas e despesas
- Previsões financeiras
- Alertas de pagamento
- Relatórios financeiros

**Capacidades:**
- `billing`: Gestão de cobrança
- `payments`: Processamento de pagamentos
- `reports`: Relatórios financeiros
- `forecasting`: Previsões financeiras
- `alerts`: Alertas de pagamento

**Comandos Disponíveis:**
```bash
/analyze_revenue - Análise de receita
/check_payments - Verificar pagamentos pendentes
/generate_financial_report - Gerar relatório financeiro
/forecast_revenue - Prever receita futura
/alert_payment_issues - Alertar problemas de pagamento
```

### 3. Marketing Agent
**Responsabilidades:**
- Gestão de campanhas
- Análise de engajamento
- Gestão de influencers
- Relatórios de marketing
- Otimização de conversão

**Capacidades:**
- `campaigns`: Gestão de campanhas
- `analytics`: Análise de marketing
- `influencers`: Gestão de influencers
- `conversion`: Otimização de conversão
- `content`: Gestão de conteúdo

**Comandos Disponíveis:**
```bash
/analyze_campaigns - Analisar campanhas ativas
/optimize_conversion - Otimizar taxa de conversão
/manage_influencers - Gerenciar influencers
/generate_marketing_report - Gerar relatório de marketing
/plan_content - Planejar conteúdo
```

### 4. Vendas Agent
**Responsabilidades:**
- Gestão de leads e prospects
- Follow-up automático
- Análise de conversão
- Relatórios de vendas
- Qualificação de leads

**Capacidades:**
- `leads`: Gestão de leads
- `prospects`: Qualificação de prospects
- `sales`: Análise de vendas
- `followup`: Follow-up automático
- `conversion`: Análise de conversão

**Comandos Disponíveis:**
```bash
/qualify_leads - Qualificar leads
/followup_prospects - Follow-up de prospects
/analyze_sales - Analisar performance de vendas
/generate_sales_report - Gerar relatório de vendas
/optimize_conversion - Otimizar conversão
```

### 5. Segurança Agent
**Responsabilidades:**
- Monitoramento contínuo
- Detecção de anomalias
- Resposta a incidentes
- Auditoria de segurança
- Prevenção de fraudes

**Capacidades:**
- `monitoring`: Monitoramento contínuo
- `security`: Análise de segurança
- `audit`: Auditoria de segurança
- `incident_response`: Resposta a incidentes
- `fraud_detection`: Detecção de fraudes

**Comandos Disponíveis:**
```bash
/monitor_security - Monitorar segurança
/detect_anomalies - Detectar anomalias
/respond_incident - Responder a incidente
/generate_security_report - Gerar relatório de segurança
/audit_access - Auditoria de acesso
```

### 6. SAC Agent
**Responsabilidades:**
- Atendimento automatizado
- Escalação inteligente
- Base de conhecimento
- Relatórios de atendimento
- Satisfação do cliente

**Capacidades:**
- `support`: Atendimento ao cliente
- `tickets`: Gestão de tickets
- `knowledge`: Base de conhecimento
- `escalation`: Escalação inteligente
- `satisfaction`: Análise de satisfação

**Comandos Disponíveis:**
```bash
/process_tickets - Processar tickets pendentes
/escalate_issues - Escalar problemas críticos
/update_knowledge - Atualizar base de conhecimento
/generate_support_report - Gerar relatório de suporte
/analyze_satisfaction - Analisar satisfação
```

### 7. Auditoria Agent
**Responsabilidades:**
- Logs de conformidade
- Relatórios de auditoria
- Detecção de irregularidades
- Controle de integridade
- Compliance

**Capacidades:**
- `compliance`: Verificação de conformidade
- `audit`: Auditoria de processos
- `reports`: Relatórios de auditoria
- `integrity`: Controle de integridade
- `irregularities`: Detecção de irregularidades

**Comandos Disponíveis:**
```bash
/audit_compliance - Auditoria de conformidade
/detect_irregularities - Detectar irregularidades
/generate_audit_report - Gerar relatório de auditoria
/check_integrity - Verificar integridade
/monitor_compliance - Monitorar conformidade
```

### 8. Documentos Agent
**Responsabilidades:**
- Gestão de documentos
- Controle de versões
- Indexação automática
- Busca inteligente
- Arquivo de documentos

**Capacidades:**
- `documents`: Gestão de documentos
- `versioning`: Controle de versões
- `search`: Busca inteligente
- `indexing`: Indexação automática
- `archiving`: Arquivo de documentos

**Comandos Disponíveis:**
```bash
/organize_documents - Organizar documentos
/update_versions - Atualizar versões
/search_documents - Buscar documentos
/index_content - Indexar conteúdo
/archive_documents - Arquivar documentos
```

### 9. Configurações Agent
**Responsabilidades:**
- Configurações do sistema
- Manutenção automática
- Atualizações de sistema
- Monitoramento de performance
- Backup e recuperação

**Capacidades:**
- `configuration`: Gestão de configurações
- `maintenance`: Manutenção do sistema
- `updates`: Atualizações automáticas
- `performance`: Monitoramento de performance
- `backup`: Backup e recuperação

**Comandos Disponíveis:**
```bash
/update_config - Atualizar configurações
/perform_maintenance - Executar manutenção
/check_performance - Verificar performance
/backup_system - Fazer backup do sistema
/optimize_settings - Otimizar configurações
```

### 10. Assinaturas Agent
**Responsabilidades:**
- Gestão de planos
- Upgrade/downgrade automático
- Cobrança automática
- Gestão de trial periods
- Análise de churn

**Capacidades:**
- `subscriptions`: Gestão de assinaturas
- `billing`: Processamento de cobrança
- `plans`: Gestão de planos
- `churn`: Análise de churn
- `trial`: Gestão de trials

**Comandos Disponíveis:**
```bash
/manage_subscriptions - Gerenciar assinaturas
/process_billing - Processar cobrança
/analyze_churn - Analisar churn
/manage_trials - Gerenciar trials
/optimize_plans - Otimizar planos
```

## 🔄 Comunicação entre Agentes

### Telegram Integration

Todos os agentes se comunicam via Telegram usando:

```typescript
// Exemplo de comunicação entre agentes
const telegramBot = new TelegramBot({
  token: process.env.TELEGRAM_BOT_TOKEN,
  chatId: process.env.TELEGRAM_CHAT_ID
});

// Enviar mensagem para outro agente
await telegramBot.sendMessage({
  to: 'financeiro_agent',
  message: 'Novo lead qualificado: João Silva - Potencial: Alto',
  priority: 'high'
});
```

### Protocolo de Comunicação

1. **Identificação**: Cada agente tem um ID único
2. **Prioridade**: Mensagens com níveis de prioridade
3. **Ack**: Confirmação de recebimento
4. **Response**: Resposta estruturada
5. **Logging**: Log de todas as comunicações

## 📊 Monitoramento dos Agentes

### Métricas por Agente

```json
{
  "agentId": "ceo",
  "status": "active",
  "uptime": "99.9%",
  "lastActivity": "2024-12-19T10:30:00Z",
  "metrics": {
    "decisionsMade": 45,
    "actionsExecuted": 120,
    "successRate": 98.5,
    "responseTime": "2.3s",
    "errorRate": 0.5
  }
}
```

### Health Checks

```bash
# Verificar status de todos os agentes
GET /api/agents/health

# Verificar agente específico
GET /api/agents/{id}/health

# Reiniciar agente
POST /api/agents/{id}/restart
```

## 🚀 Configuração e Deploy

### Variáveis de Ambiente

```env
# Mastra.ai
MASTRA_API_KEY=your-mastra-key
MASTRA_WEBHOOK_URL=https://api.botcriptofy2.com/webhooks/mastra

# Ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen3:0.6b

# Telegram
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_CHAT_ID=your-chat-id

# Redis
REDIS_URL=redis://localhost:6379

# TimescaleDB
TIMESCALEDB_URL=postgresql://user:password@localhost:5432/botcriptofy2
```

### Deploy com Docker

```dockerfile
FROM oven/bun:1.0.0

WORKDIR /app

COPY package.json bun.lockb ./
RUN bun install

COPY . .

EXPOSE 3000

CMD ["bun", "run", "dev"]
```

## 🧪 Testes

### Testes Unitários

```bash
# Testar agente específico
bun test src/agents/ceo/

# Testar todos os agentes
bun test src/agents/

# Testar comunicação
bun test src/communication/
```

### Testes de Integração

```bash
# Testar integração com Telegram
bun test tests/integration/telegram.test.ts

# Testar integração com Ollama
bun test tests/integration/ollama.test.ts

# Testar integração com TimescaleDB
bun test tests/integration/database.test.ts
```

## 📈 Performance

### Benchmarks

- **Response Time**: < 2 segundos
- **Throughput**: 100+ requests/min
- **Memory Usage**: < 256MB por agente
- **CPU Usage**: < 10% por agente
- **Uptime**: 99.9%

### Otimizações

1. **Cache Redis**: Dados frequentemente acessados
2. **Connection Pooling**: Conexões otimizadas
3. **Batch Processing**: Processamento em lote
4. **Async Operations**: Operações assíncronas
5. **Resource Monitoring**: Monitoramento de recursos

---

**Última atualização**: 2024-12-19
**Versão**: 1.0.0
**Responsável**: Agente-CTO