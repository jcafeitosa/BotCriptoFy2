# Cursor Agent - Sistema Completo de Desenvolvimento

## Visão Geral

O **Cursor Agent** é um sistema completo de desenvolvimento baseado no **Claude Sonnet 4.5** que opera como desenvolvedor par (pair programming), integrado ao ambiente de desenvolvimento Cursor. Agora com **Protocolo Agente-CTO v2.0** e **Sistema de Qualidade Integrado**.

### Características Principais

- **Context Window**: 1 milhão de tokens (renovável automaticamente)
- **Persistência**: Mantém TODO items, progresso e contexto entre renovações
- **Capacidade**: Tarefas complexas com 200+ chamadas de ferramentas
- **Operação**: Modo sandbox com permissões granulares
- **Multi-agente**: Pode atuar como múltiplos especialistas simultaneamente
- **Protocolo CTO**: Sistema completo de qualidade e governança
- **Workflows Integrados**: Processos automatizados de desenvolvimento

---

## 🎯 Sistema de Qualidade Integrado

### **Protocolo Agente-CTO v2.0**
- [Regras Ativas](./rules/active-rules.md) - Regras ativas do sistema
- [Agente-CTO v2.0](./rules/agente-cto-v2.mdc) - Protocolo principal de governança
- [Análise de Gaps](./ANALISE-GAPS-E-INTEGRACAO.md) - Análise completa de gaps e integração
- [Sistema de Qualidade](./QUALITY-SYSTEM-OVERVIEW.md) - Visão geral do sistema de qualidade

### **Workflows Obrigatórios**
- [Workflow Integrado](./workflows/integrated-workflow.md) - Workflow principal integrado
- [Análise de Tarefas](./workflows/task-analysis-protocol.md) - Protocolo de análise obrigatória
- [Quebra de Tarefas](./workflows/task-breakdown-protocol.md) - Protocolo de quebra em sub-tarefas
- [Resolução de Problemas](./workflows/problem-solving-protocol.md) - Protocolo de investigação obrigatória
- [Visualização Mermaid](./workflows/mermaid-visualization-protocol.md) - Protocolo de diagramas dinâmicos

### **Sistemas de Qualidade**
- [Gates Obrigatórios](./workflows/mandatory-gates.md) - Sistema de validação em fases
- [Revisão de Código](./workflows/code-review-protocol.md) - Protocolo estruturado de revisão
- [QA Detalhado](./workflows/qa-protocol.md) - Protocolo completo de qualidade
- [Reflexão Crítica](./workflows/self-reflection.md) - Sistema de reflexão obrigatória

### **Integração e Monitoramento**
- [Integração Automatizada](./workflows/automated-integration.md) - Sistema de integração automática
- [Métricas e Monitoramento](./workflows/metrics-monitoring.md) - Sistema de métricas em tempo real
- [Testes de Workflow](./workflows/workflow-testing.md) - Sistema de testes automatizados

---

## 📚 Guias por Categoria

1. [Busca e Análise de Código](./guides/01-busca-analise.md)
2. [Manipulação de Arquivos](./guides/02-manipulacao-arquivos.md)
3. [Execução de Comandos](./guides/03-execucao-comandos.md)
4. [Gerenciamento de Tarefas](./guides/04-gerenciamento-tarefas.md)
5. [Integração com UI Libraries](./guides/05-integracao-ui.md)
6. [Qualidade e Testes](./guides/06-qualidade-testes.md)

### 📋 Referências

- [Base de Conhecimento](./reference/base-conhecimento.md)
- [Templates](./reference/templates.md)

---

## Quick Start

### 1. Explorar Codebase Desconhecida

```typescript
// O agente usa codebase_search para busca semântica
Query: "Como funciona a autenticação de usuários?"
Target: [] // busca em todo o projeto
```

### 2. Criar um Plano de Trabalho

```typescript
// O agente cria um plano estruturado com TODOs
create_plan({
  name: "Implementar módulo de autenticação",
  overview: "Sistema completo de auth com JWT",
  todos: [
    { id: "1", content: "Criar schema de usuário", status: "pending" },
    { id: "2", content: "Implementar endpoints", status: "pending" }
  ]
})
```

### 3. Implementar com Qualidade

```typescript
// O agente:
// 1. Lê arquivos relevantes em paralelo
// 2. Implementa código completo (sem placeholders)
// 3. Adiciona testes (80%+ coverage)
// 4. Valida com linter
// 5. Documenta decisões técnicas
```

---

## Principais Ferramentas

### Busca de Código

| Ferramenta | Uso | Quando Usar |
|------------|-----|-------------|
| `codebase_search` | Busca semântica | Explorar funcionalidades, entender fluxos |
| `grep` | Busca exata (regex) | Encontrar símbolos específicos, refatorações |
| `glob_file_search` | Busca por padrão | Encontrar arquivos por nome/extensão |

### Manipulação de Arquivos

| Ferramenta | Uso | Quando Usar |
|------------|-----|-------------|
| `read_file` | Ler conteúdo | Analisar código, imagens |
| `write` | Criar/sobrescrever | Novos arquivos, reescritas completas |
| `search_replace` | Substituir strings | Edições precisas, refatorações |
| `delete_file` | Remover arquivo | Limpeza, remoção de temporários |

### Gerenciamento

