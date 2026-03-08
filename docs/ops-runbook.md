# SWING-RADAR Ops Runbook

## 1. Apply schema and ingest locally
```powershell
cd C:\Users\eugen\Documents\SwingRadar
$env:SWING_RADAR_DATABASE_URL="postgres://postgres:postgres@localhost:15432/swing_radar"
& "C:\Program Files\nodejs\npm.cmd" run db:ingest:schema
```

## 2. Start app with postgres provider
```powershell
$env:SWING_RADAR_DATA_PROVIDER="postgres"
$env:SWING_RADAR_FALLBACK_PROVIDER="file"
$env:SWING_RADAR_DATABASE_URL="postgres://postgres:postgres@localhost:15432/swing_radar"
$env:SWING_RADAR_ADMIN_TOKEN="replace-with-long-random-secret"
& "C:\Program Files\nodejs\npm.cmd" run dev
```

## 3. Admin ingest via protected API
```powershell
$env:SWING_RADAR_ADMIN_TOKEN="replace-with-long-random-secret"
$env:SWING_RADAR_ADMIN_URL="http://localhost:3000/api/admin/ingest"
& "C:\Program Files\nodejs\node.exe" .\scripts\admin-ingest.mjs --apply-schema
```

## 4. Health check
```powershell
curl http://localhost:3000/api/health
```

Expected provider fields:
- `dataProvider.configured.provider`: configured primary provider
- `dataProvider.fallback.provider`: configured fallback provider when present
- `dataProvider.lastUsed.provider`: the provider that actually served the latest health request
- `dataProvider.fallbackTriggered`: whether fallback was used during the request

## 5. Admin backoffice
- Open `/admin`.
- Enter `SWING_RADAR_ADMIN_TOKEN`.
- Use `상태 새로고침` to inspect freshness and audit logs.
- Use `초안 저장` and `Publish 반영` for editorial updates.

## 6. Observability checks
- Every API route emits one JSON log line to stdout with `route`, `status`, `durationMs`, and `requestId`.
- Health route reports snapshot freshness and actual provider usage.
- If PostgreSQL fails and fallback is used, `provider_fallback` is written to `audit_logs`.
- Successful or failed admin actions are stored in `audit_logs` when PostgreSQL is configured.

## 7. Production minimum checklist
- `SWING_RADAR_ADMIN_TOKEN` must be a long random secret.
- `SWING_RADAR_DATA_PROVIDER=postgres` in production.
- `SWING_RADAR_FALLBACK_PROVIDER=file` only if you intentionally want degraded read mode.
- `SWING_RADAR_DATABASE_SSL=true` if the managed DB requires TLS.
- `/api/admin/*` should be restricted by network policy or reverse proxy auth.
- Monitor `/api/health`, freshness severity, actual provider usage, and recent audit activity.