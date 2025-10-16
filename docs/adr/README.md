# Architecture Decision Records (ADR)

**Protocolo**: Agente-CTO v2.0
**Projeto**: BotCriptoFy2
**Última Atualização**: 2025-10-15

---

## 📋 O que são ADRs?

ADRs (Architecture Decision Records) documentam **decisões técnicas importantes** tomadas durante o desenvolvimento do projeto, incluindo:

- **Contexto**: Por que precisávamos decidir?
- **Opções**: Quais alternativas consideramos?
- **Decisão**: O que escolhemos e por quê?
- **Consequências**: Impactos positivos, negativos e riscos

---

## 🎯 Objetivo

Manter **rastro auditável** de todas as decisões arquiteturais para:

1. **Onboarding**: Novos devs entendem "por que" decisões foram tomadas
2. **Auditoria**: Compliance e revisões técnicas
3. **Evolução**: Reavaliar decisões conforme projeto cresce
4. **Debate**: Evitar discussões circulares ("já decidimos isso")

---

## 📚 ADRs Aprovados

### FASE 0 - Infraestrutura e Fundação

| # | Título | Status | Data | Decisores |
|---|--------|--------|------|-----------|
| [001](./001-drizzle-orm-choice.md) | Escolha do Drizzle ORM | ✅ Aprovado | 2025-10-15 | Agente-CTO, CEO |
| [002](./002-modular-architecture.md) | Arquitetura Modular (src/modules) | ✅ Aprovado | 2025-10-15 | Agente-CTO, Agente-Dev |
| [003](./003-better-auth-choice.md) | Escolha do Better-Auth | ✅ Aprovado | 2025-10-15 | Agente-CTO, CEO |
| [004](./004-timescaledb-hypertables.md) | TimescaleDB Hypertables | ✅ Aprovado | 2025-10-15 | Agente-CTO, CEO |

### FASE 1 - Sistemas Transversais (Futuro)

| # | Título | Status | Data | Decisores |
|---|--------|--------|------|-----------|
| 005 | Sistema de Cache (Redis Cluster vs Single) | ⏳ Pendente | - | - |
| 006 | Rate Limiting Strategy | ⏳ Pendente | - | - |
| 007 | Monitoramento (Prometheus vs DataDog) | ⏳ Pendente | - | - |

### FASE 8 - Trading (Futuro)

| # | Título | Status | Data | Decisores |
|---|--------|--------|------|-----------|
| 020 | Exchanges Integration (CCXT vs Custom) | ⏳ Pendente | - | - |
| 021 | Bot Execution Engine | ⏳ Pendente | - | - |
| 022 | Python AI Server (FastAPI vs Bun) | ⏳ Pendente | - | - |

---

## 📖 Template para Novos ADRs

Ao criar um novo ADR, siga o template:

```markdown
# ADR XXX: Título da Decisão

**Data**: YYYY-MM-DD
**Status**: ✅ Aprovado / ⏳ Proposto / ❌ Rejeitado / 🔄 Superseded
**Decisores**: Nome1, Nome2
**Contexto Técnico**: FASE X - Área

---

## Contexto

[Descreva o problema ou situação que requer decisão]

---

## Opções Consideradas

### Opção 1: Nome
**Prós**:
- Item 1
- Item 2

**Contras**:
- Item 1
- Item 2

[Repita para cada opção]

---

## Decisão

[Qual opção foi escolhida e por quê]

---

## Consequências

### Positivas ✅
- Item 1
- Item 2

### Negativas ⚠️
- Item 1
- Item 2

### Riscos Mitigados 🛡️
- **Risco**: Descrição
  - **Mitigação**: Como resolver

---

## Referências

- [Link 1]
- [Link 2]

---

## Revisões

| Data | Revisor | Decisão | Comentários |
|------|---------|---------|-------------|
| YYYY-MM-DD | Nome | ✅/❌ | Texto |

---

**Próxima Revisão**: YYYY-MM-DD
**Status Final**: Status
```

---

## 🔄 Processo de Criação de ADR

### 1. **Propor ADR**
- Identificar decisão técnica importante
- Criar arquivo `XXX-nome-da-decisao.md`
- Preencher template completo
- Commit em branch `adr/XXX-nome`

### 2. **Revisão**
- Mínimo 2 revisores (Agente-CTO obrigatório)
- Discussão no PR
- Ajustes conforme feedback

### 3. **Aprovação**
- Status muda para ✅ Aprovado
- Merge para main
- Comunicar decisão ao time

### 4. **Implementação**
- Implementar conforme decisão
- Atualizar ADR com learnings

### 5. **Revisão Periódica**
- Revisitar ADRs a cada 3-6 meses
- Avaliar se decisão ainda faz sentido
- Supersede se necessário

---

## 🏷️ Status Possíveis

| Status | Significado | Ação |
|--------|-------------|------|
| ⏳ **Proposto** | Em discussão | Aguardando aprovação |
| ✅ **Aprovado** | Decisão final | Implementar |
| ❌ **Rejeitado** | Não aprovado | Arquivar |
| 🔄 **Superseded** | Substituído | Ver ADR mais recente |
| 🚫 **Deprecated** | Obsoleto | Não usar mais |

---

## 📊 Estatísticas

| Métrica | Valor |
|---------|-------|
| Total de ADRs | 4 |
| ADRs Aprovados | 4 (100%) |
| ADRs Implementados | 2 (50%) |
| ADRs Pendentes | 0 (0%) |
| Última Revisão | 2025-10-15 |

---

## 🔗 Links Relacionados

- [Protocolo Agente-CTO v2.0](../.cursor/rules/active-rules.md)
- [Workflow FASE 0](../workflows/FASE-0-WORKFLOW.md)
- [Arquitetura Geral](../architecture/README.md)

---

## 📝 Notas

### Quando Criar um ADR?

✅ **CRIAR ADR**:
- Escolha de framework/biblioteca principal
- Decisões de arquitetura (modular vs monolítico)
- Escolha de banco de dados
- Estratégias de autenticação
- Padrões de deployment
- Breaking changes arquiteturais

❌ **NÃO CRIAR ADR**:
- Naming conventions
- Code style choices
- Pequenos refactorings
- Bug fixes
- Features isoladas

---

**Responsável**: Agente-CTO
**Manutenção**: Agente-Dev
**Aprovação Final**: CEO Julio Cezar
