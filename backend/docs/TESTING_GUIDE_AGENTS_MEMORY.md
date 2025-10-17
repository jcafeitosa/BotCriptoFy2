# Testing Guide - Agents with Memory & Learning

**Guia prático para testar todas as funcionalidades implementadas**

---

## Pré-requisitos

```bash
# 1. Ollama rodando
ollama serve

# 2. Modelo baixado
ollama pull qwen3:0.6b

# 3. Backend rodando
cd backend
bun run dev

# 4. Banco de dados migrado
# (as migrations devem ter rodado automaticamente)
```

---

## Teste 1: Criar Agente CEO

```bash
curl -X POST http://localhost:3000/agents \
  -H "Content-Type: application/json" \
  -d '{
    "agentType": "ceo",
    "name": "CEO Agent",
    "description": "Chief Executive Officer",
    "title": "CEO",
    "tenantId": "test-tenant-001",
    "config": {
      "model": "qwen3:0.6b",
      "temperature": 0.7,
      "maxTokens": 2000,
      "systemPrompt": "You are the CEO of BotCriptoFy2..."
    }
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "id": "agent-xxx",
    "agentType": "ceo",
    "name": "CEO Agent",
    "title": "CEO",
    "status": "active",
    "isEnabled": true
  }
}
```

**Save**: `CEO_AGENT_ID=agent-xxx`

---

## Teste 2: Criar Agente Financial (CFO)

```bash
curl -X POST http://localhost:3000/agents \
  -H "Content-Type: application/json" \
  -d '{
    "agentType": "financial",
    "name": "CFO Agent",
    "description": "Chief Financial Officer",
    "title": "CFO",
    "tenantId": "test-tenant-001",
    "managerId": "CEO_AGENT_ID_AQUI",
    "config": {
      "model": "qwen3:0.6b",
      "temperature": 0.5,
      "maxTokens": 2000
    }
  }'
```

**Save**: `CFO_AGENT_ID=agent-yyy`

---

## Teste 3: Criar Agente Trading Ops (CTO Trading)

```bash
curl -X POST http://localhost:3000/agents \
  -H "Content-Type: application/json" \
  -d '{
    "agentType": "trading_ops",
    "name": "CTO Trading Agent",
    "description": "Chief Trading Operations Officer",
    "title": "CTO Trading",
    "tenantId": "test-tenant-001",
    "managerId": "CEO_AGENT_ID_AQUI",
    "config": {
      "model": "qwen3:0.6b",
      "temperature": 0.3,
      "maxTokens": 2000
    }
  }'
```

**Save**: `CTO_TRADING_AGENT_ID=agent-zzz`

---

## Teste 4: Listar Todos os Agentes

```bash
curl -X GET "http://localhost:3000/agents?tenantId=test-tenant-001"
```

**Expected**: Lista com 3 agentes (CEO, CFO, CTO Trading)

---

## Teste 5: Executar Tarefa Autônoma (CFO)

```bash
curl -X POST "http://localhost:3000/agents/$CFO_AGENT_ID/autonomous-task?tenantId=test-tenant-001" \
  -H "Content-Type: application/json" \
  -d '{
    "task": "Analyze the financial performance for the last 7 days. Check revenue trends and identify any anomalies. If revenue dropped more than 10%, create an alert. Remember this analysis for future reference."
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "result": "Analysis completed...",
    "toolCalls": [
      {
        "tool": "database_query",
        "result": "..."
      },
      {
        "tool": "memory_storage",
        "result": "Memory stored successfully"
      }
    ],
    "executionTimeMs": 3500
  }
}
```

**Verify**: Agent should have:
1. Queried database
2. Analyzed data
3. Stored learning in memory

---

## Teste 6: Verificar Memória do Agente

```bash
curl -X GET "http://localhost:3000/agents/$CFO_AGENT_ID/memory-stats?tenantId=test-tenant-001"
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "totalMemoryActions": 1,
    "memoriesStored": 1,
    "memoriesRetrieved": 0,
    "lastMemoryAction": "2025-10-17T...",
    "memoryCategories": ["insight"]
  }
}
```

---

## Teste 7: Executar Tarefa que Usa Memória

```bash
curl -X POST "http://localhost:3000/agents/$CFO_AGENT_ID/autonomous-task?tenantId=test-tenant-001" \
  -H "Content-Type: application/json" \
  -d '{
    "task": "Search your memory for past financial analyses. What patterns did you notice before? Use that knowledge to analyze current performance."
  }'
```

**Expected**: Agent should use `memory_retrieval` tool to recall previous analysis

