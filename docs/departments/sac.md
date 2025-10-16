# Módulo de SAC (Suporte ao Cliente) - BotCriptoFy2

## 🎧 Visão Geral

O Módulo de SAC é responsável por todo o suporte ao cliente, incluindo gestão de tickets, atendimento automatizado, base de conhecimento, escalação inteligente e análise de satisfação.

## 🏗️ Arquitetura do Módulo

### Componentes Principais
- **Ticket Management**: Gestão de tickets e chamados
- **Automated Support**: Atendimento automatizado
- **Knowledge Base**: Base de conhecimento
- **Escalation Management**: Gestão de escalação
- **Satisfaction Analysis**: Análise de satisfação

### Integração com Better-Auth
- **Multi-tenancy**: Suporte a diferentes tipos de usuários
- **User Management**: Gestão de usuários e permissões
- **Ticket Attribution**: Atribuição de tickets a usuários
- **Support Tracking**: Rastreamento de suporte

## 📊 Estrutura de Dados

### Tabelas do Banco de Dados

#### 1. support_tickets
```sql
CREATE TABLE support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number VARCHAR(20) UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  subject VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(50) NOT NULL, -- technical, billing, account, feature, bug
  priority VARCHAR(20) NOT NULL, -- low, medium, high, urgent
  status VARCHAR(20) NOT NULL, -- open, in_progress, pending, resolved, closed
  assigned_to UUID REFERENCES users(id),
  tags TEXT[],
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP
);
```

#### 2. support_messages
```sql
CREATE TABLE support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id),
  user_id UUID NOT NULL REFERENCES users(id),
  message_type VARCHAR(20) NOT NULL, -- user, agent, system, automated
  content TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,
  attachments JSONB,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 3. support_knowledge_base
```sql
CREATE TABLE support_knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(50) NOT NULL,
  tags TEXT[],
  is_published BOOLEAN DEFAULT false,
  view_count INTEGER DEFAULT 0,
  helpful_count INTEGER DEFAULT 0,
  not_helpful_count INTEGER DEFAULT 0,
  created_by UUID NOT NULL REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 4. support_satisfaction
```sql
CREATE TABLE support_satisfaction (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id),
  user_id UUID NOT NULL REFERENCES users(id),
  rating INTEGER NOT NULL, -- 1-5
  feedback TEXT,
  categories JSONB, -- response_time, resolution, communication, etc.
  is_anonymous BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 5. support_escalations
```sql
CREATE TABLE support_escalations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id),
  from_user_id UUID NOT NULL REFERENCES users(id),
  to_user_id UUID NOT NULL REFERENCES users(id),
  reason TEXT NOT NULL,
  status VARCHAR(20) NOT NULL, -- pending, accepted, rejected
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP
);
```

#### 6. support_automation_rules
```sql
CREATE TABLE support_automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  conditions JSONB NOT NULL,
  actions JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## 🎯 Funcionalidades do Módulo

### 1. Gestão de Tickets

#### Criação de Tickets
- **Formulário de Suporte**: Formulário para criação de tickets
- **Categorização Automática**: Categorização automática por IA
- **Priorização Automática**: Priorização baseada em conteúdo
- **Atribuição Automática**: Atribuição automática a agentes

#### Gestão de Status
- **Aberto**: Ticket recém-criado
- **Em Progresso**: Ticket sendo atendido
- **Pendente**: Aguardando resposta do usuário
- **Resolvido**: Ticket resolvido
- **Fechado**: Ticket fechado

#### Categorização
- **Técnico**: Problemas técnicos
- **Billing**: Problemas de cobrança
- **Conta**: Problemas de conta
- **Funcionalidade**: Solicitações de funcionalidades
- **Bug**: Reportes de bugs

### 2. Atendimento Automatizado

#### Chatbot Inteligente
- **Respostas Automáticas**: Respostas baseadas em IA
- **Base de Conhecimento**: Integração com base de conhecimento
- **Escalação Inteligente**: Escalação quando necessário
- **Aprendizado Contínuo**: Melhoria contínua das respostas

