Banco Module – Wallets, Portfolio, Security

Status: Hardened – RBAC applied, 2FA enforced for withdrawals, safer balance ops

What changed

- Security/RBAC
  - Added RBAC to wallet and portfolio routes using existing permissions:
    - Read: wallets:read
    - Write (create, deposit, withdraw, transfer): wallets:write
    - Approvals/lock: wallets:manage
  - Enforced same-user and same-tenant on transfers
  - Withdrawal requests require 2FA enabled and a code (basic check)

- Balance integrity
  - Fixed balance math: transfers now reduce available only; withdrawals deduct locked funds
  - Added negative-balance guards to prevent underflow

- New endpoints
  - GET /api/v1/wallets → List user wallets
  - GET /api/v1/wallets/withdrawals → List user withdrawal requests
  - POST /api/v1/wallets/:id/withdraw/preview → Fee preview + 2FA requirement hint
  - POST /api/v1/wallets/:id/lock → Lock wallet (wallets:manage)
  - POST /api/v1/wallets/:id/unlock → Unlock wallet (wallets:manage)
  - GET /api/v1/wallets/:id/transactions/export → CSV export with filters
  - POST /api/v1/wallets/:id/goals → Create savings goal (wallets:write)
  - GET /api/v1/wallets/:id/goals → List savings goals (wallets:read)
  - POST /api/v1/wallets/goals/:goalId/progress → Add progress (wallets:write)

- Validation
  - Asset parameters validated via explicit enum
  - Minimum amount > 0 for monetary operations

Notes

- 2FA verification uses presence of a configured 2FA and a provided code. Full TOTP code validation is handled by the Auth module endpoints; this module enforces requirement and logs the result on the withdrawal request.
- CoinGecko-backed pricing has 1 minute cache; values are persisted into price history for analytics.
