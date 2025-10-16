# 🔍 Protocolo de Auto-Validação e Revisão dos Agentes

## 🎯 Objetivo

Garantir que **TODO agente se questione criticamente** sobre seu trabalho, submeta para **revisão de código** e **validação QA** antes de considerar uma tarefa completa.

---

## 📋 CHECKLIST OBRIGATÓRIO ANTES DE COMPLETAR TAREFA

### ✅ FASE 1: AUTO-QUESTIONAMENTO (3 Perguntas Críticas)

**TODO agente DEVE responder estas 3 perguntas ANTES de marcar tarefa como completa:**

#### ❓ Pergunta #1: Excelência Técnica

**"Este trabalho atende ao MAIS ALTO padrão de qualidade que eu sou capaz de entregar?"**

Checklist:
- [ ] Código limpo, sem mocks/placeholders/TODOs
- [ ] Documentação completa (JSDoc/NatSpec)
- [ ] Testes escritos e passando (coverage ≥80% backend, ≥95% contratos)
- [ ] Performance otimizada
- [ ] Segurança validada (OWASP Top 10)
- [ ] Zero warnings no lint/typecheck
- [ ] Seguiu TODAS as 53 Regras de Ouro

**Se NÃO**: 🚫 Corrija antes de prosseguir

---

#### ❓ Pergunta #2: Conformidade com Protocolo

**"Segui RIGOROSAMENTE todos os protocolos e workflows definidos?"**

Checklist:
- [ ] `/agent-cto-validate` executado e aprovado
- [ ] `/dev-analyze-dependencies` executado (se modificou arquivos)
- [ ] Workflow Mermaid criado (se aplicável)
- [ ] Subtarefas ≤6 definidas
- [ ] Grafo de dependências mapeado
- [ ] Todos arquivos dependentes atualizados
- [ ] Commits convencionais
- [ ] Branch nomeada corretamente (feature/ISSUE-ID)

**Se NÃO**: 🚫 Retorne ao protocolo e recomece

---

#### ❓ Pergunta #3: Impacto e Consequências

**"Considerei TODAS as consequências e impactos desta mudança?"**

Checklist:
- [ ] Impacto em arquivos dependentes avaliado
- [ ] Breaking changes documentados
- [ ] Migração planejada (se necessário)
- [ ] Performance impact avaliado
- [ ] Security impact avaliado
- [ ] User experience considerado
- [ ] Rollback plan definido
- [ ] Documentação atualizada (README, CHANGELOG, etc)

**Se NÃO**: 🚫 Analise impactos antes de continuar

---

### ✅ FASE 2: SUBMISSÃO PARA CODE REVIEW

**OBRIGATÓRIO**: Nenhum código vai para main sem revisão

#### Processo de Submissão

```bash
# 1. Auto-validação completa (Fase 1)
# 2. Executar análise de qualidade
/dev-code-review

# 3. Criar PR seguindo template
# 4. Aguardar aprovação de revisores
```

#### Critérios de Aprovação

**Revisor DEVE verificar**:

**Qualidade (Regras 11-20)**:
- [ ] Código completo (zero mocks/placeholders)
- [ ] Nomenclatura autoexplicativa
- [ ] JSDoc/NatSpec completo
- [ ] TypeScript strict mode
- [ ] Complexidade ciclomática ≤10
- [ ] Princípios SOLID seguidos
- [ ] DRY (código não duplicado)

**Segurança (Crítico)**:
- [ ] Input validation (Zod)
- [ ] Rate limiting implementado
- [ ] Authentication/Authorization corretos
- [ ] OWASP Top 10 verificado
- [ ] Sem secrets hardcoded
- [ ] SQL injection prevenido
- [ ] XSS protection implementada

**Testes (Regras 31-40)**:
- [ ] Testes unitários escritos
- [ ] Testes de integração escritos
- [ ] Coverage ≥80% (backend) / ≥95% (contratos)
- [ ] Cenários positivos, negativos e edge cases
- [ ] Testes passando no CI/CD

**Documentação (Regras 41-52)**:
- [ ] README atualizado (se necessário)
- [ ] CHANGELOG atualizado
- [ ] Diagramas Mermaid atualizados
- [ ] ADR criado (se decisão arquitetural)
- [ ] Deployment info registrado (se contrato)

**Dependências (Regra 53)**:
- [ ] Análise de dependências executada
- [ ] Todos arquivos dependentes atualizados
- [ ] Zero referências quebradas
- [ ] Zero imports quebrados
- [ ] Zero links inválidos

---

### ✅ FASE 3: VALIDAÇÃO QA

**OBRIGATÓRIO**: QA valida funcionalidade e qualidade

#### Processo de QA

```bash
# 1. Code review aprovado
# 2. Deploy em ambiente de staging
# 3. Executar suite de testes QA
/project-health-check
```

#### Checklist QA

**Funcionalidade**:
- [ ] Feature funciona conforme especificado
- [ ] Casos de uso cobertos
- [ ] Edge cases validados
- [ ] Erros tratados corretamente
- [ ] UX/UI aceitável (se frontend)