#### Sequências Automáticas
- **Boas-vindas**: Sequência de boas-vindas
- **Follow-up**: Follow-up automático
- **Lembretes**: Lembretes de tickets pendentes
- **Encerramento**: Encerramento automático

#### Respostas Padrão
- **Templates**: Templates de respostas
- **Variáveis**: Variáveis personalizáveis
- **Multilíngue**: Suporte a múltiplos idiomas
- **Contexto**: Respostas baseadas em contexto

### 3. Base de Conhecimento

#### Artigos de Ajuda
- **Criação**: Criação de artigos
- **Edição**: Edição colaborativa
- **Versionamento**: Controle de versões
- **Publicação**: Publicação controlada

#### Categorização
- **Categorias**: Organização por categorias
- **Tags**: Sistema de tags
- **Busca**: Busca inteligente
- **Filtros**: Filtros avançados

#### Feedback
- **Avaliação**: Sistema de avaliação
- **Comentários**: Comentários de usuários
- **Sugestões**: Sugestões de melhoria
- **Estatísticas**: Estatísticas de uso

### 4. Escalação Inteligente

#### Regras de Escalação
- **Tempo**: Escalação por tempo
- **Prioridade**: Escalação por prioridade
- **Categoria**: Escalação por categoria
- **Complexidade**: Escalação por complexidade

#### Gestão de Escalação
- **Atribuição**: Atribuição automática
- **Notificações**: Notificações de escalação
- **Acompanhamento**: Acompanhamento de escalações
- **Resolução**: Resolução de escalações

#### Hierarquia de Suporte
- **Nível 1**: Suporte básico
- **Nível 2**: Suporte intermediário
- **Nível 3**: Suporte avançado
- **Especialistas**: Especialistas por área

### 5. Análise de Satisfação

#### Pesquisas de Satisfação
- **NPS**: Net Promoter Score
- **CSAT**: Customer Satisfaction Score
- **CES**: Customer Effort Score
- **Pesquisas Customizadas**: Pesquisas personalizadas

#### Métricas de Qualidade
- **Tempo de Resposta**: Tempo médio de resposta
- **Tempo de Resolução**: Tempo médio de resolução
- **Taxa de Resolução**: Taxa de resolução
- **Taxa de Reabertura**: Taxa de reabertura

#### Relatórios de Satisfação
- **Relatórios por Período**: Relatórios temporais
- **Relatórios por Agente**: Relatórios individuais
- **Relatórios por Categoria**: Relatórios por categoria
- **Relatórios de Tendências**: Relatórios de tendências

## 🔧 APIs do Módulo

### 1. Tickets APIs

#### GET /api/sac/tickets
Listar tickets

```typescript
interface TicketResponse {
  id: string;
  ticketNumber: string;
  userId: string;
  tenantId: string;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  assignedTo?: string;
  tags: string[];
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}
```

#### POST /api/sac/tickets
Criar novo ticket

```typescript
interface CreateTicketRequest {
  subject: string;
  description: string;
  category: string;
  priority?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

interface CreateTicketResponse {
  id: string;
  ticketNumber: string;
  status: string;
  message: string;
}
```

#### PUT /api/sac/tickets/{id}
Atualizar ticket

```typescript
interface UpdateTicketRequest {
  subject?: string;
  description?: string;
  category?: string;
  priority?: string;
  status?: string;
  assignedTo?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

interface UpdateTicketResponse {
  id: string;
  status: string;
  message: string;
}
```

#### DELETE /api/sac/tickets/{id}
Fechar ticket

```typescript
interface CloseTicketResponse {
  id: string;
  status: string;
  message: string;
}
```

### 2. Messages APIs

#### GET /api/sac/tickets/{id}/messages
Listar mensagens do ticket

```typescript
interface MessageResponse {
  id: string;
  ticketId: string;
  userId: string;
  messageType: string;
  content: string;
  isInternal: boolean;
  attachments?: Record<string, any>;
  metadata?: Record<string, any>;
  createdAt: string;
}
```

#### POST /api/sac/tickets/{id}/messages
Enviar mensagem