---

## Teste 8: Monitoramento Proativo (CFO)

```bash
curl -X POST "http://localhost:3000/agents/$CFO_AGENT_ID/proactive-monitoring?tenantId=test-tenant-001"
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Proactive monitoring completed"
}
```

**What Happens**:
- Agent analyzes financial metrics
- Searches memory for similar patterns
- Detects anomalies automatically
- Stores important findings
- Reports to CEO if critical

---

## Teste 9: Executar Workflow Financial Monitoring

```bash
curl -X POST "http://localhost:3000/agents/$CFO_AGENT_ID/execute-workflow?tenantId=test-tenant-001" \
  -H "Content-Type: application/json" \
  -d '{
    "workflowType": "financial_monitoring"
  }'
```

**Expected**: 4-step workflow execution:
1. Analyze revenue trends
2. Check payment processing
3. Verify subscription health
4. Generate executive report

**Duration**: ~15-30 seconds

---

## Teste 10: Executar Workflow Trading Ops Monitoring

```bash
curl -X POST "http://localhost:3000/agents/$CTO_TRADING_AGENT_ID/execute-workflow?tenantId=test-tenant-001" \
  -H "Content-Type: application/json" \
  -d '{
    "workflowType": "trading_monitoring"
  }'
```

**Expected**: 4-step workflow:
1. Check exchange connectivity
2. Monitor order execution
3. Assess risks
4. Analyze bot performance

---

## Teste 11: Comunicação Inter-Agente

```bash
# CFO reporta para CEO
curl -X POST "http://localhost:3000/agents/communicate?tenantId=test-tenant-001" \
  -H "Content-Type: application/json" \
  -d '{
    "fromAgentId": "'$CFO_AGENT_ID'",
    "toAgentId": "'$CEO_AGENT_ID'",
    "message": "Financial analysis completed. Revenue increased 15% this week. No anomalies detected.",
    "priority": "normal"
  }'
```

**Expected**: Communication logged and stored

---

## Teste 12: Chat com Agente

```bash
curl -X POST "http://localhost:3000/agents/$CFO_AGENT_ID/send-message?tenantId=test-tenant-001" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What are the key financial metrics I should focus on this week?"
  }'
```

**Expected**: Agent responds with financial guidance

---

## Teste 13: Query com Contexto

```bash
curl -X POST "http://localhost:3000/agents/$CFO_AGENT_ID/query?tenantId=test-tenant-001" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Analyze subscription churn rate",
    "context": {
      "period": "last_30_days",
      "includeComparisons": true
    }
  }'
```

**Expected**: Agent analyzes with provided context

---

## Teste 14: Consolidação de Learning (Weekly)

```bash
curl -X POST "http://localhost:3000/agents/$CFO_AGENT_ID/consolidate-learning?tenantId=test-tenant-001"
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Learning consolidation completed"
}
```

**What Happens**:
- Agent reviews all memories from past week
- Identifies recurring patterns
- Consolidates successful strategies
- Stores high-level insights

---

## Teste 15: Daily Report Workflow (All Agents)

```bash
curl -X POST "http://localhost:3000/agents/daily-report?tenantId=test-tenant-001"
```

**Expected**:
- Each Level C agent generates report
- Reports sent to CEO
- CEO consolidates all reports
- Executive summary created

**Duration**: ~1-2 minutes

---

## Teste 16: Scheduled Monitoring (All Agents)

```bash
curl -X POST "http://localhost:3000/agents/schedule-monitoring?tenantId=test-tenant-001"
```

**Expected**:
- Runs monitoring for all active agents
- Each agent monitors their domain
- Alerts generated if needed

---

## Teste 17: Atribuir Agente a Departamento

```bash
curl -X POST "http://localhost:3000/agents/$CFO_AGENT_ID/assign-department?tenantId=test-tenant-001" \
  -H "Content-Type: application/json" \
  -d '{
    "departmentId": "dept-finance-001",
    "managerId": "'$CEO_AGENT_ID'"
  }'
```

**Expected**: Agent assigned to Finance department

---

## Teste 18: Listar Agentes por Departamento

```bash
curl -X GET "http://localhost:3000/agents/department/dept-finance-001?tenantId=test-tenant-001"
```

**Expected**: Lista com CFO agent

---

## Teste 19: Health Check

```bash
curl -X GET "http://localhost:3000/agents/$CFO_AGENT_ID/health?tenantId=test-tenant-001"
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "lastActivity": "2025-10-17T...",
    "messageCount": 5,
    "errorRate": 0,
    "avgResponseTime": 2.5
  }
}
```

