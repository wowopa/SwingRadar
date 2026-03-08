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

Snapshot file health:
```powershell
& "C:\Program Files\nodejs\npm.cmd" run ops:check
```

Auto-recovery check:
```powershell
& "C:\Program Files\nodejs\npm.cmd" run ops:heal
```

Default report path:
- `data/ops/latest-health-check.json`

Expected provider fields:
- `dataProvider.configured.provider`: configured primary provider
- `dataProvider.fallback.provider`: configured fallback provider when present
- `dataProvider.lastUsed.provider`: the provider that actually served the latest health request
- `dataProvider.fallbackTriggered`: whether fallback was used during the request

## 5. Daily symbol sync
자동 심볼 동기화를 daily cycle에 포함하려면 아래 환경값을 사용합니다.

KRX 다운로드 폴더에서 최신 CSV를 집어오는 방식:
```powershell
$env:SWING_RADAR_SYMBOL_SYNC_ENABLED="true"
$env:SWING_RADAR_SYMBOL_SYNC_KRX="true"
$env:SWING_RADAR_KRX_DOWNLOADS_DIR="C:\Users\eugen\Downloads"
$env:SWING_RADAR_KRX_DOWNLOAD_PATTERN="KRX"
$env:SWING_RADAR_SYMBOL_SYNC_MERGE="false"
```

KRX 원격 CSV URL 기준:
```powershell
$env:SWING_RADAR_SYMBOL_SYNC_ENABLED="true"
$env:SWING_RADAR_SYMBOL_SYNC_KRX="true"
$env:SWING_RADAR_KRX_SOURCE_URL="https://example.com/krx-download.csv"
$env:SWING_RADAR_SYMBOL_SYNC_MERGE="false"
```

이미 importer 형식으로 정리한 로컬 CSV 기준:
```powershell
$env:SWING_RADAR_SYMBOL_SYNC_ENABLED="true"
$env:SWING_RADAR_SYMBOL_SYNC_INPUT="C:\path\to\krx-symbol-master.csv"
$env:SWING_RADAR_SYMBOL_SYNC_MERGE="false"
```

단독 실행:
```powershell
& "C:\Program Files\nodejs\npm.cmd" run symbols:sync
```

## 6. Daily universe cycle
KRX 기준 일일 실행:
```powershell
$env:SWING_RADAR_SYMBOL_SYNC_ENABLED="true"
$env:SWING_RADAR_SYMBOL_SYNC_KRX="true"
$env:SWING_RADAR_KRX_DOWNLOADS_DIR="C:\Users\eugen\Downloads"
$env:SWING_RADAR_KRX_DOWNLOAD_PATTERN="KRX"
& "C:\Program Files\nodejs\npm.cmd" run universe:daily -- --sync-symbols --markets KOSPI,KOSDAQ --batch-size 20
```

작업 스케줄러용 PowerShell 래퍼:
```powershell
powershell -ExecutionPolicy Bypass -File C:\Users\eugen\Documents\SwingRadar\scripts\run-daily-krx-cycle.ps1
```

작업 스케줄러 등록:
```powershell
powershell -ExecutionPolicy Bypass -File C:\Users\eugen\Documents\SwingRadar\scripts\register-daily-krx-task.ps1 -StartTime 18:10 -DownloadsDir C:\Users\eugen\Downloads -DownloadPattern KRX
```

작업 상태 확인:
```powershell
powershell -ExecutionPolicy Bypass -File C:\Users\eugen\Documents\SwingRadar\scripts\get-daily-krx-task-status.ps1
```

작업 해제:
```powershell
powershell -ExecutionPolicy Bypass -File C:\Users\eugen\Documents\SwingRadar\scripts\unregister-daily-krx-task.ps1
```

전체 흐름은 다음 순서로 실행됩니다.
1. symbol master sync
2. universe watchlist build
3. universe batch scan
4. optional ingest
5. daily candidate refresh

## 7. Admin backoffice
- Open `/admin`.
- Enter `SWING_RADAR_ADMIN_TOKEN`.
- Use 상태 탭 to inspect freshness, audit logs, and universe scan summaries.
- Use 초안 저장 and 발행 실행 for editorial updates.
- Use watchlist tools to add symbols and rerun the pipeline when needed.

## 8. Observability checks
- Every API route emits one JSON log line to stdout with `route`, `status`, `durationMs`, and `requestId`.
- Health route reports snapshot freshness and actual provider usage.
- `ops:check` reports snapshot freshness from file outputs even when the app server is not running.
- `ops:heal` reruns the external refresh pipeline and optional Postgres ingest when stale snapshots are detected.
- If PostgreSQL fails and fallback is used, `provider_fallback` is written to `audit_logs`.
- Successful or failed admin actions are stored in `audit_logs` when PostgreSQL is configured.

## 9. Suggested scheduler flow
1. Run `npm run ops:check` on a short interval for passive monitoring.
2. Run `npm run universe:daily -- --sync-symbols --markets KOSPI,KOSDAQ --batch-size 20` after market close.
3. Review `/api/admin/status` and `/api/admin/audit` after any recovery attempt.
4. Escalate when repeated critical freshness warnings continue after recovery.

## 10. Production minimum checklist
- `SWING_RADAR_ADMIN_TOKEN` must be a long random secret.
- `SWING_RADAR_DATA_PROVIDER=postgres` in production.
- `SWING_RADAR_FALLBACK_PROVIDER=file` only if you intentionally want degraded read mode.
- `SWING_RADAR_DATABASE_SSL=true` if the managed DB requires TLS.
- `/api/admin/*` should be restricted by network policy or reverse proxy auth.
- Symbol sync source must be stable and versioned where possible.
- Monitor `/api/health`, freshness severity, actual provider usage, recent audit activity, and symbol sync failures.