| Ferramenta | Uso | Quando Usar |
|------------|-----|-------------|
| `todo_write` | Gerenciar tarefas | Projetos complexos (3+ etapas) |
| `create_plan` | Criar planos | Planejamento antes da execução |
| `update_memory` | Memória persistente | Salvar contexto entre sessões |

---

## 🚀 Sistema de Qualidade Integrado

Este agente está configurado para operar seguindo o **Protocolo Agente-CTO v2.0** com **55 Regras de Ouro** e **Sistema de Qualidade Integrado**, garantindo:

### ✅ **FASE 1: Análise e Planejamento Obrigatório**

- [ ] **Análise de Tarefa** - Protocolo obrigatório de análise
- [ ] **Quebra em Sub-tarefas** - Mínimo 5 sub-tarefas com TODOs
- [ ] **Investigaçao de Problemas** - Documentação oficial + GitHub + Internet
- [ ] **5+ Perguntas Críticas** - Análise crítica obrigatória
- [ ] **Validação de Conhecimento** - Conhecimento validado antes de prosseguir
- [ ] **Mermaids Dinâmicos** - Diagramas atualizados durante desenvolvimento

### ✅ **FASE 2: Desenvolvimento com Qualidade**

- [ ] **Código Completo** - Zero mocks, placeholders ou código incompleto
- [ ] **CRUDs Completos** - Create, Read, Update, Delete com tratamento de erros
- [ ] **Validação de Schema** - Zod ou similar obrigatório
- [ ] **Testes Obrigatórios** - Unitários e integração (80%+ coverage)
- [ ] **Documentação Inline** - JSDoc ou equivalente

### ✅ **FASE 3: Validação e Entrega**

- [ ] **Gates Obrigatórios** - 5 fases de validação bloqueantes
- [ ] **Revisão Estruturada** - Protocolo de revisão obrigatório
- [ ] **QA Detalhado** - Testes funcionais, performance, segurança
- [ ] **Reflexão Crítica** - 3 momentos de reflexão obrigatória
- [ ] **Integração Automatizada** - Workflow automatizado completo

---

## Modos de Operação

### Modo Exploração
Ideal para entender codebases novas ou complexas.

```bash
1. codebase_search (busca ampla)
2. Refinar busca por diretório
3. Ler arquivos relevantes em paralelo
4. Documentar arquitetura descoberta
```

### Modo Desenvolvimento
Para implementação de features e correções.

```bash
1. create_plan (planejar)
2. todo_write (gerenciar tarefas)
3. Implementar (com testes)
4. read_lints (validar qualidade)
5. Documentar (ADR + Mermaid)
```

### Modo Refatoração
Para melhorias e otimizações.

```bash
1. grep (encontrar todas as ocorrências)
2. search_replace (replace_all: true)
3. Testes de regressão
4. Validar integridade
```

---

## Limitações e Boas Práticas

### ⚠️ Sandbox Padrão

Por padrão, o agente opera em sandbox seguro:

**Permitido:**
- Leitura/escrita de arquivos no workspace
- Comandos git readonly (status, log)
- Builds locais

**Requer Permissões:**
- `network`: Instalação de pacotes, APIs
- `git_write`: Commits, checkout, modificações
- `all`: Desabilita sandbox (usar com cautela)

### 💡 Dicas de Performance

1. **Paralelizar**: Execute tool calls independentes simultaneamente
2. **Buscar Primeiro**: Use `codebase_search` antes de ler arquivos
3. **Ler em Lote**: Leia múltiplos arquivos de uma vez
4. **Contexto Mínimo**: Para arquivos grandes, use offset + limit

### 🚫 Evite

- Mocks ou placeholders no código
- TODOs para operações simples
- Commits sem code review
- Código sem testes
- Documentação desatualizada

---

## 🎯 Próximos Passos

### **Para Desenvolvedores**
1. Leia o [Protocolo Agente-CTO v2.0](./rules/agente-cto-v2.mdc) para entender as regras
2. Explore os [Workflows Obrigatórios](./workflows/) para processos automatizados
3. Consulte os [Guias por Categoria](./guides/) para detalhes de ferramentas
4. Pratique com exemplos reais seguindo o [Workflow Integrado](./workflows/integrated-workflow.md)

### **Para Gestores**
1. Revise o [Sistema de Qualidade](./QUALITY-SYSTEM-OVERVIEW.md) para entender métricas
2. Consulte [Métricas e Monitoramento](./workflows/metrics-monitoring.md) para acompanhamento
3. Verifique [Análise de Gaps](./ANALISE-GAPS-E-INTEGRACAO.md) para conformidade

---

## 🆘 Suporte e Troubleshooting

Para dúvidas ou problemas:
1. Consulte o [Sistema de Qualidade](./QUALITY-SYSTEM-OVERVIEW.md)
2. Revise os [Protocolos Obrigatórios](./workflows/) para processos
3. Verifique as [Regras Ativas](./rules/active-rules.md) para conformidade
4. Execute [Testes de Workflow](./workflows/workflow-testing.md) para validação

---

## 📊 Status do Sistema

**✅ Sistema Completo e Operacional**
- **Protocolo Agente-CTO v2.0**: Ativo
- **55 Regras de Ouro**: Implementadas
- **Sistema de Qualidade**: Integrado
- **Workflows Automatizados**: Funcionais
- **Métricas em Tempo Real**: Ativas

**Última atualização**: Dezembro 2024  
**Versão do Agente**: Claude Sonnet 4.5  
**Protocolo**: Agente-CTO v2.0  
**Sistema de Qualidade**: Integrado v1.0

