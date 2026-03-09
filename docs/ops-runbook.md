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

## 4. Health checks
App health:
```powershell
curl http://localhost:3000/api/health
```

Ops environment check:
```powershell
powershell -ExecutionPolicy Bypass -File C:\Users\eugen\Documents\SwingRadar\scripts\test-ops-environment.ps1 -DownloadsDir C:\Users\eugen\Downloads -DownloadPattern KRX
```

One-step scheduler setup:
```powershell
powershell -ExecutionPolicy Bypass -File C:\Users\eugen\Documents\SwingRadar\scripts\setup-ops-scheduler.ps1
```

Snapshot file health:
```powershell
& "C:\Program Files\nodejs\npm.cmd" run ops:check
```

Auto-recovery check:
```powershell
& "C:\Program Files\nodejs\npm.cmd" run ops:heal
```

Incident-based auto heal:
```powershell
& "C:\Program Files\nodejs\npm.cmd" run ops:auto-heal
```

Default report path:
- `data/ops/latest-health-check.json`

Expected provider fields:
- `dataProvider.configured.provider`: configured primary provider
- `dataProvider.fallback.provider`: configured fallback provider when present
- `dataProvider.lastUsed.provider`: the provider that actually served the latest health request
- `dataProvider.fallbackTriggered`: whether fallback was used during the request

## 5. Daily symbol sync
Enable symbol sync in the daily cycle with the environment values below.

Use the newest matching CSV from the KRX downloads folder:
```powershell
$env:SWING_RADAR_SYMBOL_SYNC_ENABLED="true"
$env:SWING_RADAR_SYMBOL_SYNC_KRX="true"
$env:SWING_RADAR_KRX_DOWNLOADS_DIR="C:\Users\eugen\Downloads"
$env:SWING_RADAR_KRX_DOWNLOAD_PATTERN="KRX"
$env:SWING_RADAR_SYMBOL_SYNC_MERGE="false"
```

Use a remote KRX CSV URL:
```powershell
$env:SWING_RADAR_SYMBOL_SYNC_ENABLED="true"
$env:SWING_RADAR_SYMBOL_SYNC_KRX="true"
$env:SWING_RADAR_KRX_FETCH_MODE="url"
$env:SWING_RADAR_KRX_SOURCE_URL="https://example.com/krx-download.csv"
$env:SWING_RADAR_SYMBOL_SYNC_MERGE="false"
```

Use the KRX Open API after your API account is ready:
```powershell
$env:SWING_RADAR_SYMBOL_SYNC_ENABLED="true"
$env:SWING_RADAR_SYMBOL_SYNC_KRX="true"
$env:SWING_RADAR_KRX_FETCH_MODE="api"
$env:SWING_RADAR_KRX_API_URL="https://data.krx.co.kr/your-open-api-endpoint"
$env:SWING_RADAR_KRX_API_KEY="replace-with-issued-key"
$env:SWING_RADAR_KRX_API_AUTH_HEADER="Authorization"
$env:SWING_RADAR_KRX_API_RESPONSE_TYPE="json"
$env:SWING_RADAR_KRX_API_DATA_PATH="data"
$env:SWING_RADAR_KRX_API_FIELD_TICKER="ticker"
$env:SWING_RADAR_KRX_API_FIELD_COMPANY="company"
$env:SWING_RADAR_KRX_API_FIELD_MARKET="market"
$env:SWING_RADAR_KRX_API_FIELD_SECTOR="sector"
$env:SWING_RADAR_KRX_API_FIELD_DART="dartCorpCode"
```

Use a local CSV that is already normalized for the importer:
```powershell
$env:SWING_RADAR_SYMBOL_SYNC_ENABLED="true"
$env:SWING_RADAR_SYMBOL_SYNC_INPUT="C:\path\to\krx-symbol-master.csv"
$env:SWING_RADAR_SYMBOL_SYNC_MERGE="false"
```

Run symbol sync only:
```powershell
& "C:\Program Files\nodejs\npm.cmd" run symbols:sync
```

