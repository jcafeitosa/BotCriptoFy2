# Tenants Module Audit (2025-10-18)

Resumo da auditoria do módulo Tenants: segurança, gaps, endpoints, performance e correções aplicadas.

## Principais Correções

- Segurança de Acesso
  - GET `/api/v1/tenants/:id` agora exige que o usuário seja membro do tenant.
  - GET `/api/v1/tenants/:id/members`, POST `/api/v1/tenants/:id/members`, DELETE `/api/v1/tenants/:id/members/:userId` exigem papel `admin` ou `ceo` no tenant.
  - GET `/api/v1/tenants/company/info` requer que o usuário seja membro do company tenant.
- Versão de Rotas
  - Prefixo padronizado: `/api/v1/tenants` (antes era `/api/tenants`).
- Cache leve
  - Cache para detalhes do tenant (por ID) e company tenant com TTL de 5 minutos.
  - Invalidação preparada (serviço expõe método `invalidate`).
- Validação de Input
  - `role` restrito ao conjunto permitido (ceo, admin, funcionario, trader, influencer, manager, viewer).
  - `userId` com comprimento mínimo.
- Segurança do Endpoint de Setup
  - `POST /api/v1/tenants/promote-me-to-ceo` agora bloqueia quando já existe um CEO para o company tenant.
- Testabilidade e Injeção de DB
  - Adicionado `getTenantsDb` para permitir stubs em testes.

## Endpoints (revisados)

- GET `/api/v1/tenants/me` – Tenants do usuário atual (apenas sessão válida).
- GET `/api/v1/tenants/:id` – Detalhes do tenant (requer membership).
- GET `/api/v1/tenants/:id/members` – Membros do tenant com paginação (requer admin/ceo).
- POST `/api/v1/tenants/:id/members` – Adicionar membro (requer admin/ceo, validação de role).
- DELETE `/api/v1/tenants/:id/members/:userId` – Remover membro (requer admin/ceo).
- POST `/api/v1/tenants/promote-me-to-ceo` – Setup inicial, bloqueia se já houver CEO.
- GET `/api/v1/tenants/company/info` – Detalhes do company tenant (requer membership).

## Testes

- `src/modules/tenants/__tests__/tenant.service.test.ts` – cobre regra de promoção a CEO (bloqueio quando já existe; promoção quando não existe).

Execução: `cd backend && bun test src/modules/tenants/__tests__/tenant.service.test.ts`

## Dependências

- Usa `auth.sessionGuard` para autenticação.
- Integra com `users` e `auth` via IDs; sem acoplamento indevido.

## Performance

- Índice único em `(tenant_id, user_id)` para `tenant_members` (uso adequado nos filtros).
- Índices adicionados em `tenants.type` e `tenants.status` para melhorar relatórios/listagens administrativas.
- Operações separadas por serviço; filtros por ID bem definidos.
 - Cache reduz cargas em consultas repetidas por tenant.

## Recomendações Futuras

- Adicionar cache leve para `getTenantById` com invalidação em updates.
- Expor util de paginação e filtros para listas de membros.
- Amarrar mudanças de membership a invalidadores do cache do módulo Users (ex.: `UsersTenantsCacheService.invalidateTenants`).
 - Conectar invalidadores de `TenantsCacheService.invalidate` a endpoints de update do tenant quando existirem.
