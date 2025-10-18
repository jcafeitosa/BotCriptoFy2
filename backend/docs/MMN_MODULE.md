# Módulo MMN – Estrutura, Segurança e Endpoints

Status: Hardened – RBAC dedicado (`mmn:read|write|manage`), respostas padronizadas e serviços centralizados.

## Segurança
- Todas as rotas exigem `sessionGuard` + `requireTenant`.
- Permissões:
  - `mmn:read`: consultar árvore, volumes, comissões, visualizações.
  - `mmn:write`: ingressar no MMN, solicitar ou cancelar próprios pagamentos.
  - `mmn:manage`: operações administrativas (estatísticas globais, processamento de comissões, qualificações).

## Serviços Principais
- `TreeService`: criação/consulta de nós, spillover otimizado, estatísticas e qualificação.
- `GenealogyService`: downline/upline, contagem por nível e genealogia.
- `VolumeService`, `CommissionService`, `RankService`, `PayoutService`: cálculos de negócio encapsulados.
- `AnalyticsService`: métricas avançadas (membros, leaderboard, crescimento, saúde da rede).

## Endpoints Atualizados (resposta `{ success, data }`)
- `GET /api/v1/mmn/tree` – árvore até profundidade informada.
- `POST /api/v1/mmn/join` – ingresso com validação de sponsor.
- `GET /api/v1/mmn/volumes`, `/commissions`, `/rank`, `/payouts` – métricas do membro.
- `POST /api/v1/mmn/request-payout`, `/payouts/:id/cancel` – gestão de saques.
- `GET /api/v1/mmn/tree/visual`, `/tree/stats`, `/analytics`, `/members/:userId/details` – visualização e dashboards com analytics consolidados.
- `GET /api/v1/mmn/admin/members` – paginação, filtros (status, rank, qualificação) e ordenação dinâmica.
- `GET /api/v1/mmn/admin/payouts/pending`, `POST /api/v1/mmn/admin/payouts/:id/{process|complete|fail}` – gestão completa de saques.
- `POST /api/v1/mmn/admin/commissions/:id/approve`, `POST /api/v1/mmn/admin/members/:userId/calculate-rank` – fluxo operacional direto.
- `GET /api/v1/mmn/admin/leaderboard` – ranking avançado ponderado por volume, comissões, rank e tamanho de equipe.

## Melhorias de Código
- Rotas não acessam mais o banco diretamente; utilizam serviços especializados.
- Erros retornam HTTP apropriado (`set.status`) e mensagens consistentes.
- Imports limpos e utilitário `parseOptionalInt` para query params.
- Spillover percorre a árvore em largura com carregamento em lote (`getNodesByIds`), reduzindo I/O.
- `AnalyticsService` consolida métricas históricas, leaderboard e saúde da rede para reuso em rotas/admin.

## Próximos Passos
- Automatizar execução do spillover em lote (crontab) com auditoria.
- Integrar notificações/marketing ao MMN (convites e promoções).
- Instrumentar caching para analytics pesados e expor métricas no Prometheus.
