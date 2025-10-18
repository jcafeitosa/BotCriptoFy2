# 🔐 Auth Module Audit — 2025-10-18

Status: Completed review and hardening of Better-Auth integration.

## Summary

- Better-Auth in place with Drizzle adapter and Stripe plugin.
- Schema alignment migration added (sessions.token, users.stripe_customer_id, subscriptions table, indexes).
- New endpoints: sessions management, tenant switching, roles and 2FA status.
- JSON parsing issue with sign-up fixed by using `mount()` and ordering middlewares.

## Changes

1) Database
- Added `sessions.token` (unique, not null, default uuid) for faster lookup and cookie binding;
- Added useful indexes: `sessions_user_id_idx`, `accounts_user_id_idx`, `verifications_identifier_idx`,
  `user_roles_user_id_idx`, `passkeys_user_id_idx`;
- Added `users.stripe_customer_id` for Stripe integration;
- Added `subscriptions` table compatible with Better-Auth Stripe plugin.

2) Endpoints (prefix `/api/auth`)
- `GET /sessions` — list user’s active sessions;
- `POST /sessions/revoke-others` — revoke all but current session;
- `POST /sessions/revoke/:sessionId` — revoke a specific session;
- `POST /tenant/switch` — set active organization for current session (membership-checked);
- `GET /roles` — all roles + primary role;
- `GET /two-factor/status` — 2FA enabled flag.

3) Security & Performance
- Strict same-site cookies (`lax`) and secure cookies in production;
- CORS configured with credentials and trusted origins;
- Session + verification + account indexes to reduce hot-path latency;
- Guards for session, roles, tenant membership, verified email.

## Validation

- Manual smoke: auth status (`GET /api/auth/status`), me (`GET /api/auth/me`), sessions list, revoke-others, and tenant switch.
- Docs updated: resolved prior JSON parsing issue.

## Next Steps

- Add integration tests (requires running Postgres) for sign-up/sign-in flows.
- Wire SMTP provider for verification and password reset emails.
- Configure Stripe Price IDs for paid plans.
4) Ownership boundaries (refactor)
- Moved role resolution to Security module: `security/services/role.service.ts` (getUserRoles, getUserPrimaryRole);
- Moved tenant membership helpers to Tenants module: `tenants/services/membership.service.ts` (getUserPrimaryTenantId, getUserTenantIds, userIsMemberOfTenant);
- Auth no longer exports role/membership helpers; only session-specific helpers remain (setActiveOrganization);
- Auth email now delegates to Notifications EmailProvider (no duplicate SMTP logic).
