# 🚀 QUICK START - Dia 3.5

**Objetivo**: Corrigir erros TypeScript e validar implementação do Dia 3

**Tempo estimado**: 2-3 horas

---

## ⚡ INÍCIO RÁPIDO (5 minutos)

### 1. Limpar Processos Background
```bash
cd /Users/myminimac/Desenvolvimento/BotCriptoFy2/backend
killall -9 bun
ps aux | grep bun | grep -v grep  # Deve retornar vazio
```

Se persistirem processos, siga: [CLEANUP_REQUIRED.md](CLEANUP_REQUIRED.md)

### 2. Verificar Estado do Projeto
```bash
# Status Git
git status

# Verificar erros TypeScript
bunx tsc --noEmit 2>&1 | head -50

# Deve mostrar ~30 erros
```

### 3. Ler Documentação
📖 **LEIA PRIMEIRO**: [backend/docs/subscriptions/PROXIMA_SESSAO.md](backend/docs/subscriptions/PROXIMA_SESSAO.md)

---

## 🎯 TAREFAS P0 - CRÍTICAS (75 min)

### Task 1: Corrigir t.Enum → t.Union (30 min)

**Arquivos afetados**: 5 ocorrências

**admin.routes.ts** (2 ocorrências):
```typescript
// Linha 80 e 165
// ❌ ANTES
billingPeriod: t.Optional(t.Enum(['monthly', 'yearly'], { default: 'monthly' }))

// ✅ DEPOIS
billingPeriod: t.Optional(
  t.Union([t.Literal('monthly'), t.Literal('yearly')], { default: 'monthly' })
)
```

**authenticated.routes.ts** (1 ocorrência):
```typescript
// Linha 214
// ❌ ANTES
effectiveDate: t.Optional(t.Enum(['immediate', 'end_of_period'], {...}))

// ✅ DEPOIS
effectiveDate: t.Optional(
  t.Union([t.Literal('immediate'), t.Literal('end_of_period')], {...})
)
```

**usage.routes.ts** (2 ocorrências):
```typescript
// Linhas 70 e 227
// ❌ ANTES
eventCategory: t.Enum(['trading', 'api', 'storage', 'feature'])

// ✅ DEPOIS
eventCategory: t.Union([
  t.Literal('trading'),
  t.Literal('api'),
  t.Literal('storage'),
  t.Literal('feature')
])
```

---

### Task 2: Adicionar Null Checks (30 min)

**Arquivo**: authenticated.routes.ts

**Linhas 67, 74-75** (check if/change-plan):
```typescript
// ❌ ANTES
const currentSubscription = await service.getSubscriptionStatus(tenantId);
if (currentSubscription.status === 'active') { ... }

// ✅ DEPOIS
const currentSubscription = await service.getSubscriptionStatus(tenantId);
if (currentSubscription && currentSubscription.status === 'active') { ... }
```

**Linha 174** (change-plan response):
```typescript
// ❌ ANTES
message: result.effectiveDate === 'immediate' ? '...' : '...'

// ✅ DEPOIS
message: 'Plan changed successfully'
// (effectiveDate não existe no tipo)
```

**Linhas 236, 311, 316, 320** (cancel/reactivate):
```typescript
// ❌ ANTES
const current = await service.getSubscriptionStatus(tenantId);
if (current.status === 'canceled') { ... }

// ✅ DEPOIS
const current = await service.getSubscriptionStatus(tenantId);
if (!current) {
  set.status = 404;
  return { success: false, error: 'Subscription not found' };
}
if (current.status === 'canceled') { ... }
```

---

### Task 3: Corrigir Conversão Date (10 min)

**Arquivo**: usage.routes.ts

**Linhas 191-192**:
```typescript
// ❌ ANTES
const events = await usageTrackingService.getUsageEvents(tenantId, {
  startDate: validatedQuery.startDate,  // string
  endDate: validatedQuery.endDate,      // string
  ...
});

// ✅ DEPOIS
const events = await usageTrackingService.getUsageEvents(tenantId, {
  startDate: validatedQuery.startDate
    ? new Date(validatedQuery.startDate)
    : undefined,
  endDate: validatedQuery.endDate
    ? new Date(validatedQuery.endDate)
    : undefined,
  ...
});
```

