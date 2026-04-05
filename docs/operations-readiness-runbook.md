# SwingRadar Operations Readiness Runbook

## Goal
Keep one operator-visible proof trail for the checks that decide whether the service can safely stay open.

## Required checkpoints
- Scheduler proof
  - Confirm the real machine still has the daily cycle and auto-heal tasks registered.
  - Confirm the latest run timestamps match the reports shown in `/admin`.
- Backup check
  - Confirm the latest runtime and database backup exists.
  - Record where the backup lives and when it was generated.
- Restore rehearsal
  - Rehearse one restore from backup into a safe target.
  - Record what was restored and whether the data was readable.
- Rollback drill
  - Rehearse one published snapshot rollback.
  - Record the history id or release label used for the drill.
- Release smoke
  - After each deployment, check login, Today, Signals, Analysis, Portfolio, popup notice, and tutorial replay.
  - Record anything unexpected even if the smoke still passes.

## Recommended cadence
- Scheduler proof: at least every 7 days
- Backup check: at least every 7 days
- Restore rehearsal: at least every 30 days
- Rollback drill: at least every 30 days
- Release smoke: after each deployment and at least every 14 days while actively operating

## Minimum release bar
- No missing checkpoint proofs in admin overview
- No blocked item in `Service Readiness`
- No blocked item in `Prelaunch Dry Run`
- At least one real-account flow completed:
  - `Login -> Today -> Opening Check -> Portfolio record -> Review`

## Where to record it
- `/admin` overview -> `운영 검증 체크포인트`
- Each checkpoint should include:
  - what was checked
  - where it was checked
  - result or follow-up if something looked off
