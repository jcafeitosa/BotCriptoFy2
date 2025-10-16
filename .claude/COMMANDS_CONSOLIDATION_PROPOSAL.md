# 📋 Proposta de Consolidação de Comandos Slash

## 🎯 Objetivo

Reduzir de **35 comandos** para **12-15 comandos essenciais**, consolidando funcionalidades sobrepostas e simplificando o uso.

---

## 📊 ANÁLISE ATUAL (35 Comandos)

### Comandos Existentes

1. agent-cto-validate
2. analyze
3. backtest-run
4. brainstorm
5. build
6. business-panel
7. cleanup
8. design
9. dev-analyze-dependencies
10. dev-code-review
11. document
12. estimate
13. exchange-test
14. explain
15. git
16. help
17. implement
18. improve
19. index
20. load
21. project-health-check
22. project-init
23. reflect
24. research
25. review-pr
26. save
27. select-tool
28. spawn
29. spec-panel
30. strategy-validate
31. task
32. test
33. troubleshoot
34. workflow
35. README (arquivo, não comando)

---

## 🔍 CATEGORIZAÇÃO E ANÁLISE

### Categoria 1: Core/Obrigatórios (MANTER - 5 comandos)

**Essenciais para governança e qualidade**:

| Comando | Uso | Frequência | Ação |
|---------|-----|------------|------|
| `/cto-validate` | Validação completa antes de dev | Alta | ✅ MANTER (renomear) |
| `/deps` | Análise de dependências (Regra 53) | Alta | ✅ MANTER (renomear) |
| `/review` | Code review profundo | Alta | ✅ MANTER (renomear) |
| `/health` | Health check do projeto | Média | ✅ MANTER (renomear) |
| `/help` | Lista comandos disponíveis | Alta | ✅ MANTER |

**Novos nomes sugeridos**: Mais curtos e memoráveis

---

### Categoria 2: Desenvolvimento (CONSOLIDAR - 8 → 3 comandos)

**Comandos sobrepostos**:

| Comando Atual | Função | Consolidar em |
|---------------|--------|---------------|
| brainstorm | Ideação e planejamento | `/plan` |
| design | Design de sistema | `/plan` |
| workflow | Criar workflows | `/plan` |
| spec-panel | Review de specs | `/plan` |
| implement | Implementar código | `/dev` |
| improve | Melhorar código | `/dev` |
| cleanup | Limpar código | `/dev` |
| build | Build projeto | `/dev` |

**Resultado**: 3 comandos

- `/plan` - Planejamento, design, workflows
- `/dev` - Desenvolvimento, implementação, melhorias
- `/fix` - Troubleshooting, correções

---

### Categoria 3: Testing & QA (CONSOLIDAR - 3 → 1 comando)

| Comando Atual | Função | Consolidar em |
|---------------|--------|---------------|
| test | Executar testes | `/test` |
| backtest-run | Backtesting trading | `/test --backtest` |
| strategy-validate | Validar estratégia | `/test --strategy` |

**Resultado**: 1 comando com flags

- `/test [--backtest] [--strategy] [--coverage]`

---

### Categoria 4: Documentação (CONSOLIDAR - 3 → 1 comando)

| Comando Atual | Função | Consolidar em |
|---------------|--------|---------------|
| document | Gerar documentação | `/docs` |
| index | Indexar projeto | `/docs --index` |
| explain | Explicar código | `/docs --explain` |

**Resultado**: 1 comando com flags

- `/docs [--index] [--explain] [--generate]`

---

### Categoria 5: Git & Deploy (CONSOLIDAR - 2 → 1 comando)

| Comando Atual | Função | Consolidar em |
|---------------|--------|---------------|
| git | Operações git | `/ship` |
| review-pr | Review PR | `/review` (já existe) |

**Resultado**: 1 comando

- `/ship [commit|push|pr]`

---

### Categoria 6: Trading-Specific (MANTER - 2 comandos)

**Específicos do domínio, não consolidar**:

| Comando | Função | Ação |
|---------|--------|------|
| exchange-test | Testar CCXT | ✅ MANTER como `/exchange` |
| strategy-validate | Validar estratégia | ⚠️ Consolidado em `/test` |

**Resultado**: 1 comando

- `/exchange [binance|coinbase|...] [test|balance|orders]`

---

### Categoria 7: Utilitários (CONSOLIDAR - 6 → 2 comandos)

| Comando Atual | Função | Consolidar em |
|---------------|--------|---------------|
| research | Pesquisa deep | `/search` |
| analyze | Análise de código | `/analyze` |
| estimate | Estimativa de esforço | `/analyze --estimate` |
| troubleshoot | Debug problemas | `/fix` (já consolidado) |
| reflect | Reflexão pós-tarefa | ❌ REMOVER (fazer automaticamente) |
| select-tool | Seleção de MCP tool | ❌ REMOVER (fazer automaticamente) |

**Resultado**: 2 comandos

- `/search [query]`
- `/analyze [--estimate] [--complexity]`

---

### Categoria 8: Meta/Workflow (CONSOLIDAR - 4 → 1 comando)

| Comando Atual | Função | Consolidar em |
|---------------|--------|---------------|
| task | Delegação de tarefas | `/task` |
| spawn | Meta-orchestration | `/task --parallel` |
| project-init | Inicializar módulo | `/init` |
| business-panel | Panel de negócio | ❌ REMOVER (não usado) |

**Resultado**: 2 comandos

- `/init [module|feature]`
- `/task [--parallel]`

---

### Categoria 9: Session Management (AVALIAR - 2 comandos)

| Comando | Função | Ação |
|---------|--------|------|
| save | Salvar sessão | ⚠️ Avaliar uso |
| load | Carregar sessão | ⚠️ Avaliar uso |

**Decisão**: ❌ REMOVER (usar MCP Serena diretamente)

---

## ✅ ESTRUTURA PROPOSTA (12 Comandos Essenciais)

### Core (5 comandos) 🔴 Críticos

```bash
/cto          # Validação Agente-CTO (agent-cto-validate)
/deps         # Análise de dependências (dev-analyze-dependencies)
/review       # Code review profundo (dev-code-review + review-pr)
/health       # Health check projeto (project-health-check)
/help         # Lista comandos
```

### Development (3 comandos) 🟡 Importantes

```bash
/plan         # Planejamento & design (brainstorm + design + workflow + spec-panel)
/dev          # Desenvolvimento (implement + improve + cleanup + build)
/fix          # Troubleshooting (troubleshoot)
```

### Testing & Quality (1 comando) 🟢 Essencial

```bash
/test [flags] # Testes (test + backtest-run + strategy-validate)
              # Flags: --backtest, --strategy, --coverage, --watch
```

### Documentation (1 comando) 🟢 Útil

```bash
/docs [flags] # Documentação (document + index + explain)
              # Flags: --index, --explain, --generate
```

### Domain-Specific (1 comando) 🔵 Trading

```bash
/exchange [name] [action]  # CCXT operations (exchange-test)
                           # Ex: /exchange binance test
```

### Utilities (2 comandos) 🟣 Suporte

```bash
/search [query]      # Pesquisa deep (research)
/analyze [flags]     # Análise de código (analyze)
                     # Flags: --estimate, --complexity
```

---

## 📊 COMPARAÇÃO

### Antes vs Depois

| Métrica | Antes | Depois | Redução |
|---------|-------|--------|---------|
| **Total Comandos** | 35 | 12 | -66% |
| **Core** | 5 | 5 | 0% |
| **Dev/Test** | 11 | 4 | -64% |
| **Docs** | 3 | 1 | -67% |
| **Utils** | 6 | 2 | -67% |
| **Trading** | 2 | 1 | -50% |
| **Meta/Session** | 6 | 0 | -100% |

**Redução Total**: 23 comandos removidos/consolidados (-66%)

---

## 🎯 BENEFÍCIOS DA CONSOLIDAÇÃO

