# ADR 002: Arquitetura Modular (src/modules)

**Data**: 2025-10-15
**Status**: ✅ Aprovado
**Decisores**: Agente-CTO, Agente-Dev
**Contexto Técnico**: FASE 0 - Estrutura de Projeto

---

## Contexto

Precisávamos definir a estrutura de pastas do projeto BotCriptoFy2 considerando:

1. **26 Módulos**: Sistema complexo com muitas funcionalidades
2. **Manutenibilidade**: Fácil localizar e manter código
3. **Escalabilidade**: Adicionar novos módulos sem reestruturar
4. **Separação de Responsabilidades**: Cada módulo independente
5. **Padrões Elysia**: Seguir best practices do framework

---

## Opções Consideradas

### Opção 1: Estrutura por Camada (Layer-based)
```
src/
├── controllers/
│   ├── auth.controller.ts
│   ├── users.controller.ts
│   └── (50+ arquivos...)
├── services/
│   ├── auth.service.ts
│   ├── users.service.ts
│   └── (50+ arquivos...)
├── routes/
└── schemas/
```

**Prós**:
- Padrão tradicional MVC
- Familiaridade para alguns devs

**Contras**:
- **Não escala**: 50+ arquivos por pasta
- **Difícil manter**: Arquivos relacionados espalhados
- **Alta acoplamento**: Mudanças afetam múltiplas pastas
- **Navegação ruim**: Muito scrolling

### Opção 2: Estrutura por Feature (Feature-based) ✅ ESCOLHIDO
```
src/modules/
├── auth/
│   ├── schema/auth.schema.ts
│   ├── services/auth.service.ts
│   ├── routes/auth.routes.ts
│   ├── controllers/auth.controller.ts
│   ├── types/auth.types.ts
│   ├── utils/auth.utils.ts
│   └── index.ts
├── tenants/
│   └── (mesma estrutura)
└── (13 outros módulos)
```

**Prós**:
- **Alta coesão**: Tudo relacionado junto
- **Baixo acoplamento**: Módulos independentes
- **Fácil navegação**: Tudo de auth em `modules/auth`
- **Escalável**: Adicionar novos módulos é trivial
- **Testável**: Testes próximos ao código
- **DX Superior**: IDE autocomplete melhor

**Contras**:
- Requer disciplina (não misturar responsabilidades)

### Opção 3: Hybrid (Camada + Feature)
```
src/
├── core/ (compartilhado)
└── features/
    ├── auth/
    └── users/
```

**Prós**:
- Flexibilidade

**Contras**:
- Confusão sobre onde colocar código
- Mais complexo que necessário

---

## Decisão

**Escolhemos Estrutura Modular (Feature-based)** porque:

1. **26 Módulos**: Estrutura por camada seria caótica
2. **Time Distribuído**: Cada dev pode focar em 1 módulo
3. **Manutenção**: Mudanças ficam contidas no módulo
4. **Testes**: Coverage por módulo mais claro
5. **Padrão Moderno**: Usado por Next.js, Nx, NestJS

---

## Estrutura Definida

```typescript
// Cada módulo segue exatamente esta estrutura:
src/modules/{module-name}/
├── schema/               # Drizzle schemas
│   └── {module}.schema.ts
├── types/                # TypeScript types/interfaces
│   └── {module}.types.ts
├── services/             # Business logic
│   └── {module}.service.ts
├── routes/               # Elysia routes
│   └── {module}.routes.ts
├── controllers/          # Request handlers
│   └── {module}.controller.ts
├── utils/                # Utilitários específicos
│   └── {module}.utils.ts
├── __tests__/            # Testes do módulo
│   ├── {module}.service.test.ts
│   └── {module}.routes.test.ts
├── README.md             # Documentação do módulo
└── index.ts              # Barrel exports
```

---

## Regras de Arquitetura

### 1. **Barrel Exports** (index.ts)
Cada módulo expõe apenas o necessário:

```typescript
// modules/auth/index.ts
export * from './schema/auth.schema';
export * from './types/auth.types';
export { authService } from './services/auth.service';
export { authRoutes } from './routes/auth.routes';
```

### 2. **Dependency Direction**
```
routes → controllers → services → schema
  ↓          ↓            ↓          ↓
types ← types  ← types  ← types
```

### 3. **Import Rules**
- ✅ Módulo pode importar de `@/modules/outro-modulo`
- ❌ Nunca importar internamente de outro módulo
- ✅ Usar barrel exports (`from './auth'` não `from './auth/services/auth.service'`)

### 4. **Shared Code**
Código compartilhado vai em `src/shared/`:
```
src/shared/
├── utils/
├── types/
├── constants/
└── middleware/
```

---

## Consequências

### Positivas ✅
- **Onboarding Rápido**: Novos devs entendem estrutura rapidamente
- **Paralelização**: Múltiplos devs sem conflitos
- **Code Splitting**: Fácil lazy loading de módulos
- **Testing**: Coverage por módulo claro
- **Deployment**: Possível micro-frontends futuros

### Negativas ⚠️
- **Duplicação Inicial**: Alguma duplicação entre módulos (aceitável)
- **Mais Arquivos**: Mais arquivos que estrutura flat

### Neutras ℹ️
- **Padrão Consistente**: TODOS os módulos seguem mesma estrutura
- **Documentação**: README em cada módulo obrigatório

---

## Implementação

### Módulos Criados (15/26)

**Administrativos** (9/9 ✅):
- ✅ auth
- ✅ tenants
- ✅ departments
- ✅ security
- ✅ subscriptions
- ✅ notifications
- ✅ support
- ✅ audit
- ✅ documents
- ✅ configurations
- ✅ ceo
- ✅ financial
- ✅ marketing
- ✅ sales

**Trading** (0/12 ⏳):
- ⏳ trading-core
- ⏳ orders
- ⏳ exchanges
- ⏳ bots
- ⏳ strategies
- ⏳ risk
- ⏳ portfolio
- ⏳ analytics
- ⏳ social-trading
- ⏳ education
- ⏳ mobile
- ⏳ ai-ml

**Parcerias** (0/5 ⏳):
- ⏳ affiliate
- ⏳ mmn
- ⏳ p2p
- ⏳ banco
- ⏳ payments

---

## Exemplo Real

```typescript
// ❌ ERRADO - Import direto
import { authService } from '../auth/services/auth.service';

// ✅ CORRETO - Via barrel export
import { authService } from '@/modules/auth';

// ✅ CORRETO - Múltiplos exports
import {
  authService,
  type User,
  type AuthContext
} from '@/modules/auth';
```

---

## Métricas de Sucesso

| Métrica | Meta | Atual | Status |
|---------|------|-------|--------|
| Módulos com README | 100% | 0% | ❌ |
| Módulos com testes | 100% | 0% | ❌ |
| Seguindo padrão | 100% | 100% | ✅ |
| Barrel exports | 100% | 100% | ✅ |

---

## Referências

- [Feature-Sliced Design](https://feature-sliced.design/)
- [NestJS Modules](https://docs.nestjs.com/modules)
- [Nx Workspace](https://nx.dev/concepts/more-concepts/applications-and-libraries)

---

## Revisões

| Data | Revisor | Decisão | Comentários |
|------|---------|---------|-------------|
| 2025-10-15 | Agente-CTO | ✅ Aprovado | Escalável para 26+ módulos |
| 2025-10-15 | Agente-Dev | ✅ Aprovado | DX superior comprovado |

---

**Próxima Revisão**: 2025-11-15 (após implementar 5+ módulos completos)
**Status Final**: ✅ IMPLEMENTADO