---

## Teste 20: Ollama Status

```bash
curl -X GET "http://localhost:3000/agents/ollama/status"
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "available": true,
    "models": ["qwen3:0.6b", "..."],
    "defaultModel": "qwen3:0.6b",
    "defaultModelExists": true
  }
}
```

---

## Teste 21: Histórico de Chat

```bash
curl -X GET "http://localhost:3000/agents/$CFO_AGENT_ID/history?tenantId=test-tenant-001&limit=10"
```

**Expected**: Lista dos últimos 10 messages

---

## Teste 22: Executar Ação Específica

```bash
curl -X POST "http://localhost:3000/agents/$CFO_AGENT_ID/action?tenantId=test-tenant-001" \
  -H "Content-Type: application/json" \
  -d '{
    "actionType": "analyze_metrics",
    "actionName": "Analyze Revenue Metrics",
    "description": "Analyze revenue for Q4",
    "input": {
      "metricType": "revenue",
      "period": "Q4"
    }
  }'
```

**Expected**: Action executed and logged

---

## Validações Completas

### ✅ Checklist de Validação

Execute todos os 22 testes acima e marque:

- [ ] Teste 1: CEO criado
- [ ] Teste 2: CFO criado
- [ ] Teste 3: CTO Trading criado
- [ ] Teste 4: Lista agentes OK
- [ ] Teste 5: Tarefa autônoma executada
- [ ] Teste 6: Memory stats OK
- [ ] Teste 7: Memory retrieval funcionou
- [ ] Teste 8: Monitoring proativo OK
- [ ] Teste 9: Workflow financial OK
- [ ] Teste 10: Workflow trading OK
- [ ] Teste 11: Comunicação inter-agente OK
- [ ] Teste 12: Chat respondeu
- [ ] Teste 13: Query com contexto OK
- [ ] Teste 14: Learning consolidation OK
- [ ] Teste 15: Daily report OK
- [ ] Teste 16: Scheduled monitoring OK
- [ ] Teste 17: Atribuição a departamento OK
- [ ] Teste 18: Listagem por departamento OK
- [ ] Teste 19: Health check OK
- [ ] Teste 20: Ollama status OK
- [ ] Teste 21: Histórico de chat OK
- [ ] Teste 22: Ação executada OK

---

## Queries de Validação no Banco

```sql
-- 1. Verificar agentes criados
SELECT id, agent_type, name, title, status, is_enabled
FROM agents
WHERE tenant_id = 'test-tenant-001';

-- 2. Verificar ações dos agentes
SELECT agent_id, action_type, action_name, status, created_at
FROM agent_actions
WHERE tenant_id = 'test-tenant-001'
ORDER BY created_at DESC
LIMIT 20;

-- 3. Verificar memórias armazenadas
SELECT agent_id, input->>'category', input->>'importance', input->>'content'
FROM agent_actions
WHERE tenant_id = 'test-tenant-001'
  AND action_type = 'memory_storage'
ORDER BY created_at DESC;

-- 4. Verificar comunicações
SELECT from_agent_id, to_agent_id, message, priority, created_at
FROM agent_communications
WHERE tenant_id = 'test-tenant-001'
ORDER BY created_at DESC;

-- 5. Estatísticas de memória por agente
SELECT
  agent_id,
  COUNT(*) FILTER (WHERE action_type = 'memory_storage') as memories_stored,
  COUNT(*) FILTER (WHERE action_type = 'memory_retrieval') as memories_retrieved
FROM agent_actions
WHERE tenant_id = 'test-tenant-001'
GROUP BY agent_id;

-- 6. Categorias de memória mais usadas
SELECT
  input->>'category' as category,
  COUNT(*) as count
FROM agent_actions
WHERE tenant_id = 'test-tenant-001'
  AND action_type = 'memory_storage'
GROUP BY input->>'category'
ORDER BY count DESC;

-- 7. Importância das memórias
SELECT
  input->>'importance' as importance,
  COUNT(*) as count
FROM agent_actions
WHERE tenant_id = 'test-tenant-001'
  AND action_type = 'memory_storage'
GROUP BY input->>'importance'
ORDER BY count DESC;

-- 8. Agentes mais ativos
SELECT
  agent_id,
  COUNT(*) as total_actions,
  MAX(created_at) as last_activity
FROM agent_actions
WHERE tenant_id = 'test-tenant-001'
GROUP BY agent_id
ORDER BY total_actions DESC;
```

---

## Testes de Performance

### Load Test - Autonomous Tasks

