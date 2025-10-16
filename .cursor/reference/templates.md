# Templates - Modelos Prontos para Uso

## Visão Geral

Templates padronizados para garantir consistência em toda a documentação do projeto.

---

## 1. Template de Pull Request

### Arquivo: `.github/PULL_REQUEST_TEMPLATE.md`

```markdown
# Pull Request

## 📋 Descrição

[Descrição clara e concisa das mudanças implementadas]

## 🎯 Tipo de Mudança

- [ ] 🐛 **Bug fix** (mudança que corrige um issue)
- [ ] ✨ **Feature** (mudança que adiciona funcionalidade)
- [ ] 💥 **Breaking change** (correção ou feature que quebra compatibilidade)
- [ ] 📝 **Documentação** (mudanças apenas em documentação)
- [ ] ♻️ **Refatoração** (mudança que não corrige bug nem adiciona feature)
- [ ] ⚡ **Performance** (mudança que melhora performance)
- [ ] 🔒 **Security** (mudança relacionada a segurança)
- [ ] 🧪 **Testes** (adição ou correção de testes)

## 🔗 Issue Relacionada

Closes #[número]
Fixes #[número]
Related to #[número]

## 📝 Mudanças Implementadas

### Backend
- Mudança 1
- Mudança 2

### Frontend
- Mudança 1
- Mudança 2

### Database
- Migration 1
- Migration 2

## ✅ Checklist de Desenvolvimento (70 Regras de Ouro)

### 📚 Aprendizado (Regras 56-60)
- [ ] Estudei documentações oficiais das tecnologias
- [ ] Usei versões mais recentes (latest stable)
- [ ] Usei recursos e APIs modernos
- [ ] Configurei lint corretamente (0 errors)
- [ ] Validei build antes de começar

### 💻 Código (Regras 11-20)
- [ ] Código 100% completo (sem mocks/placeholders)
- [ ] CRUDs completos (C, R, U, D) com error handling
- [ ] Código é idempotente e seguro
- [ ] Dependências atualizadas (latest stable)
- [ ] Lint, formatter e type check configurados
- [ ] Nomes autoexplicativos (sem abreviações)
- [ ] JSDoc em todas as funções públicas
- [ ] Sem lógica mágica (tudo explícito)
- [ ] Validação Zod implementada
- [ ] Testes unitários e de integração

### 🧪 Testes (Regras 31-40, 66-67)
- [ ] Testes 100% passando (sem exceções)
- [ ] Coverage >= 80%
- [ ] Testes unitários completos
- [ ] Testes de integração
- [ ] Testes E2E (se aplicável)
- [ ] Cenários positivos testados
- [ ] Cenários negativos testados
- [ ] Edge cases testados
- [ ] Testes de regressão

### ⚡ Qualidade (Regras 61-62)
- [ ] Lint passou (0 errors, 0 warnings)
- [ ] Type check passou (0 errors)
- [ ] Build passou (0 errors)
- [ ] Nenhum warning no console
- [ ] Sem erros de runtime

### 🧹 Código Limpo (Regras 63-65, 68)
- [ ] Sem mocks ou placeholders
- [ ] Sem TODO, FIXME, HACK, XXX
- [ ] Sem workarounds ou gambiarras
- [ ] Sem console.log, console.error, debugger
- [ ] Sem código comentado
- [ ] Sem números mágicos (constantes nomeadas)
- [ ] Sem tipo "any" (TypeScript)
- [ ] Sem imports não utilizados

### 📚 Documentação (Regras 44-48, 70)
- [ ] README atualizado
- [ ] JSDoc completo
- [ ] Diagramas Mermaid criados/atualizados
- [ ] ADR criado para decisões técnicas
- [ ] CHANGELOG atualizado
- [ ] API documentada (OpenAPI/Swagger)
- [ ] Runbook criado (se aplicável)

### 🔒 Segurança
- [ ] `npm audit` - 0 vulnerabilidades críticas/altas
- [ ] Nenhum secret exposto (TruffleHog)
- [ ] Validação de todos os inputs (Zod)
- [ ] Sanitização de outputs
- [ ] Auth/authz implementada
- [ ] HTTPS obrigatório
- [ ] Headers de segurança configurados

### 📈 Performance
- [ ] Build compila sem erros
- [ ] Sem vazamentos de memória
- [ ] Performance adequada (p95 < target)
- [ ] Bundle size aceitável
- [ ] Lazy loading implementado (onde aplicável)

### 🔄 Processo (Regras 21-30, 51)
- [ ] Code review aprovado (mínimo 1 revisor)
- [ ] QA aprovou
- [ ] Security aprovou (se aplicável)
- [ ] CI/CD passou completamente
- [ ] Branch segue padrão (feature/issue-ID)
- [ ] PR tem descrição clara

## 📸 Screenshots/Vídeos

[Adicionar capturas de tela ou vídeos demonstrando a funcionalidade]

### Antes
[Screenshot do estado anterior]

### Depois
[Screenshot do estado atual]

## 🧪 Como Testar

### Setup
```bash
npm install
npm run dev
```

### Steps
1. Passo 1
2. Passo 2
3. Verificar resultado esperado

## 📊 Métricas

| Métrica | Antes | Depois | Delta |
|---------|-------|--------|-------|
| Coverage | XX% | XX% | +X% |
| Bundle size | XXkB | XXkB | -X% |
| Performance (p95) | XXms | XXms | -X% |

## 🔗 Documentação

- [Arquitetura](docs/architecture/...)
- [Workflow](docs/workflows/...)
- [ADR](docs/adr/...)
- [API Docs](docs/api/...)
- [Runbook](docs/runbooks/...)

## 📝 Notas para Revisores

[Informações adicionais que podem ajudar na revisão]

### Decisões Técnicas
- Decisão 1: [justificativa]
- Decisão 2: [justificativa]

### Áreas de Atenção
- Área 1: [o que revisar cuidadosamente]
- Área 2: [possíveis edge cases]

## 🚀 Deployment Notes

- [ ] Requer migration de banco
- [ ] Requer variável de ambiente nova
- [ ] Requer atualização de dependência
- [ ] Requer restart de serviços

### Variáveis de Ambiente Novas
```env
NEW_VAR=value
```

### Migrations
```bash
npm run migrate
```

## ✅ Definition of Done

### Validação Automática
```bash
./scripts/validate-dod.sh
```

Resultado esperado:
```
✅ DEFINITION OF DONE: COMPLETO
✅ Código PRONTO para produção
```

## 👥 Aprovações

- [ ] Code Review: @reviewer1 @reviewer2
- [ ] QA: @qa-team
- [ ] Security: @security-team (se aplicável)
- [ ] CTO: @cto-team

---

## 🔖 Metadados

**Criado por**: [nome do agente/dev]
**Data**: [data]
**Estimativa**: [X story points]
**Tempo real**: [X horas]
**Sprint**: [número]

---

**⚠️ Lembrete**: Este PR só pode ser merged se TODOS os itens da checklist estiverem marcados.
```

