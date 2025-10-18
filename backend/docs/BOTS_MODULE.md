# Bots Module – Execution, Security and Advanced Endpoints

Status: Active – Engine registry integrated, RBAC enforced

## Highlights

- Live Bot Execution Engine wiring via in‑memory registry
- RBAC permissions applied to all routes (bots:read|write|execute|manage)
- Advanced monitoring endpoints for engine state and metrics
- Health now cross‑checks DB state vs. live engine

## Security

- All routes require session + tenant membership
- Permissions per operation:
  - Read: `bots:read`
  - Create/Update: `bots:write`
  - Start/Stop/Pause/Resume/Restart: `bots:execute`
  - Delete/Performance recalc: `bots:manage`

## New Endpoints

- GET `/api/v1/bots/:botId/engine/metrics` → Live engine metrics
- GET `/api/v1/bots/:botId/engine/state` → Live engine state
- GET `/api/v1/bots/running` → List bots with active engines

Existing routes now enforce RBAC accordingly (create, update, control, statistics, trades, logs, templates).

## Engine Integration

`botEngineRegistry` manages one engine per bot:

- Starts engine on `POST /:botId/start` (after DB execution creation)
- Stops engine on `POST /:botId/stop`
- `getBotHealth` verifies engine presence when bot is marked running

## Notes

- The registry is in‑memory by design. For multi‑process/cluster execution, delegate orchestration to workers and persist heartbeats in Redis/DB.
- If engine start fails, bot status is set to `error` with an audit log.

