# SwingRadar Production Cutover Checklist

## Goal
Bring the service online in a repeatable order and confirm that data, automation, and recovery are all working on the real machine.

## 1. Before deployment
- Fill [`.env.local`](/C:/Users/eugen/Documents/SwingRadar/.env.local) with the real database URL, admin token, Naver key, and DART key.
- Confirm the KRX download folder and file pattern are correct.
- Run:
```powershell
powershell -ExecutionPolicy Bypass -File C:\Users\eugen\Documents\SwingRadar\scripts\test-ops-environment.ps1 -DownloadsDir C:\Users\eugen\Downloads -DownloadPattern KRX
```
- Expected result: `Environment summary: READY`

## 2. Deploy the stack
- Run:
```powershell
powershell -ExecutionPolicy Bypass -File C:\Users\eugen\Documents\SwingRadar\scripts\deploy-production-stack.ps1 -SetupScheduler
```
- This does:
  - `docker compose up -d --build`
  - waits for `/api/health`
  - runs `db:ingest:schema`
  - runs `db:ingest`
  - checks stack status
  - registers scheduler tasks

## 3. Verify immediately after deployment
- Run:
```powershell
powershell -ExecutionPolicy Bypass -File C:\Users\eugen\Documents\SwingRadar\scripts\check-production-stack.ps1
```
- Check:
  - `docker compose ps` shows `app` and `postgres` running
  - `/api/health` returns `ok` or acceptable `warning`
  - scheduled tasks exist

## 4. Verify admin operations
- Open `/admin`
- Confirm:
  - health and freshness cards load
  - latest daily cycle report is visible
  - auto-heal report is visible
  - audit log is receiving events

## 5. First backup
- Run:
```powershell
powershell -ExecutionPolicy Bypass -File C:\Users\eugen\Documents\SwingRadar\scripts\backup-postgres.ps1
```
- Confirm a new file exists under `backups/postgres`

## 6. Next-day follow-up
- Confirm the daily cycle task ran after market close
- Confirm the auto-heal task ran afterward
- Review [ops runbook](/C:/Users/eugen/Documents/SwingRadar/docs/ops-runbook.md) status cards in `/admin`
- Review `data/ops/latest-daily-cycle.json`
- Review `data/ops/latest-auto-heal.json`

## 7. If something goes wrong
- Re-run:
```powershell
powershell -ExecutionPolicy Bypass -File C:\Users\eugen\Documents\SwingRadar\scripts\check-production-stack.ps1
```
- If DB corruption or data loss is suspected, restore the newest dump:
```powershell
powershell -ExecutionPolicy Bypass -File C:\Users\eugen\Documents\SwingRadar\scripts\restore-postgres.ps1 -BackupFile C:\Users\eugen\Documents\SwingRadar\backups\postgres\latest.dump
```
