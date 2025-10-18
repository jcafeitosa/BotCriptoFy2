# Exchanges Module Restoration — 2025-10-18

## Context
- The original `exchanges` module was removed inadvertently, leaving only an empty skeleton under `backend/backend/src/modules/exchanges/`.
- Multiple parts of the platform (orders, market-data adapters, scripts) depended on the module, leading to `MODULE_NOT_FOUND` errors and failing type-checks.

## Actions Taken
1. **Removed stray directory** `backend/backend/` to eliminate duplicate paths.
2. **Recreated module structure** under `backend/src/modules/exchanges/`:
   - Database schema (`exchanges`, `exchange_configurations`, `exchange_orders`, `exchange_balances`).
   - Services for catalog management, CCXT integration, credential storage, and polling-based WebSocket adapters.
   - Connection pool (`exchangeConnectionPool`) to reuse REST (CCXT) clients and shared WebSocket adapters.
   - REST API routes for listing exchanges, managing encrypted API keys, and testing connectivity.
   - Utility helpers for AES-256-GCM credential encryption.
3. **Integrated with existing systems**:
   - Orders and positions services now load exchange connections via the new module, decrypt credentials, and instantiate CCXT clients through `ExchangeService`.
   - Market data manager/tests receive `createWebSocketAdapter` and default configs from the module.
4. **RBAC update**: Added `exchanges` (and `wallets`) to `ResourceType` so permissions align with the new endpoints.

## Notes
- Database migrations must create the new tables (`exchanges`, `exchange_configurations`, `exchange_orders`, `exchange_balances`). Until then, API routes gracefully fall back to in-memory metadata and raise informative errors on credential operations.
- WebSocket functionality uses a polling adapter (CCXT REST) as a unified fallback; specialized native adapters can be added incrementally under `services/adapters/`.

## Follow-up
- Generate migrations via `drizzle-kit` for the new tables.
- Seed RBAC permissions allowing `exchanges:read/manage` to relevant roles.
- Extend polling adapter with rate-limited caching or native socket implementations per exchange when ready.