### 1. Simplicidade

✅ Menos comandos para memorizar
✅ Naming mais intuitivo e curto
✅ Reduz cognitive load

### 2. Descoberta

✅ Mais fácil para novos devs
✅ `/help` menos sobrecarregado
✅ Comandos agrupados logicamente

### 3. Manutenção

✅ Menos arquivos para manter
✅ Menos duplicação de lógica
✅ Updates mais fáceis

### 4. Usabilidade

✅ Flags opcionais > comandos separados
✅ Padrões consistentes
✅ Auto-complete mais efetivo

---

## 🔄 PLANO DE MIGRAÇÃO

### Fase 1: Backup (1 hora)

```bash
# Criar branch
git checkout -b feat/commands-consolidation

# Backup comandos atuais
cp -r .claude/commands .claude/commands.backup

# Commit backup
git add .
git commit -m "backup: preserve original commands before consolidation"
```

### Fase 2: Consolidação (4 horas)

**Criar novos comandos consolidados**:

1. `/cto` - Copiar de agent-cto-validate.md
2. `/deps` - Copiar de dev-analyze-dependencies.md
3. `/review` - Mesclar dev-code-review.md + review-pr.md
4. `/health` - Copiar de project-health-check.md
5. `/plan` - Mesclar brainstorm + design + workflow + spec-panel
6. `/dev` - Mesclar implement + improve + cleanup + build
7. `/fix` - Copiar de troubleshoot.md
8. `/test` - Mesclar test + backtest-run + strategy-validate (com flags)
9. `/docs` - Mesclar document + index + explain (com flags)
10. `/exchange` - Renomear exchange-test.md (com args)
11. `/search` - Renomear research.md
12. `/analyze` - Copiar de analyze.md (com flags)

### Fase 3: Testes (2 horas)

```bash
# Testar cada comando novo
/help
/cto
/deps
/review
/health
/plan
/dev
/fix
/test --backtest
/docs --index
/exchange binance test
/search "Drizzle ORM"
/analyze --estimate

# Validar funcionamento
```

### Fase 4: Documentação (2 horas)

**Atualizar**:
- CLAUDE.md (seção de comandos)
- AGENTS.md (referências a comandos)
- .claude/README.md
- docs/AGENTS_README.md

### Fase 5: Cleanup (1 hora)

```bash
# Remover comandos antigos
rm .claude/commands/agent-cto-validate.md
rm .claude/commands/brainstorm.md
# ... (todos os consolidados/removidos)

# Manter apenas os 12 novos

# Commit
git add .
git commit -m "feat: consolidate 35 commands into 12 essential commands"
```

### Fase 6: Migration Guide (1 hora)