```bash
# Criar 10 tarefas simultâneas
for i in {1..10}; do
  curl -X POST "http://localhost:3000/agents/$CFO_AGENT_ID/autonomous-task?tenantId=test-tenant-001" \
    -H "Content-Type: application/json" \
    -d "{\"task\": \"Analyze metric #$i\"}" &
done
wait
```

### Load Test - Memory Storage

```bash
# Armazenar 50 memórias
for i in {1..50}; do
  curl -X POST "http://localhost:3000/agents/$CFO_AGENT_ID/autonomous-task?tenantId=test-tenant-001" \
    -H "Content-Type: application/json" \
    -d "{\"task\": \"Remember: Test memory #$i - Revenue increased\"}" &

  if [ $((i % 10)) -eq 0 ]; then
    wait  # Wait every 10 requests
  fi
done
```

---

## Troubleshooting

### Problema: Ollama não responde
```bash
# Verificar se está rodando
ps aux | grep ollama

# Reiniciar
ollama serve
```

### Problema: Erro de tipo TypeScript
```bash
# Limpar e rebuildar
rm -rf node_modules
bun install
```

### Problema: Agent não executa tools
```bash
# Verificar logs
tail -f logs/app.log | grep "Agent executing"

# Verificar Ollama
curl http://localhost:11434/api/generate -d '{
  "model": "qwen3:0.6b",
  "prompt": "Test"
}'
```

### Problema: Memória não salva
```bash
# Verificar tabela
psql -d beecripto -c "SELECT COUNT(*) FROM agent_actions WHERE action_type='memory_storage';"

# Verificar logs
tail -f logs/app.log | grep "memory_storage"
```

---

## Scripts de Teste Automatizado

### test-all-agents.sh
```bash
#!/bin/bash
set -e

BASE_URL="http://localhost:3000"
TENANT_ID="test-tenant-001"

echo "🧪 Testing Agents with Memory & Learning"
echo "========================================"

# 1. Create CEO
echo "1. Creating CEO Agent..."
CEO_RESPONSE=$(curl -s -X POST $BASE_URL/agents \
  -H "Content-Type: application/json" \
  -d '{
    "agentType": "ceo",
    "name": "Test CEO",
    "tenantId": "'$TENANT_ID'",
    "config": {"model": "qwen3:0.6b"}
  }')
CEO_ID=$(echo $CEO_RESPONSE | jq -r '.data.id')
echo "✅ CEO created: $CEO_ID"

# 2. Create CFO
echo "2. Creating CFO Agent..."
CFO_RESPONSE=$(curl -s -X POST $BASE_URL/agents \
  -H "Content-Type: application/json" \
  -d '{
    "agentType": "financial",
    "name": "Test CFO",
    "tenantId": "'$TENANT_ID'",
    "managerId": "'$CEO_ID'",
    "config": {"model": "qwen3:0.6b"}
  }')
CFO_ID=$(echo $CFO_RESPONSE | jq -r '.data.id')
echo "✅ CFO created: $CFO_ID"

# 3. Execute autonomous task
echo "3. Executing autonomous task..."
curl -s -X POST "$BASE_URL/agents/$CFO_ID/autonomous-task?tenantId=$TENANT_ID" \
  -H "Content-Type: application/json" \
  -d '{"task": "Analyze revenue and remember findings"}' | jq '.'
echo "✅ Task executed"

# 4. Check memory stats
echo "4. Checking memory stats..."
curl -s -X GET "$BASE_URL/agents/$CFO_ID/memory-stats?tenantId=$TENANT_ID" | jq '.'
echo "✅ Memory stats retrieved"

# 5. Execute workflow
echo "5. Executing financial workflow..."
curl -s -X POST "$BASE_URL/agents/$CFO_ID/execute-workflow?tenantId=$TENANT_ID" \
  -H "Content-Type: application/json" \
  -d '{"workflowType": "financial_monitoring"}' | jq '.'
echo "✅ Workflow executed"

echo ""
echo "🎉 All tests completed successfully!"
echo "CEO_ID=$CEO_ID"
echo "CFO_ID=$CFO_ID"
```

---

## Conclusão

Com este guia, você pode:
1. ✅ Criar agentes de todos os tipos
2. ✅ Executar tarefas autônomas
3. ✅ Testar memória e aprendizado
4. ✅ Executar workflows completos
5. ✅ Validar comunicação inter-agente
6. ✅ Verificar consolidação de learning
7. ✅ Testar performance
8. ✅ Troubleshoot problemas

**Status**: Pronto para produção! 🚀