```typescript
interface SendMessageRequest {
  content: string;
  messageType: string;
  isInternal?: boolean;
  attachments?: Record<string, any>;
  metadata?: Record<string, any>;
}

interface SendMessageResponse {
  id: string;
  status: string;
  message: string;
}
```

### 3. Knowledge Base APIs

#### GET /api/sac/knowledge-base
Listar artigos da base de conhecimento

```typescript
interface KnowledgeBaseResponse {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  isPublished: boolean;
  viewCount: number;
  helpfulCount: number;
  notHelpfulCount: number;
  createdBy: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}
```

#### POST /api/sac/knowledge-base
Criar artigo

```typescript
interface CreateArticleRequest {
  title: string;
  content: string;
  category: string;
  tags?: string[];
  isPublished?: boolean;
}

interface CreateArticleResponse {
  id: string;
  status: string;
  message: string;
}
```

#### PUT /api/sac/knowledge-base/{id}
Atualizar artigo

```typescript
interface UpdateArticleRequest {
  title?: string;
  content?: string;
  category?: string;
  tags?: string[];
  isPublished?: boolean;
}

interface UpdateArticleResponse {
  id: string;
  status: string;
  message: string;
}
```

#### POST /api/sac/knowledge-base/{id}/feedback
Avaliar artigo

```typescript
interface ArticleFeedbackRequest {
  helpful: boolean;
  comment?: string;
}

interface ArticleFeedbackResponse {
  id: string;
  status: string;
  message: string;
}
```

### 4. Satisfaction APIs

#### GET /api/sac/satisfaction
Listar avaliações de satisfação

```typescript
interface SatisfactionResponse {
  id: string;
  ticketId: string;
  userId: string;
  rating: number;
  feedback?: string;
  categories?: Record<string, any>;
  isAnonymous: boolean;
  createdAt: string;
}
```

#### POST /api/sac/satisfaction
Avaliar atendimento

```typescript
interface RateSatisfactionRequest {
  ticketId: string;
  rating: number;
  feedback?: string;
  categories?: Record<string, any>;
  isAnonymous?: boolean;
}

interface RateSatisfactionResponse {
  id: string;
  status: string;
  message: string;
}
```

### 5. Escalations APIs

#### GET /api/sac/escalations
Listar escalações

```typescript
interface EscalationResponse {
  id: string;
  ticketId: string;
  fromUserId: string;
  toUserId: string;
  reason: string;
  status: string;
  notes?: string;
  createdAt: string;
  resolvedAt?: string;
}
```

#### POST /api/sac/escalations
Criar escalação

```typescript
interface CreateEscalationRequest {
  ticketId: string;
  toUserId: string;
  reason: string;
  notes?: string;
}

interface CreateEscalationResponse {
  id: string;
  status: string;
  message: string;
}
```

#### PUT /api/sac/escalations/{id}
Atualizar escalação

```typescript
interface UpdateEscalationRequest {
  status?: string;
  notes?: string;
}

interface UpdateEscalationResponse {
  id: string;
  status: string;
  message: string;
}
```

### 6. Automation APIs

#### GET /api/sac/automation-rules
Listar regras de automação

```typescript
interface AutomationRuleResponse {
  id: string;
  name: string;
  description?: string;
  conditions: Record<string, any>;
  actions: Record<string, any>;
  isActive: boolean;
  priority: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
```

#### POST /api/sac/automation-rules
Criar regra de automação

```typescript
interface CreateAutomationRuleRequest {
  name: string;
  description?: string;
  conditions: Record<string, any>;
  actions: Record<string, any>;
  priority?: number;
}

interface CreateAutomationRuleResponse {
  id: string;
  status: string;
  message: string;
}
```

#### PUT /api/sac/automation-rules/{id}
Atualizar regra de automação

```typescript
interface UpdateAutomationRuleRequest {
  name?: string;
  description?: string;
  conditions?: Record<string, any>;
  actions?: Record<string, any>;
  isActive?: boolean;
  priority?: number;
}

interface UpdateAutomationRuleResponse {
  id: string;
  status: string;
  message: string;
}
```

