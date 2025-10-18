# Users Module Audit (2025-10-18)

Resumo da auditoria do módulo Users: segurança, gaps, endpoints, performance e correções aplicadas.

## Principais Pontos

- Prefixo de rotas padronizado para versão: `/api/v1/user` (consistência com demais módulos)
- Validação mais rígida no body de `POST /api/v1/user/switch-tenant` (tenantId com restrições de formato/tamanho)
- Refatoração leve: mapeamento de `tenants.type` para `ProfileType` extraído para util testável
- Teste unitário criado (PT-BR) cobrindo util de mapeamento
- Removida invasão de competência: atualização do `activeOrganizationId` da sessão passou do módulo Users para o serviço de sessão do Auth (`setActiveOrganization`)

## Endpoints (revisados)

- GET `/api/v1/user/profile` – retorna perfil do usuário autenticado (sessionGuard)
- GET `/api/v1/user/tenants` – lista tenants do usuário
- POST `/api/v1/user/switch-tenant` – troca tenant ativo (validação reforçada)
- GET `/api/v1/user/active-tenant` – retorna tenant ativo da sessão

Todos usam `sessionGuard` (Better-Auth). Não há endpoints administrativos neste módulo.

## Segurança

- Autenticação: obrigatória em todas as rotas do módulo
- Autorização: contexto do próprio usuário (não expõe dados de terceiros)
- Validação: reforço no `switch-tenant` para evitar entrada malformada
- Logs: não expõem PII sensível além do necessário

## Performance

- Consultas com JOIN pontuais e com filtros por userId (indexado em tabelas relacionadas)
- O schema `user_profiles` usa PK em `user_id`, adequado aos acessos feitos

## Correções Aplicadas

- Rotas: prefixo atualizado para `/api/v1/user`
- Validação: `tenantId` com restrição de padrão, comprimento mínimo e máximo
- Refatoração: `mapTenantTypeToProfileType` extraído para util e coberto por testes
- Competência: `setActiveOrganization` implementado em `auth/services/session.service.ts` e chamado pela rota de `switch-tenant`

## Testes

- `src/modules/users/__tests__/profile-type.util.test.ts` – cobre util de mapeamento

Execução: `cd backend && bun test src/modules/users/__tests__/profile-type.util.test.ts`

## Recomendações Futuras

- Adicionar cache leve para `getUserProfile` e invalidar em eventos relevantes (troca de tenant, atualização de membership)
- Suíte de testes para `user.service` e `profile.service` com stubs de DB
- Smoke tests autenticados (quando disponível mocking de auth) para as rotas do módulo