```bash
# Criar guia de migração
cat > .claude/MIGRATION_COMMANDS.md << 'EOF'
# Migration Guide: Old → New Commands

## Mapping

| Old Command | New Command | Notes |
|-------------|-------------|-------|
| /agent-cto-validate | /cto | Direct rename |
| /dev-analyze-dependencies | /deps | Direct rename |
| /dev-code-review | /review | Merged with review-pr |
| /review-pr | /review | Merged with dev-code-review |
| /project-health-check | /health | Direct rename |
| /brainstorm | /plan | Consolidated |
| /design | /plan | Consolidated |
| /workflow | /plan | Consolidated |
| /spec-panel | /plan | Consolidated |
| /implement | /dev | Consolidated |
| /improve | /dev | Consolidated |
| /cleanup | /dev | Consolidated |
| /build | /dev | Consolidated |
| /test | /test | Same (now with flags) |
| /backtest-run | /test --backtest | Flag added |
| /strategy-validate | /test --strategy | Flag added |
| /troubleshoot | /fix | Renamed |
| /document | /docs | Consolidated |
| /index | /docs --index | Flag added |
| /explain | /docs --explain | Flag added |
| /exchange-test | /exchange | Renamed, args added |
| /research | /search | Renamed |
| /analyze | /analyze | Same (now with flags) |
| /estimate | /analyze --estimate | Flag added |
| /task | /task | Same |
| /spawn | /task --parallel | Flag added |
| /project-init | /init | Renamed |
| /git | /ship | Renamed |
| /save | ❌ REMOVED | Use MCP directly |
| /load | ❌ REMOVED | Use MCP directly |
| /reflect | ❌ REMOVED | Automatic |
| /select-tool | ❌ REMOVED | Automatic |
| /business-panel | ❌ REMOVED | Not used |

## Examples

### Before
\```bash
/agent-cto-validate
/dev-analyze-dependencies
/dev-code-review
/project-health-check
\```

### After
\```bash
/cto
/deps
/review
/health
\```

## Quick Reference

\```bash
# Core
/cto          # Validate with CTO protocols
/deps         # Analyze dependencies
/review       # Code review
/health       # Health check
/help         # List commands

# Development
/plan         # Planning & design
/dev          # Development
/fix          # Troubleshooting

# Testing
/test                # Run tests
/test --backtest     # Run backtesting
/test --strategy     # Validate strategy
/test --coverage     # Coverage report

# Documentation
/docs                # Generate docs
/docs --index        # Index project
/docs --explain      # Explain code

# Trading
/exchange binance test      # Test exchange
/exchange coinbase balance  # Check balance

# Utilities
/search "query"             # Deep research
/analyze                    # Code analysis
/analyze --estimate         # Estimate effort
\```
EOF
```

---

## 📋 CHECKLIST DE IMPLEMENTAÇÃO

### Preparação

- [ ] Backup de comandos atuais
- [ ] Criar branch feat/commands-consolidation
- [ ] Commit backup

### Criação

- [ ] Criar 12 novos comandos consolidados
- [ ] Testar cada comando individualmente
- [ ] Validar flags e args

### Documentação

- [ ] Atualizar CLAUDE.md
- [ ] Atualizar AGENTS.md
- [ ] Atualizar .claude/README.md
- [ ] Criar MIGRATION_COMMANDS.md

### Cleanup

- [ ] Remover comandos antigos
- [ ] Validar que nada quebrou
- [ ] Commit final

### Validação

- [ ] Testar workflow completo
- [ ] Code review da consolidação
- [ ] Merge to main

---

## 🎓 TREINAMENTO

### Quick Start Guide (Novos Comandos)

```markdown
# 🚀 Quick Start: Comandos Essenciais

## Antes de Desenvolvimento

\```bash
/cto    # Validar protocolo CTO (OBRIGATÓRIO)
/deps   # Analisar dependências antes de modificar
\```

## Durante Desenvolvimento

\```bash
/plan   # Planejar feature/design
/dev    # Desenvolver/implementar
/fix    # Resolver problemas
\```

## Antes de PR

\```bash
/test         # Rodar testes
/review       # Code review
/health       # Health check
\```

## Documentação

\```bash
/docs         # Gerar documentação
/search       # Pesquisar info
\```

## Trading

\```bash
/exchange binance test     # Testar exchange
/test --backtest           # Backtest estratégia
\```

**Lembre-se**: `/help` sempre disponível!
```

---

## ✅ APROVAÇÃO

**Recomendação**: ✅ IMPLEMENTAR

**Benefícios**:
- -66% comandos (35 → 12)
- Naming mais intuitivo
- Menor cognitive load
- Mais fácil onboarding
- Manutenção simplificada

**Riscos**:
- ⚠️ Curva de aprendizado inicial para time atual
- ⚠️ Precisa atualizar hábitos

**Mitigação**:
- ✅ Migration guide completo
- ✅ Comandos antigos permanecem em backup
- ✅ Rollback fácil se necessário

**Esforço Total**: ~11 horas

**Prioridade**: 🟡 Média-Alta

---

**Gerado por**: Agente-CTO
**Data**: 2025-10-12
**Versão**: 1.0.0
**Protocolo**: AGENTS.md v1.1.0

**📊 Redução de 66% em comandos slash mantendo 100% das funcionalidades**
