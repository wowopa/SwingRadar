# SwingRadar Sprint Roadmap

## Purpose
This document reconstructs the working sprint history from the current codebase so we can continue development from a shared baseline.

## Current summary
- The app already supports `mock`, `file`, and `postgres` data providers.
- The ETL layer can fetch market, news, and disclosure data from external sources and regenerate live snapshots.
- Admin APIs and an admin dashboard exist for operational workflows.
- Universe scan automation scripts exist and can score watchlist candidates in batches.
- The project is beyond prototype stage and is now balancing two priorities:
  - operational hardening
  - product repositioning from analysis-heavy UI toward an action-first swing operating system

## Sprint status

### Sprint 1: App shell and file snapshot experience
Status: Completed

Scope:
- Recommendations, analysis, and tracking pages are implemented.
- API routes serve snapshot-backed responses for core app features.
- File-based provider is available for local and fallback operation.

Code anchors:
- `app/recommendations/page.tsx`
- `app/analysis/[ticker]/page.tsx`
- `app/tracking/page.tsx`
- `app/api/recommendations/route.ts`
- `app/api/analysis/[ticker]/route.ts`
- `app/api/tracking/route.ts`
- `lib/data-sources/file-provider.ts`

### Sprint 2: Provider abstraction and safe fallback
Status: Completed

Scope:
- Provider selection is centralized.
- Fallback behavior exists when the primary provider fails.
- News curation overlays are applied after provider reads.

Code anchors:
- `lib/providers/index.ts`

### Sprint 3: External data ingestion pipeline
Status: Completed

Scope:
- Separate fetchers exist for market, news, and disclosures.
- External raw payloads are synced into the snapshot generation flow.
- Full refresh script is available for local or scheduled execution.

Code anchors:
- `scripts/fetch-market-source.mjs`
- `scripts/fetch-news-source.mjs`
- `scripts/fetch-disclosures-source.mjs`
- `scripts/sync-external-raw.mjs`
- `scripts/generate-snapshots.mjs`
- `scripts/refresh-external-pipeline.mjs`
- `docs/external-data-sources.md`

### Sprint 4: PostgreSQL snapshot provider
Status: Completed

Scope:
- PostgreSQL pool and provider are implemented.
- Snapshot ingest script writes generated app payloads into database tables.
- Runtime can switch to Postgres with env configuration.

Code anchors:
- `lib/server/postgres.ts`
- `lib/data-sources/postgres-provider.ts`
- `scripts/ingest-postgres.mjs`
- `db/postgres-schema.sql`
- `docs/postgres-provider.md`

### Sprint 5: Admin operations and editorial workflow
Status: In progress

What is already present:
- Admin page and admin APIs are implemented.
- Health, ingest, publish, rollback, audit, editorial draft, and watchlist routes exist.
- Watchlist update flow can rerun pipeline-related work.

Code anchors:
- `app/admin/page.tsx`
- `app/api/admin/status/route.ts`
- `app/api/admin/watchlist/route.ts`
- `app/api/admin/ingest/route.ts`
- `app/api/admin/publish/route.ts`
- `app/api/admin/rollback/route.ts`
- `app/api/admin/audit/route.ts`
- `app/api/admin/editorial-draft/route.ts`

Why this sprint is still open:
- Some UI copy appears to have broken text encoding.
- Operational paths exist, but we have not yet confirmed all admin flows end-to-end with regression coverage.
- Test coverage is still focused on service-level behavior, not the full admin workflow surface.

### Sprint 6: Universe expansion and daily candidate scan
Status: In progress

What is already present:
- Symbol import and watchlist build scripts exist.
- Batch scan logic exists and can score candidates across generated snapshots.
- Daily cycle orchestration script exists.

Code anchors:
- `scripts/import-symbol-master.mjs`
- `scripts/build-universe-watchlist.mjs`
- `scripts/scan-universe-batches.mjs`
- `scripts/run-daily-universe-cycle.mjs`
- `docs/universe-scan.md`

Why this sprint is still open:
- The scan pipeline appears script-driven rather than fully surfaced in the app.
- Candidate review, approval, and promotion workflow is not yet clearly connected to admin UX.
- We should validate performance, failure recovery, and database ingest behavior at larger universe sizes.

### Sprint 7: Data model normalization
Status: Not started

Target outcome:
- Move from snapshot-only persistence toward raw event tables, derived features, and stable materialized outputs.

Planned direction:
1. Split raw market, news, and disclosure events into dedicated tables.
2. Build derived feature tables for scoring inputs.
3. Generate materialized recommendation and analysis views from normalized data.
4. Keep app APIs reading stable snapshots or views while internals evolve.

Reference:
- `docs/postgres-provider.md`

### Sprint 8: Reliability and release hardening
Status: Not started

Target outcome:
- Treat the project as an operated product rather than a developer-run pipeline.

Suggested scope:
- Expand automated tests around provider fallback, ETL scripts, and admin APIs.
- Add stronger health checks and failure reporting for scheduled jobs.
- Validate deployment and recovery procedures against the current Postgres mode.
- Remove text encoding issues from user-facing Korean copy.

### Sprint 9: Action-first product repositioning
Status: Not started

Target outcome:
- Reframe the app around daily decisions, portfolio rules, and plain-language guidance.

Suggested scope:
- Redesign the recommendations surface into a daily operating home.
- Define action buckets such as `Buy now`, `Watch only`, `Manage open position`, and `Avoid for now`.
- Add trade-plan fields such as entry zone, stop, first target, and expected hold window.
- Add market-regime and portfolio-cap metadata so the app can limit daily actions intentionally.
- Rewrite onboarding and guide copy around user decisions rather than internal scoring vocabulary.

Reference:
- `docs/service-operating-model.md`
- `docs/action-first-ux-roadmap.md`

## Recommended next sprint
Recommended focus: Sprint 9 action-first product repositioning

Why this is the best next step:
- The strongest user feedback is about clarity, actionability, and decision confidence rather than missing infrastructure.
- Product trust will improve more by reducing ambiguity than by adding more analysis detail.
- A clear operating model is now needed before further UI or scoring iteration.
- This sprint still complements later hardening work because it will define the new source of truth for labels, screen hierarchy, and portfolio behavior.

## Suggested immediate tasks
1. Rewrite user-facing language around action buckets, entry, stop, and target.
2. Redesign `/recommendations` into a daily operating summary with visible action limits.
3. Extend data contracts to support regime, trade-plan, and portfolio-cap fields.
4. Rework `/guide` into a short onboarding flow that explains how many names to act on and why.

## Notes
- `docs/postgres-provider.md` and some app copy currently show corrupted Korean text and should be normalized before they become the source of truth.
- This roadmap is reconstructed from the repository state on 2026-03-08 and should be updated whenever a sprint is closed.
