# Affiliate Module Audit (2025-10-18)

This report documents a focused audit on the affiliate module covering gaps, security, functionality, dependencies, logic, performance, improvements, endpoints, validation, fixes, and tests.

## Summary

- Fixed logic/syntax issues in routes and services
- Eliminated `any` in module code, added strict types for route contexts and updates
- Tightened input validation schemas for nested objects
- Hardened schema JSONB types from `any` to `unknown`
- Added unit tests for critical utils
- Improved payout selection algorithm: select eligible commissions to meet or slightly exceed requested amount; mark commissions as paid only upon payout completion
- Payout agora integra-se ao módulo Financeiro (Disbursement): inicia transação em `payment_transactions` e armazena `financialTransactionId` em metadata; conclusão valida e marca a transação como concluída
- Taxa de payout lida do Configurations (`affiliate.payout.fee.percent`), com fallback seguro

## Fixes Applied

- Routes
  - Replaced untyped handler contexts with `AffiliateRouteContext` in `affiliate.routes.ts` and `admin.routes.ts`
  - Strengthened validation:
    - `socialMedia` now validates optional platform fields
    - `bankInfo` now validates allowed keys
  - Removed duplicate return in tiers endpoint (admin)

- Services
  - `profile.service.ts`:
    - Replaced `any` update objects with `Partial<NewAffiliateProfile>`
    - Safe number-to-decimal string conversions
  - `payout.service.ts`:
    - Ensured single conditions `.where(...)` in list query
    - Validates Stripe method requires connected account
    - Selects commissions consistently and updates pending balance using selected sum
    - Integração com `PayoutDisbursementService` (módulo Financial) para iniciar e concluir desembolsos
    - Armazena `financialTransactionId` em `affiliate_payouts.metadata` para rastreio
    - Taxa de payout lida de Configurações

- Schema
  - Switched JSONB `metadata` columns to `Record<string, unknown>`

- Types
  - Extended `UpdateAffiliateData` with optional `tierId` and `tierName` (admin-only update path)
  - Added `AffiliateRouteContext` for typed route handlers

## Endpoints Reviewed

- User
  - GET `/api/v1/affiliate/profile`
  - POST `/api/v1/affiliate/profile`
  - GET `/api/v1/affiliate/referral-code`
  - GET `/api/v1/affiliate/referrals`
  - GET `/api/v1/affiliate/commissions`
  - GET `/api/v1/affiliate/payouts`
  - POST `/api/v1/affiliate/payouts`
  - GET `/api/v1/affiliate/analytics`
  - GET `/api/v1/affiliate/tier`

- Admin
  - GET `/api/v1/affiliate/admin/affiliates`
  - POST `/api/v1/affiliate/admin/affiliates/:id/approve`
  - POST `/api/v1/affiliate/admin/affiliates/:id/suspend`
  - GET `/api/v1/affiliate/admin/payouts/pending`
  - POST `/api/v1/affiliate/admin/payouts/:id/process`
  - POST `/api/v1/affiliate/admin/payouts/:id/complete`
  - PUT `/api/v1/affiliate/admin/affiliates/:id/tier`
  - GET `/api/v1/affiliate/admin/tiers`

- Public
  - POST `/api/v1/affiliate/public/click` — track affiliate clicks without authentication

## Security & Validation

- AuthZ: Admin routes already gated by RBAC `requireAnyRole(['super_admin','admin'])`
- AuthN/Tenant: All routes are behind `sessionGuard` and `requireTenant`
- Input validation tightened for nested objects
- Sensitive data (keys/taxId) not logged

## Dependencies & Integration

- Depends on: `auth`, `tenants`, `subscriptions`, `db`, `cache`
- Cache: Uses `cacheManager` (USERS namespace) for analytics/profile
- DB: Drizzle ORM with proper indices on high-traffic tables
- Global rate limiting middleware applied at app level

## Testing

- Added Bun unit tests for:
  - `utils/referral-code.ts`
  - `utils/commission-calculator.ts`

Run tests: `cd backend && bun test`

## Follow-ups (Optional)

- Add integration tests for services with a test DB
- Add e2e tests for critical endpoints
- Consider anti-fraud heuristics for click-spam detection

## Compliance Check

- No TODO/placeholder/FIXME present in changed files
- Strict TS: Removed `any` from module code; schemas use `unknown` for JSONB
- Performance: queries use indices; pagination enforced; caching in analytics