---

## 2. Template de Issue

### Arquivo: `.github/ISSUE_TEMPLATE/bug_report.md`

```markdown
---
name: Bug Report
about: Reportar um bug
title: '[BUG] '
labels: bug
assignees: ''
---

# 🐛 Bug Report

## Descrição
[Descrição clara e concisa do bug]

## Comportamento Esperado
[O que deveria acontecer]

## Comportamento Atual
[O que está acontecendo]

## Steps to Reproduce
1. Ir para '...'
2. Clicar em '...'
3. Preencher '...'
4. Ver erro

## Stacktrace/Logs
```
[Colar stacktrace ou logs de erro]
```

## Ambiente
- **OS**: [macOS / Windows / Linux]
- **Browser**: [Chrome 120, Firefox 121]
- **Versão da App**: [v1.2.3]
- **Node**: [v20.x]

## Screenshots
[Adicionar capturas de tela]

## Informações Adicionais
[Qualquer contexto adicional]

## Reprodução Local
- [ ] Consegui reproduzir localmente
- [ ] Bug é consistente
- [ ] Encontrei a causa provável

## Prioridade Sugerida
- [ ] 🔴 Crítico (produção quebrada)
- [ ] 🟡 Alto (feature principal afetada)
- [ ] 🟢 Médio (feature secundária)
- [ ] ⚪ Baixo (cosmético)
```