---

### Task 4: Validar (5 min)

```bash
# Deve retornar 0 erros
bunx tsc --noEmit

# Se ainda houver erros, documentar em ERROS_TS_PENDENTES.md
```

---

## 📋 CHECKLIST DE PROGRESSO

```markdown
### P0 - Crítico (obrigatório)
- [ ] admin.routes.ts linha 80 (t.Enum → t.Union)
- [ ] admin.routes.ts linha 165 (t.Enum → t.Union)
- [ ] authenticated.routes.ts linha 214 (t.Enum → t.Union)
- [ ] usage.routes.ts linha 70 (t.Enum → t.Union)
- [ ] usage.routes.ts linha 227 (t.Enum → t.Union)
- [ ] authenticated.routes.ts linhas 67, 74-75 (null checks)
- [ ] authenticated.routes.ts linha 174 (remove effectiveDate)
- [ ] authenticated.routes.ts linhas 236, 311, 316, 320 (null checks)
- [ ] usage.routes.ts linhas 191-192 (conversão Date)
- [ ] Validar: bunx tsc --noEmit → 0 erros

### P1 - Alta (recomendado)
- [ ] Simplificar queries Drizzle (30 min)
- [ ] Resolver Partial<PlanLimits> (15 min)

### Testes
- [ ] curl GET /subscriptions/plans
- [ ] curl GET /subscriptions/my-subscription (401)
- [ ] curl GET /subscriptions/admin/analytics (403)
```

---

## ✅ CRITÉRIO DE SUCESSO

Você completou quando:
- ✅ `bunx tsc --noEmit` retorna **0 erros**
- ✅ Servidor compila e inicia sem warnings críticos
- ✅ Pelo menos 3 endpoints testados via curl

---

## 🔗 RECURSOS

**Documentação**:
- [PROXIMA_SESSAO.md](backend/docs/subscriptions/PROXIMA_SESSAO.md) - Checklist completo
- [ERROS_TS_PENDENTES.md](backend/docs/subscriptions/ERROS_TS_PENDENTES.md) - Lista de erros
- [SESSAO_DIA3_RESUMO.md](backend/docs/subscriptions/SESSAO_DIA3_RESUMO.md) - Contexto técnico

**Código**:
- [authenticated.routes.ts](backend/src/modules/subscriptions/routes/authenticated.routes.ts)
- [usage.routes.ts](backend/src/modules/subscriptions/routes/usage.routes.ts)
- [admin.routes.ts](backend/src/modules/subscriptions/routes/admin.routes.ts)

**Referências Externas**:
- [Elysia Validation](https://elysiajs.com/essential/validation.html)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)

---

## 🚨 AJUDA

**Problema?**
1. Revisar [ERROS_TS_PENDENTES.md](backend/docs/subscriptions/ERROS_TS_PENDENTES.md)
2. Verificar [SESSAO_DIA3_RESUMO.md](backend/docs/subscriptions/SESSAO_DIA3_RESUMO.md)
3. Consultar documentação oficial do Elysia

**Bloqueado?**
- Processos background: Ver [CLEANUP_REQUIRED.md](CLEANUP_REQUIRED.md)
- Erros persistentes: Documentar em ERROS_TS_PENDENTES.md

---

## 🎉 APÓS COMPLETAR

1. ✅ Validar: `bunx tsc --noEmit` → 0 erros
2. ✅ Testar 3+ endpoints
3. ✅ Commit com mensagem:
   ```
   fix(subscriptions): corrigir erros TypeScript do Dia 3

   - Corrigir t.Enum → t.Union em 5 ocorrências
   - Adicionar null checks em authenticated.routes
   - Corrigir conversão Date em usage.routes

   Closes: Dia 3.5
   Next: Dia 4 - Stripe Integration
   ```

4. 🚀 Prosseguir para **Dia 4 - Stripe Integration**

---

**Boa sorte! 💪**

**Tempo estimado**: 2-3 horas
**Dificuldade**: Média
**Impacto**: Alto (desbloqueia Dia 4)
