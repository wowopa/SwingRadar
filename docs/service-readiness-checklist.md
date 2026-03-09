# SwingRadar Service Readiness Checklist

## Goal
Move from a developer-operated project to a service that can run every day with minimal manual intervention.

## Current phase
- Core pages, admin tools, provider fallback, KRX symbol sync, daily universe scan, and auto-heal loops are implemented.
- The biggest remaining risks are external data stability, real scheduler operation, and deployment discipline.

## Priority 1: External data stability
Status: In progress

Tasks:
- Add retry and backoff for rate-limited news providers.
- Keep snapshot generation alive when validation data is missing for a ticker.
- Add clearer warnings when a provider falls back to cache or file data.
- Reduce single-point failure risk in market, news, and disclosure fetch steps.

Done in this pass:
- News fetch now retries on `429`, `408`, and `5xx`.
- Snapshot generation now uses a conservative fallback when validation data is missing.

## Priority 2: Scheduler operation
Status: In progress

Tasks:
- Register daily KRX cycle and auto-heal tasks on the actual operations machine.
- Confirm run order after market close.
- Verify task status and last-run behavior with real credentials and real folders.
- Keep runbook steps aligned with the current scripts.

Current tooling:
- `scripts/register-ops-scheduler.ps1`
- `scripts/get-ops-scheduler-status.ps1`
- `scripts/unregister-ops-scheduler.ps1`

## Priority 3: Deployment and runtime operations
Status: In progress

Tasks:
- Define the production host shape: app process, database, scheduler, and secrets.
- Store secrets outside local `.env.local`.
- Add backup and restore steps for PostgreSQL.
- Define restart and rollback procedures.
- Decide where structured logs and audit events are retained.

Done in this pass:
- Docker Compose now mounts persistent app data and backup paths.
- Added deploy, backup, restore, and stack-check PowerShell scripts.
- Added a short production cutover checklist.

## Priority 4: User-facing trust signals
Status: In progress

Tasks:
- Expand public freshness banners with stronger reasons when data is stale.
- Surface partial data conditions like limited news coverage or fallback-only snapshots.
- Keep messages short enough for beginner investors.

Done in this pass:
- Recommendations, analysis, and tracking pages now show public freshness status.

## Priority 5: Universe scale-up
Status: In progress

Tasks:
- Finalize stable KRX full-list ingestion in real daily operations.
- Tune scan time, batch size, and failure handling for larger universes.
- After KRX is stable, add the same structure for US symbols.

## Priority 6: Release safety
Status: In progress

Tasks:
- Add more regression coverage for script-heavy failure paths.
- Create a short pre-release checklist for data freshness, audit health, and fallback activity.
- Add smoke checks after each deployment.

Done in this pass:
- Added a post-launch service check script.
- Added a 72-hour post-launch watch checklist.

## Recommended next execution order
1. Stabilize external news and validation data further with real run logs.
2. Register the scheduler on the real operations machine.
3. Stand up the production runtime and secret management path.
4. Tighten public trust messaging for partial data cases.
5. Expand to larger KRX coverage, then US symbols.