### Arquivo: `.github/ISSUE_TEMPLATE/feature_request.md`

```markdown
---
name: Feature Request
about: Sugerir nova funcionalidade
title: '[FEATURE] '
labels: enhancement
assignees: ''
---

# ✨ Feature Request

## Problema/Necessidade
[Qual problema esta feature resolve?]

## Solução Proposta
[Descrição da feature desejada]

## Alternativas Consideradas
[Outras soluções que você considerou]

## User Story
**Como** [tipo de usuário]
**Quero** [objetivo]
**Para** [benefício]

## Critérios de Aceite
- [ ] Critério 1
- [ ] Critério 2
- [ ] Critério 3

## Mockups/Wireframes
[Adicionar imagens se houver]

## Impacto Esperado
- **Usuários afetados**: [quantidade/porcentagem]
- **Valor de negócio**: [alto/médio/baixo]
- **Urgência**: [alta/média/baixa]

## Informações Técnicas
- **Complexidade estimada**: [baixa/média/alta]
- **Dependências**: [listar]
- **Breaking changes**: [sim/não]
```

---

## 3. Template de ADR

### Arquivo: `docs/adr/TEMPLATE.md`

```markdown
# ADR [número]: [Título Curto]

## Status
[Proposto | Aceito | Deprecated | Substituído por ADR-XXX]

## Data
[YYYY-MM-DD]

## Contexto
[Descrever o contexto e o problema que levou a esta decisão]

### Problema
[Qual problema técnico ou de negócio estamos resolvendo?]

### Restrições
- Restrição 1
- Restrição 2

## Decisão
[Descrever a decisão tomada]

Decidimos [escolha] porque [razão principal].

### Tecnologias/Padrões Escolhidos
- Tecnologia A: [versão] - [justificativa]
- Padrão B: [justificativa]

## Consequências

### Positivas ✅
- Benefício 1
- Benefício 2
- Benefício 3

### Negativas ⚠️
- Trade-off 1
- Trade-off 2

### Riscos 🔴
- Risco 1: [mitigação]
- Risco 2: [mitigação]

## Alternativas Consideradas

### Alternativa 1: [Nome]
**Prós:**
- Pro 1
- Pro 2

**Contras:**
- Contra 1
- Contra 2

**Por que rejeitamos:**
[Razão]

### Alternativa 2: [Nome]
**Prós:**
- Pro 1

**Contras:**
- Contra 1

**Por que rejeitamos:**
[Razão]

## Implementação

### Passos
1. Passo 1
2. Passo 2

### Impacto
- Arquivos afetados: [listar]
- Breaking changes: [sim/não - detalhar]
- Migration necessária: [sim/não - detalhar]

## Validação

### Critérios de Sucesso
- [ ] Métrica 1 melhorou
- [ ] Sem regressão de performance
- [ ] Testes passaram

### Monitoramento
- Métrica A: [como monitorar]
- Métrica B: [como monitorar]

## Referências

### Documentação Oficial
- [Tecnologia A]: [URL]
- [Padrão B]: [URL]

### Artigos/Posts
- [Título]: [URL]

### Issues/PRs Relacionados
- #123: [título]
- #456: [título]

## Revisões

| Data | Autor | Mudança |
|------|-------|---------|
| YYYY-MM-DD | Nome | Criação inicial |

---

**Autor**: [nome]
**Revisores**: [nomes]
**Aprovado por**: Agente-CTO
```

---

## 4. Template de Runbook

### Arquivo: `docs/runbooks/TEMPLATE.md`