**Integração**:
- [ ] APIs funcionando
- [ ] Database queries otimizadas
- [ ] Cache funcionando
- [ ] WebSockets estáveis (se aplicável)
- [ ] CCXT integration OK (se trading)

**Performance**:
- [ ] Tempos de resposta aceitáveis
- [ ] Sem memory leaks
- [ ] Queries otimizadas (sem N+1)
- [ ] Gas costs aceitáveis (se contratos)

**Segurança**:
- [ ] Security scan passou
- [ ] Vulnerabilidades corrigidas
- [ ] Secrets management OK
- [ ] Rate limiting funcionando

**Conformidade**:
- [ ] Seguiu padrões do projeto
- [ ] Documentação completa
- [ ] Testes passando
- [ ] CI/CD verde

---

## 🔄 WORKFLOW COMPLETO DE VALIDAÇÃO

```mermaid
graph TD
    A[Tarefa Completa?] --> B[FASE 1: Auto-Questionamento]
    B --> C{3 Perguntas = SIM?}
    C -->|NÃO| D[🚫 Corrija e Retorne]
    C -->|SIM| E[FASE 2: Code Review]
    E --> F[/dev-code-review]
    F --> G{Aprovado por Revisores?}
    G -->|NÃO| H[🚫 Corrija Feedback]
    G -->|SIM| I[FASE 3: QA]
    I --> J[/project-health-check]
    J --> K{QA Aprovado?}
    K -->|NÃO| L[🚫 Corrija Issues]
    K -->|SIM| M[✅ Deploy Autorizado]
    D --> B
    H --> E
    L --> I
```

---

## 🤝 HIERARQUIA DE REVISÃO

### Nível C (Junior Developer, QA Tester, Support Engineer)

**Auto-validação**:
- 3 Perguntas Críticas respondidas

**Revisão Obrigatória**:
- 1 revisor de Nível B ou A
- QA Tester valida funcionalidade

**Aprovação**:
- Mid Developer (Nível B)
- OU Senior Developer (Nível A)

---

### Nível B (Mid Developer, Scrum Master, Product Analyst)

**Auto-validação**:
- 3 Perguntas Críticas respondidas
- Checklist de qualidade completo

**Revisão Obrigatória**:
- 1 revisor de Nível A
- QA Engineer valida integração

**Aprovação**:
- Senior Developer (Nível A)
- OU Tech Lead

---

### Nível A (Senior Developer, Tech Lead, Architect, Engineering Manager)

**Auto-validação**:
- 3 Perguntas Críticas respondidas
- Checklist de qualidade completo
- Impacto arquitetural avaliado

**Revisão Obrigatória**:
- 1 revisor de Nível A (peer review)
- QA Engineer valida
- Security Specialist valida (se crítico)

**Aprovação**:
- Tech Lead
- OU Architect
- OU Engineering Manager

---

### Especialistas (Stack-Specific)

**Auto-validação**:
- 3 Perguntas Críticas respondidas
- Best practices da stack aplicadas
- Performance otimizada

**Revisão Obrigatória**:
- 1 revisor generalista (Nível A)
- 1 specialist da mesma stack (peer review)
- QA Engineer valida

**Aprovação**:
- Specialist peer
- + Tech Lead

---

### Smart Contracts & Código Crítico de Trading

**⚠️ REGRAS ESPECIAIS**:

**Auto-validação**:
- 3 Perguntas Críticas respondidas
- Security checklist completo (OWASP + Blockchain)
- Gas optimization validada

**Revisão Obrigatória**:
- **MÍNIMO 2 revisores** (Nível A)
- Security Specialist valida
- QA Engineer testa em testnet
- External audit (se deploy mainnet)

**Aprovação**:
- 2+ Senior Developers
- + Security Specialist
- + Tech Lead ou Architect
- + Agente-CTO

**Zero Tolerância**:
- Qualquer dúvida de segurança = REJEITAR
- Qualquer teste falhando = REJEITAR
- Qualquer warning = REJEITAR

---

## 📝 TEMPLATE DE SUBMISSÃO PARA REVISÃO

### Para o Agente Desenvolvedor:

```markdown
## 🔍 Auto-Validação Completa

### 3 Perguntas Críticas

#### ❓ #1: Excelência Técnica
- [x] Código limpo, sem mocks/placeholders
- [x] Documentação completa
- [x] Testes passando (coverage: 87%)
- [x] Performance otimizada
- [x] Segurança validada
- [x] Zero warnings

**Resposta**: ✅ SIM - Atende ao mais alto padrão

---

#### ❓ #2: Conformidade com Protocolo
- [x] `/agent-cto-validate` executado
- [x] `/dev-analyze-dependencies` executado
- [x] Workflow Mermaid criado
- [x] Grafo de dependências mapeado
- [x] Commits convencionais

**Resposta**: ✅ SIM - Seguiu todos os protocolos

---

#### ❓ #3: Impacto e Consequências
- [x] Impacto em arquivos dependentes avaliado
- [x] Breaking changes: Nenhum
- [x] Performance impact: Neutro
- [x] Security impact: Positivo (melhoria)
- [x] Documentação atualizada

**Resposta**: ✅ SIM - Todos impactos considerados

---

## 📊 Evidências

**Testes**:
```bash
$ bun test
✓ All tests passed (42/42)
✓ Coverage: 87%
```

**Lint**:
```bash
$ bun run lint
✓ No issues found
```

**TypeCheck**:
```bash
$ bun run typecheck
✓ No type errors
```

**Security**:
```bash
$ bun audit
✓ 0 vulnerabilities
```

---

## 🚀 Pronto para Revisão

- [x] Auto-validação completa
- [x] Todas evidências fornecidas
- [x] PR criado com template completo

**Aguardando aprovação de**:
- [ ] Code Reviewer
- [ ] QA Engineer
- [ ] (Security Specialist se crítico)
```

---

## 🚨 BLOQUEADORES AUTOMÁTICOS

**Code Review é BLOQUEADO automaticamente se**:

1. ❌ 3 Perguntas Críticas não respondidas
2. ❌ Testes falhando
3. ❌ Coverage < 80% (backend) ou < 95% (contratos)
4. ❌ Warnings no lint/typecheck
5. ❌ Vulnerabilidades de segurança
6. ❌ `/dev-analyze-dependencies` não executado
7. ❌ Documentação incompleta
8. ❌ CI/CD falhando

**QA é BLOQUEADO automaticamente se**:

1. ❌ Code review não aprovado
2. ❌ Deploy em staging falhou
3. ❌ Testes de integração falhando
4. ❌ Performance degradada
5. ❌ Security scan falhou

---

## 📈 MÉTRICAS DE QUALIDADE

### Tracking de Revisões

```markdown
## Estatísticas do Agente

**Total PRs**: 15
**Aprovados 1ª Tentativa**: 12 (80%)
**Retrabalho Necessário**: 3 (20%)
**Média de Reviewers**: 2.1
**Tempo Médio de Review**: 2.5 horas

**Principais Feedbacks**:
1. Documentação incompleta (2x)
2. Testes edge cases faltando (1x)

**Plano de Melhoria**:
- [ ] Revisar checklist de documentação antes de submeter
- [ ] Adicionar mais testes de edge cases
```

---

## 🎯 CULTURA DE QUALIDADE

### Princípios

1. **Ownership**: Cada agente é dono da qualidade do seu código
2. **Humildade**: Aceitar feedback é essencial para crescimento
3. **Colaboração**: Revisões são oportunidades de aprendizado
4. **Excelência**: "Bom o suficiente" não é aceitável
5. **Zero Ego**: O código é do time, não do indivíduo

### Code Review NÃO é:

- ❌ Ataque pessoal
- ❌ Imposição de preferências pessoais
- ❌ Burocracia desnecessária

### Code Review É:

- ✅ Garantia de qualidade
- ✅ Compartilhamento de conhecimento
- ✅ Prevenção de bugs
- ✅ Melhoria contínua
- ✅ Proteção da base de código

---

## 🛠️ FERRAMENTAS DE AUTOMAÇÃO

### Scripts Disponíveis

```bash
# Validação completa antes de submeter
./scripts/pre-submit-validation.sh

# Análise de dependências
./scripts/analyze-deps.sh <arquivo>

# Health check
./scripts/health-check.sh
```

### Comandos Slash

```bash
# Validação CTO (antes de iniciar)
/agent-cto-validate

# Análise de dependências
/dev-analyze-dependencies

# Code review profundo
/dev-code-review

# Health check do projeto
/project-health-check
```

### CI/CD Automation

```yaml
# .github/workflows/pr-validation.yml
name: PR Validation

on: [pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v3

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1

      - name: Install deps
        run: bun install

      - name: Lint
        run: bun run lint

      - name: TypeCheck
        run: bun run typecheck

      - name: Tests
        run: bun test

      - name: Coverage
        run: bun run test:coverage

      - name: Security Audit
        run: bun audit

      - name: Block if failed
        if: failure()
        run: |
          echo "❌ PR BLOCKED - Fix issues before review"
          exit 1
```

---

## ✅ APROVAÇÃO FINAL

**Para tarefa ser considerada COMPLETA**:

```
✅ FASE 1: Auto-Questionamento (3 Perguntas = SIM)
✅ FASE 2: Code Review (Aprovado por ≥1 revisor)
✅ FASE 3: QA (Validado por QA Engineer)
✅ CI/CD: Verde
✅ Deploy: Staging funcionando
```

**SOMENTE ENTÃO**: 🎉 Tarefa Completa & Pronta para Deploy

---

**Gerado por**: Agente-CTO
**Data**: 2025-10-12
**Versão**: 1.0.0
**Protocolo**: AGENTS.md v1.1.0

**⚠️ Este protocolo é OBRIGATÓRIO para TODOS os agentes sem exceção**