## 🤖 Agente de SAC

### Capacidades

#### support
- Atendimento ao cliente
- Resolução de problemas
- Gestão de tickets
- Comunicação com usuários

#### tickets
- Gestão de tickets
- Categorização automática
- Priorização automática
- Atribuição automática

#### knowledge
- Base de conhecimento
- Criação de artigos
- Busca inteligente
- Feedback de usuários

#### escalation
- Escalação inteligente
- Gestão de hierarquia
- Notificações de escalação
- Resolução de escalações

#### satisfaction
- Análise de satisfação
- Pesquisas de qualidade
- Relatórios de satisfação
- Melhoria contínua

### Comandos

```bash
/process_tickets - Processar tickets pendentes
/escalate_issues - Escalar problemas críticos
/update_knowledge - Atualizar base de conhecimento
/generate_support_report - Gerar relatório de suporte
/analyze_satisfaction - Analisar satisfação
/optimize_automation - Otimizar automação
/update_templates - Atualizar templates
/analyze_performance - Analisar performance
/generate_insights - Gerar insights
/update_escalation - Atualizar escalação
```

## 📊 Dashboard de SAC

### Métricas Principais
- **Tickets Abertos**: Número de tickets abertos
- **Tempo Médio de Resposta**: Tempo médio de resposta
- **Tempo Médio de Resolução**: Tempo médio de resolução
- **Taxa de Resolução**: Taxa de resolução
- **Satisfação do Cliente**: NPS/CSAT

### Gráficos
- **Tickets por Categoria**: Gráfico de pizza
- **Tickets por Período**: Gráfico de linha
- **Performance por Agente**: Gráfico de barras
- **Satisfação por Período**: Gráfico de linha

### Alertas
- **Tickets Urgentes**: Alertas de tickets urgentes
- **Tickets Atrasados**: Alertas de tickets atrasados
- **Baixa Satisfação**: Alertas de baixa satisfação
- **Escalações Pendentes**: Alertas de escalações

## 🔄 Fluxo de Trabalho

### 1. Criação de Ticket
```
Usuário → Formulário → Validação → Categorização → Atribuição → Notificação
```

### 2. Atendimento de Ticket
```
Ticket → Agente → Análise → Resposta → Resolução → Fechamento
```

### 3. Escalação de Ticket
```
Ticket → Análise → Escalação → Notificação → Atribuição → Resolução
```

### 4. Avaliação de Satisfação
```
Ticket Fechado → Pesquisa → Avaliação → Análise → Melhoria
```

## 🧪 Testes

### Testes Unitários
```bash
# Testes de tickets
bun test src/admin/departments/sac/tickets/

# Testes de mensagens
bun test src/admin/departments/sac/messages/

# Testes de base de conhecimento
bun test src/admin/departments/sac/knowledge/
```

### Testes de Integração
```bash
# Testes de integração com Better-Auth
bun test tests/integration/sac-auth.test.ts

# Testes de integração com Telegram
bun test tests/integration/sac-telegram.test.ts
```

## 🚀 Deploy

### Variáveis de Ambiente
```env
# SAC
SAC_TICKET_CACHE_TTL=1800
SAC_MESSAGE_CACHE_TTL=900
SAC_KNOWLEDGE_CACHE_TTL=3600
SAC_SATISFACTION_CACHE_TTL=7200
```

### Docker
```dockerfile
# Adicionar ao Dockerfile existente
COPY src/admin/departments/sac/ ./src/admin/departments/sac/
RUN bun install
```

## 📈 Monitoramento

### Métricas de Performance
- **Response Time**: < 200ms para APIs
- **Throughput**: 400+ requests/min
- **Error Rate**: < 0.1%
- **Uptime**: 99.9%

### Alertas
- **Tickets Urgentes**: > 5 tickets urgentes
- **Tickets Atrasados**: > 10 tickets atrasados
- **Baixa Satisfação**: < 3.0 NPS
- **Alta Taxa de Escalação**: > 20%

---

**Última atualização**: 2024-12-19
**Versão**: 1.0.0
**Responsável**: Agente-CTO