```markdown
# Runbook: [Nome do Sistema/Feature]

## Visão Geral
[Descrição do que este runbook cobre]

## Responsáveis
- **Primary**: [nome/time]
- **Secondary**: [nome/time]
- **Escalation**: [nome/time]

---

## Arquitetura Rápida

```mermaid
[Diagrama simplificado do sistema]
```

---

## Operações Comuns

### Iniciar Serviço
```bash
npm run start
```

**Resultado esperado:**
```
Server running on port 3000
```

### Parar Serviço
```bash
npm run stop
```

### Restart
```bash
npm run restart
```

### Health Check
```bash
curl http://localhost:3000/health
```

**Resposta esperada:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "uptime": 12345
}
```

---

## Troubleshooting

### Problema 1: [Sintoma]

**Sintoma:**
[Descrição do que o usuário vê]

**Diagnóstico:**
1. Verificar logs: `tail -f logs/app.log`
2. Verificar status: `systemctl status app`
3. Verificar conexões: `netstat -an | grep 3000`

**Causa Provável:**
[Descrição da causa]

**Solução:**
```bash
# Comandos para resolver
```

**Prevenção:**
[Como evitar no futuro]

### Problema 2: [Sintoma]

[Repetir estrutura acima]

---

## Alertas e Monitoramento

### Alert 1: High Error Rate

**Condição:**
```
error_rate > 5% for 5 minutes
```

**Severidade:** 🔴 Critical

**Ação:**
1. Verificar logs de erro
2. Identificar padrão de erro
3. Executar rollback se necessário
4. Notificar time

**Escalation:**
- 5 min: Time de plantão
- 15 min: Tech Lead
- 30 min: CTO

### Alert 2: High Latency

**Condição:**
```
p95_latency > 2s for 10 minutes
```

**Severidade:** 🟡 High

**Ação:**
1. Verificar uso de CPU/RAM
2. Verificar queries lentas
3. Verificar cache hit rate
4. Escalar recursos se necessário

---

## Manutenção

### Backup
```bash
# Diário (automático às 3AM)
npm run backup

# Manual
npm run backup:manual
```

**Verificar backup:**
```bash
npm run backup:verify
```

### Restore
```bash
npm run restore -- --date=YYYY-MM-DD
```

### Atualização de Dependências
```bash
# 1. Verificar outdated
npm outdated

# 2. Atualizar (em staging primeiro)
npm update

# 3. Testar
npm test

# 4. Deploy
```

### Limpeza de Logs
```bash
# Logs com mais de 30 dias
find logs/ -name "*.log" -mtime +30 -delete
```

---

## Rollback

### Rollback de Deploy
```bash
# Via Git
git revert HEAD
git push

# Via Vercel
vercel rollback [deployment-url]
```

### Rollback de Migration
```bash
npx prisma migrate rollback
```

---

## Contatos

### Time
- **Dev Lead**: [nome] - [email] - [telefone]
- **DevOps**: [nome] - [email]
- **CTO**: [nome] - [email]

### External
- **Stripe Support**: support@stripe.com
- **Vercel Support**: support@vercel.com

---

## Logs e Dashboards

### Logs
- **App Logs**: `/var/log/app/app.log`
- **Error Logs**: `/var/log/app/error.log`
- **Access Logs**: `/var/log/nginx/access.log`

### Dashboards
- **Grafana**: https://grafana.company.com
- **Sentry**: https://sentry.io/company
- **Datadog**: https://app.datadoghq.com

---

## Comandos Úteis

```bash
# Ver logs em tempo real
tail -f logs/app.log

# Buscar erro específico
grep "ERROR" logs/app.log

# Ver últimos 100 erros
grep "ERROR" logs/app.log | tail -100

# Reiniciar com logs
npm run start 2>&1 | tee logs/startup.log

# Verificar porta em uso
lsof -i :3000

# Matar processo
pkill -f "node"
```

---

**Última atualização**: [data]
**Versão**: [X.Y.Z]
**Mantido por**: [time]
```

---

## 5. Template de Post-Mortem

### Arquivo: `docs/post-mortems/TEMPLATE.md`

```markdown
# Post-Mortem: [Título do Incidente]

## Informações do Incidente