## 6. Daily universe cycle
Run the KRX daily cycle:
```powershell
$env:SWING_RADAR_SYMBOL_SYNC_ENABLED="true"
$env:SWING_RADAR_SYMBOL_SYNC_KRX="true"
$env:SWING_RADAR_KRX_DOWNLOADS_DIR="C:\Users\eugen\Downloads"
$env:SWING_RADAR_KRX_DOWNLOAD_PATTERN="KRX"
& "C:\Program Files\nodejs\npm.cmd" run universe:daily -- --sync-symbols --markets KOSPI,KOSDAQ --batch-size 20
```

PowerShell wrapper for Windows Task Scheduler:
```powershell
powershell -ExecutionPolicy Bypass -File C:\Users\eugen\Documents\SwingRadar\scripts\run-daily-krx-cycle.ps1
```

Register the scheduled task:
```powershell
powershell -ExecutionPolicy Bypass -File C:\Users\eugen\Documents\SwingRadar\scripts\register-daily-krx-task.ps1 -StartTime 18:10 -DownloadsDir C:\Users\eugen\Downloads -DownloadPattern KRX
```

Check task status:
```powershell
powershell -ExecutionPolicy Bypass -File C:\Users\eugen\Documents\SwingRadar\scripts\get-daily-krx-task-status.ps1
```

Remove the task:
```powershell
powershell -ExecutionPolicy Bypass -File C:\Users\eugen\Documents\SwingRadar\scripts\unregister-daily-krx-task.ps1
```

## 7. Auto-heal scheduler
Run auto-heal manually:
```powershell
powershell -ExecutionPolicy Bypass -File C:\Users\eugen\Documents\SwingRadar\scripts\run-ops-auto-heal.ps1
```

Register the auto-heal task:
```powershell
powershell -ExecutionPolicy Bypass -File C:\Users\eugen\Documents\SwingRadar\scripts\register-auto-heal-task.ps1 -StartTime 18:40
```

Register both tasks together:
```powershell
powershell -ExecutionPolicy Bypass -File C:\Users\eugen\Documents\SwingRadar\scripts\register-ops-scheduler.ps1 -DailyStartTime 18:10 -AutoHealStartTime 18:40 -DownloadsDir C:\Users\eugen\Downloads -DownloadPattern KRX
```

Check resolved settings without registering:
```powershell
powershell -ExecutionPolicy Bypass -File C:\Users\eugen\Documents\SwingRadar\scripts\setup-ops-scheduler.ps1 -CheckOnly
```

Check auto-heal task status:
```powershell
powershell -ExecutionPolicy Bypass -File C:\Users\eugen\Documents\SwingRadar\scripts\get-auto-heal-task-status.ps1
```

Remove the auto-heal task:
```powershell
powershell -ExecutionPolicy Bypass -File C:\Users\eugen\Documents\SwingRadar\scripts\unregister-auto-heal-task.ps1
```

Remove both scheduler tasks:
```powershell
powershell -ExecutionPolicy Bypass -File C:\Users\eugen\Documents\SwingRadar\scripts\unregister-ops-scheduler.ps1
```

Check both scheduler tasks at once:
```powershell
powershell -ExecutionPolicy Bypass -File C:\Users\eugen\Documents\SwingRadar\scripts\get-ops-scheduler-status.ps1
```

The full cycle runs in this order.
1. symbol master sync
2. universe watchlist build
3. universe batch scan
4. optional ingest
5. daily candidate refresh
6. incident-based auto heal

Daily cycle report:
- Default report path: `data/ops/latest-daily-cycle.json`
- Override with `SWING_RADAR_DAILY_CYCLE_REPORT_PATH`

Auto-heal report:
- Default report path: `data/ops/latest-auto-heal.json`
- Override with `SWING_RADAR_AUTO_HEAL_REPORT_PATH`

