# PostgreSQL Provider Setup

## 목적
SWING-RADAR를 `mock` 또는 `file` 기반 운영에서 실제 PostgreSQL 기반 스냅샷 저장소로 전환하기 위한 설정 문서입니다.

## Env
```env
SWING_RADAR_DATA_PROVIDER=postgres
SWING_RADAR_DATABASE_URL=postgres://postgres:postgres@localhost:5432/swing_radar
SWING_RADAR_DATABASE_SSL=false
SWING_RADAR_DB_POOL_MAX=10
```

## Schema
초기 스키마는 [db/postgres-schema.sql](../db/postgres-schema.sql)에 있습니다.

직접 적용 예시:
```bash
psql "$SWING_RADAR_DATABASE_URL" -f db/postgres-schema.sql
```

또는 ingest 스크립트에서 스키마까지 함께 적용:
```bash
node scripts/ingest-postgres.mjs --apply-schema
```

## Ingest workflow
파일 기반으로 생성된 payload를 PostgreSQL snapshot table에 적재하는 스크립트는 [scripts/ingest-postgres.mjs](../scripts/ingest-postgres.mjs)입니다.

기본 실행:
```bash
node scripts/ingest-postgres.mjs
```

스키마 포함 실행:
```bash
node scripts/ingest-postgres.mjs --apply-schema
```

데이터 디렉터리 지정:
```bash
node scripts/ingest-postgres.mjs --data-dir ./data/live
```

## Current storage shape
현재 provider는 정규화된 계산 테이블이 아니라 snapshot 중심 구조입니다.
즉, 프론트엔드와 API가 바로 사용하는 DTO payload를 `jsonb`로 저장하고 최신 snapshot을 읽습니다.

### recommendation_snapshots
- `generated_at`
- `ticker`
- `payload jsonb`
- unique key: `(generated_at, ticker)`

### analysis_snapshots
- `generated_at`
- `ticker`
- `payload jsonb`
- unique key: `(generated_at, ticker)`

### tracking_snapshots
- `generated_at`
- `history jsonb`
- `details jsonb`
- unique key: `(generated_at)`

## Why snapshot-first
- 프론트 DTO와 1:1로 매핑하기 쉽습니다.
- 초기 라이브 전환 속도가 빠릅니다.
- 계산 파이프라인과 읽기 API를 느슨하게 분리할 수 있습니다.

## Recommended next phase
운영 데이터가 쌓이면 아래 단계로 전환하는 것을 권장합니다.
1. raw market, news, signal event table 분리
2. derived feature table 분리
3. recommendation, analysis, tracking materialized snapshot 생성
4. API는 안정적인 snapshot 또는 view만 읽도록 유지

## Current code entry points
- provider selector: [lib/providers/index.ts](../lib/providers/index.ts)
- postgres connection: [lib/server/postgres.ts](../lib/server/postgres.ts)
- postgres provider: [lib/data-sources/postgres-provider.ts](../lib/data-sources/postgres-provider.ts)
- ingest script: [scripts/ingest-postgres.mjs](../scripts/ingest-postgres.mjs)