| Campo | Valor |
|-------|-------|
| **Data** | [YYYY-MM-DD] |
| **Duração** | [X horas] |
| **Severidade** | 🔴 Critical / 🟡 High / 🟢 Medium |
| **Impacto** | [descrição] |
| **Usuários Afetados** | [quantidade] |
| **Downtime** | [X minutos] |
| **Receita Perdida** | [R$ X] |

## Timeline do Incidente

| Horário | Evento |
|---------|--------|
| HH:MM | Incidente detectado (alerta disparado) |
| HH:MM | Time notificado |
| HH:MM | Investigação iniciada |
| HH:MM | Causa raiz identificada |
| HH:MM | Fix implementado |
| HH:MM | Deploy da correção |
| HH:MM | Validação completa |
| HH:MM | Incidente resolvido |

## Descrição do Incidente

### O que Aconteceu
[Descrição clara do que ocorreu]

### Impacto no Usuário
[Como os usuários foram afetados]

### Sistemas Afetados
- Sistema A: [impacto]
- Sistema B: [impacto]

## Root Cause Analysis (RCA)

### Técnica dos 5 Whys

1. **Por que o incidente ocorreu?**
   [Resposta]

2. **Por que [resposta anterior]?**
   [Resposta]

3. **Por que [resposta anterior]?**
   [Resposta]

4. **Por que [resposta anterior]?**
   [Resposta]

5. **Por que [resposta anterior]?**
   [Resposta - CAUSA RAIZ]

### ✅ Causa Raiz Identificada

[Descrição da causa raiz]

### Diagrama Fishbone

```mermaid
[Diagrama de causa e efeito]
```

## O Que Funcionou Bem ✅

1. [Coisa que funcionou]
2. [Processo que ajudou]
3. [Ferramenta útil]

## O Que Não Funcionou ⚠️

1. [Problema identificado]
2. [Processo falho]
3. [Gap de ferramenta]

## Action Items

| # | Ação | Responsável | Prazo | Status |
|---|------|-------------|-------|--------|
| 1 | [Ação preventiva] | [nome] | [data] | [ ] |
| 2 | [Melhoria de processo] | [nome] | [data] | [ ] |
| 3 | [Implementação de ferramenta] | [nome] | [data] | [ ] |

## Lições Aprendidas

### Para o Time
1. [Lição 1]
2. [Lição 2]

### Para a Organização
1. [Lição 1]
2. [Lição 2]

## Métricas

### MTTR (Mean Time To Recovery)
**Tempo desde detecção até resolução:** [X horas]

### MTTD (Mean Time To Detect)
**Tempo desde início até detecção:** [X minutos]

### MTTI (Mean Time To Investigate)
**Tempo de investigação:** [X horas]

### MTTF (Mean Time To Fix)
**Tempo de implementação da correção:** [X horas]

## Prevenção Futura

### Curto Prazo (1-2 semanas)
- [ ] Ação 1
- [ ] Ação 2

### Médio Prazo (1-2 meses)
- [ ] Ação 1
- [ ] Ação 2

### Longo Prazo (3-6 meses)
- [ ] Ação 1
- [ ] Ação 2

---

**Facilitador**: [nome]
**Participantes**: [nomes]
**Data do Post-Mortem**: [data]
**Aprovado por**: Agente-CTO
```

---

## 6. Template de Test Plan

### Arquivo: `docs/testing/test-plan-TEMPLATE.md`

```markdown
# Test Plan: [Feature/Module Name]

## Informações Gerais

| Campo | Valor |
|-------|-------|
| **Feature** | [nome] |
| **Versão** | [X.Y.Z] |
| **QA Lead** | [nome] |
| **Data Início** | [YYYY-MM-DD] |
| **Data Fim** | [YYYY-MM-DD] |
| **Status** | [Planejado / Em Andamento / Completo] |

## Objetivos do Teste

1. [Objetivo 1]
2. [Objetivo 2]
3. [Objetivo 3]

## Escopo

### In Scope
- [ ] Funcionalidade A
- [ ] Funcionalidade B
- [ ] Integração com C

### Out of Scope
- Performance testing (será feito separadamente)
- Usability testing (será feito separadamente)

## Estratégia de Teste

### Tipos de Teste

