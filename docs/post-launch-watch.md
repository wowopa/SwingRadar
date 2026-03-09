# SwingRadar Post-Launch Watch

## Goal
Use the first 72 hours after deployment to confirm that the service is stable without constant manual intervention.

## Every check window
Run:
```powershell
powershell -ExecutionPolicy Bypass -File C:\Users\eugen\Documents\SwingRadar\scripts\run-post-launch-check.ps1
```

This writes a summary to:
- `data/ops/latest-post-launch-check.json`

## Recommended schedule
1. Right after deployment
2. After the first daily cycle
3. The next morning
4. Day 2 after market close
5. Day 3 after market close

## What to watch
- `Health` should stay `ok` or low-risk `warning`
- `Overall` should not stay `critical`
- `Critical incidents` should be `0`
- `Recent audit failures` should stay at `0`
- `dailyTaskRegistered` and `autoHealTaskRegistered` should both be `true`
- `dailyCycle.status` should move to `ok` after the first real run
- `autoHeal.status` should not stay `failed`
- `newsFetch.liveFetchTickers` should remain healthy relative to total tickers
- `snapshotGeneration.validationFallbackCount` should stay low

## Escalate when
- `Critical incidents` remains above `0` after auto-heal
- `Recent audit failures` grows across multiple checks
- `dailyCycle.status` stays `failed`
- `autoHeal.status` stays `failed`
- the same data-quality warning appears for several runs in a row

## If the service looks unstable
1. Run [check-production-stack.ps1](/C:/Users/eugen/Documents/SwingRadar/scripts/check-production-stack.ps1)
2. Review [ops-runbook.md](/C:/Users/eugen/Documents/SwingRadar/docs/ops-runbook.md)
3. Review `/admin` status and audit tabs
4. Restore PostgreSQL from the newest backup if the data store is the problem
