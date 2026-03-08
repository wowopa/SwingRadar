# PostgreSQL Provider Setup

## 목적
SWING-RADAR를 mock/file 단계에서 실제 운영 데이터베이스 단계로 전환하기 위한 PostgreSQL provider 설정 문서다.

## Env
```env
SWING_RADAR_DATA_PROVIDER=postgres
SWING_RADAR_DATABASE_URL=postgres://postgres:postgres@localhost:5432/swing_radar
SWING_RADAR_DATABASE_SSL=false
SWING_RADAR_DB_POOL_MAX=10
```

## Schema
초기 스키마는 [db/postgres-schema.sql](../db/postgres-schema.sql)에 있다.

직접 적용 예시:
```bash
psql "$SWING_RADAR_DATABASE_URL" -f db/postgres-schema.sql
```

또는 ingest 스크립트에서 schema까지 같이 적용:
```bash
node scripts/ingest-postgres.mjs --apply-schema
```

## Ingest workflow
파일 기반 payload를 Postgres snapshot table에 넣는 스크립트는 [scripts/ingest-postgres.mjs](../scripts/ingest-postgres.mjs)이다.

기본 실행:
```bash
node scripts/ingest-postgres.mjs
```

schema 포함 실행:
```bash
node scripts/ingest-postgres.mjs --apply-schema
```

데이터 디렉터리 지정:
```bash
node scripts/ingest-postgres.mjs --data-dir ./data/live
```

## Current storage shape
현재 provider는 정규화된 계산 테이블이 아니라 snapshot 중심이다.
즉, 프론트가 필요로 하는 DTO payload를 `jsonb`로 저장하고 최신 snapshot을 읽는다.

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
- 프론트 DTO와 1:1 매핑이 쉽다
- 초기 라이브 전환 속도가 빠르다
- 계산 파이프라인과 읽기 API를 느슨하게 분리할 수 있다

## Recommended next phase
운영 데이터가 쌓이면 아래 단계로 전환 권장:
1. raw market/news/signal event table 분리
2. derived feature table 분리
3. recommendation/analysis/tracking materialized snapshot 생성
4. API는 snapshot만 읽도록 유지

## Current code entry points
- provider selector: [lib/providers/index.ts](../lib/providers/index.ts)
- postgres connection: [lib/server/postgres.ts](../lib/server/postgres.ts)
- postgres provider: [lib/data-sources/postgres-provider.ts](../lib/data-sources/postgres-provider.ts)
- ingest script: [scripts/ingest-postgres.mjs](../scripts/ingest-postgres.mjs)