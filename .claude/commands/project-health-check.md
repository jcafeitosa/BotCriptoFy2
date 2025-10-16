---
description: Verifica saúde do projeto (código, testes, segurança, documentação)
---

# Project Health Check

Realize uma análise completa da saúde do projeto BeeCripto.

## 1. Análise de Código

### TypeScript
```bash
bun run typecheck
```

**Verificar:**
- [ ] Zero erros de compilação
- [ ] Strict mode habilitado
- [ ] Sem uso de `any`
- [ ] Imports organizados

### Lint
```bash
bun run lint
```

**Verificar:**
- [ ] Zero erros de lint
- [ ] Zero warnings não justificados
- [ ] Código formatado (Prettier)

## 2. Testes

```bash
bun test
bun run test:coverage
```

**Verificar:**
- [ ] Todos os testes passando
- [ ] Coverage ≥ 80% (backend)
- [ ] Coverage ≥ 95% (trading strategies)
- [ ] Sem testes skipados

## 3. Segurança

### Dependências
```bash
bun audit
```

**Verificar:**
- [ ] Zero vulnerabilidades críticas
- [ ] Zero vulnerabilidades high
- [ ] Dependências atualizadas

### Secrets
```bash
grep -r "api_key\|secret\|password" src/ --exclude-dir=node_modules
```

**Verificar:**
- [ ] Nenhum secret hardcoded
- [ ] Todas keys em .env
- [ ] .env no .gitignore

### API Security
**Verificar:**
- [ ] Validação com Zod em todos endpoints
- [ ] Rate limiting configurado
- [ ] CORS configurado
- [ ] JWT com expiration

## 4. Documentação

**Verificar:**
- [ ] README.md atualizado
- [ ] docs/IMPLEMENTACAO.md reflete realidade
- [ ] Swagger/Scalar funcionando
- [ ] JSDoc completo
- [ ] CHANGELOG atualizado

## 5. Database

```bash
bun run db:studio
```

**Verificar:**
- [ ] Migrations aplicadas
- [ ] Seeds funcionando
- [ ] Índices criados
- [ ] Relacionamentos corretos

## 6. Performance

**Verificar:**
- [ ] Queries otimizadas
- [ ] Redis cache configurado
- [ ] N+1 queries evitadas
- [ ] Conexões pooled

## 7. Git & CI/CD

```bash
git status
git log --oneline -10
```

**Verificar:**
- [ ] Branch atualizada
- [ ] Commits convencionais
- [ ] CI/CD passando
- [ ] Sem merge conflicts

## 8. Trading-Specific

**Verificar:**
- [ ] CCXT rate limiting habilitado
- [ ] Exchange errors tratados
- [ ] Order validation implementada
- [ ] Risk management ativo

---

## Relatório de Saúde

Gere relatório:

```markdown
# Project Health Report - BeeCripto

**Data**: YYYY-MM-DD

## Status Geral: 🟢 Saudável | 🟡 Atenção | 🔴 Crítico

### Code Quality: [🟢/🟡/🔴]
- TypeScript: ✅ Zero erros
- Lint: ✅ Zero issues
- Format: ✅ Prettier

### Tests: [🟢/🟡/🔴]
- Passing: 100/100 ✅
- Coverage: 85% 🟢

### Security: [🟢/🟡/🔴]
- Vulnerabilities: 0 critical, 2 low
- Secrets: ✅ Nenhum hardcoded

### Documentation: [🟢/🟡/🔴]
- Up-to-date: ✅
- Swagger: ✅
- Coverage: 90%

### Performance: [🟢/🟡/🔴]
- Queries: Otimizadas ✅
- Cache: Configurado ✅

### Issues Encontrados
1. [Issue 1]
2. [Issue 2]

### Recomendações
1. [Recomendação 1]
2. [Recomendação 2]
```

