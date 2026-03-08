# SWING-RADAR Deployment Guide

## Docker Compose
```bash
cd /app
cp .env.example .env
docker compose up --build
```

## Required production variables
- `NEXT_PUBLIC_APP_URL`
- `SWING_RADAR_API_ORIGIN`
- `SWING_RADAR_DATA_PROVIDER=postgres`
- `SWING_RADAR_DATABASE_URL`
- `SWING_RADAR_DATABASE_SSL`
- `SWING_RADAR_ADMIN_TOKEN`
- `SWING_RADAR_STALE_WARNING_MINUTES`
- `SWING_RADAR_STALE_CRITICAL_MINUTES`

## Deployment flow
1. Build the app image.
2. Start PostgreSQL with persistent volume.
3. Run `npm run db:ingest:schema` or the admin ingest endpoint once the app is up.
4. Verify `/api/health` returns `status=ok` or `warning` with acceptable freshness.
5. Restrict `/api/admin/*` by network and rotate `SWING_RADAR_ADMIN_TOKEN`.

## CI baseline
GitHub Actions runs `npm ci` and `npm run build` on push and pull request through `.github/workflows/ci.yml`.