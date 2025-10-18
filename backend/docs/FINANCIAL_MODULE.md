# Módulo Financeiro – Pagamentos, Faturas e Contabilidade

Status: Hardened – RBAC dedicado, novos endpoints analíticos, rotas sem acesso direto ao banco

## Segurança & Governança

- Permissões específicas do domínio (`financial:read|write|manage`) adicionadas ao seed de RBAC
- Todas as rotas financeiras exigem `sessionGuard + requireTenant + requirePermission`
- Rotas sensíveis (reembolsos, dunning, fechamento contábil) exigem `financial:manage`
- Rotas de pagamentos passaram a validar propriedade da transação via `paymentProcessor`

## Novos Recursos de Pagamentos

- `GET /api/v1/payments/analytics` – Resumo de volume, breakdown por status/método, dunning ativo
- `GET /api/v1/payments/:id/detail` – Linha do tempo completa (transação, reembolsos, webhooks, dunning)
- `POST /api/v1/payments/dunning/process` – Processa tentativas pendentes (admin)
- Paginação e filtros avançados em `GET /api/v1/payments` (status, método, gateway, range de datas)
- Rotas de reembolso/dunning não consultam mais o banco diretamente; usam serviços centralizados

## Faturas, Despesas, Orçamentos e Contabilidade

- Todas as rotas de faturas, despesas, budgets e ledger exigem as permissões financeiras
- Operações administrativas (bloquear orçamento, postar/reverter lançamentos) usam `financial:manage`

## Serviços

- `payment-processor.service` agora expõe:
  - `listTransactions` com paginação + filtros
  - `getTransactionDetail` agregando reembolsos/webhooks/dunning
  - `getAnalytics` consolidando métricas e monitoramento

## Próximos Passos

- Mapear permissões financeiras para perfis existentes (rodar seed RBAC)
- Avaliar testes adicionais com mock de banco real ou camada de integração
- Expansão futura: API pública de gateways e webhooks automatizados