## 8. Admin backoffice
- Open `/admin`.
- Enter `SWING_RADAR_ADMIN_TOKEN`.
- Use the status tab to inspect freshness, audit logs, and universe scan summaries.
- Use draft save and publish actions for editorial updates.
- Use watchlist tools to add symbols and rerun the pipeline when needed.
- Adding a symbol now runs a lighter follow-up refresh for that symbol first, then rebuilds the shared snapshots.

Refresh one watchlist symbol manually:
```powershell
& "C:\Program Files\nodejs\npm.cmd" run watchlist:refresh:entry -- --ticker 005930
```

## 9. Observability checks
- Every API route emits one JSON log line to stdout with `route`, `status`, `durationMs`, and `requestId`.
- Health route reports snapshot freshness and actual provider usage.
- `ops:check` reports snapshot freshness from file outputs even when the app server is not running.
- `ops:heal` reruns the external refresh pipeline and optional Postgres ingest when stale snapshots are detected.
- `ops:auto-heal` watches the latest health and daily cycle reports, then reruns recovery actions when stale snapshots or universe cycle failures are detected.
- If PostgreSQL fails and fallback is used, `provider_fallback` is written to `audit_logs`.
- Every auto-heal execution writes `auto_heal_run` to `audit_logs` when PostgreSQL is configured.
- Successful or failed admin actions are stored in `audit_logs` when PostgreSQL is configured.

## 10. Suggested scheduler flow
1. Run `npm run ops:check` on a short interval for passive monitoring.
2. Run `npm run universe:daily -- --sync-symbols --markets KOSPI,KOSDAQ --batch-size 20` after market close.
3. Run `npm run ops:auto-heal` after `ops:check` and after the daily cycle to retry safe recovery actions automatically.
4. Review `/api/admin/status` and `/api/admin/audit` after any recovery attempt.
5. Escalate when repeated critical freshness warnings continue after recovery.

## 11. Recommended machine setup
1. Fill `.env.local` with the production database URL, admin token, Naver key, and DART key.
2. Set `SWING_RADAR_DAILY_TASK_NAME`, `SWING_RADAR_AUTO_HEAL_TASK_NAME`, `SWING_RADAR_DAILY_TASK_START_TIME`, and `SWING_RADAR_AUTO_HEAL_START_TIME` if you want machine-specific names or times.
3. Put the latest KRX CSV in `SWING_RADAR_KRX_DOWNLOADS_DIR`, or update `SWING_RADAR_KRX_DOWNLOAD_PATTERN` to match the real file name.
4. Run `scripts\test-ops-environment.ps1` and confirm the summary is `READY`.
5. Run `scripts\setup-ops-scheduler.ps1` once to register both tasks with the resolved settings.
6. Confirm the tasks with `scripts\get-ops-scheduler-status.ps1`.

## 12. Backup and restore
Create a PostgreSQL backup:
```powershell
powershell -ExecutionPolicy Bypass -File C:\Users\eugen\Documents\SwingRadar\scripts\backup-postgres.ps1
```

Restore a backup:
```powershell
powershell -ExecutionPolicy Bypass -File C:\Users\eugen\Documents\SwingRadar\scripts\restore-postgres.ps1 -BackupFile C:\Users\eugen\Documents\SwingRadar\backups\postgres\swing-radar-20260309-181000.dump
```

Check the full production stack:
```powershell
powershell -ExecutionPolicy Bypass -File C:\Users\eugen\Documents\SwingRadar\scripts\check-production-stack.ps1
```

## 13. Production minimum checklist
- `SWING_RADAR_ADMIN_TOKEN` must be a long random secret.
- `SWING_RADAR_DATA_PROVIDER=postgres` in production.
- `SWING_RADAR_FALLBACK_PROVIDER=file` only if you intentionally want degraded read mode.
- `SWING_RADAR_DATABASE_SSL=true` if the managed DB requires TLS.
- `/api/admin/*` should be restricted by network policy or reverse proxy auth.
- Symbol sync source must be stable and versioned where possible.
- Monitor `/api/health`, freshness severity, actual provider usage, recent audit activity, and symbol sync failures.
- Run `scripts/test-ops-environment.ps1` before registering scheduler tasks on a new machine.
