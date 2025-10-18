# Marketing Module – Campaigns, Leads e Analytics

Status: Hardened – RBAC dedicado, serviços centralizados e endpoints avançados

## Segurança & Governança

- Novas permissões `marketing:read|write|manage` adicionadas ao seed RBAC.
- Todas as rotas exigem `sessionGuard + requireTenant` e a permissão adequada:
  - `marketing:read` para consultas e analytics.
  - `marketing:write` para criar/editar campanhas, leads e templates.
  - `marketing:manage` para ações sensíveis (lançar/pausar campanha, importar leads, duplicar, test send, excluir templates/leads).

## Serviços

- `CampaignService`: criação, listagem, atualização, duplicação, analytics e mudança de status das campanhas.
- `TemplateService`: CRUD e pré-visualização de templates de email com renderização segura.
- `MarketingAnalyticsService`: consolida funil de leads, distribuição por fontes e visão geral das campanhas.

## Novos e Atualizados Endpoints

- `POST /api/v1/marketing/campaigns` – cria campanha (write).
- `GET /api/v1/marketing/campaigns` – paginação + filtros (status, tipo, datas, busca).
- `POST /api/v1/marketing/campaigns/:id/duplicate` – clona campanha (manage).
- `POST /api/v1/marketing/campaigns/:id/test-send` – renderiza email e registra teste (manage).
- `GET /api/v1/marketing/campaigns/:id/analytics` – estatísticas consolidadas (read).
- `POST /api/v1/marketing/leads/import` – importação CSV com tratamento de erros (manage).
- `GET /api/v1/marketing/leads/analytics` – funil, conversões e fontes (read).
- `POST /api/v1/marketing/templates` / `PATCH` / `DELETE` – operam via service com auditoria básica.
- `POST /api/v1/marketing/templates/:id/preview` – renderização com contexto seguro.
- `GET /api/v1/marketing/dashboard` – dashboard unificado (leads + campanhas).

## Estrutura do Código

- Rotas não acessam mais o banco diretamente; utilizam serviços (`CampaignService`, `TemplateService`, `LeadsService`, `MarketingAnalyticsService`).
- Leads Service ganhou método `softDeleteLead` para remoção lógica e invalidou cache.
- Helpers de analytics exportados para facilitar testes (`percentage`).

## Próximos Passos

- Implementar envio real de campanhas (integração com provedor de email) e auditoria.
- Expandir testes unitários cobrindo CampaignService/TemplateService com mocks de banco.
- Criar relatórios adicionais (ex: cohort de leads, impacto por campanha) conforme roadmap.