| Tipo | Cobertura | Ferramentas | Responsável |
|------|-----------|-------------|-------------|
| Unitário | 80%+ | Vitest | Devs |
| Integração | Features críticas | Vitest | Devs + QA |
| E2E | Happy paths | Playwright | QA |
| Regressão | Funcionalidades existentes | Playwright | QA |
| Performance | Endpoints críticos | k6 | DevOps |
| Security | OWASP Top 10 | ZAP | Security |

## Test Cases

### TC-001: [Nome do Caso de Teste]

**Prioridade:** 🔴 Critical / 🟡 High / 🟢 Medium / ⚪ Low

**Pré-condições:**
- Condição 1
- Condição 2

**Steps:**
1. Passo 1
2. Passo 2
3. Passo 3

**Dados de Teste:**
```json
{
  "input": "test data"
}
```

**Resultado Esperado:**
[Descrição do resultado esperado]

**Resultado Atual:**
[Preencher após execução]

**Status:** [ ] Pass / [ ] Fail / [ ] Blocked / [ ] Skip

---

### TC-002: [Nome do Caso de Teste]

[Repetir estrutura acima]

## Cenários de Teste

### Cenários Positivos (Happy Path)
- [ ] Usuário completa fluxo com sucesso
- [ ] Dados válidos são aceitos
- [ ] Resultado correto é retornado

### Cenários Negativos
- [ ] Dados inválidos são rejeitados
- [ ] Erro apropriado é retornado
- [ ] Sistema não quebra

### Edge Cases
- [ ] Valores extremos (min/max)
- [ ] Valores vazios
- [ ] Caracteres especiais
- [ ] Múltiplas requisições simultâneas

## Dados de Teste

### Test Users
| Username | Password | Role | Notes |
|----------|----------|------|-------|
| test@admin.com | Test123! | admin | Full permissions |
| test@user.com | Test123! | user | Regular user |

### Test Data
```json
{
  "validUser": {
    "name": "Test User",
    "email": "test@example.com"
  },
  "invalidUser": {
    "name": "",
    "email": "invalid-email"
  }
}
```

## Ambiente de Teste

### URLs
- **Local**: http://localhost:3000
- **Staging**: https://staging.app.com
- **Production**: https://app.com

### Credenciais
[Stored in password manager]

## Critérios de Aceite

### Para Aprovar
- [ ] 100% dos testes críticos passaram
- [ ] 95%+ dos testes high passaram
- [ ] Coverage >= 80%
- [ ] 0 bugs críticos encontrados
- [ ] Performance dentro do SLA

### Para Rejeitar
- Qualquer teste crítico falhando
- Coverage < 80%
- Bugs críticos não resolvidos

## Riscos e Dependências

### Riscos
- Risco 1: [mitigação]
- Risco 2: [mitigação]

### Dependências
- [ ] Feature X deve estar completa
- [ ] Ambiente Y deve estar disponível

## Relatório de Execução

### Resumo
- **Total Test Cases**: [X]
- **Passed**: [X]
- **Failed**: [X]
- **Blocked**: [X]
- **Coverage**: [X%]

### Bugs Encontrados

| ID | Severidade | Descrição | Status |
|----|-----------|-----------|--------|
| BUG-001 | 🔴 Critical | [descrição] | [Open/Fixed] |
| BUG-002 | 🟡 High | [descrição] | [Open/Fixed] |

### Métricas

| Métrica | Target | Atual | Status |
|---------|--------|-------|--------|
| Coverage | >= 80% | 87% | ✅ |
| Pass Rate | 100% | 98% | ⚠️ |
| Performance | < 2s | 1.5s | ✅ |

## Aprovação

- [ ] QA Lead aprovado
- [ ] Todos os testes críticos passaram
- [ ] Bugs críticos resolvidos
- [ ] Documentação atualizada

**Aprovado por**: [nome]
**Data**: [data]
```

---

## 7. Template de Security Audit

### Arquivo: `docs/security/audit-TEMPLATE.md`

```markdown
# Security Audit Report

## Informações Gerais

