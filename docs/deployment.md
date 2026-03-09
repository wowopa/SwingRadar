# SWING-RADAR Deployment Guide

## 1. Production baseline
- Deploy with Docker Compose.
- Keep PostgreSQL data in the named volume `swing-radar-postgres`.
- Keep app data, ops reports, and imported CSV files in the host `./data` directory.
- Keep DB backups in the host `./backups/postgres` directory.

## 2. Prepare environment values
Copy `.env.example` to `.env.local` and fill at least these values.

- `NEXT_PUBLIC_APP_URL`
- `SWING_RADAR_API_ORIGIN`
- `SWING_RADAR_DATA_PROVIDER=postgres`
- `SWING_RADAR_DATABASE_URL`
- `SWING_RADAR_DATABASE_SSL`
- `SWING_RADAR_ADMIN_TOKEN`
- `SWING_RADAR_NAVER_CLIENT_ID`
- `SWING_RADAR_NAVER_CLIENT_SECRET`
- `SWING_RADAR_DART_API_KEY`
- `SWING_RADAR_KRX_DOWNLOADS_DIR`
- `SWING_RADAR_KRX_DOWNLOAD_PATTERN`

Optional but recommended:
- `SWING_RADAR_DAILY_TASK_NAME`
- `SWING_RADAR_AUTO_HEAL_TASK_NAME`
- `SWING_RADAR_DAILY_TASK_START_TIME`
- `SWING_RADAR_AUTO_HEAL_START_TIME`

## 3. Start the stack
```powershell
cd C:\Users\eugen\Documents\SwingRadar
docker compose --env-file .env.local up -d --build
```

Check container status:
```powershell
docker compose ps
```

## 4. First ingest
Apply schema and ingest once:
```powershell
docker compose exec app npm run db:ingest:schema
docker compose exec app npm run db:ingest
```

## 5. Scheduler setup
Run the environment check first:
```powershell
powershell -ExecutionPolicy Bypass -File C:\Users\eugen\Documents\SwingRadar\scripts\test-ops-environment.ps1 -DownloadsDir C:\Users\eugen\Downloads -DownloadPattern KRX
```

Register both daily tasks:
```powershell
powershell -ExecutionPolicy Bypass -File C:\Users\eugen\Documents\SwingRadar\scripts\setup-ops-scheduler.ps1
```

## 6. Daily backup
Create a PostgreSQL backup:
```powershell
powershell -ExecutionPolicy Bypass -File C:\Users\eugen\Documents\SwingRadar\scripts\backup-postgres.ps1
```

Restore from a backup when needed:
```powershell
powershell -ExecutionPolicy Bypass -File C:\Users\eugen\Documents\SwingRadar\scripts\restore-postgres.ps1 -BackupFile C:\Users\eugen\Documents\SwingRadar\backups\postgres\swing-radar-20260309-181000.dump
```

## 7. Health and stack checks
Quick stack check:
```powershell
powershell -ExecutionPolicy Bypass -File C:\Users\eugen\Documents\SwingRadar\scripts\check-production-stack.ps1
```

App health:
```powershell
curl http://localhost:3000/api/health
```

## 8. Recovery flow
1. Check `/api/health` and `/api/admin/status`.
2. Review the latest `data/ops/*.json` reports.
3. Run `npm run ops:auto-heal` or wait for the scheduled auto-heal task.
4. If PostgreSQL is damaged, restore the newest dump with `restore-postgres.ps1`.
5. Re-run `npm run db:ingest` if snapshot tables need to be rebuilt.

## 9. CI baseline
GitHub Actions runs `npm ci` and `npm run build` on push and pull request through `.github/workflows/ci.yml`.
