# ADR 001: Escolha do Drizzle ORM

**Data**: 2025-10-15
**Status**: ✅ Aprovado
**Decisores**: Agente-CTO, CEO Julio Cezar
**Contexto Técnico**: FASE 0 - Database Layer

---

## Contexto

Precisávamos escolher um ORM para o projeto BotCriptoFy2 que atendesse aos seguintes requisitos:

1. **Type-Safety**: TypeScript completo sem `any`
2. **Performance**: Queries otimizadas sem overhead
3. **Bun Compatibility**: Funcionar nativamente com Bun runtime
4. **PostgreSQL/TimescaleDB**: Suporte completo para extensões
5. **Migrations**: Sistema robusto de migrations
6. **Developer Experience**: DX superior com autocompletion

---

## Opções Consideradas

### Opção 1: Prisma
**Prós**:
- Mais popular (maior comunidade)
- Schema declarativo
- Prisma Studio (GUI)
- Migrations automáticas

**Contras**:
- Schema em formato proprietário (não TypeScript)
- Overhead de performance (~20-30% mais lento)
- Geração de código adicional
- Menor controle sobre queries
- Problemas com Bun (algumas features não funcionam)

### Opção 2: TypeORM
**Prós**:
- Maduro e estável
- Decorators TypeScript
- Active Record pattern
- Suporte completo PostgreSQL

**Contras**:
- Decorators aumentam bundle size
- Performance inferior a Drizzle
- Menor type-safety
- API menos intuitiva
- Problemas conhecidos com Bun

### Opção 3: **Drizzle ORM** ✅ ESCOLHIDO
**Prós**:
- **Type-Safe 100%**: Schemas são TypeScript nativo
- **Performance Superior**: ~2-3x mais rápido que Prisma
- **Bun Native**: Desenvolvido pensando em Bun
- **SQL-like**: Queries parecem SQL (fácil migração)
- **Zero Overhead**: Sem geração de código
- **Drizzle Kit**: Migrations e Studio inclusos
- **Relations**: Sistema de relações robusto
- **Zod Integration**: Validação nativa

**Contras**:
- Comunidade menor (mas crescendo)
- Menos recursos third-party
- Documentação ainda em evolução

---

## Decisão

**Escolhemos Drizzle ORM** pelos seguintes motivos:

1. **Performance Crítica**: Sistema de trading requer latência mínima
2. **Type-Safety**: Evitar bugs em produção com tipos completos
3. **Bun First**: Aproveitamos 100% das otimizações do Bun
4. **SQL Control**: Controle total sobre queries complexas
5. **Future-Proof**: Alinhado com tendências modernas (Bun, TypeScript)

---

## Consequências

### Positivas ✅
- Queries otimizadas para TimescaleDB (hypertables)
- Type inference completa em todo o projeto
- Migrations versionadas e rastreáveis
- DX superior com autocomplete
- Performance superior em operações de trading

### Negativas ⚠️
- Curva de aprendizado inicial para time
- Menos exemplos na comunidade (ainda)
- Precisamos contribuir com a documentação

### Riscos Mitigados 🛡️
- **Risco**: Comunidade pequena
  - **Mitigação**: Drizzle é backed by Neon (empresa sólida)

- **Risco**: Mudanças breaking
  - **Mitigação**: Versionar Drizzle no package.json (^0.33.0)

- **Risco**: Falta de recursos
  - **Mitigação**: Drizzle Studio + Drizzle Kit suprem necessidades

---

## Validação

```typescript
// Exemplo de type-safety completo:
const user = await db.select().from(users).where(eq(users.id, userId));
//    ^? User (type inferido automaticamente)

// Query builder type-safe:
const result = await db
  .select({
    userName: users.name,
    tenantName: tenants.name,
  })
  .from(users)
  .leftJoin(tenants, eq(users.tenantId, tenants.id))
  .where(eq(users.email, 'test@example.com'));
//    ^? { userName: string | null, tenantName: string }
```

---

## Referências

- [Drizzle ORM Docs](https://orm.drizzle.team/)
- [Drizzle vs Prisma Benchmark](https://github.com/drizzle-team/drizzle-orm/blob/main/benchmarks/README.md)
- [Bun + Drizzle Guide](https://bun.sh/guides/ecosystem/drizzle)

---

## Revisões

| Data | Revisor | Decisão | Comentários |
|------|---------|---------|-------------|
| 2025-10-15 | Agente-CTO | ✅ Aprovado | Performance crítica para trading |
| 2025-10-15 | CEO Julio | ✅ Aprovado | Alinhado com visão técnica |

---

**Próxima Revisão**: 2025-11-15 (após 1 mês de uso)
**Status Final**: ✅ IMPLEMENTADO