| Campo | Valor |
|-------|-------|
| **Projeto** | [nome] |
| **Versão** | [X.Y.Z] |
| **Auditor** | Agente-Security |
| **Data** | [YYYY-MM-DD] |
| **Tipo** | Internal / External / Pentest |
| **Scope** | [descrição] |

## Executive Summary

### Resumo
[Resumo executivo da auditoria em 2-3 parágrafos]

### Risk Level
**Overall: 🟢 LOW / 🟡 MEDIUM / 🔴 HIGH / ⚫ CRITICAL**

### Vulnerabilidades Encontradas

| Severidade | Quantidade |
|-----------|-----------|
| 🔴 Critical | 0 |
| 🟡 High | 0 |
| 🟠 Medium | 2 |
| 🟢 Low | 5 |
| **TOTAL** | **7** |

## Metodologia

### Frameworks Utilizados
- [ ] OWASP Top 10 (2024)
- [ ] STRIDE Threat Modeling
- [ ] CWE Top 25
- [ ] NIST Cybersecurity Framework

### Ferramentas

| Categoria | Ferramenta | Versão |
|-----------|------------|--------|
| SAST | Semgrep | X.Y.Z |
| DAST | OWASP ZAP | X.Y.Z |
| Dependency | Snyk | X.Y.Z |
| Secrets | TruffleHog | X.Y.Z |
| Container | Trivy | X.Y.Z |

## Vulnerabilidades Encontradas

### VULN-001: [Título]

**Severidade:** 🔴 Critical

**CVSS Score:** 9.1 (Critical)

**Descrição:**
[Descrição detalhada da vulnerabilidade]

**Impacto:**
[Qual o impacto se explorada]

**Exploitability:**
- [ ] Easy
- [x] Medium
- [ ] Hard

**Affected Components:**
- Component A
- Component B

**Proof of Concept:**
```bash
# Como reproduzir
curl -X POST https://api.com/endpoint \
  -d '{"payload": "malicious"}'
```

**Remediation:**
[Como corrigir]

**Priority:** P0 (fix within 24h)

**Status:** [ ] Open / [ ] In Progress / [ ] Fixed / [ ] Accepted

---

## OWASP Top 10 Assessment

### A01:2021 - Broken Access Control
**Status:** ✅ Protected
- [ ] IDOR tested
- [ ] Vertical privilege escalation tested
- [ ] Horizontal privilege escalation tested

**Findings:** None

### A02:2021 - Cryptographic Failures
**Status:** ✅ Secure
- [x] HTTPS enforced
- [x] Passwords hashed (bcrypt, 12 rounds)
- [x] Sensitive data encrypted at rest

**Findings:** None

### A03:2021 - Injection
**Status:** ✅ Protected
- [x] SQL injection tested (using Prisma ORM)
- [x] XSS tested (CSP headers + sanitization)
- [x] Command injection tested

**Findings:** None

[Continuar para todos os 10...]

## STRIDE Analysis

### Spoofing
- [ ] Authentication tested
- [ ] Session management tested

**Vulnerabilities:** [listar ou "None"]

### Tampering
- [ ] Input validation tested
- [ ] Data integrity tested

**Vulnerabilities:** [listar ou "None"]

[Continuar para todos...]

## Recommendations

### Immediate (P0)
1. [Ação 1]
2. [Ação 2]

### Short-term (P1)
1. [Ação 1]
2. [Ação 2]

### Long-term (P2)
1. [Ação 1]
2. [Ação 2]

## Compliance Status

- [ ] LGPD Compliant
- [ ] GDPR Compliant
- [ ] PCI-DSS Compliant (if applicable)
- [ ] SOC 2 Ready

## Conclusion

[Conclusão geral do audit]

### Approved for Production?
- [ ] ✅ Yes (0 critical/high vulnerabilities)
- [ ] ⚠️ Yes with conditions
- [ ] ❌ No (block deployment)

**Approved by**: [nome]
**Date**: [data]
```

---

**Versão**: 1.0
**Data**: Outubro 2025
**Autor**: Agente-CTO
**Uso**: Copiar e adaptar para cada situação

